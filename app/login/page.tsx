import LoginForm from "../ui/login-form"
import { Suspense } from "react"
export default function LoginPage() {

    return (
        <main className="flex flex-col items-center justify-center min-h-screen"
            style={{
                background: 'linear-gradient(135deg, #b429f9, #9c43f8, #855df7, #6d77f6, #5591f5, #3eabf4, #26c5f3)',
            }}>
            <div className="w-full max-w-[400px] px-4">
                <div>
                    <h1 className="text-center pb-2 text-lg">Welcome to PulseOut!</h1>
                </div>
                <Suspense>
                    <LoginForm />
                </Suspense>

            </div>

        </main>

    )
}