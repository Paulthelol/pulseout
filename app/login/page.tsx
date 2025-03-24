import LoginForm from "../ui/login-form"
export default function LoginPage() {

    return (
        <main className="flex flex-col items-center justify-center min-h-screen bg-[#2b2d42]">
            <div className="w-full max-w-[400px] px-4">
                <div>
                <h1 className="text-center pb-2 text-lg">PulseOut</h1>
                </div>
                <LoginForm />
            </div>
            
        </main>

    )
}