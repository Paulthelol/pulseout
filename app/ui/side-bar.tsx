import { SignOut } from "@/lib/actions"

export default function SideBar() {

    return (
        <div>
            <form
            action={SignOut}>
                <button>
                    Sign Out
                </button>
            </form>
        </div>
    )
}