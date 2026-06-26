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

        // 2. Fetch Monthly Sales
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const { data: monthlySalesData } = await supabase
          .from('sales_transactions')
          .select('amount_net')
          .gte('transaction_timestamp', startOfMonth.toISOString().split('T')[0]);

        const monthlySalesSum = monthlySalesData?.reduce((acc: number, row: any) => acc + Number(row.amount_net), 0) || 0;

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Performance Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Real-time branch financial metrics and daybook cash reconciliations.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today's Sales */}
        <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Today's Net Sales
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatRupee(stats.todaySales)}</div>
            <p className="text-xs text-primary mt-1 flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>Real-time from Daybook splits</span>
            </p>
          </CardContent>
        </Card>

        {/* Expenses Today */}
        <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Approved Expenses (Today)
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatRupee(stats.todayExpenses)}</div>
            <p className="text-xs text-slate-500 mt-1">Petty cash payouts</p>
          </CardContent>
        </Card>

        {/* Cash Variance */}
        <Card className={`border bg-white dark:bg-slate-950 shadow-sm rounded-2xl ${
          stats.cashVariance !== 0 
            ? 'border-rose-350 dark:border-rose-900 bg-rose-50/10' 
            : 'border-stone-200 dark:border-slate-800'
        }`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Drawer Cash Variance
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.cashVariance !== 0 ? 'text-rose-500' : 'text-slate-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono ${stats.cashVariance !== 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
              {stats.cashVariance > 0 ? `+${formatRupee(stats.cashVariance)}` : formatRupee(stats.cashVariance)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.cashVariance === 0 ? 'Balanced drawer' : stats.cashVariance < 0 ? 'Cash shortage alert' : 'Cash overage'}
            </p>
          </CardContent>
        </Card>

        {/* Vendor Outstanding */}
        <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              AP Vendor Outstanding
            </CardTitle>
            <Layers className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatRupee(stats.vendorOutstanding)}</div>
            <p className="text-xs text-slate-500 mt-1">Outstanding liability invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts & Tables Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sales Trend Chart */}
        <Card className="lg:col-span-2 border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 rounded-2xl shadow-sm">
          <CardHeader className="px-0 pt-0 pb-6 border-b border-stone-100 dark:border-stone-900">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
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
                        <stop offset="5%" stopColor="#0d692d" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0d692d" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="date" className="text-xs fill-slate-500 font-medium" />
                    <YAxis className="text-xs fill-slate-500 font-medium font-mono" tickFormatter={(v) => `₹${v}`} />
                    <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Sales']} />
                    <Area type="monotone" dataKey="sales" stroke="#0d692d" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center bg-stone-50 dark:bg-slate-900 border border-dashed border-stone-200 dark:border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-400 font-semibold">No sales transactions logged for the chosen period.</p>
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
