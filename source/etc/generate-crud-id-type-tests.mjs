import path from 'node:path';
import fs from 'node:fs/promises';
import yaml from 'js-yaml';

const operations = {
    insertOne: (_id)=> {
        return {
            name: 'insertOne',
            object: 'collection',
            arguments: { document: { _id } }
        }
    },
    insertMany: (_id)=> {
        return {
            name: 'insertMany',
            object: 'collection',
            arguments: { documents: [{ _id }] }
        }
    },
    updateOne: (_id)=> {
        return {
            name: 'updateOne',
            object: 'collection',
            arguments: { filter: { _id }, update: { $unset: { a: '' } }, upsert: true }
        }
    },
    updateMany: (_id) => {
        return {
            name: 'updateMany',
            object: 'collection',
            arguments: { filter: { _id }, update: { $unset: { a: '' } }, upsert: true }
        }
    },
    replaceOne: (_id) => {
        return {
            name: 'replaceOne',
            object: 'collection',
            arguments: { filter: {}, replacement: { _id }, upsert: true }
        }
    },
    bulkWrite: (_id) => {
        return {
            name: 'bulkWrite',
            object: 'collection',
            arguments: { requests: [{ insertOne: { document: { _id } } }] }
        }
    },
    clientBulkWrite: (_id) => {
        return {
            name: 'clientBulkWrite',
            object: 'client',
            arguments: { models: [{ namespace: 'crud_id.type_tests', insertOne: { document: { _id } } }] }
        }
    },
};

const idTypes = {
    // double: { $numberDouble: 'NaN' },
    // string: '',
    // object: {},
    // binData: { $binary: { base64: '', subType: '00' } },
    // undefined: { $undefined: true },
    // objectId: { $oid: '507f1f77bcf86cd799439011' },
    // bool: false,
    // date: { $date: { $numberLong: '0' } },
    null: null,
    // dbPointer: { $dbPointer: { $ref: '', $id: { $oid: '507f1f77bcf86cd799439011' } } },
    // javascript: { $javascript: '' },
    // javascriptWithScope: { $javascriptWithScope: { code: '', scope: { } } },
    // symbol: { $symbol: 'hello' },
    // int: { $numberInt: '0' },
    // timestamp: { $timestamp: { t: 0, i: 0 } },
    // long: { $numberLong: '0' },
    // decimal: { $numberDecimal: '0' },
    // minKey: { $minKey: 1 },
    // maxKey: { $maxKey: 1 },
};

const illegalIdTypes = [
    { $regex: { pattern: 'abc', options: 'i' } },
    [],
];

const unifiedTestSuite = () => ({
    description: 'CRUD ID Type Tests',
    schemaVersion: '1.0',
    createEntities: [
        { client: { id: 'client', observeEvents: ["commandStartedEvent"] } },
        { database: { id: 'database', client: 'client', databaseName: 'crud_id' } },
        { collection: { id: 'collection', client: 'client', database: 'database',  collectionName: 'type_tests' } },
    ],
    tests: Object.entries(idTypes).flatMap(([idName, idValue]) => Object.entries(operations).flatMap(([operationName, operation]) => ({
        description: `inserting _id with type ${idName} via ${operationName}`,
        operations: [{ name: 'dropCollection', object: 'database', arguments: { collection: 'type_tests' } }, operation(idValue)],
        outcome: [{  databaseName: 'crud_id',  collectionName: 'type_tests', documents: [{ _id: idValue }] }] // { _id: { $$type: idName } } - we need to change unified runners to use their matching code on outcome
    })))
})

const sourceDirectory = path.resolve(import.meta.dirname, '..');
await fs.writeFile(
    path.join(sourceDirectory, 'crud', 'tests', 'unified', 'create-id-types.yml'),
    yaml.dump(unifiedTestSuite(), { lineWidth: 120, noRefs: true, flowLevel: 4, condenseFlow: false }),
    'utf8'
)
