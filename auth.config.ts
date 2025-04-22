import type { NextAuthConfig } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Spotify from "next-auth/providers/spotify"
import { db } from "./src/db/index";

//Responsible for enforcing middleware rules
export const authConfig = {
  adapter: DrizzleAdapter(db),
  providers: [Spotify],
  pages: {
    signIn: "/login",
    error: "/autherror",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnMusicGrid = nextUrl.pathname.startsWith('/musicgrid');
      const isOnLoginpage = nextUrl.pathname.startsWith('/login');

      if (isOnMusicGrid) {
        return isLoggedIn;
      } else if (isOnLoginpage) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/musicgrid/trending', nextUrl));
        }
      } else if (!isLoggedIn) {
        return isLoggedIn;
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      console.log("@@@ redirect", url, baseUrl);

      baseUrl = "https://localhost.maxhogan.dev:3000/";

      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
} satisfies NextAuthConfig;