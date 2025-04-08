'use client';

import { usePathname } from 'next/navigation';
import SideBar from './side-bar';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const rawPathname = usePathname();
  const pathname = rawPathname.split('?')[0].replace(/\/$/, '') || '/';

  const hideSidebarOn = ['/', '/login'];
  const shouldShowSidebar = !hideSidebarOn.includes(pathname);

  return (
    <div className="flex min-h-screen">
      {shouldShowSidebar && <SideBar />}
      <main className={`${shouldShowSidebar ? 'ml-[220px] p-6' : 'w-full'} flex-1`}>
        {children}
      </main>
    </div>
  );
}
