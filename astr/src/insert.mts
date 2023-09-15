import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { BSON, MongoClient } from "mongodb";

import { ASTR_ROOT } from "./util.mjs";

const { MONGODB_URI = "mongodb://127.0.0.1:27017" } = process.env;

export async function insert() {
  const file = await fs.readFile(path.join(ASTR_ROOT, "astr_tests.json"), {
    encoding: "utf8",
  });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const contents = BSON.EJSON.parse(file, { relaxed: false });

  const client = new MongoClient(MONGODB_URI);

  await client
    .db("astr")
    .collection("tests")
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    .insertMany(contents.tests.map((test, _id) => ({ _id, ...test })));

  await client.close();
}
