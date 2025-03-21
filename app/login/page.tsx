import LoginForm from "../ui/login-form"
export default function LoginPage() {

    return (
        <main className="flex flex-col items-center justify-center min-h-screen">
            <div className="w-full max-w-[400px] px-4">
                <div>
                <h1>Login Page</h1>
                </div>
                <LoginForm />
            </div>
            
        </main>

    )
}