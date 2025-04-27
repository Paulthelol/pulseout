'use client';

import LoginForm from "../ui/login-form";
import { Suspense } from "react";

export default function LoginPage() {
    return (
        <main className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-200">
            <div className="bg-gray-800 px-10 py-12 rounded-xl shadow-lg max-w-md w-full">
                <Suspense>
                    <LoginForm />
                </Suspense>
            </div>
        </main>
    );
}
