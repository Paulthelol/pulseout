'use client';

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

                <div>
                    <label>
                        Password
                    </label>
                    <div className="relative">
                        <input
                            className="w-full rounded-md border border-gray-500 pl-2 py-2"
                            placeholder="Enter your password"
                        />
                    </div>

                </div>
                <button className="mt-2 rounded-md bg-[#5591f5] w-full px-10 py-2 text-white transition-colors hover:bg-[#3eabf4]">
                    Login
                </button>
            </div>

        </form>
    )
}