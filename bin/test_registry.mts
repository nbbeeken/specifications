#! /usr/bin/env node
import fs from 'node:fs/promises';
import { listAllFilesIn, exec, alphabetically, sum, loadYAML, readFileAtGitRef } from './utils.mjs';
import yaml from 'js-yaml';

/** @returns {Promise<{ content: any; file: string; changes: { ref: string }[] }[]>} */
async function getUnifiedFormatFiles() {
  const allYAMLFiles = await listAllFilesIn(
    'source',
    (fullPath) =>
      fullPath.endsWith('.yml') &&
      !fullPath.includes('unified-test-format/tests/invalid') &&
      !fullPath.includes('unified-test-format/tests/valid-fail')
  );

  const allYAMLFilesContent = await Promise.all(
    allYAMLFiles.map(async (filePath) => ({
      filePath,
      content: await loadYAML(filePath),
    }))
  );

  const unifiedFormatYAMLFiles = allYAMLFilesContent.filter(({ content }) => typeof content.schemaVersion === 'string');

  return (
    await Promise.all(
      unifiedFormatYAMLFiles.map(async (file) => {
        const changes = (await exec(`git log --follow --pretty="%h %cI" ${file.filePath}`, { encoding: 'utf8' })).stdout
          .trim()
          .split('\n')
          .map((line) => {
            const [hash, date] = line.split(' ', 2);
            return { ref: hash, date: new Date(date) };
          });
        return {
          ...file,
          changes: changes,
        };
      })
    )
  ).sort((a, b) => alphabetically(a.filePath, b.filePath));
}

async function enumerateTests(files) {
  const tests = files.flatMap((file) =>
    file.content.tests.flatMap((test) =>
      file.changes.flatMap((change) => ({
        filePath: file.filePath,
        ref: change.ref,
        date: change.date,
        description: test.description,
      }))
    )
  );

  const flatTests = [];
  for (const test of tests) {
    try {
      const content = await readFileAtGitRef(test.filePath, test.ref, { encoding: 'buffer' });
      const structure = yaml.load(content.toString('utf8'));
      const matchingTest = structure.tests.find((testFromThePast) => testFromThePast.description === test.description);
      if (matchingTest == null) throw new Error(`Did not find matching test ${test.description} at ${test.ref}`);
      flatTests.push({ ...test, content: content.toString('base64') });
    } catch {}
  }

  flatTests.sort((a, b) => a.date - b.date);

  return flatTests;
}

const files = await getUnifiedFormatFiles();
const tests = await enumerateTests(files);

console.table({
  fileCount: files.length,
  testCount: sum(files, ({ content: { tests } }) => tests.length),
  testVersionCount: tests.length,
});

await fs.writeFile(
  './test_registry.yml',
  yaml.dump(tests, {
    lineWidth: Infinity,
    forceQuotes: true,
    quotingType: '"',
    noArrayIndent: true,
  }),
  { encoding: 'utf8' }
);
