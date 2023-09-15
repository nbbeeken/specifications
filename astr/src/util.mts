import childProcess from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { promisify } from "node:util";

import { EJSON } from "bson";
import { load } from "js-yaml";

import { schema } from "./schemas/schema-1.0.mjs";

export async function* walk(
  root: string,
  filter: (filePath: string) => boolean = () => true,
): AsyncGenerator<string> {
  const directoryContents = await Promise.all(
    (await fs.readdir(root))
      .map((filepath) => path.join(root, filepath))
      .map(async (fullPath) => {
        return { fullPath, stat: await fs.lstat(fullPath) };
      }),
  );

  for (const { fullPath, stat } of directoryContents) {
    if (stat.isDirectory()) {
      yield* walk(fullPath, filter);
    } else if (stat.isFile()) {
      if (filter(fullPath)) {
        yield fullPath;
      }
    }
  }
}

export const ASTR_ROOT = url.fileURLToPath(new URL("..", import.meta.url));
export const SPEC_ROOT = url.fileURLToPath(
  new URL("../../source", import.meta.url),
);

export const exec = promisify(childProcess.exec);

type UnifiedTest = {
  description: string;
};

type UnifiedTestSuite = {
  schemaVersion: string;
  description: string;
  tests: UnifiedTest[];
};

export function isUnifiedTestFormat(
  contents: Record<string, unknown>,
): contents is UnifiedTestSuite {
  return (
    Object.hasOwn(contents, "schemaVersion") && Array.isArray(contents.tests)
  );
}

export async function readEJSONFile(
  filePath: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  const contents = await fs.readFile(filePath, { encoding: "utf8" });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  try {
    return EJSON.parse(contents, { relaxed: true });
  } catch (error) {
    if (typeof error === "object" && error !== null) error.filePath = filePath;
    throw error;
  }
}

export async function readEYMLFile(
  filePath: string,
): Promise<Record<string, any>> {
  const contents = await fs.readFile(filePath, { encoding: "utf8" });

  try {
    const objectify = load(contents);
    const jsonContents = JSON.stringify(objectify);
    return EJSON.parse(jsonContents, { relaxed: true });
  } catch (error) {
    if (typeof error === "object" && error !== null) error.filePath = filePath;
    throw error;
  }
}

export async function allUnifiedTests() {
  const utf = [];
  for await (const filePath of walk(SPEC_ROOT)) {
    if (!filePath.endsWith(".json")) continue;
    if (filePath.includes("tests/invalid")) continue;
    const contents = await readEJSONFile(filePath);
    if (!isUnifiedTestFormat(contents)) continue;

    const shortPath = filePath.slice(filePath.indexOf("source/"));

    const ut = schema.safeParse({
      filePath: shortPath,
      ...contents,
    });
    utf.push({ contents, filePath: shortPath, ut });
  }
  return utf;
}
