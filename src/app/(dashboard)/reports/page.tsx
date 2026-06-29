'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  AlertTriangle,
  Search
} from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'operations' | 'finance' | 'audit';
}

const availableReports: ReportTemplate[] = [
  { id: 'daily_sales', name: 'Daily Sales Register', description: 'Reconcile invoice payment channels (Cash, Cards, Swiggy, Zomato).', category: 'operations' },
  { id: 'purchase_cost', name: 'Purchase Head Cost Report', description: 'Daily and monthly comparisons by GL procurement classification.', category: 'operations' },
  { id: 'cash_denom', name: 'Cash Denomination History', description: 'Chronological denomination counts and cashier register checks.', category: 'audit' },
  { id: 'variance_trend', name: 'Variance Trend Logs', description: 'Flag branches showing drawer cash shortage/overage trends.', category: 'audit' },
  { id: 'petty_cash', name: 'Petty Cash Vouchers Log', description: 'Audited expense voucher payouts grouped by category.', category: 'operations' },
  { id: 'bank_flow', name: 'Bank Flow Summary', description: 'Summarize deposits, drawer cash pickups and withdrawals.', category: 'finance' },
  { id: 'period_recon', name: 'Period Closing Reconciliation Sheet', description: 'Audited trial balance sheet and financial closure logs.', category: 'finance' },
  { id: 'vendor_aging', name: 'Vendor Liability Aging Report', description: 'Accounts payable aging brackets, payments, and FIFO ledgers.', category: 'finance' },
  { id: 'food_cost_trend', name: 'Food Cost Trend Report', description: 'Compare daily and monthly raw material food cost percentage trends.', category: 'finance' },
  { id: 'category_procurement', name: 'Category-wise Procurement Analysis', description: 'Aggregated procurement spends grouped by GL item and supplier.', category: 'operations' },
  { id: 'workflow_logs', name: 'Sequential Approval Activity Logs', description: 'Full workflow history tracking submissions and multi-user locks.', category: 'audit' },
];

