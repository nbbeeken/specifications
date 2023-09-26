#! /usr/bin/env node
import process from 'node:process';
import path from 'node:path';
import util from 'node:util';
import { loadYAML } from './utils.mjs';

let fileNames = new Map();
let suiteNames = new Map();
let testNames = new Map();

const registry = await loadYAML('./test_registry.yml');

for (const { fileName, tests } of registry) {
  for (const testName of tests) {
    testNames.set(testName, {
      count: (testNames.get(testName)?.count ?? 0) + 1,
      fileNames: [...(testNames.get(testName)?.fileNames ?? []), fileName],
    });
  }

  fileNames.set(path.basename(fileName), {
    count: (fileNames.get(path.basename(fileName))?.count ?? 0) + 1,
    fileNames: [...(fileNames.get(path.basename(fileName))?.fileNames ?? []), fileName],
  });

  const testFile = await loadYAML(fileName);

  suiteNames.set(testFile.description, {
    count: (suiteNames.get(testFile.description)?.count ?? 0) + 1,
    fileNames: [...(suiteNames.get(testFile.description)?.fileNames ?? []), fileName],
  });
}

// Locate duplicates
fileNames = new Map(Array.from(fileNames.entries()).filter(([, { count }]) => count > 1));
suiteNames = new Map(Array.from(suiteNames.entries()).filter(([, { count }]) => count > 1));
testNames = new Map(Array.from(testNames.entries()).filter(([, { count }]) => count > 1));

const inspectOptions = { colors: true, breakLength: 180, depth: Infinity, maxArrayLength: Infinity };
console.log('\nfileNames:', util.inspect(fileNames, inspectOptions));
console.log('\nsuiteNames:', util.inspect(suiteNames, inspectOptions));
console.log('\ntestNames:', util.inspect(testNames, inspectOptions));
console.log();

if (fileNames.size !== 0 || suiteNames.size !== 0 || testNames.size !== 0) {
  process.exitCode = 1;
}
