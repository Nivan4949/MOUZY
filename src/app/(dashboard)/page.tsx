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
  Activity
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

export default function DashboardPage() {
  const supabase = createClient();
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

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-emerald-600"></div>
        <p className="text-sm font-medium text-slate-500">Loading dashboard performance indicators...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto px-4 md:px-6">
      {/* Page Header */}
      <div className="bg-accent/10 p-6 rounded-2xl border border-accent/20 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-primary uppercase">
            Mouzy Dashboard 🍌
          </h1>
          <p className="text-sm text-slate-650 mt-1 font-medium">
            Welcome back! Here is a simple overview of how your store is performing today.
          </p>
        </div>
        <span className="text-3xl animate-bounce">🥛</span>
      </div>

      {/* CORE OPERATIONAL METRICS */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Today's Sales & Ingredient Costs</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Today's Net Sales */}
          <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Today's Net Sales
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold font-mono text-primary">{formatRupee(stats.todayNetSales)}</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Total with tax: {formatRupee(stats.todaySales)}
              </p>
            </CardContent>
          </Card>

          {/* Monthly Net Sales */}
          <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                This Month's Sales
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold font-mono text-primary">{formatRupee(stats.monthlyNetSales)}</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Total with tax: {formatRupee(stats.monthlySales)}
              </p>
            </CardContent>
          </Card>

          {/* Today's Food Cost % */}
          <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Today's Ingredient Cost
              </CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold font-mono text-primary">{stats.todayFoodCost.toFixed(1)}%</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Stock bought: {formatRupee(stats.todayPurchases)}
              </p>
            </CardContent>
          </Card>

          {/* Monthly Food Cost % */}
          <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                This Month's Cost
              </CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold font-mono text-primary">{stats.monthlyFoodCost.toFixed(1)}%</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Stock bought: {formatRupee(stats.monthlyPurchases)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CASHFLOW & RECONCILIATION */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Daily Register & Balances</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Expenses Today */}
          <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Shop Expenses Today
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold font-mono text-slate-800 dark:text-slate-200">{formatRupee(stats.todayExpenses)}</div>
              <p className="text-[11px] text-slate-500 mt-1">Everyday utility & operational spending</p>
            </CardContent>
          </Card>

          {/* Cash Variance */}
          <Card className={`border bg-white dark:bg-slate-950 shadow-sm rounded-2xl ${
            stats.cashVariance !== 0 
              ? 'border-rose-300 dark:border-rose-900 bg-rose-50/10' 
              : 'border-stone-200 dark:border-slate-800'
          }`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Register Cash Difference
              </CardTitle>
              <AlertTriangle className={`h-4 w-4 ${stats.cashVariance !== 0 ? 'text-rose-500' : 'text-slate-400'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-extrabold font-mono ${stats.cashVariance !== 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                {stats.cashVariance > 0 ? `+${formatRupee(stats.cashVariance)}` : formatRupee(stats.cashVariance)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {stats.cashVariance === 0 ? 'Perfect balance!' : stats.cashVariance < 0 ? 'Cash shortage in drawer' : 'Extra cash in drawer'}
              </p>
            </CardContent>
          </Card>

          {/* Vendor Outstanding */}
          <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Unpaid Supplier/Vendor Bills
              </CardTitle>
              <Layers className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold font-mono text-slate-800 dark:text-slate-200">{formatRupee(stats.vendorOutstanding)}</div>
              <p className="text-[11px] text-slate-500 mt-1">Total outstanding credit balances</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Charts & Tables Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sales Trend Chart */}
        <Card className="lg:col-span-2 border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 rounded-2xl shadow-sm">
          <CardHeader className="px-0 pt-0 pb-6 border-b border-stone-100 dark:border-stone-900">
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
                  <p className="text-xs text-slate-450 font-semibold">No sales transactions logged for the chosen period.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Outlets Table */}
        <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 rounded-2xl shadow-sm">
          <CardHeader className="px-0 pt-0 pb-6 border-b border-slate-100 dark:border-slate-900">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
              Branch Rankings
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
                <p className="text-xs text-slate-400 font-medium font-semibold">No branches logged in system database.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
