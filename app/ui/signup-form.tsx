'use client';
import { SpotifyLoginButton } from "./spotify-login-button";
import Link from "next/link";

export default function SignupForm() {

    return (
        <form className="space-y-2">
            <div className="py-4 bg-slate-300 px-4 rounded-lg bg-opacity-90">
                <div className="">
                    <label>
                        Username
                    </label>
                    <div className="relative">
                        <input
                            className="w-full rounded-md border border-gray-200 pl-2 py-2"
                            placeholder="Enter a username"
                        />
                    </div>
                </div>
                <div className="mt-2">
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
                <div className="mt-2">
                    <label>
                        Confirm Password
                    </label>
                    <div className="relative">
                        <input
                            className="w-full rounded-md border border-gray-200 pl-2 py-2"
                            placeholder="Re-enter your password"
                        />
                    </div>
                </div>
                <button className="mt-4 rounded-md bg-[#5591f5] w-full px-2 py-2 text-white transition-colors hover:bg-[#3eabf4]">
                    Sign Up
                </button>
                <div>
                    <p className="text-center">or</p>
                </div>
                <div>
                    <SpotifyLoginButton spotifyAuthUrl={""} />
                </div>
                <div className="mt-4 flex justify-center">
                    <p>Already have an account?</p> <Link href="/login" className="ml-1 text-[#5591f5] underline">Login.</Link>
                </div>
            </div>
        </form>
    )
}