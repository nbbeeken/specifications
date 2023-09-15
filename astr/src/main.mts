import process from "node:process";
import util from "node:util";

const argv = process.argv.slice(2);

const args = util.parseArgs({
  allowPositionals: true,
  args: argv,
  options: {
    insert: { type: "boolean" },
    languages: { type: "string" },
    saveTests: { type: "string" },
    schemaFixes: { type: "boolean" },
  },
  tokens: true,
});

const positional = args.tokens.find(({ kind }) => kind === "positional");
const command = argv[positional?.index ?? 0];

switch (command) {
  case "info":
    await info(args);
    break;

  case "registry":
    console.log("registry");
    break;

  default:
    throw new Error(`Unknown command: ${command}`);
}

export async function info(args) {
  console.log("info", args);
}
