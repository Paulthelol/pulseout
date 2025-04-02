import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextRequest, NextResponse } from "next/server";

//export default NextAuth(authConfig).auth;

export async function middleware(request: NextRequest) {
      return NextResponse.redirect(new URL('/login', request.url));
  }

//Matcher triggers middleware to run
export const config = {
    matcher: [
        '/musicgrid:path*',
    ]
}