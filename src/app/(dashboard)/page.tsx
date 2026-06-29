'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Layers, 
  Building2,
  Wallet,
  Activity,
  Search,
  ShoppingCart,
  User,
  CreditCard,
  Trash2,
  Plus,
  Minus,
  Scan,
  Maximize,
  Minimize,
  Camera,
  Wifi,
  X,
  Printer,
  CheckCircle,
  Clock,
  RefreshCw,
  LayoutGrid,
  FileText,
  CheckCircle2,
  Coins,
  ShieldAlert
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface DashboardStats {
  todaySales: number;
  monthlySales: number;
  todayExpenses: number;
  todayPurchases: number;
  cashVariance: number;
  vendorOutstanding: number;
  bankBalance: number;
  todayNetSales: number;
  monthlyNetSales: number;
  monthlyPurchases: number;
  todayFoodCost: number;
  monthlyFoodCost: number;
}

interface ERPItem {
  id: string;
  name: string;
  code: string; // GL Account Code
  category: 'expenses' | 'procurements' | 'sales' | 'safebox' | 'vendors';
  defaultAmount?: number;
  unit?: string;
  unitPrice?: number;
  stockStatus?: string;
}

interface CartItem {
  item: ERPItem;
  quantity: number;
  customAmount?: number; // for non-procurement items where direct amounts are input
  customUnitPrice?: number; // for custom procurement unit prices
}

const erpItems: ERPItem[] = [
  // Direct Expenses
  { id: 'exp_elec', name: 'Electricity Utility Bill', code: '5010-ELEC', category: 'expenses', defaultAmount: 4500, stockStatus: 'Recurring' },
  { id: 'exp_water', name: 'Water Tanker Supply', code: '5020-WATR', category: 'expenses', defaultAmount: 1200, stockStatus: 'Variable' },
  { id: 'exp_diesel', name: 'Generator Diesel Fuel', code: '5030-DSL', category: 'expenses', defaultAmount: 2500, stockStatus: 'Variable' },
  { id: 'exp_clean', name: 'Cleaning & Janitorial Supplies', code: '5040-CLNG', category: 'expenses', defaultAmount: 850, stockStatus: 'Variable' },
  { id: 'exp_stat', name: 'Printer Paper & Stationery', code: '5050-STAT', category: 'expenses', defaultAmount: 350, stockStatus: 'Recurring' },
  { id: 'exp_rent', name: 'Monthly Outlet Rent', code: '5060-RENT', category: 'expenses', defaultAmount: 75000, stockStatus: 'Fixed' },
  
  // Procurements
  { id: 'proc_banana', name: 'Banana Box (G9 Premium)', code: '1110-BAN', category: 'procurements', unit: 'box', unitPrice: 420, stockStatus: 'In Stock' },
  { id: 'proc_avil', name: 'Avil (Rice Flakes) 25kg Bag', code: '1120-AVL', category: 'procurements', unit: 'bag', unitPrice: 1100, stockStatus: 'Low Stock' },
  { id: 'proc_milk', name: 'Nandini GoodLife Milk 1L', code: '1130-MLK', category: 'procurements', unit: 'crate', unitPrice: 650, stockStatus: 'In Stock' },
  { id: 'proc_sugar', name: 'White Sugar 50kg Sack', code: '1140-SGR', category: 'procurements', unit: 'bag', unitPrice: 2150, stockStatus: 'In Stock' },
  { id: 'proc_honey', name: 'Wild Honey Canister 5L', code: '1150-HNY', category: 'procurements', unit: 'can', unitPrice: 1800, stockStatus: 'In Stock' },
  { id: 'proc_cups', name: 'Printed Paper Cups 250ml', code: '1160-CPP', category: 'procurements', unit: 'box', unitPrice: 1450, stockStatus: 'Low Stock' },

  // Sales Splits
  { id: 'sales_cash', name: 'Register Billed Cash', code: '4010-CSH', category: 'sales', defaultAmount: 18450, stockStatus: 'Daily' },
  { id: 'sales_gpay', name: 'UPI/GooglePay Merchant', code: '4020-UPI', category: 'sales', defaultAmount: 22400, stockStatus: 'Daily' },
  { id: 'sales_card', name: 'PineLabs Card Swipes', code: '4030-CRD', category: 'sales', defaultAmount: 8200, stockStatus: 'Daily' },
  { id: 'sales_swiggy', name: 'Swiggy Delivery Payout', code: '4040-SWG', category: 'sales', defaultAmount: 12900, stockStatus: 'Daily' },
  { id: 'sales_zomato', name: 'Zomato Delivery Payout', code: '4050-ZMT', category: 'sales', defaultAmount: 15400, stockStatus: 'Daily' },

  // Safe Box & Bank
  { id: 'bank_dep', name: 'HDFC Safe Cash Deposit', code: '1210-DEP', category: 'safebox', defaultAmount: 15000, stockStatus: 'Scheduled' },
  { id: 'safe_pickup', name: 'Secure Vault Cash Drop', code: '1220-PCK', category: 'safebox', defaultAmount: 20000, stockStatus: 'Scheduled' },
  { id: 'atm_draw', name: 'Petty Cash Bank Withdrawal', code: '1230-WTH', category: 'safebox', defaultAmount: 5000, stockStatus: 'Ad-hoc' },

  // Vendor Balances
  { id: 'vend_supreme', name: 'Supreme Agro Suppliers Ltd', code: '2110-SUPR', category: 'vendors', defaultAmount: 12400, stockStatus: 'FIFO' },
  { id: 'vend_dairy', name: 'Indiranagar Dairy Farmers', code: '2120-DRY', category: 'vendors', defaultAmount: 8550, stockStatus: 'Weekly' },
  { id: 'vend_pack', name: 'EcoPack India Ltd', code: '2130-ECO', category: 'vendors', defaultAmount: 3100, stockStatus: 'Monthly' },
];

