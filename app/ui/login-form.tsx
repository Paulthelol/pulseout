'use client';
import Link from "next/link";
import { SpotifyLoginButton } from "./spotify-login-button";

export default function LoginForm() {

    return (
        <form className="space-y-2">
            <div className="py-4 bg-slate-300 px-4 rounded-lg">
                <div className="">
                    <label>
                        Email
                    </label>
                    <div className="relative">
                        <input
                            className="w-full rounded-md border border-gray-200 pl-2 py-2"
                            placeholder="Enter your email address"
                        />
                    </div>
                </div>

                <div className="mt-2">
                    <label>
                        Password
                    </label>
                    <div className="relative">
                        <input
                            className="w-full rounded-md border border-gray-200 pl-2 py-2"
                            placeholder="Enter your password"
                        />
                    </div>

                </div>
                <button className="mt-4 rounded-md w-full px-2 py-2 text-white transition-colors]"
                    style={{
                        background: 'linear-gradient(135deg, #b429f9, #9c43f8, #855df7, #6d77f6, #5591f5, #3eabf4, #26c5f3)',
                    }}
                >
                    Login
                </button>
                <div>
                    <p className="text-center">or</p>
                </div>
                <div>
                    <SpotifyLoginButton spotifyAuthUrl={""} />
                </div>
                <div className="mt-4 flex justify-center">
                    <p>Don&apos;t have an account?</p> <Link href="/signup" className="ml-1 text-[#5591f5] underline">Sign up.</Link>
                </div>
            </div>
        </form>
    )
}