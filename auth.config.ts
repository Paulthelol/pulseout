import type { NextAuthConfig } from "next-auth";
import Spotify from "next-auth/providers/spotify"

//Responsible for enforcing middleware rules
export const authConfig = {
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
          return Response.redirect(new URL('/musicgrid', nextUrl));
        }
      } else if (!isLoggedIn) {
        return isLoggedIn;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;