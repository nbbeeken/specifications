import { inspect } from "node:util";

import { allUnifiedTests } from "./util.mjs";

export async function schemaFixes() {
  const uts = await allUnifiedTests();
  for (const ut of uts) {
    if (ut.contents.schemaVersion === "1.0" && !ut.ut.success) {
      console.log(`${ut.filePath} failed 1.0 validation`);
      console.log(
        inspect(ut.ut.error.format(), {
          breakLength: Infinity,
          colors: true,
          compact: true,
          depth: Infinity,
        }),
      );
    }
  }
}
