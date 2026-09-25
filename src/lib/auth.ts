import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            password: true,
            streak: true,
            longestStreak: true,
            lastActiveAt: true,
          },
        });

        // Same message for unknown email and wrong password to avoid account enumeration
        const isValid =
          user !== null &&
          (await bcrypt.compare(credentials.password, user.password));

        if (user === null || isValid === false) {
          throw new Error("Invalid email or password");
        }

        // Update streak
        const now = new Date();
        const lastActive = new Date(user.lastActiveAt);
        const diffHours =
          (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

        let newStreak = user.streak;
        if (diffHours >= 24 && diffHours < 48) {
          newStreak = user.streak + 1;
        } else if (diffHours >= 48) {
          newStreak = 1;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastActiveAt: now,
            streak: newStreak,
            longestStreak: Math.max(newStreak, user.longestStreak),
          },
          select: { id: true },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
