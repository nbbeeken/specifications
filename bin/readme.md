# Auto spec scripts

All scripts are written in TypeScript in ES Module format. In order to run them in Node.js a few extra flags are needed:

```sh
node --loader=ts-node/esm SCRIPT_PATH
# Example
node --loader=ts-node/esm ./bin/duplicate_tests.mts
```

- `--loader=ts-node/esm` Will strip type annotations before passing the JavaScript to Node.js.
- Additionally, `--no-warnings` will silence a warning about experimental ESM loader. It is safe to ignore.

All the scripts have been adding to the package.json file's `scripts` entry, so each can be launched with `npm run` as a shortcut.

## `test_registry`

```sh
npm run test_registry
```

- This seeks out all tests stored in the source directory.
- It filters out unified test format `valid-fail` and `invalid` tests
  - Not ideal that the only way to determine these "different" tests are from the directory they are placed in
- It finds yaml files with a schemaVersion property.
- Uses `git log --follow` to enumerate all the changes to a given test file
- collects tests from each commit in that file's history
- All files (including their history) are read in as test suite objects that have their list of tests.
- For each suite we flatten the list of tests into one registry yaml file
- An array of tests: `{filePath, ref, date, description, content}` where content is the base64 encoding of the file
  - The base64 encoding was to make a step in the next script easier but isn't necessary.

> [!NOTE]
> This script produces an array like this `{filePath, ref, date, description, content}` this is **per test**, it just includes the filePath to reference the source location. The precise versioning that the final approach would use is still up for refinement. In this example, each test is "versioned" by the fact that there is a unique entry for each unique test across all files across their git history in the registry. If one were to make a new test, or edit an existing one, it would result in a new entry in the registry. Super naively, drivers could have a list of array offsets in the registry. Much more reasonably, a lookup of `description+fileName+gitRef`, but we can come up with something even more abstracted from those details. Perhaps ObjectIds, encoding a timestamp, and encoding a sortable order to encode if a version succeeds another.

## `sh ./bin/get_all_languages.sh`

This clones all drivers to a `_languages` subdirectory. It relies on the github CLI `gh`. This is so the drivers are cloned associated with the local dev's preferred auth (ssh/http).

Enables `recurse-submodules` during cloning (for Php's dependence on C)

Future work will be to easily manage multiple PRs / forks of each driver with `gh`.

## `driver_version`

```sh
npm run driver_version
```

- This script uses the list of languages in `languages.yml`
- For each language the script seeks out **JSON and YAML** files with a `schemaVersion` and attempts a flexible filter for `invalid` and `valid-fail` tests.
  - The filter appears to work, looks like everyone used that directory name
- for every test defined in a driver's repo, the script searches the registry for an equal test. Equality is calculated:
  - suite descriptions are equal
  - test descriptions are equal
  - runOnRequirements from suite and test are deeply equal
  - createEntities are deeply equal
  - initialData is deeply equal
  - test object is deeply equal (operations, expectations, etc.)
- If an equal test is found the script will print (future work, output to file)
  - The name of the current test file from the driver
  - Each location of the equal test
  - Which git hash and date in the spec repo the test is equal to

- Take the example below, JS copies both JSON and YAML (even though the yaml is unused) we can see both `reauthenticate_with_retry.json` and `reauthenticate_with_retry.yml` line up with the same named file in `source/auth/tests/unified/` at a particular spec commit.

```txt
driver: _languages/node-mongodb-native/test/spec/auth/unified/reauthenticate_with_retry.json
   javascript depends on 4c0bc035 ( 2023-02-23T18:57:50.000Z ) Read command should reauthenticate when receive ReauthenticationRequired error code and retryReads=true at source/auth/tests/unified/reauthenticate_with_retry.yml
   javascript depends on 4c0bc035 ( 2023-02-23T18:57:50.000Z ) Write command should reauthenticate when receive ReauthenticationRequired error code and retryWrites=true at source/auth/tests/unified/reauthenticate_with_retry.yml
driver: _languages/node-mongodb-native/test/spec/auth/unified/reauthenticate_with_retry.yml
   javascript depends on 4c0bc035 ( 2023-02-23T18:57:50.000Z ) Read command should reauthenticate when receive ReauthenticationRequired error code and retryReads=true at source/auth/tests/unified/reauthenticate_with_retry.yml
   javascript depends on 4c0bc035 ( 2023-02-23T18:57:50.000Z ) Write command should reauthenticate when receive ReauthenticationRequired error code and retryWrites=true at source/auth/tests/unified/reauthenticate_with_retry.yml
```

## `duplicate_tests`


```sh
npm run duplicate_tests
```

This is a quick script that identifies duplicate:

- file names
- suite names
- test names

After more PoC-ing the versioning system won't require us to have unique names for each of these, but it could still prove useful in a future endeavor.
