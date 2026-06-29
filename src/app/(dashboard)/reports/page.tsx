'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  FileSpreadsheet, 
  FileText, 
  TrendingUp, 
  Coins, 
  Clock, 
  ShoppingBag, 
  ClipboardList, 
  Activity, 
  Table as TableIcon, 
  FileText as FileTextIcon, 
  Wallet, 
  Layers, 
  Users, 
  UserCheck, 
  LayoutGrid,
  Printer,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  categoryGroup: 'operations' | 'finance' | 'audit';
  icon: React.ComponentType<any>;
}

const availableReports: ReportTemplate[] = [
  // OPERATIONS REPORTS
  { id: 'daily_sales', name: 'Daily Sales Register', description: 'Reconcile invoice payment channels (Cash, Cards, Swiggy, Zomato).', categoryGroup: 'operations', icon: TrendingUp },
  { id: 'purchase_cost', name: 'Purchase Head Cost Report', description: 'Daily and monthly comparisons by GL procurement classification.', categoryGroup: 'operations', icon: ShoppingBag },
  { id: 'petty_cash', name: 'Petty Cash Vouchers Log', description: 'Audited expense voucher payouts grouped by category.', categoryGroup: 'operations', icon: Wallet },
  { id: 'category_procurement', name: 'Category-wise Procurement Analysis', description: 'Aggregated procurement spends grouped by GL item and supplier.', categoryGroup: 'operations', icon: LayoutGrid },

  // FINANCE REPORTS
  { id: 'bank_flow', name: 'Bank Flow Summary', description: 'Summarize deposits, drawer cash pickups and withdrawals.', categoryGroup: 'finance', icon: Clock },
  { id: 'period_recon', name: 'Period Closing Reconciliation Sheet', description: 'Audited trial balance sheet and financial closure logs.', categoryGroup: 'finance', icon: Layers },
  { id: 'vendor_aging', name: 'Vendor Liability Aging Report', description: 'Accounts payable aging brackets, payments, and FIFO ledgers.', categoryGroup: 'finance', icon: Users },
  { id: 'food_cost_trend', name: 'Food Cost Trend Report', description: 'Compare daily and monthly raw material food cost percentage trends.', categoryGroup: 'finance', icon: Activity },

  // AUDIT & COMPLIANCE
  { id: 'cash_denom', name: 'Cash Denomination History', description: 'Chronological denomination counts and cashier register checks.', categoryGroup: 'audit', icon: Coins },
  { id: 'variance_trend', name: 'Variance Trend Logs', description: 'Flag branches showing drawer cash shortage/overage trends.', categoryGroup: 'audit', icon: AlertTriangle },
  { id: 'workflow_logs', name: 'Sequential Approval Activity Logs', description: 'Full workflow history tracking submissions and multi-user locks.', categoryGroup: 'audit', icon: ClipboardList },
];

