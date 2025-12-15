// Created using template and modified by Paul
  // tested by: Paul, Andrew, Jordan, Others...

import type { NextAuthConfig } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Spotify from "next-auth/providers/spotify";
import Google from "next-auth/providers/google";
import { db } from "./src/db/index"; // Ensure this path is correct

export const authConfig = {
  adapter: DrizzleAdapter(db),
  providers: [Spotify, Google],
  pages: {
    signIn: "/login",
    error: "/autherror",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },

    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnMusicGrid = nextUrl.pathname.startsWith('/musicgrid');
      const isOnLoginPage = nextUrl.pathname.startsWith('/login');

      if (isOnMusicGrid) {
        if (!isLoggedIn) return false;
      } else if (isOnLoginPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/musicgrid/trending', nextUrl));
        }
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
