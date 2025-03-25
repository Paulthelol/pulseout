import Link from "next/link"
export default function WelcomePage() {

    return (
        <main className="flex items-center justify-center">
            <div>
                <div>
                    <p>Welcome Page</p>
                </div>
                <Link
                    href="/login"
                    className="mt-4 rounded-md bg-green-600 px-4 py-2 text-sm text-white transition-colors hover:bg-green-500"
                >
                    Login
                </Link>
            </div>

        </main>

    )
}