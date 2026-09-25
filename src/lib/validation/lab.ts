import { z } from "zod";

const fileName = z.string().regex(/^[\w.-]{1,64}$/, "File names may use letters, digits, dot, dash and underscore");

export const execSchema = z.object({
  command: z.string().trim().min(1).max(500),
  // Files written in the lab's manifest editor, saved before the command runs
  files: z
    .record(fileName, z.string().max(20_000))
    .refine((files) => Object.keys(files).length <= 5, "At most 5 files per request")
    .optional(),
});
