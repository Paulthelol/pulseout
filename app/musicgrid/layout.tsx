import SideBar from "../ui/side-bar";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <div>
                <SideBar />
            </div>
            <div>{children}</div>
        </div>

    );
}