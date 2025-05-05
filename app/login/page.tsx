// written by: Paul and Jordan
  // tested by: Paul, Andrew, Jordan, Others...
  'use client';

import LoginForm from "../ui/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <main
      className="flex flex-col items-center justify-center min-h-screen w-full"
      style={{
        background:
          "linear-gradient(135deg, #b429f9, #9c43f8, #855df7, #6d77f6, #5591f5, #3eabf4, #26c5f3)",
      }}
    >
      <div className="max-w-[400px] w-full">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
