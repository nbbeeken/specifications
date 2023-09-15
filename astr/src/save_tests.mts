import fs from "node:fs/promises";
import { basename, dirname } from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import zlib from "node:zlib";

import { Binary, BSON } from "bson";

import {
  exec,
  isUnifiedTestFormat,
  readEJSONFile,
  readEYMLFile,
  walk,
} from "./util.mjs";

async function compress(bytes: Uint8Array): Promise<Buffer> {
  return await promisify(zlib.deflate)(bytes, {});
}

export async function saveTests(
  testRoot: string,
  languagesRoot: string,
): Promise<void> {
  const testTitles: Record<string, string[] | undefined> = {};
  const testSuites: Record<string, string[] | undefined> = {};

  const tests = [];

  for await (const filePath of walk(testRoot, (filePath) => {
    if (!filePath.endsWith(".json")) return false;
    if (filePath.includes("tests/invalid")) return false;
    return true;
  })) {
    const contents = await readEJSONFile(filePath);
    if (isUnifiedTestFormat(contents)) {
      (testSuites[contents.description] ??= []).push(filePath);

      const test = {
        contents: new Binary(await compress(BSON.serialize(contents))),
        filePath: filePath.slice(filePath.indexOf("source")),
        lastModified: await getLastModified(filePath),
        references: await findReferences(filePath, languagesRoot),
        suiteTitle: contents.description,
        testTitles: contents.tests.map(({ description }) => {
          (testTitles[description] ??= []).push(filePath);
          return description;
        }),
      };
      tests.push(test);
    }
  }

  const metadata = {
    _id: "metadata",
    testCount: tests.reduce((acc, test) => {
      return acc + test.testTitles.length;
    }, 0),
    testFiles: tests.length,
  };

  await fs.writeFile(
    "astr_tests.json",
    BSON.EJSON.stringify({ ...metadata, tests }, undefined, 2, {
      relaxed: false,
    }),
    { encoding: "utf8" },
  );
}

async function getLastModified(
  filePath: string,
  directory: string = "",
): Promise<Date> {
  const command = `git -C "${directory}" log -1 --pretty="format:%cI" ${filePath}`;

  const { stdout } = await exec(command, {
    encoding: "utf8",
    env: { TZ: "Etc/UTC" },
  });
  return new Date(stdout);
}

async function findReferences(
  testFile: string,
  languagesRoot: string,
): Promise<
  {
    file: string;
    language: string;
    lastModified: Date;
    contents: string;
  }[]
> {
  const languageBaseDir = `${basename(languagesRoot)}/`;
  const references: {
    file: string;
    language: string;
    lastModified: Date;
    contents: any;
  }[] = [];

  const [name] = basename(testFile).split(".");

  const { stdout } = await exec(`find ${languagesRoot} -iname *${name}*`);
  const files = stdout
    .trim()
    .split("\n")
    .filter(
      (fileName) =>
        (fileName.endsWith("json") || fileName.endsWith("yml")) &&
        basename(fileName).split(".")[0] === name,
    );

  for (const filePath of files) {
    const languagesRootIdx = filePath.indexOf(languageBaseDir);
    const language = filePath.slice(
      languagesRootIdx + languageBaseDir.length,
      filePath.indexOf("/", languagesRootIdx + languageBaseDir.length),
    );

    const contents = filePath.endsWith("json")
      ? await readEJSONFile(filePath)
      : await readEYMLFile(filePath).catch((error) => {
          console.log(error);
          return {};
        });

    const fileFixed = filePath.slice(languagesRootIdx + languageBaseDir.length);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    references.push({
      // eslint-disable-next-line no-await-in-loop
      contents: new Binary(await compress(BSON.serialize(contents))),
      file: fileFixed,
      language,
      // eslint-disable-next-line no-await-in-loop
      lastModified: await getLastModified(filePath, dirname(filePath)),
    });
  }

  return references;
}
