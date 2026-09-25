import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getClientIp, isRateLimited } from "./rate-limit";
import { loginSchema } from "./validation/auth";

const INVALID_LOGIN = "Invalid email or password";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const parsed = loginSchema.safeParse(credentials);
        if (parsed.success === false) throw new Error(INVALID_LOGIN);

        const { email, password } = parsed.data;
        const ip = getClientIp((name) => req.headers?.[name] as string | undefined);

        // Limit guesses per account and per address
        const [emailLimited, ipLimited] = await Promise.all([
          isRateLimited(`login:email:${email}`, 5, 900),
          isRateLimited(`login:ip:${ip}`, 20, 900),
        ]);
        if (emailLimited || ipLimited) {
          throw new Error("Too many login attempts. Try again in 15 minutes.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, image: true, password: true },
        });

        // Same message for unknown email and wrong password to avoid account enumeration
        const isValid = user !== null && (await bcrypt.compare(password, user.password));
        if (user === null || isValid === false) throw new Error(INVALID_LOGIN);

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
