import type { NextAuthConfig, Session } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { cache } from "react";
import { z } from "zod";
import { db } from "./db/client";
import { User } from "./db/schema";

const authOptions: NextAuthConfig = {
  session: {
    strategy: "jwt",
  },
  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    jwt: async ({ user, token }) => {
      if (user) {
        token.uid = user.id;
      }
      return token;
    },
  },
  providers: [
    Credentials({
      async authorize(input) {
        const credentials = z
          .object({
            name: z.string(),
          })
          .parse(input);

        const name = credentials.name?.toLocaleLowerCase()?.trim();
        const existedUser = await db.query.User.findFirst({
          where: (user, { eq }) => eq(user.name, name),
        });
        if (existedUser) return { name: existedUser.name, id: existedUser.id };

        // Create a new user in the database
        const [user] = await db.insert(User).values({ name: name }).returning();

        if (user) return { name: user.name, id: user.id };

        return null;
      },
      credentials: {
        name: { type: "text", placeholder: "John Doe", label: "Name" },
      },
    }),
  ],
};

export const {
  handlers,
  auth: uncachedAuth,
  signIn,
  signOut,
} = NextAuth(authOptions);

export const auth = cache(uncachedAuth);

export async function SignedIn(props: {
  children:
    | React.ReactNode
    | ((props: { user: Session["user"] }) => React.ReactNode);
}) {
  const sesh = await auth();
  return sesh?.user ? (
    <>
      {typeof props.children === "function"
        ? props.children({ user: sesh.user })
        : props.children}
    </>
  ) : null;
}

export async function SignedOut(props: { children: React.ReactNode }) {
  const sesh = await auth();
  return sesh?.user ? null : <>{props.children}</>;
}
