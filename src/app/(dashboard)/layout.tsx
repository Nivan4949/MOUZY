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
  Wallet,
  BarChart3,
  UserCheck,
  Settings,
  ShieldCheck,
  LogOut, 
  Menu, 
  X,
  User,
  RefreshCw
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

function NavigationList({ pathname, onClick, userRole }: { pathname: string; onClick: () => void; userRole: string | null }) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab');

  const visibleItems = userRole === 'outlet_manager'
    ? [
        { name: 'CASH', href: '/daybook?tab=cash', icon: Wallet },
        { name: 'BANK', href: '/daybook?tab=bank', icon: Building },
      ]
    : navigationItems;

  return (
    <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
      {visibleItems.map((item) => {
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
                ? 'bg-white/15 text-white shadow-sm border-[#ffd600]' 
                : 'text-emerald-100 border-transparent hover:bg-white/5 hover:text-white'
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
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || 'user@mouzyerp.com');
        const role = user.user_metadata?.app_role || 'super_admin';
        setUserRole(role);
        
        // Redirect outlet manager to daybook if on root dashboard
        if (role === 'outlet_manager' && pathname === '/') {
          router.push('/daybook?tab=sales');
        }
      }
    }
    fetchUser();
  }, [supabase, pathname, router]);

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
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-850 bg-[#0b522c] transition-transform duration-300 lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-[#073d20] bg-slate-950/15">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#ffd600] text-[#0b522c] shadow-md border border-[#ffd600]/10 shrink-0">
              <svg className="h-6 w-6" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Spoon Handle extending up */}
                <path d="M 48 12 L 52 12 L 52 45 L 48 45 Z" fill="currentColor" />
                {/* Spoon Bowl in the middle */}
                <ellipse cx="50" cy="42" rx="3.5" ry="6" fill="currentColor" />
                {/* Thick Banana crescent body with stems */}
                <path d="M 22,38 C 22,38 15,42 17,48 C 21,60 32,73 50,73 C 68,73 79,60 83,48 C 85,42 78,38 78,38 C 78,38 74,51 68,57 C 60,63 55,65 50,65 C 45,65 40,63 32,57 C 26,51 22,38 22,38 Z" fill="currentColor" />
                {/* Small stem details on banana ends */}
                <path d="M 22,38 C 22,38 23,35 20,36 C 17,37 17,45 17,45 Z" fill="currentColor" />
                <path d="M 78,38 C 78,38 77,35 80,36 C 83,37 83,45 83,45 Z" fill="currentColor" />
                {/* Floating Fruits (Circles representing fruits) */}
                <circle cx="35" cy="45" r="2.5" fill="currentColor" />
                <circle cx="42" cy="51" r="2" fill="currentColor" />
                <circle cx="38" cy="55" r="2" fill="currentColor" />
                <circle cx="65" cy="45" r="2.5" fill="currentColor" />
                <circle cx="58" cy="51" r="2" fill="currentColor" />
                <circle cx="62" cy="55" r="2" fill="currentColor" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-[#ffd600] uppercase leading-none drop-shadow-[0_1.5px_1px_rgba(7,61,32,0.8)]">
                MOUZY
              </span>
              <span className="text-[8px] font-black text-emerald-100 uppercase tracking-wider leading-none mt-1.5">
                BANANA AVIL MILK
              </span>
              <span className="text-[6px] font-extrabold text-[#ffd600]/80 uppercase tracking-widest leading-none mt-1">
                EST. 1985
              </span>
            </div>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-emerald-100 hover:bg-[#073d20] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <Suspense fallback={<div className="flex-1 px-4 py-6 animate-pulse text-xs text-slate-400">Loading menus...</div>}>
          <NavigationList pathname={pathname} onClick={() => setSidebarOpen(false)} userRole={userRole} />
        </Suspense>

        {/* User Footer Profile */}
        <div className="border-t border-[#073d20] p-4 bg-slate-950/15">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#073d20] text-slate-300">
              <User className="h-4 w-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">
                {userRole === 'outlet_manager' ? 'Outlet Manager' : 'Branch Manager'}
              </p>
              <p className="text-[10px] text-emerald-200 truncate">
                {userEmail}
              </p>
            </div>
          </div>
          {userRole === 'outlet_manager' && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all mock daybook data? This will reset all daily sales, purchases, and expenses.')) {
                  localStorage.removeItem('mouzy_mock_daybooks');
                  localStorage.removeItem('mouzy_mock_sales_transactions');
                  localStorage.removeItem('mouzy_mock_purchases');
                  localStorage.removeItem('mouzy_mock_expenses');
                  localStorage.removeItem('mouzy_mock_income');
                  localStorage.removeItem('mouzy_mock_vendor_ledger');
                  localStorage.removeItem('mouzy_mock_invoice_allocations');
                  alert('All daybook data has been cleared. Reloading page...');
                  window.location.reload();
                }
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-amber-350 hover:bg-amber-950/30 transition-colors mb-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              Reset Daybook Data
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-350 hover:bg-rose-950/30 transition-colors"
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