export default function ReportsPage() {
  const supabase = createClient();
  const [selectedReportId, setSelectedReportId] = useState<string>('daily_sales');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'all' | 'operations' | 'finance' | 'audit'>('all');

  // Async Jobs
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Fetch branches and jobs
  async function fetchBranches() {
    const { data } = await supabase.from('branches').select('id, name');
    setBranches(data || []);
  }

  async function fetchJobs() {
    try {
      setLoadingJobs(true);
      const { data } = await supabase
        .from('report_jobs')
        .select('*')
        .order('created_at', { ascending: false });
      setJobs(data || []);
    } catch (err) {
      console.error('Error fetching report jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  }

  useEffect(() => {
    fetchBranches();
    fetchJobs();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'report_jobs' },
        () => fetchJobs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Client-side report CSV compilation and async job creation
  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      setLoadingJobs(true);
      const reportName = availableReports.find(r => r.id === selectedReportId)?.name || 'Custom Report';
      
      // Query records based on selected report parameters
      let csvContent = "data:text/csv;charset=utf-8,";
      
      if (selectedReportId === 'daily_sales') {
        const { data } = await supabase
          .from('sales_transactions')
          .select('*')
          .gte('transaction_timestamp', startDate)
          .lte('transaction_timestamp', endDate + 'T23:59:59');
          
        csvContent += "Invoice ID,Timestamp,Payment Method,Amount Gross,Amount Net\n";
        data?.forEach((row: any) => {
          csvContent += `"${row.invoice_number}","${row.transaction_timestamp}","${row.payment_method}",${row.amount_gross},${row.amount_net}\n`;
        });
      } else if (selectedReportId === 'purchase_cost') {
        const { data } = await supabase
          .from('purchases')
          .select('*')
          .gte('invoice_date', startDate)
          .lte('invoice_date', endDate);
          
        csvContent += "Invoice ID,Date,Payment Mode,Amount\n";
        data?.forEach((row: any) => {
          csvContent += `"${row.invoice_number}","${row.invoice_date}","${row.payment_mode}",${row.amount}\n`;
        });
      } else if (selectedReportId === 'cash_denom') {
        const { data } = await supabase
          .from('daybooks')
          .select('*')
          .gte('business_date', startDate)
          .lte('business_date', endDate);
          
        csvContent += "Date,Physical Cash,Expected Cash,500s,200s,100s,50s,20s,10s,5s,2s,1s,Coins\n";
        data?.forEach((row: any) => {
          csvContent += `"${row.business_date}",${row.physical_cash},${row.expected_cash},${row.denom_500},${row.denom_200},${row.denom_100},${row.denom_50},${row.denom_20},${row.denom_10},${row.denom_5},${row.denom_2},${row.denom_1},${row.denom_coins}\n`;
        });
      } else if (selectedReportId === 'variance_trend') {
        const { data } = await supabase
          .from('daybooks')
          .select('*')
          .gte('business_date', startDate)
          .lte('business_date', endDate);
          
        csvContent += "Date,Expected Cash,Physical Cash,Variance,Justification\n";
        data?.forEach((row: any) => {
          const variance = Number(row.physical_cash) - Number(row.expected_cash);
          csvContent += `"${row.business_date}",${row.expected_cash},${row.physical_cash},${variance},"${row.variance_justification || ''}"\n`;
        });
      } else if (selectedReportId === 'petty_cash') {
        const { data } = await supabase
          .from('expenses')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate + 'T23:59:59');
          
        csvContent += "Expense ID,Created At,Description,Amount,Payment Mode,Approved\n";
        data?.forEach((row: any) => {
          csvContent += `"${row.id}","${row.created_at}","${row.description}",${row.amount},"${row.payment_mode}",${row.is_approved}\n`;
        });
      } else {
        csvContent += "Report Name,Start Date,End Date,Scope Branch\n";
        csvContent += `"${reportName}","${startDate}","${endDate}","${selectedBranchId}"\n`;
      }
      
      // Trigger download
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${selectedReportId}_export_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Create a background job audit record marked completed
      const { data: { user } } = await supabase.auth.getUser();
      const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single();

      if (user && tenant) {
        await supabase
          .from('report_jobs')
          .insert({
            tenant_id: tenant.id,
            user_id: user.id,
            report_type: selectedReportId,
            parameters: {
              branch_id: selectedBranchId,
              start_date: startDate,
              end_date: endDate,
              export_format: format,
              report_name: reportName,
            },
            status: 'completed',
            download_url: '#',
          });
        fetchJobs();
      }
    } catch (err: any) {
      alert(err.message || 'Error compiling export files');
    } finally {
      setLoadingJobs(false);
    }
  };

  const selectedReport = availableReports.find(r => r.id === selectedReportId);

  // Real-time filtering and searching of reports
  const filteredReports = availableReports.filter(report => {
    const matchesCategory = selectedCategoryTab === 'all' || report.category === selectedCategoryTab;
    const matchesSearch = report.name.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                          report.description.toLowerCase().includes(reportSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: 'operations' | 'finance' | 'audit') => {
    switch (category) {
      case 'operations':
        return <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Ops 🛒</span>;
      case 'finance':
        return <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 text-[9px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Fin 🏦</span>;
      case 'audit':
        return <span className="inline-flex items-center rounded-md bg-purple-50 dark:bg-purple-950/20 px-2 py-0.5 text-[9px] font-extrabold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Audit 🛡️</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Reporting Center
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Generate financial summaries, export spreadsheets, and monitor active data requests.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Report Selectors & Parameters */}
        <div className="space-y-6">
          <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-900">
              <CardTitle className="text-sm font-semibold uppercase text-slate-500 tracking-wider">Report Registry</CardTitle>
              <div className="relative mt-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search report name..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary outline-none"
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                />
              </div>

              {/* Category Tab Selector */}
              <div className="flex gap-1 mt-3 bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-150 dark:border-slate-850 overflow-x-auto scrollbar-none">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'operations', label: 'Ops' },
                  { id: 'finance', label: 'Fin' },
                  { id: 'audit', label: 'Audit' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedCategoryTab(tab.id as any)}
                    className={`flex-1 text-center py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all cursor-pointer ${
                      selectedCategoryTab === tab.id
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-650'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-4 max-h-[480px] overflow-y-auto custom-scrollbar">
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReportId(report.id)}
                    className={`w-full text-left p-3.5 rounded-xl transition-all border duration-200 ${
                      selectedReportId === report.id
                        ? 'bg-emerald-50/30 border-emerald-500/25 dark:bg-emerald-950/10 dark:border-emerald-550/20 shadow-sm'
                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-900/40 border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className={`font-semibold text-xs ${selectedReportId === report.id ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-850 dark:text-slate-205'}`}>
                        {report.name}
                      </p>
                      <div className="shrink-0">{getCategoryBadge(report.category)}</div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 font-normal mt-1 leading-snug">
                      {report.description}
                    </p>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">No reports match your filters.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Filters, Actions & Active Jobs */}
        <div className="lg:col-span-2 space-y-8">
          {selectedReport && (
            <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6">
              <CardHeader className="px-0 pt-0 pb-6 border-b border-slate-100 dark:border-slate-900">
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">{selectedReport.name}</CardTitle>
                <CardDescription>{selectedReport.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="px-0 py-6 space-y-6">
                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="branch_select">Scope Branch</Label>
                    <Select onValueChange={(v) => setSelectedBranchId(v as string)} defaultValue={selectedBranchId}>
                      <SelectTrigger id="branch_select">
                        <SelectValue placeholder="All Branches" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-950 border dark:border-slate-800">
                        <SelectItem value="all">All Outlets</SelectItem>
                        {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input 
                      id="start_date" 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input 
                      id="end_date" 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="px-0 pb-0 border-t border-slate-100 dark:border-slate-900 pt-6 flex justify-end gap-4">
                <Button 
                  onClick={() => handleExport('excel')}
                  variant="outline" 
                  className="gap-2 border-slate-200 dark:border-slate-800"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Export Excel</span>
                </Button>
                <Button 
                  onClick={() => handleExport('pdf')}
                  variant="outline" 
                  className="gap-2 border-slate-200 dark:border-slate-800"
                >
                  <FileText className="h-4 w-4 text-rose-600" />
                  <span>Export PDF</span>
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Active / Historical Job Queue */}
          <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6">
            <CardHeader className="px-0 pt-0 pb-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Active Export Requests</CardTitle>
                <CardDescription>Consolidated multi-branch tasks running asynchronously.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchJobs} className="h-8 border-slate-200">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-slate-800">
                    <TableHead>Requested Report</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.length > 0 ? (
                    jobs.map((job) => (
                      <TableRow key={job.id} className="border-slate-100 dark:border-slate-900">
                        <TableCell className="font-semibold text-slate-700 dark:text-slate-300 py-3.5">
                          {job.parameters?.report_name || job.report_type}
                        </TableCell>
                        <TableCell className="text-slate-500 uppercase font-medium py-3.5">
                          {job.parameters?.export_format || 'Excel'}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 border ${
                            job.status === 'completed' 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20' 
                              : job.status === 'processing' 
                              ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/20' 
                              : 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20'
                          }`}>
                            {job.status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            <span>{job.status.toUpperCase()}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-3.5">
                          {job.status === 'completed' && job.download_url ? (
                            <Button render={<a href={job.download_url} download />} size="sm" variant="ghost" className="h-8 gap-1.5 text-emerald-600 hover:text-emerald-500">
                              <span className="flex items-center gap-1.5">
                                <Download className="h-3.5 w-3.5" /> Download
                              </span>
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Pending Processing</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-xs text-slate-400">No export jobs requested yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