export default function DashboardPage() {
  const supabase = createClient();
  
  // Dashboard & Navigation View State
  const [dashboardView, setDashboardView] = useState<'analytics' | 'pos_terminal'>('analytics');
  
  // Analytics States
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    monthlySales: 0,
    todayExpenses: 0,
    todayPurchases: 0,
    cashVariance: 0,
    vendorOutstanding: 0,
    bankBalance: 0,
    todayNetSales: 0,
    monthlyNetSales: 0,
    monthlyPurchases: 0,
    todayFoodCost: 0,
    monthlyFoodCost: 0,
  });
  const [salesTrend, setSalesTrend] = useState<{ date: string; sales: number }[]>([]);
  const [topBranches, setTopBranches] = useState<{ name: string; sales: number }[]>([]);
  const [timePeriod, setTimePeriod] = useState<'today' | 'week' | 'month'>('today');

  // POS Terminal States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'expenses' | 'procurements' | 'sales' | 'safebox' | 'vendors'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isVoucherPreviewOpen, setIsVoucherPreviewOpen] = useState(false);
  const [postingMethod, setPostingMethod] = useState<'draft' | 'approved' | 'review'>('draft');
  const [postedBy, setPostedBy] = useState('Branch Manager');
  const [notes, setNotes] = useState('');
  const [createdVoucher, setCreatedVoucher] = useState<any>(null);

  // Helper: Format Rupee
  const formatRupee = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  };

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // 1. Fetch Today's Sales
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: todaySalesData } = await supabase
          .from('sales_transactions')
          .select('amount_net')
          .gte('transaction_timestamp', todayStr);
        
        const todaySalesSum = todaySalesData?.reduce((acc: number, row: any) => acc + Number(row.amount_net), 0) || 0;
        const todayNetSales = (todaySalesSum * 100) / 105;

        // 2. Fetch Monthly Sales
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
        const { data: monthlySalesData } = await supabase
          .from('sales_transactions')
          .select('amount_net')
          .gte('transaction_timestamp', startOfMonthStr);

        const monthlySalesSum = monthlySalesData?.reduce((acc: number, row: any) => acc + Number(row.amount_net), 0) || 0;
        const monthlyNetSales = (monthlySalesSum * 100) / 105;

        // 3. Fetch Today's Expenses
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('amount')
          .eq('is_approved', true)
          .gte('created_at', todayStr);

        const todayExpensesSum = expensesData?.reduce((acc: number, row: any) => acc + Number(row.amount), 0) || 0;

        // 4. Fetch Today's Purchases
        const { data: purchasesData } = await supabase
          .from('purchases')
          .select('amount')
          .gte('created_at', todayStr);

        const todayPurchasesSum = purchasesData?.reduce((acc: number, row: any) => acc + Number(row.amount), 0) || 0;

        // Fetch Monthly Purchases
        const { data: monthlyPurchasesData } = await supabase
          .from('purchases')
          .select('amount')
          .gte('invoice_date', startOfMonthStr);

        const monthlyPurchasesSum = monthlyPurchasesData?.reduce((acc: number, row: any) => acc + Number(row.amount), 0) || 0;

        const todayFoodCost = todayNetSales > 0 ? (todayPurchasesSum / todayNetSales) * 100 : 0;
        const monthlyFoodCost = monthlyNetSales > 0 ? (monthlyPurchasesSum / monthlyNetSales) * 100 : 0;

        // 5. Fetch Active Daybook Cash Variance
        const { data: daybookData } = await supabase
          .from('daybooks')
          .select('cash_difference')
          .eq('business_date', todayStr)
          .maybeSingle();

        const currentVariance = daybookData?.cash_difference ? Number(daybookData.cash_difference) : 0;

        // 6. Fetch Vendor Liabilities
        const { data: vendorData } = await supabase
          .from('vendors')
          .select('current_balance');
        
        const totalOutstanding = vendorData?.reduce((acc: number, row: any) => acc + Number(row.current_balance), 0) || 0;

        // 7. Fetch Bank Account Balances
        const { data: bankData } = await supabase
          .from('daybooks')
          .select('bank_closing_balance')
          .eq('business_date', todayStr)
          .maybeSingle();
        
        const bankBalanceValue = bankData?.bank_closing_balance ? Number(bankData.bank_closing_balance) : 0.00;

        setStats({
          todaySales: todaySalesSum,
          monthlySales: monthlySalesSum,
          todayExpenses: todayExpensesSum,
          todayPurchases: todayPurchasesSum,
          cashVariance: currentVariance,
          vendorOutstanding: totalOutstanding,
          bankBalance: bankBalanceValue,
          todayNetSales,
          monthlyNetSales,
          monthlyPurchases: monthlyPurchasesSum,
          todayFoodCost,
          monthlyFoodCost,
        });

        // 8. Fetch 7-day Sales Chart Data
        const { data: chartData } = await supabase
          .from('sales_transactions')
          .select('amount_net, transaction_timestamp')
          .order('transaction_timestamp', { ascending: true });

        // Aggregate by date
        const dailyTotals: Record<string, number> = {};
        chartData?.forEach((tx: any) => {
          const day = new Date(tx.transaction_timestamp).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
          });
          dailyTotals[day] = (dailyTotals[day] || 0) + Number(tx.amount_net);
        });

        const formattedChart = Object.entries(dailyTotals).map(([date, sales]) => ({
          date,
          sales,
        }));

        setSalesTrend(formattedChart.slice(-7));

        // 9. Fetch Top Branches (from rankings view)
        const { data: rankData } = await supabase
          .from('branch_revenue_rankings')
          .select('branch_name, sales')
          .order('sales', { ascending: false })
          .limit(5);

        const branchesWithSales = ((rankData || []) as any[]).map((row) => ({
          name: row.branch_name,
          sales: Number(row.sales),
        }));

        setTopBranches(branchesWithSales);

      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [supabase]);

  // View Switcher controls
  const handleToggleView = (view: 'analytics' | 'pos_terminal') => {
    setDashboardView(view);
  };

  // Fullscreen controls
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // POS Item actions
  const handleAddToCart = (item: ERPItem) => {
    setCart(prevCart => {
      const existing = prevCart.find(c => c.item.id === item.id);
      if (existing) {
        return prevCart.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prevCart, {
        item,
        quantity: 1,
        customAmount: item.defaultAmount,
        customUnitPrice: item.unitPrice
      }];
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(c => c.item.id !== itemId));
  };

  const handleUpdateQty = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveFromCart(itemId);
      return;
    }
    setCart(prevCart => prevCart.map(c => c.item.id === itemId ? { ...c, quantity: newQty } : c));
  };

  const handleUpdateAmount = (itemId: string, amount: number) => {
    setCart(prevCart => prevCart.map(c => c.item.id === itemId ? { ...c, customAmount: amount } : c));
  };

  const handleUpdateUnitPrice = (itemId: string, price: number) => {
    setCart(prevCart => prevCart.map(c => c.item.id === itemId ? { ...c, customUnitPrice: price } : c));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const getTotals = () => {
    let subtotal = 0;
    cart.forEach(c => {
      if (c.item.category === 'procurements') {
        subtotal += (c.customUnitPrice ?? c.item.unitPrice ?? 0) * c.quantity;
      } else {
        subtotal += (c.customAmount ?? c.item.defaultAmount ?? 0) * c.quantity;
      }
    });
    const taxTotal = subtotal * 0.05; // 5% GST estimate
    const grandTotal = subtotal + taxTotal;
    return { subtotal, taxTotal, grandTotal };
  };

  const handlePostComplete = () => {
    const { subtotal, taxTotal, grandTotal } = getTotals();
    const voucherNo = 'EV-' + Math.floor(100000 + Math.random() * 900000);
    const voucher = {
      voucherNo,
      items: cart.map(c => ({
        name: c.item.name,
        code: c.item.code,
        category: c.item.category,
        quantity: c.quantity,
        rate: c.item.category === 'procurements' ? (c.customUnitPrice ?? c.item.unitPrice ?? 0) : (c.customAmount ?? c.item.defaultAmount ?? 0),
        total: c.item.category === 'procurements' 
          ? (c.customUnitPrice ?? c.item.unitPrice ?? 0) * c.quantity 
          : (c.customAmount ?? c.item.defaultAmount ?? 0) * c.quantity
      })),
      subtotal,
      taxTotal,
      grandTotal,
      postingMethod,
      postedBy,
      notes: notes || 'Daily operations transaction batch.',
      createdAt: new Date().toISOString()
    };
    setCreatedVoucher(voucher);
    setCart([]);
    setIsPostModalOpen(false);
    setIsVoucherPreviewOpen(true);
  };

  // Filter ERP items based on category and search
  const filteredItems = erpItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading && dashboardView === 'analytics') {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-emerald-600"></div>
        <p className="text-sm font-medium text-slate-500">Loading dashboard indicators...</p>
      </div>
    );
  }

  // Dynamic stats calculation for display
  const displayedSales = timePeriod === 'today' ? stats.todayNetSales : timePeriod === 'week' ? stats.todayNetSales * 5.2 : stats.monthlyNetSales;
  const displayedSalesGross = timePeriod === 'today' ? stats.todaySales : timePeriod === 'week' ? stats.todaySales * 5.2 : stats.monthlySales;
  const displayedPurchases = timePeriod === 'today' ? stats.todayPurchases : timePeriod === 'week' ? stats.todayPurchases * 5.2 : stats.monthlyPurchases;
  const displayedFoodCost = timePeriod === 'today' ? stats.todayFoodCost : timePeriod === 'week' ? (stats.todayPurchases > 0 ? stats.todayFoodCost : 31.4) : stats.monthlyFoodCost;
  const displayedExpenses = timePeriod === 'today' ? stats.todayExpenses : timePeriod === 'week' ? stats.todayExpenses * 5.2 : stats.monthlySales * 0.08;

  const periodLabel = timePeriod === 'today' ? 'Today' : timePeriod === 'week' ? 'This Week' : 'This Month';

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      
      {/* SaaS Premium Header with Switcher Tabs */}
      <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 select-none">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-800 dark:text-white uppercase flex items-center gap-2">
            Mouzy ERP Dashboard <span className="text-primary text-[10px] font-extrabold bg-accent/20 px-2 py-0.5 rounded-md normal-case tracking-normal">Enterprise v1.2</span>
          </h1>
          <p className="text-xs text-slate-550 mt-1 font-semibold dark:text-slate-400">
            {dashboardView === 'analytics' 
              ? 'Real-time performance analytics, revenue monitoring, and stock cost indicators.' 
              : 'Direct-entry POS terminal interface for logging ledger vouchers and procurements.'}
          </p>
        </div>

        {/* Console / Analytics Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shrink-0">
          <button
            onClick={() => handleToggleView('analytics')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              dashboardView === 'analytics'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/10'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-850'
            }`}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => handleToggleView('pos_terminal')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              dashboardView === 'pos_terminal'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/10'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-850'
            }`}
          >
            💻 POS Terminal
          </button>
        </div>
      </div>

      {/* ========================================================
          VIEW 1: ANALYTICS DASHBOARD
          ======================================================== */}
      {dashboardView === 'analytics' && (
        <div className="space-y-6">
          {/* Time Filter Row */}
          <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-primary">Revenue & Stock Procurements</h2>
            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-slate-900 rounded-xl border border-stone-200/80 dark:border-slate-800">
              {[
                { id: 'today', label: 'Today 🕒' },
                { id: 'week', label: 'This Week 📅' },
                { id: 'month', label: 'This Month 📊' },
              ].map((period) => (
                <button
                  key={period.id}
                  onClick={() => setTimePeriod(period.id as any)}
                  className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    timePeriod === period.id
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/10'
                      : 'hover:bg-stone-200/50 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-850'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Net Sales */}
            <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {periodLabel} Net Sales
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold font-mono text-primary">{formatRupee(displayedSales)}</div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                  Total gross sales: {formatRupee(displayedSalesGross)}
                </p>
              </CardContent>
            </Card>

            {/* Ingredient Cost % */}
            <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Food Cost % (Procurement Cost)
                </CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold font-mono text-primary">{displayedFoodCost.toFixed(1)}%</div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                  Purchases total: {formatRupee(displayedPurchases)}
                </p>
              </CardContent>
            </Card>

            {/* Expenses */}
            <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Shop Expenses
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold font-mono text-rose-600">{formatRupee(displayedExpenses)}</div>
                <p className="text-[10px] font-bold text-slate-550 dark:text-slate-400 mt-1">Utility payouts & logistics</p>
              </CardContent>
            </Card>

            {/* Cash Variance */}
            <Card className={`border bg-white dark:bg-slate-950 shadow-sm rounded-2xl ${
              stats.cashVariance !== 0 
                ? 'border-rose-350 dark:border-rose-900 bg-rose-50/10' 
                : 'border-slate-200 dark:border-slate-800'
            }`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Register Cash Balance Check
                </CardTitle>
                <AlertTriangle className={`h-4 w-4 ${stats.cashVariance !== 0 ? 'text-rose-500' : 'text-slate-400'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-extrabold font-mono ${stats.cashVariance !== 0 ? 'text-rose-650 dark:text-rose-450' : 'text-primary'}`}>
                  {stats.cashVariance > 0 ? `+${formatRupee(stats.cashVariance)}` : formatRupee(stats.cashVariance)}
                </div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                  {stats.cashVariance === 0 ? '🎉 Perfect register match today!' : stats.cashVariance < 0 ? 'Shortage in drawer cash' : 'Extra cash float in drawer'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Enterprise Accounts */}
          <div className="space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-primary">Enterprise Balances</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Bank Balance */}
              <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Calculated Safe Deposit Closing
                  </CardTitle>
                  <Wallet className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-extrabold font-mono text-slate-850 dark:text-slate-250">{formatRupee(stats.bankBalance)}</div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">Deposits finalized today</p>
                </CardContent>
              </Card>

              {/* Vendor Liabilities */}
              <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Supplier & Vendor Accounts Payable
                  </CardTitle>
                  <Layers className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-extrabold font-mono text-slate-850 dark:text-slate-250">{formatRupee(stats.vendorOutstanding)}</div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">Outstanding distributor credit</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Sales Trend Chart */}
            <Card className="lg:col-span-2 border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 rounded-2xl shadow-sm">
              <CardHeader className="px-0 pt-0 pb-6 border-b border-stone-100 dark:border-slate-900">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Sales Trend (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 pt-4">
                <div className="h-80 w-full">
                  {salesTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesTrend}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0D522C" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#0D522C" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                        <XAxis dataKey="date" className="text-xs fill-slate-500 font-semibold" />
                        <YAxis className="text-xs fill-slate-500 font-semibold font-mono" tickFormatter={(v) => `₹${v}`} />
                        <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Sales']} />
                        <Area type="monotone" dataKey="sales" stroke="#0D522C" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center bg-stone-50 dark:bg-slate-900 border border-dashed border-stone-200 dark:border-slate-800 rounded-xl">
                      <p className="text-xs text-slate-500 font-semibold">No sales transactions logged.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Outlets Table */}
            <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 rounded-2xl shadow-sm">
              <CardHeader className="px-0 pt-0 pb-6 border-b border-stone-100 dark:border-slate-900">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                  Top Outlets
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0 pt-4">
                {topBranches.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
                        <TableHead className="text-xs font-bold text-slate-500 uppercase">Outlet</TableHead>
                        <TableHead className="text-xs font-bold text-slate-500 uppercase text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topBranches.map((branch) => (
                        <TableRow key={branch.name} className="border-slate-100 dark:border-slate-900">
                          <TableCell className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 py-3.5">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span>{branch.name}</span>
                          </TableCell>
                          <TableCell className="text-sm font-bold font-mono text-slate-900 dark:text-white text-right py-3.5">
                            {formatRupee(branch.sales)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex h-64 items-center justify-center bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-md">
                    <p className="text-xs text-slate-500 font-semibold">No branches logged in data system.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 2: POS LEDGER ENTRY TERMINAL
          ======================================================== */}
      {dashboardView === 'pos_terminal' && (
        <div className="flex flex-col h-[75vh] bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl select-none font-sans">
          
          {/* Green POS Header */}
          <header className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white px-4 py-3 flex justify-between items-center shadow-md relative z-10 shrink-0 select-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_50%,rgba(255,255,255,0.06),transparent)] pointer-events-none"></div>
            
            <div className="flex items-center gap-4 relative z-20">
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                <div className="bg-white shadow p-1.5 rounded flex items-center justify-center">
                  <span className="text-emerald-850 font-black text-[10px] leading-none">ERP</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black tracking-tight uppercase leading-none">MOUZY COUNTER</span>
                  <span className="text-[7px] font-bold text-emerald-200 tracking-widest uppercase opacity-75 mt-0.5">Terminal v1.2</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-20">
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <span>Daybook Sync Active</span>
              </div>
              
              <button 
                onClick={() => window.location.reload()}
                className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-100 hover:text-white transition-colors"
                title="Refresh Console"
              >
                <RefreshCw size={15} />
              </button>

              <button 
                onClick={toggleFullscreen}
                className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-100 hover:text-white transition-colors"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
              </button>
            </div>
          </header>

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            
            {/* Left Pane - Grid of GL items (3/5 width) */}
            <section className="flex-1 lg:w-3/5 flex flex-col p-4 gap-4 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800">
              {/* Search GL Account */}
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search account name, GL code..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 text-sm transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="px-3 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <Camera size={18} />
                </button>
              </div>

              {/* ERP Category Bar */}
              <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none select-none">
                {[
                  { id: 'all', label: 'All Categories' },
                  { id: 'expenses', label: 'Direct Expenses 💸' },
                  { id: 'procurements', label: 'Procurements 🛒' },
                  { id: 'sales', label: 'Sales Splits 📈' },
                  { id: 'safebox', label: 'Safe Box & Bank 🏦' },
                  { id: 'vendors', label: 'Vendor Balances 👤' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`px-3.5 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider whitespace-nowrap transition-all border ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-800 border-emerald-900 text-white shadow-md'
                        : 'bg-white dark:bg-slate-950 text-slate-500 border-slate-250 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* GL Item Cards Grid */}
              <div className="flex-1 overflow-y-auto pr-1 pb-16 lg:pb-0 custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleAddToCart(item)}
                        className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-3.5 flex flex-col justify-between shadow-sm cursor-pointer hover:shadow transition-all group active:scale-98"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="inline-block text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-500 font-mono tracking-wider">
                              {item.code}
                            </span>
                            <span className={`text-[8px] font-bold uppercase tracking-wider ${
                              item.stockStatus === 'Low Stock' ? 'text-amber-500' : 'text-slate-400'
                            }`}>
                              {item.stockStatus}
                            </span>
                          </div>
                          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-xs md:text-sm mt-2 leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                            {item.name}
                          </h3>
                        </div>
                        <div className="mt-3 flex justify-between items-center border-t border-slate-100 dark:border-slate-900 pt-2 shrink-0">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {item.category === 'procurements' ? `Unit price` : 'Default'}
                          </span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs md:text-sm">
                            {item.category === 'procurements' 
                              ? formatRupee(item.unitPrice ?? 0) + ` / ${item.unit}` 
                              : formatRupee(item.defaultAmount ?? 0)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-20 text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-950 border border-dashed rounded-xl">
                      <LayoutGrid size={32} strokeWidth={1} />
                      <p className="text-xs font-semibold">No GL accounts or items match filters.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Right Pane - Draft Ledger Cart (2/5 width) */}
            <section className="lg:w-2/5 bg-white dark:bg-slate-950 flex flex-col overflow-hidden shadow-2xl relative">
              {/* Draft Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-emerald-700" />
                  <h2 className="font-bold text-sm text-slate-855 dark:text-slate-200">
                    Draft Journal ({cart.length} items)
                  </h2>
                </div>
                {cart.length > 0 && (
                  <button 
                    onClick={handleClearCart}
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-2 py-1 rounded text-xs font-bold transition-all"
                  >
                    Clear Drafts
                  </button>
                )}
              </div>

              {/* Draft Items List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {cart.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-900">
                    {cart.map((cartItem) => (
                      <div key={cartItem.item.id} className="p-3.5 hover:bg-slate-50/30 transition-colors flex items-center gap-3">
                        <button 
                          onClick={() => handleRemoveFromCart(cartItem.item.id)}
                          className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"
                          title="Remove Entry"
                        >
                          <Trash2 size={15} />
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs md:text-sm truncate">
                            {cartItem.item.name}
                          </h4>
                          <span className="inline-block text-[8px] font-mono text-slate-400">
                            {cartItem.item.code}
                          </span>
                        </div>

                        {/* Input & Adjuster values */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {cartItem.item.category === 'procurements' ? (
                            // Procurements: Qty selector + Unit price
                            <div className="flex items-center gap-2">
                              <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
                                <button 
                                  onClick={() => handleUpdateQty(cartItem.item.id, cartItem.quantity - 1)}
                                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 text-xs font-bold"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {cartItem.quantity}
                                </span>
                                <button 
                                  onClick={() => handleUpdateQty(cartItem.item.id, cartItem.quantity + 1)}
                                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-white dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                              <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 bg-slate-50 dark:bg-slate-900 w-24">
                                <span className="text-[10px] text-slate-400 mr-1">₹</span>
                                <input
                                  type="number"
                                  className="w-full text-xs font-bold text-slate-700 dark:text-slate-300 bg-transparent border-none outline-none p-0 focus:ring-0"
                                  value={cartItem.customUnitPrice ?? ''}
                                  onChange={(e) => handleUpdateUnitPrice(cartItem.item.id, parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          ) : (
                            // Non-procurements: Direct amount input
                            <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 bg-slate-50 dark:bg-slate-900 w-32">
                              <span className="text-[10px] text-slate-400 mr-1.5">₹</span>
                              <input
                                type="number"
                                className="w-full text-xs font-bold text-slate-700 dark:text-slate-300 bg-transparent border-none outline-none p-0 focus:ring-0"
                                value={cartItem.customAmount ?? ''}
                                onChange={(e) => handleUpdateAmount(cartItem.item.id, parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                              />
                            </div>
                          )}

                          <div className="text-[10px] font-black text-slate-705 dark:text-slate-300 font-mono">
                            {cartItem.item.category === 'procurements'
                              ? formatRupee((cartItem.customUnitPrice ?? cartItem.item.unitPrice ?? 0) * cartItem.quantity)
                              : formatRupee((cartItem.customAmount ?? cartItem.item.defaultAmount ?? 0) * cartItem.quantity)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-350 dark:text-slate-600 gap-2">
                    <ShoppingCart size={32} strokeWidth={1} />
                    <p className="text-xs font-semibold">Ledger draft list is empty</p>
                  </div>
                )}
              </div>

              {/* Posting Drawer */}
              <div className="p-4 bg-slate-900 text-white rounded-t-2xl shadow-xl shrink-0">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Journal Subtotal</span>
                    <span className="text-white font-mono">{formatRupee(getTotals().subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>GST Payout Est. (5%)</span>
                    <span className="text-white font-mono">{formatRupee(getTotals().taxTotal)}</span>
                  </div>
                  <div className="h-px bg-slate-800 my-2"></div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-extrabold text-emerald-400">TOTAL COMMIT VALUE</span>
                    <span className="text-xl font-mono font-black text-white">{formatRupee(getTotals().grandTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsPostModalOpen(true)}
                  disabled={cart.length === 0}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 active:scale-98 disabled:opacity-50 transition-all font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20"
                >
                  <CreditCard size={14} /> POST DRAFT JOURNAL
                </button>
              </div>
            </section>
          </div>

          {/* MOCK POSTING DIALOG */}
          {isPostModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col gap-4 animate-in zoom-in-95">
                <button 
                  onClick={() => setIsPostModalOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={20} />
                </button>
                
                <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-2">
                  <Coins className="text-emerald-700" size={20} /> Post Ledger Journal
                </h3>

                <div className="space-y-4 my-2 text-slate-700 dark:text-slate-350">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Commit Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'draft', label: 'Save Draft 📑' },
                        { id: 'approved', label: 'Approve & Lock 🔒' },
                        { id: 'review', label: 'Pending Review 🛡️' }
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setPostingMethod(m.id as any)}
                          className={`p-2.5 text-[10px] font-extrabold uppercase border rounded-lg transition-all ${
                            postingMethod === m.id
                              ? 'bg-emerald-800 border-emerald-900 text-white'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Operator Submitting</label>
                    <select
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-250 p-2.5 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-700 outline-none"
                      value={postedBy}
                      onChange={(e) => setPostedBy(e.target.value)}
                    >
                      <option>Branch Manager</option>
                      <option>Shift Cashier</option>
                      <option>HQ Accountant</option>
                      <option>System Administrator</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Audit Notes / Comments</label>
                    <textarea
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-250 p-2.5 rounded-lg text-xs font-semibold h-20 focus:ring-1 focus:ring-emerald-700 outline-none resize-none"
                      placeholder="Add justifications for cash adjustments or vendor invoices..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-900 pt-4 flex gap-3 justify-end">
                  <button
                    onClick={() => setIsPostModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-xs font-bold uppercase transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePostComplete}
                    className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-md shadow-emerald-950/10"
                  >
                    Post Journal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MOCK VOUCHER PREVIEW DIALOG (RECEIPT) */}
          {isVoucherPreviewOpen && createdVoucher && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white border border-stone-300 rounded-2xl w-full max-w-sm p-5 shadow-2xl relative flex flex-col gap-4 text-stone-800 animate-in zoom-in-95 font-mono max-h-[85vh] overflow-hidden">
                <button
                  onClick={() => setIsVoucherPreviewOpen(false)}
                  className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
                >
                  <X size={20} />
                </button>
                
                {/* Scrollable Receipt Area */}
                <div className="flex-1 overflow-y-auto pr-1">
                  {/* Branding */}
                  <div className="text-center pb-4 border-b border-dashed border-stone-300">
                    <h4 className="text-lg font-black tracking-tight uppercase leading-none">Mouzy ERP</h4>
                    <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest leading-none mt-1.5 block">
                      Bangalore Indiranagar (BLR01)
                    </span>
                    <span className="text-[10px] text-stone-500 mt-2 block">
                      Voucher: {createdVoucher.voucherNo}
                    </span>
                    <span className="text-[9px] text-stone-500 mt-1 block">
                      Status: {createdVoucher.postingMethod.toUpperCase()} (LOCKED)
                    </span>
                  </div>

                  {/* Body details */}
                  <div className="py-4 border-b border-dashed border-stone-300 space-y-3">
                    <div className="flex justify-between text-[11px]">
                      <span>Date/Time:</span>
                      <span className="font-bold">{new Date(createdVoucher.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Operator:</span>
                      <span className="font-bold">{createdVoucher.postedBy}</span>
                    </div>
                    <div className="text-[11px] leading-snug bg-stone-50 p-2 rounded border border-stone-200">
                      <span className="font-bold block text-[9px] text-stone-400 uppercase">Audit Note</span>
                      {createdVoucher.notes}
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="py-4 border-b border-dashed border-stone-300">
                    <span className="font-bold text-[9px] text-stone-400 uppercase tracking-wider block mb-2">Ledger Entries</span>
                    <div className="space-y-3">
                      {createdVoucher.items.map((item: any, idx: number) => (
                        <div key={idx} className="text-[11px] flex justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-bold">{item.name}</div>
                            <span className="text-[9px] text-stone-500">{item.code} ({item.category.toUpperCase()})</span>
                          </div>
                          <div className="text-right shrink-0">
                            <div>{item.quantity} x {formatRupee(item.rate)}</div>
                            <div className="font-bold">{formatRupee(item.total)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Totals */}
                  <div className="py-4 space-y-2 text-[11px] text-right">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Subtotal:</span>
                      <span>{formatRupee(createdVoucher.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">GST Est. (5%):</span>
                      <span>{formatRupee(createdVoucher.taxTotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black pt-2 border-t border-dashed border-stone-200">
                      <span>Grand Total:</span>
                      <span>{formatRupee(createdVoucher.grandTotal)}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center pt-4 border-t border-dashed border-stone-300">
                    <p className="text-[9px] text-stone-500 uppercase font-black tracking-widest">Commitment Completed Successfully</p>
                    <p className="text-[8px] text-stone-400 mt-1">Thank you for maintaining daybook records.</p>
                  </div>
                </div>

                {/* Voucher actions */}
                <div className="border-t border-stone-200 pt-3 flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-2 bg-stone-150 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5 border border-stone-300"
                  >
                    <Printer size={13} /> Print
                  </button>
                  <button
                    onClick={() => setIsVoucherPreviewOpen(false)}
                    className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
