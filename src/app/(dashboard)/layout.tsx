'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  Home, 
  ClipboardList, 
  ShoppingBag,
  Receipt,
  Users, 
  Coins,
  Building,
  BarChart3,
  UserCheck,
  Settings,
  ShieldCheck,
  LogOut, 
  Menu, 
  X,
  User
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const navigationItems: SidebarItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Daily Daybook', href: '/daybook', icon: ClipboardList },
  { name: 'Vendor Ledger', href: '/vendors', icon: Users },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Users & Staff', href: '/users', icon: UserCheck },
  { name: 'HQ Approvals', href: '/hq', icon: ShieldCheck },
  { name: 'Settings', href: '/settings', icon: Settings },
];

function NavigationList({ pathname, onClick }: { pathname: string; onClick: () => void }) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab');

  return (
    <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
      {navigationItems.map((item) => {
        const urlPath = item.href.split('?')[0];
        const urlTab = item.href.includes('?') ? item.href.split('?')[1].split('=')[1] : null;

        const isActive = urlTab
          ? pathname === urlPath && activeTab === urlTab
          : pathname === urlPath && !activeTab;

        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 border-l-4 ${
              isActive 
                ? 'bg-[#0b522c] text-white shadow-sm border-[#ffd600]' 
                : 'text-slate-400 border-transparent hover:bg-slate-800/60 hover:text-white'
            }`}
            onClick={onClick}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || 'user@mouzyerp.com');
      }
    }
    fetchUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-[#0f172a] transition-transform duration-300 lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800 bg-slate-950/25">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#ffd600] text-[#0b522c] shadow-md border border-[#ffd600]/10">
              <svg className="h-6 w-6" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Banana Smile Curve */}
                <path d="M15,40 Q50,85 85,40 Q50,65 15,40 Z" fill="currentColor" />
                {/* Spoon Handle */}
                <path d="M48,15 L52,15 L52,50 L48,50 Z" fill="currentColor" stroke="currentColor" strokeWidth="1" />
                {/* Spoon Top */}
                <ellipse cx="50" cy="15" rx="5" ry="3" fill="currentColor" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-[#ffd600] uppercase leading-none">
                MOUZY
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-1">
                Banana Avil Milk
              </span>
            </div>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <Suspense fallback={<div className="flex-1 px-4 py-6 animate-pulse text-xs text-slate-400">Loading menus...</div>}>
          <NavigationList pathname={pathname} onClick={() => setSidebarOpen(false)} />
        </Suspense>

        {/* User Footer Profile */}
        <div className="border-t border-slate-800 p-4 bg-slate-950/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300">
              <User className="h-4 w-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">
                Branch Manager
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {userEmail}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-900"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Branch Bangalore Indiranagar (BLR01)
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Daybook Sync Active
            </span>
          </div>
        </header>

        {/* Nested Page Grid */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
