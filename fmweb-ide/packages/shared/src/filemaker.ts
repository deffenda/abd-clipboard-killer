import { z } from "zod";

export const LayoutParamsSchema = z.object({
  layout: z.string().min(1)
});

export const RecordParamsSchema = LayoutParamsSchema.extend({
  recordId: z.string().min(1)
});

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).default(20),
  offset: z.coerce.number().int().nonnegative().default(0)
});

export const CreateRecordBodySchema = z.object({
  data: z.record(z.string(), z.unknown()),
  portalData: z.record(z.string(), z.unknown()).optional()
});

export const UpdateRecordBodySchema = z.object({
  data: z.record(z.string(), z.unknown())
});

export const FindBodySchema = z.object({
  query: z.array(z.record(z.string(), z.unknown())).min(1),
  limit: z.number().int().positive().max(500).optional(),
  offset: z.number().int().nonnegative().optional(),
  sort: z.array(z.record(z.string(), z.unknown())).optional()
});

export const ScriptBodySchema = z.object({
  scriptName: z.string().min(1),
  parameter: z.string().optional()
});

export const LoginBodySchema = z.object({
  username: z.string().optional(),
  password: z.string().optional()
});

export const RuntimeLoginBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});
