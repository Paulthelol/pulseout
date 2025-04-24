import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

//Matcher triggers middleware to run (middleware is implemented in authConfig for this project)
export const config = {
  runtime: "nodejs",
    matcher: [
      '/((?!api|_next/static|_next/image|Spotify_logo_without_text.svg|sitemap.xml|robots.txt|logo.png|Google__G__logo.svg).+)',
    ],
  };