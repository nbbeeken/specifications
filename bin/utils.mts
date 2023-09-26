import path from 'node:path';
import util from 'node:util';
import child_process from 'node:child_process';
import fs from 'node:fs/promises';
import yaml from 'js-yaml';

export const exec = util.promisify(child_process.exec);

export async function loadYAML<T = any>(filePath: string): Promise<T> {
  try {
    return yaml.load(await fs.readFile(filePath, { encoding: 'utf8' })) as T;
  } catch (cause) {
    throw new (class YAMLFileParseError extends Error {
      filePath = filePath;
    })('Unable to read yaml file', { cause });
  }
}

export async function loadJSON(filePath: string) {
  try {
    return JSON.parse(await fs.readFile(filePath, { encoding: 'utf8' }));
  } catch (cause) {
    throw new (class JSONFileParseError extends Error {
      filePath = filePath;
    })('Unable to read json file', { cause });
  }
}

export async function* walk(
  directory: string,
  filter: (fullPath: string) => boolean = () => true
): AsyncGenerator<string> {
  for await (const dirent of await fs.opendir(directory)) {
    const fullPath = path.join(directory, dirent.name);
    if (dirent.isDirectory()) yield* walk(fullPath, filter);
    if (!filter(fullPath)) continue;
    else if (dirent.isFile()) yield fullPath;
  }
}

export async function listAllFilesIn(
  directory: string,
  filter: (fullPath: string) => boolean = () => true
): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of walk(directory, filter)) files.push(entry);
  files.sort(alphabetically);
  return files;
}

export function alphabetically(a: unknown, b: unknown): number {
  return `${a}`.localeCompare(`${b}`, 'en-US', { usage: 'sort', numeric: true, ignorePunctuation: false });
}

export function sum(items: Iterable<unknown>, how = (item: unknown) => item) {
  return Array.from(items).reduce((acc: number, item) => (acc += Number(how(item))), 0);
}

export async function readFileAtGitRef(
  filePath: string,
  ref: string,
  options: child_process.ExecOptions & { encoding: BufferEncoding }
): Promise<string>;
export async function readFileAtGitRef(
  filePath: string,
  ref: string,
  options: child_process.ExecOptions & { encoding: 'buffer' }
): Promise<Buffer>;
export async function readFileAtGitRef(
  filePath: string,
  ref: string,
  options: child_process.ExecOptions & { encoding?: BufferEncoding | 'buffer' }
): Promise<string | Buffer>;
export async function readFileAtGitRef(
  filePath: string,
  ref: string,
  options: child_process.ExecOptions & { encoding?: BufferEncoding | 'buffer' } = { encoding: 'utf8' }
): Promise<string | Buffer> {
  const { stdout } = await exec(`git show ${ref}:${filePath}`, options);
  return stdout;
}

export function log(strings: TemplateStringsArray, ...items: any[]) {
  const printable = [strings[0].trim()];
  for (const [i, item] of items.entries()) {
    if (typeof item === 'string') {
      printable.push(`\x1B[32m${item}\x1B[0m`);
    } else {
      printable.push(item);
    }
    printable.push(strings[i + 1].trim());
  }
  console.log(...printable);
}
