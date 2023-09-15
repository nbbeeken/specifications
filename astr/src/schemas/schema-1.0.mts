import { z } from "zod";

import { dataset, entity, runOnRequirement, versionRegExp } from "./shared.mjs";

export const schema = z.object({
  createEntities: z.array(entity).min(1).optional(),
  description: z.string().min(3),
  filePath: z.string().min(1),
  initialData: dataset.optional(),
  runOnRequirements: z.array(runOnRequirement).min(1).optional(),
  schemaVersion: z.string().regex(versionRegExp),
});