export default function ReportsPage() {
  const supabase = createClient();
  const [selectedReportId, setSelectedReportId] = useState<string>('daily_sales');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Helper: Format Rupee
  const formatRupee = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  };

  // Compute dates boundaries
  const getDateRange = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (dateFilter === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (dateFilter === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      return { start: yesterdayStr, end: yesterdayStr };
    }
    if (dateFilter === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekStr = lastWeek.toISOString().split('T')[0];
      return { start: lastWeekStr, end: todayStr };
    }
    if (dateFilter === 'month') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
      return { start: startOfMonthStr, end: todayStr };
    }
    return { start: todayStr, end: todayStr };
  };

  // Load database tables based on selected report and date picker
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);
        const { start, end } = getDateRange();
        
        if (selectedReportId === 'daily_sales') {
          const { data } = await supabase
            .from('sales_transactions')
            .select('*')
            .gte('transaction_timestamp', start)
            .lte('transaction_timestamp', end + 'T23:59:59')
            .order('transaction_timestamp', { ascending: false });
          setReportData(data || []);
        } else if (selectedReportId === 'purchase_cost') {
          const { data } = await supabase
            .from('purchases')
            .select('*')
            .gte('invoice_date', start)
            .lte('invoice_date', end)
            .order('invoice_date', { ascending: false });
          setReportData(data || []);
        } else if (selectedReportId === 'petty_cash') {
          const { data } = await supabase
            .from('expenses')
            .select('*')
            .gte('created_at', start)
            .lte('created_at', end + 'T23:59:59')
            .order('created_at', { ascending: false });
          setReportData(data || []);
        } else if (selectedReportId === 'cash_denom' || selectedReportId === 'variance_trend') {
          const { data } = await supabase
            .from('daybooks')
            .select('*')
            .gte('business_date', start)
            .lte('business_date', end)
            .order('business_date', { ascending: false });
          setReportData(data || []);
        } else {
          setReportData([]);
        }
      } catch (err) {
        console.error('Error loading report data:', err);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, [selectedReportId, dateFilter]);

  // Compute metrics for the cards
  const getReportSummary = () => {
    if (selectedReportId === 'daily_sales') {
      const totalSales = reportData.reduce((acc, row) => acc + Number(row.amount_net), 0);
      const billCount = reportData.length;
      const totalTax = totalSales * 0.05; // 5% GST
      return { card1: formatRupee(totalSales), card2: billCount, card3: formatRupee(totalTax) };
    }
    if (selectedReportId === 'purchase_cost') {
      const totalPurchases = reportData.reduce((acc, row) => acc + Number(row.amount), 0);
      const purchaseCount = reportData.length;
      const creditOutstanding = reportData.filter(r => r.payment_status === 'unpaid').reduce((acc, row) => acc + Number(row.amount), 0);
      return { card1: formatRupee(totalPurchases), card2: purchaseCount, card3: formatRupee(creditOutstanding) };
    }
    if (selectedReportId === 'petty_cash') {
      const totalExpenses = reportData.filter(e => e.is_approved).reduce((acc, row) => acc + Number(row.amount), 0);
      const voucherCount = reportData.length;
      const pendingApproval = reportData.filter(e => !e.is_approved).reduce((acc, row) => acc + Number(row.amount), 0);
      return { card1: formatRupee(totalExpenses), card2: voucherCount, card3: formatRupee(pendingApproval) };
    }
    if (selectedReportId === 'cash_denom' || selectedReportId === 'variance_trend') {
      const expectedCash = reportData.reduce((acc, row) => acc + Number(row.expected_cash), 0);
      const physicalCash = reportData.reduce((acc, row) => acc + Number(row.physical_cash), 0);
      const variance = physicalCash - expectedCash;
      return { card1: formatRupee(expectedCash), card2: reportData.length, card3: formatRupee(variance) };
    }
    return { card1: '₹0.00', card2: 0, card3: '₹0.00' };
  };

  const getCardTitles = () => {
    if (selectedReportId === 'purchase_cost') {
      return { card1: 'TOTAL PURCHASES', card2: 'PURCHASE COUNT', card3: 'CREDIT OUTSTANDING' };
    }
    if (selectedReportId === 'petty_cash') {
      return { card1: 'TOTAL EXPENSES', card2: 'VOUCHER COUNT', card3: 'PENDING APPROVAL' };
    }
    if (selectedReportId === 'cash_denom' || selectedReportId === 'variance_trend') {
      return { card1: 'EXPECTED CASH', card2: 'SHIFT COUNT', card3: 'TOTAL VARIANCE' };
    }
    return { card1: 'TOTAL SALES', card2: 'BILL COUNT', card3: 'TOTAL TAX' };
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    if (reportData.length === 0) {
      alert('No data records available to export.');
      return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (selectedReportId === 'daily_sales') {
      csvContent += "Invoice ID,Timestamp,Payment Method,Amount Gross,Amount Net\n";
      reportData.forEach((row: any) => {
        csvContent += `"${row.invoice_number}","${row.transaction_timestamp}","${row.payment_method}",${row.amount_gross},${row.amount_net}\n`;
      });
    } else if (selectedReportId === 'purchase_cost') {
      csvContent += "Invoice ID,Date,Payment Mode,Amount\n";
      reportData.forEach((row: any) => {
        csvContent += `"${row.invoice_number}","${row.invoice_date}","${row.payment_mode}",${row.amount}\n`;
      });
    } else if (selectedReportId === 'petty_cash') {
      csvContent += "Expense ID,Created At,Description,Amount,Payment Mode,Approved\n";
      reportData.forEach((row: any) => {
        csvContent += `"${row.id}","${row.created_at}","${row.description}",${row.amount},"${row.payment_mode}",${row.is_approved}\n`;
      });
    } else if (selectedReportId === 'cash_denom') {
      csvContent += "Date,Physical Cash,Expected Cash,500s,200s,100s,50s,20s,10s,5s,2s,1s,Coins\n";
      reportData.forEach((row: any) => {
        csvContent += `"${row.business_date}",${row.physical_cash},${row.expected_cash},${row.denom_500},${row.denom_200},${row.denom_100},${row.denom_50},${row.denom_20},${row.denom_10},${row.denom_5},${row.denom_2},${row.denom_1},${row.denom_coins}\n`;
      });
    } else if (selectedReportId === 'variance_trend') {
      csvContent += "Date,Expected Cash,Physical Cash,Variance,Justification\n";
      reportData.forEach((row: any) => {
        const variance = Number(row.physical_cash) - Number(row.expected_cash);
        csvContent += `"${row.business_date}",${row.expected_cash},${row.physical_cash},${variance},"${row.variance_justification || ''}"\n`;
      });
    } else {
      csvContent += "Report Name,Date Filter\n";
      csvContent += `"${availableReports.find(r => r.id === selectedReportId)?.name}","${dateFilter}"\n`;
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedReportId}_export_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeReport = availableReports.find(r => r.id === selectedReportId);
  const summaryMetrics = getReportSummary();
  const cardTitles = getCardTitles();

  const getGroupedMenu = (group: 'operations' | 'finance' | 'audit') => {
    return availableReports
      .filter(r => r.categoryGroup === group)
      .map(report => {
        const Icon = report.icon;
        const isSelected = selectedReportId === report.id;
        return (
          <button
            key={report.id}
            onClick={() => setSelectedReportId(report.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-extrabold rounded-lg transition-all text-left uppercase tracking-wider ${
              isSelected 
                ? 'bg-[#7cb342] text-white shadow-sm' 
                : 'text-slate-655 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-350 dark:hover:bg-slate-900'
            }`}
          >
            <Icon size={14} className={isSelected ? 'text-white' : 'text-slate-500'} />
            {report.name}
          </button>
        );
      });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm font-sans select-none overflow-hidden h-[82vh]">
      
      {/* Left sub-column - categorized Reports menu */}
      <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-850 pr-0 lg:pr-4 flex flex-col overflow-y-auto shrink-0 select-none custom-scrollbar">
        <h2 className="text-lg font-black tracking-tight text-slate-855 dark:text-white uppercase mb-4 pl-2">
          Reports
        </h2>
        
        <div className="space-y-4 pb-6">
          {/* Operations Reports */}
          <div className="space-y-1">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1.5">
              Operations Reports
            </h3>
            {getGroupedMenu('operations')}
          </div>

          {/* Finance Reports */}
          <div className="space-y-1">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1.5">
              Finance Reports
            </h3>
            {getGroupedMenu('finance')}
          </div>

          {/* Audit Reports */}
          <div className="space-y-1">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 mb-1.5">
              Audit & Compliance
            </h3>
            {getGroupedMenu('audit')}
          </div>
        </div>
      </aside>

      {/* Right sub-column - main details pane */}
      <section className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        {/* Header toolbar */}
        {activeReport && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-805 pb-4 mb-4 gap-4 shrink-0">
            <div>
              <h1 className="text-xl font-black text-slate-855 dark:text-white uppercase tracking-tight">
                {activeReport.name}
              </h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                Data Analysis & Archival
              </p>
            </div>
            
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <Button 
                onClick={() => handleExport('csv')}
                variant="outline" 
                size="sm"
                className="gap-1.5 border-emerald-600/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-[10px] font-black uppercase tracking-wider"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </Button>
              <Button 
                onClick={() => handleExport('csv')} // PDF export fallback trigger
                variant="outline" 
                size="sm"
                className="gap-1.5 border-rose-600/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[10px] font-black uppercase tracking-wider"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Export PDF</span>
              </Button>
              
              <select
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-350 p-2 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        )}

        {/* Summary metrics cards (3 cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {cardTitles.card1}
              </span>
              <p className="text-xl font-extrabold text-slate-800 dark:text-slate-105 font-mono mt-1">
                {summaryMetrics.card1}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {cardTitles.card2}
              </span>
              <p className="text-xl font-extrabold text-slate-805 dark:text-slate-105 font-mono mt-1">
                {summaryMetrics.card2}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-955 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {cardTitles.card3}
              </span>
              <p className="text-xl font-extrabold text-slate-805 dark:text-slate-105 font-mono mt-1">
                {summaryMetrics.card3}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main records data table */}
        <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 overflow-y-auto custom-scrollbar shadow-sm">
          {loadingData ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-20 text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin text-[#0b522c]" />
              <p className="text-xs font-semibold">Querying database records...</p>
            </div>
          ) : reportData.length > 0 ? (
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
                  <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Time</TableHead>
                  <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Reference</TableHead>
                  <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Details / Description</TableHead>
                  <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-wider text-right">Amount</TableHead>
                  <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-wider text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row: any, idx: number) => {
                  const timestamp = row.transaction_timestamp || row.created_at || row.invoice_date;
                  const dateObj = timestamp ? new Date(timestamp) : null;
                  const dateDisplay = dateObj ? dateObj.toLocaleDateString() : (row.business_date || '-');
                  const timeDisplay = dateObj ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                  
                  return (
                    <TableRow key={row.id || idx} className="border-slate-100 dark:border-slate-900">
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-mono py-3">
                        {dateDisplay}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-mono py-3">
                        {timeDisplay}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-mono py-3">
                        {row.invoice_number || row.id?.slice(0,8) || '-'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200 py-3">
                        {row.payment_method || row.payment_mode || row.description || row.variance_justification?.slice(0, 30) || 'General Posting'}
                      </TableCell>
                      <TableCell className="text-xs font-bold font-mono text-slate-900 dark:text-white text-right py-3">
                        {formatRupee(Number(row.amount_net || row.amount || row.physical_cash || 0))}
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <Button 
                          onClick={() => alert(`Review record details:\nRef: ${row.invoice_number || row.id}`)}
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-505"
                        >
                          <Printer size={12} className="mr-1" /> Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-full items-center justify-center py-20 text-slate-400 dark:text-slate-650">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                No records found.
              </span>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
