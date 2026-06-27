'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  Calendar, 
  Plus, 
  Building2 
} from 'lucide-react';

const periodSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD'),
});

type PeriodFormValues = z.infer<typeof periodSchema>;

export default function HQApprovalsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daybooks');

  // Operational states
  const [daybooks, setDaybooks] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);

  // Dialog details
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectingDbId, setRejectingDbId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [newPeriodOpen, setNewPeriodOpen] = useState(false);
  
  // Custom states for active user permissions
  const [userRole, setUserRole] = useState<string>('finance_head');

  const periodForm = useForm<PeriodFormValues>({
    resolver: zodResolver(periodSchema) as any,
  });

  // Helper: Format Rupee
  const formatRupee = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  };

  async function fetchBranches() {
    const { data } = await supabase.from('branches').select('id, name');
    setBranches(data || []);
  }

  async function loadPendingDaybooks() {
    const { data } = await supabase
      .from('daybooks')
      .select('*')
      .in('status', ['submitted', 'branch_approved'])
      .order('business_date', { ascending: false });
    setDaybooks(data || []);
  }

  async function loadPendingExpenses() {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('requires_hq_approval', true)
      .eq('is_approved', false)
      .order('created_at', { ascending: false });
    setExpenses(data || []);
  }

  async function loadPeriods() {
    const { data } = await supabase
      .from('financial_periods')
      .select('*')
      .order('start_date', { ascending: false });
    setPeriods(data || []);
  }

  async function refreshAll() {
    setLoading(true);
    await Promise.all([
      fetchBranches(),
      loadPendingDaybooks(),
      loadPendingExpenses(),
      loadPeriods()
    ]);
    setLoading(false);
  }

  useEffect(() => {
    async function getUserRoleData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.role_id) {
          const { data: roleObj } = await supabase
            .from('roles')
            .select('role_name')
            .eq('id', profile.role_id)
            .maybeSingle();
          if (roleObj?.role_name) {
            setUserRole(roleObj.role_name);
          }
        } else {
          const mockRole = user.user_metadata?.app_role;
          if (mockRole) {
            setUserRole(mockRole);
          }
        }
      }
    }
    getUserRoleData();
    refreshAll();
  }, [supabase]);

  // Action: Approve Daybook (via RPC)
  const handleApproveDaybook = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('approve_daybook', { 
        p_daybook_id: id,
        p_user_id: user.id
      });
      if (error) throw error;
      alert('Daybook sheet approved and posted to General Ledgers successfully.');
      loadPendingDaybooks();
    } catch (err: any) {
      alert(err.message || 'Error approving daybook');
    }
  };

  // Action: Reject Daybook (via RPC)
  const handleRejectDaybook = async () => {
    if (!rejectingDbId || !rejectionReason.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('reject_daybook', { 
        p_daybook_id: rejectingDbId, 
        p_user_id: user.id,
        p_reason: rejectionReason 
      });
      if (error) throw error;
      setRejectOpen(false);
      setRejectingDbId(null);
      setRejectionReason('');
      alert('Daybook sheet rejected and returned to branch manager.');
      loadPendingDaybooks();
    } catch (err: any) {
      alert(err.message || 'Error rejecting daybook');
    }
  };

  // Action: Approve Expense Override (direct update)
  const handleApproveExpense = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('expenses')
        .update({ 
          is_approved: true,
          approved_by: user.id
        })
        .eq('id', id);
      if (error) throw error;
      alert('Expense override approved and cash drawer allocation authorized.');
      loadPendingExpenses();
    } catch (err: any) {
      alert(err.message || 'Error approving expense override');
    }
  };

  // Action: Lock / Unlock Accounting Period
  const handleTogglePeriodLock = async (id: string, currentLockState: boolean) => {
    try {
      const { error } = await supabase
        .from('financial_periods')
        .update({ is_locked: !currentLockState })
        .eq('id', id);
      if (error) throw error;
      loadPeriods();
    } catch (err: any) {
      alert(err.message || 'Error updating lock state');
    }
  };

  // Action: Create New Financial Period
  const handleCreatePeriod = async (values: PeriodFormValues) => {
    try {
      const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single();
      if (!tenant) return;

      const { error } = await supabase
        .from('financial_periods')
        .insert({
          tenant_id: tenant.id,
          start_date: values.start_date,
          end_date: values.end_date,
          is_locked: false,
        });

      if (error) throw error;
      setNewPeriodOpen(false);
      periodForm.reset();
      loadPeriods();
    } catch (err: any) {
      alert(err.message || 'Error creating period');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-emerald-600"></div>
        <p className="text-sm font-medium text-slate-500">Loading control console...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto px-4 md:px-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          HQ Finance Control Console
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Perform audits, verify cash reconciliation sheets, approve expenses, and manage locked calendar cycles in Rupees (₹).
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 border dark:border-slate-800 rounded-md">
          <TabsTrigger value="daybooks">Pending Daybooks ({daybooks.length})</TabsTrigger>
          <TabsTrigger value="expenses">Expense Overrides ({expenses.length})</TabsTrigger>
          <TabsTrigger value="periods">Period Locks</TabsTrigger>
        </TabsList>

        {/* Tab 1: Daybooks Approvals */}
        <TabsContent value="daybooks" className="pt-6">
          <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 rounded-2xl shadow-sm">
            <CardHeader className="px-0 pt-0 pb-6 border-b border-slate-100 dark:border-slate-900">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Submitted Daily Daybooks</CardTitle>
              <CardDescription>Verify drawer totals and reconcile cash differences before posting to general accounts.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-slate-800">
                    <TableHead>Date</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Float Open</TableHead>
                    <TableHead className="text-right">Expected Drawer</TableHead>
                    <TableHead className="text-right">Physical Counted</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead>Variance Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daybooks.length > 0 ? (
                    daybooks.map((db) => {
                      const branchName = branches.find(b => b.id === db.branch_id)?.name || 'Unknown Branch';
                      const variance = Number(db.cash_difference);

                      // Role-gating controls
                      const canApprove = 
                        (db.status === 'submitted' && (userRole === 'branch_manager' || userRole === 'super_admin')) ||
                        (db.status === 'branch_approved' && (userRole === 'finance_head' || userRole === 'accountant' || userRole === 'super_admin'));

                      const statusLabel = db.status === 'submitted' ? 'Awaiting Mgr' : 'Awaiting Finance';
                      const statusColor = db.status === 'submitted' 
                        ? 'bg-amber-50 border-amber-250 text-amber-800 dark:bg-amber-950/20' 
                        : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20';

                      return (
                        <TableRow key={db.id} className="border-slate-100 dark:border-slate-900">
                          <TableCell className="font-semibold text-slate-700 dark:text-slate-350">
                            {new Date(db.business_date).toLocaleDateString('en-IN')}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5 py-4">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            <span>{branchName}</span>
                          </TableCell>
                          <TableCell>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">{formatRupee(Number(db.opening_cash))}</TableCell>
                          <TableCell className="text-right font-mono font-medium">{formatRupee(Number(db.expected_cash))}</TableCell>
                          <TableCell className="text-right font-mono font-bold">{formatRupee(Number(db.physical_cash))}</TableCell>
                          <TableCell className={`text-right font-mono font-bold ${variance === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {variance > 0 ? `+${formatRupee(variance)}` : formatRupee(variance)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 max-w-[200px] truncate" title={db.variance_justification}>
                            {db.variance_justification || '-'}
                          </TableCell>
                          <TableCell className="text-right space-x-2 py-4 shrink-0">
                            {canApprove ? (
                              <>
                                <Button 
                                  onClick={() => handleApproveDaybook(db.id)}
                                  size="sm" 
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-2.5"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {db.status === 'submitted' ? 'Approve' : 'Lock'}
                                </Button>
                                <Button 
                                  onClick={() => {
                                    setRejectingDbId(db.id);
                                    setRejectOpen(true);
                                  }}
                                  variant="outline"
                                  size="sm" 
                                  className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-500 text-xs h-8 px-2.5"
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                                </Button>
                              </>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 border border-stone-250 rounded-lg px-2.5 py-1 dark:bg-slate-900 dark:border-slate-800">
                                <Lock className="h-3 w-3" /> Locked
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-xs text-slate-400">No daybook sheets awaiting HQ review.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Expense Overrides */}
        <TabsContent value="expenses" className="pt-6">
          <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 rounded-2xl shadow-sm">
            <CardHeader className="px-0 pt-0 pb-6 border-b border-slate-100 dark:border-slate-900">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Expense Overrides Requiring HQ Approval</CardTitle>
              <CardDescription>Petty cash expense vouchers exceeding the branch limit (₹1,500).</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-slate-800">
                    <TableHead>Date</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Voucher Value</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length > 0 ? (
                    expenses.map((exp) => {
                      const branchName = branches.find(b => b.id === exp.branch_id)?.name || 'Unknown Branch';
                      return (
                        <TableRow key={exp.id} className="border-slate-100 dark:border-slate-900">
                          <TableCell className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                            {new Date(exp.created_at).toLocaleDateString('en-IN')}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900 dark:text-white">{branchName}</TableCell>
                          <TableCell className="text-slate-500 text-sm">{exp.description}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-rose-600">{formatRupee(Number(exp.amount))}</TableCell>
                          <TableCell className="text-right py-3">
                            <Button 
                              onClick={() => handleApproveExpense(exp.id)}
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                            >
                              Approve Voucher
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-400">No expense vouchers exceed threshold limits.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Period Locking */}
        <TabsContent value="periods" className="pt-6">
          <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 rounded-2xl shadow-sm">
            <CardHeader className="px-0 pt-0 pb-6 flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-900">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Financial Accounting Periods</CardTitle>
                <CardDescription>Lock calendar periods to prevent historic database modifications during audits.</CardDescription>
              </div>
              <Dialog open={newPeriodOpen} onOpenChange={setNewPeriodOpen}>
                <DialogTrigger render={
                  <Button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-1.5 h-9">
                    <Plus className="h-4 w-4" /> Open New Period
                  </Button>
                } />
                <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border dark:border-slate-800">
                  <DialogHeader>
                    <DialogTitle>Open New Financial Period</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={periodForm.handleSubmit(handleCreatePeriod)} className="space-y-4">
                    <div>
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input id="start_date" placeholder="YYYY-MM-DD" {...periodForm.register('start_date')} className="mt-1" />
                      {periodForm.formState.errors.start_date && (
                        <p className="text-xs text-rose-500 mt-1">{periodForm.formState.errors.start_date.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="end_date">End Date</Label>
                      <Input id="end_date" placeholder="YYYY-MM-DD" {...periodForm.register('end_date')} className="mt-1" />
                      {periodForm.formState.errors.end_date && (
                        <p className="text-xs text-rose-500 mt-1">{periodForm.formState.errors.end_date.message}</p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">Save Period</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="px-0 pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-slate-800">
                    <TableHead>Period Boundaries</TableHead>
                    <TableHead>Lock Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.length > 0 ? (
                    periods.map((p) => (
                      <TableRow key={p.id} className="border-slate-100 dark:border-slate-900">
                        <TableCell className="font-semibold text-slate-700 dark:text-slate-300 py-4 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span>
                            {new Date(p.start_date).toLocaleDateString('en-IN')} to {new Date(p.end_date).toLocaleDateString('en-IN')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-0.5 border ${
                            p.is_locked 
                              ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20' 
                              : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20'
                          }`}>
                            {p.is_locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                            <span>{p.is_locked ? 'LOCKED' : 'OPEN'}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <Button 
                            onClick={() => handleTogglePeriodLock(p.id, p.is_locked)}
                            variant="outline" 
                            size="sm" 
                            className={`h-8 border-slate-200 dark:border-slate-800 ${
                              p.is_locked ? 'text-emerald-600 hover:text-emerald-500' : 'text-rose-600 hover:text-rose-500'
                            }`}
                          >
                            {p.is_locked ? 'Unlock Period' : 'Lock Period'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-xs text-slate-400">No financial periods defined.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rejection Reasons Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Provide Rejection Reason</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Label htmlFor="reject_reason">Mandatory Audit Comments</Label>
            <textarea
              id="reject_reason"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide clear reasons for rejecting the cash sheet reconciliation..."
              className="w-full rounded-md border border-slate-300 dark:border-slate-800 bg-transparent p-2.5 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />
          </div>
          <DialogFooter>
            <Button 
              onClick={handleRejectDaybook}
              disabled={!rejectionReason.trim()}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold"
            >
              Submit Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
