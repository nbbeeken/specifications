#! /usr/bin/env node
import path from 'node:path';
import util from 'node:util';
import { listAllFilesIn, loadYAML, loadJSON, log } from './utils.mjs';
import { UnifiedTestSuite } from './unified.mjs';
import yaml from 'js-yaml';

const languages = await loadYAML<{ language: string; repo: string }[]>('./languages.yml');
const registry = await loadYAML<{ filePath: string; date: Date; ref: string; description: string }[]>(
  './test_registry.yml'
);

/** Search recursively for unified spec tests */
async function getUnifiedTests(directory: string) {
  // Also excluding valid-fail, invalid UTF
  const allJSONOrYAMLFiles = await listAllFilesIn(
    directory,
    (filePath) =>
      (filePath.endsWith('.yml') || filePath.endsWith('.json')) &&
      !/unified-test-format\/(tests\/)?invalid/.test(filePath) &&
      !/unified-test-format\/(tests\/)?valid-fail/.test(filePath)
  );

  const filesWithContent = await Promise.all(
    allJSONOrYAMLFiles.map(async (filePath) => {
      const sourceType = filePath.endsWith('.json') ? ('json' as const) : ('yml' as const);
      const content = await (sourceType === 'json' ? loadJSON(filePath) : loadYAML(filePath)).catch(() => ({
        schemaVersion: null,
      }));
      return { filePath, sourceType, content };
    })
  );

  const unifiedTests = filesWithContent
    .filter((file) => typeof file.content.schemaVersion === 'string')
    .map(({ filePath, sourceType, content }) => new UnifiedTestSuite({ filePath, sourceType }, content));
  return unifiedTests;
}

for (const language of [languages.find((l) => l.language === 'javascript')]) {
  const unifiedSuites = await getUnifiedTests(path.join('_languages', language.repo));
  console.log('found', unifiedSuites.length, 'unified test files in', language.language);

  for (const driverUnifiedSuite of unifiedSuites) {
    console.log('driver:', driverUnifiedSuite.source.filePath);
    console.group();
    for (const driverUnifiedTest of driverUnifiedSuite.tests) {
      for (const specTest of registry) {
        const testFromRegistry = new UnifiedTestSuite(
          { filePath: specTest.filePath, sourceType: 'yml' },
          yaml.load(Buffer.from(specTest.content, 'base64').toString('utf8'))
        ).tests.find((test) => test.description === specTest.description);

        if (driverUnifiedTest.equals(testFromRegistry)) {
          log`${language.language} depends on ${specTest.ref} (${specTest.date}) ${specTest.description} at ${specTest.filePath}`;
          break;
        }
      }
    }

    console.groupEnd();
  }
}
