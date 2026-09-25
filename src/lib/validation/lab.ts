import { z } from "zod";

export const execSchema = z.object({
  command: z.string().trim().min(1).max(500),
});
