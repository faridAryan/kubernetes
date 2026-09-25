import { z } from "zod";

export const answerValueSchema = z.union([
  z.string().max(500),
  z.array(z.string().max(500)).max(20),
]);

export const answerSchema = z.object({ answer: answerValueSchema });
