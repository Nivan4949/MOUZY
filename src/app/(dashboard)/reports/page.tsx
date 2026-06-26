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
  AlertTriangle 
} from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'operations' | 'finance' | 'audit';
}

const availableReports: ReportTemplate[] = [
  { id: 'daily_sales', name: 'Daily Sales Report', description: 'Reconcile invoice channels (Cash, Cards, Swiggy, Zomato).', category: 'operations' },
  { id: 'daily_purchase', name: 'Daily Purchase Report', description: 'Track branch cash purchases and credit invoice logs.', category: 'operations' },
  { id: 'daily_expense', name: 'Daily Expense Report', description: 'Summarize petty cash vouchers logged at outlets.', category: 'operations' },
  { id: 'vendor_ledger', name: 'Vendor Ledger Statement', description: 'Complete chronological credit/debit balances per vendor.', category: 'finance' },
  { id: 'food_cost', name: 'Food Cost Variance Report', description: 'Ideal vs Actual ingredient consumption and shrinkages.', category: 'finance' },
  { id: 'pnl', name: 'Profit & Loss (P&L) Statement', description: 'Consolidated corporate operating income and gross margins.', category: 'finance' },
  { id: 'cash_variance', name: 'Cash Variance Report', description: 'Flag branches with register shortage overages.', category: 'audit' },
  { id: 'outlet_performance', name: 'Outlet Performance Report', description: 'Rank branches based on gross revenue and profit limits.', category: 'audit' },
];

export default function ReportsPage() {
  const supabase = createClient();
  const [selectedReportId, setSelectedReportId] = useState<string>('daily_sales');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

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

    // Subscribe to realtime changes in job queue
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

  // Request report job
  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single();

      if (!user || !tenant) return;

      const reportName = availableReports.find(r => r.id === selectedReportId)?.name || 'Custom Report';

      // Insert job in public.report_jobs
      // Deno Edge function trigger or backend worker picks up and processes this record
      const { error } = await supabase
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
          status: 'pending',
        });

      if (error) throw error;
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Error creating report job');
    }
  };

  const selectedReport = availableReports.find(r => r.id === selectedReportId);

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
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase text-slate-500 tracking-wider">Report Registry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {availableReports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReportId(report.id)}
                  className={`w-full text-left p-3 rounded-md transition-colors text-sm ${
                    selectedReportId === report.id
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900'
                  }`}
                >
                  <p className="font-semibold">{report.name}</p>
                  <p className="text-xs text-slate-400 font-normal mt-0.5">{report.description}</p>
                </button>
              ))}
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
