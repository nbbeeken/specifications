/* eslint-disable id-length */
import { z } from "zod";

export const versionRegExp = /^[0-9]+(?:\.[0-9]+){1,2}$/u;

export const serverVersion = z.string().regex(versionRegExp).optional();

export const topology = z.enum(["single", "replicaset", "sharded"]);

const observableEvent = z.enum([
  "commandStartedEvent",
  "commandSucceededEvent",
  "commandFailedEvent",
]);

export const readConcernLevel = z.enum([
  "local",
  "majority",
  "linearizable",
  "available",
  "snapshot",
]);

export const readConcern = z.object({ level: readConcernLevel });

export const readPreferenceMode = z.enum([
  "primary",
  "primaryPreferred",
  "secondary",
  "secondaryPreferred",
  "nearest",
]);

export const readPreference = z.object({
  hedge: z.object({ enabled: z.boolean() }).optional(),
  maxStalenessSeconds: z.number().int().nonnegative().optional(),
  mode: z.array(readPreferenceMode),
  tags: z.array(z.record(z.string())).optional(),
});

export const writeConcern = z.object({
  journal: z.boolean().optional(),
  w: z.number().int().nonnegative().or(z.literal("majority")),
  wtimeoutMS: z.number().int().nonnegative().optional(),
});

export const runOnRequirement = z.object({
  maxServerVersion: serverVersion.optional(),
  minServerVersion: serverVersion.optional(),
  topologies: z.array(topology).optional(),
});

export const dataset = z.array(
  z.object({
    collectionName: z.string(),
    databaseName: z.string(),
    documents: z.array(z.record(z.any())),
  }),
);

const clientEntity = z.object({
  client: z.object({
    id: z.string().nonempty(),
    ignoreCommandMonitoringEvents: z.array(z.string()).nonempty().optional(),
    observeEvents: z.array(observableEvent).optional(),
    uriOptions: z.record(z.any()).optional(),
    useMultipleMongoses: z.boolean().optional(),
  }),
});

const databaseEntity = z.object({
  database: z.object({
    client: z.string(),
    databaseName: z.string().nonempty(),
    databaseOptions: z
      .object({
        readConcern: readConcern.optional(),
        readPreference: readPreference.optional(),
        writeConcern: writeConcern.optional(),
      })
      .optional(),
    id: z.string().nonempty(),
  }),
});

const collectionEntity = z.object({
  collection: z.object({
    collectionName: z.string().nonempty(),
    collectionOptions: z
      .object({
        readConcern: readConcern.optional(),
        readPreference: readPreference.optional(),
        writeConcern: writeConcern.optional(),
      })
      .optional(),
    database: z.string(),
    id: z.string().nonempty(),
  }),
});

const sessionEntity = z.object({
  session: z.object({
    client: z.string().nonempty(),
    id: z.string().nonempty(),
    sessionOptions: z
      .object({
        causalConsistency: z.boolean().optional(),
        defaultTransactionOptions: z
          .object({
            readConcern: readConcern.optional(),
            readPreference: readPreference.optional(),
            writeConcern: writeConcern.optional(),
          })
          .optional(),
        snapshot: z.boolean().optional(),
      })
      .optional(),
  }),
});

const bucketEntity = z.object({
  bucket: z.object({
    bucketOptions: z
      .object({
        bucketName: z.string().optional(),
        chunkSizeBytes: z.number().int().gte(1).optional(),
        readPreference: readPreference.optional(),
      })
      .optional(),
    database: z.string().nonempty(),
    id: z.string().nonempty(),
  }),
});

export const entity = z.union([
  clientEntity,
  databaseEntity,
  collectionEntity,
  sessionEntity,
  bucketEntity,
]);

const operations = z.object({
  arguments: z.record(z.any()).optional(),
  expectError: z.record(z.any()),
  expectResult: z.record(z.any()),
  name: z.string().nonempty(),
  object: z.string().nonempty(),
  saveResultAsEntity: z.record(z.any()),
});

export const test = z.object({
  description: z.string().nonempty(),
  expectEvents: z.array(z.object({ client: z.string() })),
  operations: z.array(operations).nonempty(),
  outcome: dataset.optional(),
  runOnRequirement: z.array(runOnRequirement).optional(),
  skipReason: z.string().nonempty().optional(),
});
