import { z } from "zod";

const email = z.string().trim().toLowerCase().max(254).pipe(z.email("Invalid email"));

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  email,
  // bcrypt only uses the first 72 bytes
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(72),
});
