import { z } from "zod";

export const progressSchema = z.object({
  status: z.enum(["in_progress", "completed"]),
});
