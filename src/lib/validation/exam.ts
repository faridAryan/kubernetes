import { z } from "zod";
import { answerValueSchema } from "./quiz";

export const startExamSchema = z.object({
  certificationSlug: z.string().min(1).max(100),
});

export const submitExamSchema = z.object({
  answers: z.record(z.string().max(50), answerValueSchema),
});
