'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Wallet,
  Building,
  Coins,
  Receipt,
  ShoppingBag,
  Info,
  ClipboardList,
  Lock,
  Unlock,
  XCircle,
  RefreshCw
} from 'lucide-react';

// Form Validation Schemas
const openDaybookSchema = z.object({
  opening_cash: z.coerce.number().nonnegative('Opening cash must be 0 or greater'),
  bank_opening_balance: z.coerce.number().nonnegative('Bank opening balance must be 0 or greater'),
});

const expenseSchema = z.object({
  expense_category_id: z.string().uuid('Please select a category'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  description: z.string().min(5, 'Description must be at least 5 characters long'),
  payment_mode: z.enum(['cash', 'bank']),
});

const purchaseSchema = z.object({
  vendor_id: z.string().uuid('Please select a vendor'),
  purchase_head_id: z.string().uuid('Please select a purchase head'),
  invoice_number: z.string().min(1, 'Invoice number is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  payment_mode: z.enum(['cash', 'bank', 'credit']),
});

const incomeSchema = z.object({
  source: z.string().min(3, 'Source must be at least 3 characters long'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  payment_method: z.enum(['cash', 'gpay', 'card']),
  description: z.string().optional(),
});

type OpenDaybookForm = z.infer<typeof openDaybookSchema>;
type ExpenseForm = z.infer<typeof expenseSchema>;
type PurchaseForm = z.infer<typeof purchaseSchema>;
type IncomeForm = z.infer<typeof incomeSchema>;

interface Denomination {
  val: number;
  label: string;
  field: string;
}

function DaybookContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab Syncing
  const activeTab = searchParams.get('tab') || 'sales';
  const handleTabChange = (tabId: string) => {
    router.push(`/daybook?tab=${tabId}`);
  };

  const [daybook, setDaybook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active daybook lists
  const [expenses, setExpenses] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [incomeList, setIncomeList] = useState<any[]>([]);
  const [salesTransactions, setSalesTransactions] = useState<any[]>([]);

  // Selection Dropdowns
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [heads, setHeads] = useState<any[]>([]);

  // Modal Dialogs Toggles
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);

  // Sales Splits State
  const [salesSplits, setSalesSplits] = useState({
    systemSales: 0,
    gpay: 0,
    card: 0,
    swiggy: 0,
    zomato: 0,
    online: 0,
  });

  // Denominations State
  const [denomCounts, setDenomCounts] = useState<Record<string, number>>({
    denom_500: 0,
    denom_200: 0,
    denom_100: 0,
    denom_50: 0,
    denom_20: 0,
    denom_10: 0,
    denom_5: 0,
    denom_2: 0,
    denom_1: 0,
    denom_coins: 0,
  });

  // Bank flow State
  const [bankOpening, setBankOpening] = useState(0);
  const [bankDeposits, setBankDeposits] = useState(0);
  const [bankWithdrawals, setBankWithdrawals] = useState(0);
  const [justification, setJustification] = useState('');
  
  // Custom states for monthly cost percentage analysis & workflow role
  const [monthlyPurchases, setMonthlyPurchases] = useState<any[]>([]);
  const [monthlySalesTotal, setMonthlySalesTotal] = useState<number>(0);
  const [userRole, setUserRole] = useState<string>('cashier');
  
  // Rejection reason popups
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Form Handlers
  const openForm = useForm<OpenDaybookForm>({ resolver: zodResolver(openDaybookSchema) as any });
  const expForm = useForm<ExpenseForm>({ resolver: zodResolver(expenseSchema) as any });
  const purForm = useForm<PurchaseForm>({ resolver: zodResolver(purchaseSchema) as any });
  const incForm = useForm<IncomeForm>({ resolver: zodResolver(incomeSchema) as any });

  const denominationList: Denomination[] = [
    { val: 500, label: '₹500 Note', field: 'denom_500' },
    { val: 200, label: '₹200 Note', field: 'denom_200' },
    { val: 100, label: '₹100 Note', field: 'denom_100' },
    { val: 50, label: '₹50 Note', field: 'denom_50' },
    { val: 20, label: '₹20 Note', field: 'denom_20' },
    { val: 10, label: '₹10 Note', field: 'denom_10' },
    { val: 5, label: '₹5 Bill/Coin', field: 'denom_5' },
    { val: 2, label: '₹2 Bill/Coin', field: 'denom_2' },
    { val: 1, label: '₹1 Bill/Coin', field: 'denom_1' },
    { val: 1, label: 'Other Coins', field: 'denom_coins' },
  ];

  const formatRupee = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  };

  const renderWorkflowFooter = () => {
    if (!daybook) return null;
    return (
      <div className="pt-4 pb-6 flex flex-col sm:flex-row gap-3 border-t border-stone-100 dark:border-slate-900 bg-stone-50/20 py-4 px-6">
        {isEditable && (
          <>
            <Button 
              onClick={() => handleSaveDraft(false)}
              className="flex-1 border border-stone-250 bg-white hover:bg-stone-50 text-slate-850 font-bold py-5 rounded-xl flex items-center justify-center gap-2 shadow-sm dark:bg-stone-900 dark:border-slate-850 dark:text-slate-100 transition-all h-11 text-xs"
            >
              <Save className="h-4 w-4" /> Manual Save Draft
            </Button>
            <Button 
              onClick={handleSubmitDaybook}
              disabled={isSalesInvalid}
              className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all h-11 text-xs"
            >
              <CheckCircle2 className="h-4 w-4" /> Submit to Area Manager
            </Button>
          </>
        )}

        {daybook.status === 'submitted' && (
          <div className="w-full flex items-center gap-2 justify-center p-3 rounded-xl border border-amber-250 bg-amber-50/20 text-amber-700 font-bold text-xs">
            <Lock className="h-4 w-4" />
            <span>Submitted - Awaiting Branch Manager Approval</span>
          </div>
        )}

        {daybook.status === 'branch_approved' && (
          <div className="w-full flex items-center gap-2 justify-center p-3 rounded-xl border border-blue-200 bg-blue-50/20 text-blue-700 font-bold text-xs">
            <Lock className="h-4 w-4" />
            <span>Awaiting Finance Approval & Lock</span>
          </div>
        )}

        {daybook.status === 'approved' && (
          <div className="w-full flex items-center gap-2 justify-center p-3 rounded-xl border border-emerald-250 bg-emerald-50/20 text-emerald-700 font-bold text-xs">
            <Lock className="h-4 w-4" />
            <span>Locked & Approved by Finance</span>
          </div>
        )}
      </div>
    );
  };

  async function loadActiveDaybook() {
    try {
      setLoading(true);
      setErrorMsg(null);

      const todayString = new Date().toISOString().split('T')[0];
      const { data: db, error } = await supabase
        .from('daybooks')
        .select('*')
        .eq('business_date', todayString)
        .maybeSingle();

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Query user's role for workflow options
        const { data: userProfile } = await supabase
          .from('users')
          .select('role_id')
          .eq('id', user.id)
          .maybeSingle();
        
        if (userProfile?.role_id) {
          const { data: roleObj } = await supabase
            .from('roles')
            .select('role_name')
            .eq('id', userProfile.role_id)
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

      if (db) {
        setDaybook(db);
        setJustification(db.variance_justification || '');
        setBankOpening(Number(db.bank_opening_balance) || 0);
        setBankDeposits(Number(db.bank_deposits) || 0);
        setBankWithdrawals(Number(db.bank_withdrawals) || 0);

        const { data: exp } = await supabase.from('expenses').select('*').eq('daybook_id', db.id);
        const { data: pur } = await supabase.from('purchases').select('*').eq('daybook_id', db.id);
        const { data: inc } = await supabase.from('income').select('*').eq('daybook_id', db.id);
        const { data: sales } = await supabase.from('sales_transactions').select('*').eq('daybook_id', db.id);

        setExpenses(exp || []);
        setPurchases(pur || []);
        setIncomeList(inc || []);
        setSalesTransactions(sales || []);

        const cashAmt = Number(db.sales_cash) || 0;
        const gpayAmt = Number(db.sales_gpay) || 0;
        const cardAmt = Number(db.sales_card) || 0;
        const swiggyAmt = Number(db.sales_swiggy) || 0;
        const zomatoAmt = Number(db.sales_zomato) || 0;
        const onlineAmt = Number(db.sales_online) || 0;

        setSalesSplits({
          systemSales: cashAmt + gpayAmt + cardAmt + swiggyAmt + zomatoAmt + onlineAmt,
          gpay: gpayAmt,
          card: cardAmt,
          swiggy: swiggyAmt,
          zomato: zomatoAmt,
          online: onlineAmt,
        });

        setDenomCounts({
          denom_500: db.denom_500 || 0,
          denom_200: db.denom_200 || 0,
          denom_100: db.denom_100 || 0,
          denom_50: db.denom_50 || 0,
          denom_20: db.denom_20 || 0,
          denom_10: db.denom_10 || 0,
          denom_5: db.denom_5 || 0,
          denom_2: db.denom_2 || 0,
          denom_1: db.denom_1 || 0,
          denom_coins: db.denom_coins || 0,
        });

        // Load monthly costs to compute Purchase % comparison
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
        
        const { data: mPurchases } = await supabase
          .from('purchases')
          .select('amount, purchase_head_id')
          .gte('invoice_date', startOfMonthStr);

        const { data: mSales } = await supabase
          .from('sales_transactions')
          .select('amount_net')
          .gte('transaction_timestamp', startOfMonthStr);

        setMonthlyPurchases(mPurchases || []);
        setMonthlySalesTotal(mSales?.reduce((acc: number, r: any) => acc + Number(r.amount_net), 0) || 0);

      } else {
        setDaybook(null);
      }
    } catch {
      setErrorMsg('Could not read daybook database. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActiveDaybook();

    async function loadSelectData() {
      const { data: cat } = await supabase.from('expense_categories').select('id, name');
      const { data: vnd } = await supabase.from('vendors').select('id, name');
      const { data: hd } = await supabase.from('purchase_heads').select('id, name');
      setCategories(cat || []);
      setVendors(vnd || []);
      setHeads(hd || []);
    }
    loadSelectData();
  }, [supabase]);

  // Calculations
  const isEditable = daybook && (daybook.status === 'draft' || daybook.status === 'rejected');

  const calculatedCash = salesSplits.systemSales - (salesSplits.gpay + salesSplits.card + salesSplits.swiggy + salesSplits.zomato + salesSplits.online);
  const totalSalesSplits = salesSplits.systemSales;
  const netSales = (totalSalesSplits * 100) / 105;

  const totalPurchasesValue = purchases.reduce((acc: number, row: any) => acc + Number(row.amount), 0);
  const foodCostPercent = netSales > 0 ? (totalPurchasesValue / netSales) * 100 : 0;

  const totalCashSales = calculatedCash;
  const totalCashExpenses = expenses.filter((e: any) => e.payment_mode === 'cash' && e.is_approved).reduce((a: number, b: any) => a + Number(b.amount), 0);
  const totalCashPurchases = purchases.filter((p: any) => p.payment_mode === 'cash').reduce((a: number, b: any) => a + Number(b.amount), 0);
  const totalCashIncome = incomeList.filter((i: any) => i.payment_method === 'cash').reduce((a: number, b: any) => a + Number(b.amount), 0);

  const expectedCash = daybook 
    ? Number(daybook.opening_cash) + totalCashSales + totalCashIncome - totalCashPurchases - totalCashExpenses - bankDeposits + bankWithdrawals
    : 0;

  const actualCash = userRole === 'outlet_manager' && daybook
    ? Number(daybook.physical_cash) || 0
    : denominationList.reduce((acc: number, row: any) => acc + (row.val * (denomCounts[row.field] || 0)), 0);
  const cashDifference = actualCash - expectedCash;
  const isSalesInvalid = calculatedCash < 0;

  // Background Auto-Save
  useEffect(() => {
    if (!daybook || !isEditable) return;
    const saveTimer = setTimeout(() => {
      handleSaveDraft(true);
    }, 1500);

    return () => clearTimeout(saveTimer);
  }, [salesSplits, denomCounts, bankDeposits, bankWithdrawals, justification, daybook?.opening_cash, daybook?.physical_cash, bankOpening]);

  const handleOpenDaybook = async (values: OpenDaybookForm) => {
    try {
      setErrorMsg(null);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('users')
        .select('tenant_id, primary_branch_id')
        .eq('id', user?.id)
        .single();

      if (!user || !profile) {
        setErrorMsg('User profile session not found. Please log in again.');
        return;
      }

      const { error } = await supabase
        .from('daybooks')
        .insert({
          tenant_id: profile.tenant_id,
          branch_id: profile.primary_branch_id,
          business_date: new Date().toISOString().split('T')[0],
          opening_cash: values.opening_cash,
          bank_opening_balance: values.bank_opening_balance,
          status: 'draft',
          created_by: user.id,
        });

      if (error) {
        setErrorMsg(error.message);
        return;
      }
      loadActiveDaybook();
    } catch {
      setErrorMsg('Failed to open daybook.');
    }
  };

  const handleSaveDraft = async (silent = false) => {
    if (!daybook) return;
    if (isSalesInvalid) {
      if (!silent) alert('Cannot save: Cash sales calculation is negative. Adjust splits.');
      return;
    }
    try {
      if (!silent) setLoading(true);
      else setSavingDraft(true);
      setErrorMsg(null);
      if (!silent) setSuccessMsg(null);

      // Save sales splits including calculated cash
      const splitsToSave = {
        cash: calculatedCash,
        gpay: salesSplits.gpay,
        card: salesSplits.card,
        swiggy: salesSplits.swiggy,
        zomato: salesSplits.zomato,
        online: salesSplits.online,
      };

      for (const [method, amount] of Object.entries(splitsToSave)) {
        const invoiceNo = `DAILY_SUM_${method.toUpperCase()}_${daybook.id}`;
        const existingTx = salesTransactions.find(tx => tx.payment_method === method);

        if (existingTx) {
          await supabase
            .from('sales_transactions')
            .update({
              amount_gross: amount,
              amount_net: amount,
            })
            .eq('id', existingTx.id);
        } else {
          if (amount >= 0) {
            await supabase
              .from('sales_transactions')
              .insert({
                tenant_id: daybook.tenant_id,
                branch_id: daybook.branch_id,
                daybook_id: daybook.id,
                invoice_number: invoiceNo,
                payment_method: method,
                amount_gross: amount,
                amount_discount: 0,
                amount_tax: 0,
                amount_net: amount,
              });
          }
        }
      }

      // Update daybook details with extended denominations
      const { error } = await supabase
        .from('daybooks')
        .update({
          opening_cash: daybook.opening_cash,
          bank_opening_balance: bankOpening,
          physical_cash: actualCash,
          bank_deposits: bankDeposits,
          bank_withdrawals: bankWithdrawals,
          denom_500: denomCounts.denom_500,
          denom_200: denomCounts.denom_200,
          denom_100: denomCounts.denom_100,
          denom_50: denomCounts.denom_50,
          denom_20: denomCounts.denom_20,
          denom_10: denomCounts.denom_10,
          denom_5: denomCounts.denom_5,
          denom_2: denomCounts.denom_2,
          denom_1: denomCounts.denom_1,
          denom_coins: denomCounts.denom_coins,
          variance_justification: justification || null,
        })
        .eq('id', daybook.id);

      if (error) throw error;

      if (!silent) {
        setSuccessMsg('Daybook draft saved successfully.');
        await loadActiveDaybook();
      } else {
        const { data: sales } = await supabase.from('sales_transactions').select('*').eq('daybook_id', daybook.id);
        setSalesTransactions(sales || []);
      }
    } catch (err: any) {
      if (!silent) setErrorMsg(err.message || 'Failed to save draft.');
    } finally {
      if (!silent) setLoading(false);
      else setSavingDraft(false);
    }
  };

  const handleApproveWorkflow = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('approve_daybook', {
        p_daybook_id: daybook.id,
        p_user_id: user.id
      });
      if (error) throw error;
      setSuccessMsg('Daybook approval phase processed.');
      await loadActiveDaybook();
    } catch (err: any) {
      setErrorMsg(err.message || 'Workflow approval failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectWorkflow = async () => {
    if (!rejectionReason.trim()) {
      alert('A comment justification is mandatory when rejecting sheets.');
      return;
    }
    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('reject_daybook', {
        p_daybook_id: daybook.id,
        p_user_id: user.id,
        p_reason: rejectionReason
      });
      if (error) throw error;
      setRejectOpen(false);
      setRejectionReason('');
      setSuccessMsg('Daybook sheet rejected back to draft.');
      await loadActiveDaybook();
    } catch (err: any) {
      setErrorMsg(err.message || 'Rejection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReopenWorkflow = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const { error } = await supabase.rpc('reopen_daybook', {
        p_daybook_id: daybook.id
      });
      if (error) throw error;
      setSuccessMsg('Daybook unlocked and reopened for correction.');
      await loadActiveDaybook();
    } catch (err: any) {
      setErrorMsg(err.message || 'Reopen failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (values: ExpenseForm) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          tenant_id: daybook.tenant_id,
          branch_id: daybook.branch_id,
          daybook_id: daybook.id,
          expense_category_id: values.expense_category_id,
          amount: values.amount,
          description: values.description,
          payment_mode: values.payment_mode,
          requires_hq_approval: values.amount > 1500.00,
          is_approved: values.amount <= 1500.00,
        });

      if (error) throw error;
      setExpenseOpen(false);
      expForm.reset();
      await loadActiveDaybook();
    } catch (err: any) {
      alert(err.message || 'Error saving expense');
    }
  };

  const handleAddPurchase = async (values: PurchaseForm) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .insert({
          tenant_id: daybook.tenant_id,
          branch_id: daybook.branch_id,
          daybook_id: daybook.id,
          vendor_id: values.vendor_id,
          purchase_head_id: values.purchase_head_id,
          invoice_number: values.invoice_number,
          invoice_date: new Date().toISOString().split('T')[0],
          amount: values.amount,
          payment_mode: values.payment_mode,
          payment_status: values.payment_mode === 'credit' ? 'unpaid' : 'paid',
        });

      if (error) throw error;
      setPurchaseOpen(false);
      purForm.reset();
      await loadActiveDaybook();
    } catch (err: any) {
      alert(err.message || 'Error saving purchase');
    }
  };

  const handleAddIncome = async (values: IncomeForm) => {
    try {
      const { error } = await supabase
        .from('income')
        .insert({
          tenant_id: daybook.tenant_id,
          branch_id: daybook.branch_id,
          daybook_id: daybook.id,
          source: values.source,
          amount: values.amount,
          payment_method: values.payment_method,
          description: values.description,
        });

      if (error) throw error;
      setIncomeOpen(false);
      incForm.reset();
      await loadActiveDaybook();
    } catch (err: any) {
      alert(err.message || 'Error saving income log');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      await loadActiveDaybook();
    } catch (err: any) {
      alert(err.message || 'Error deleting expense');
    }
  };

  const handleDeletePurchase = async (id: string) => {
    try {
      const { error } = await supabase.from('purchases').delete().eq('id', id);
      if (error) throw error;
      await loadActiveDaybook();
    } catch (err: any) {
      alert(err.message || 'Error deleting purchase');
    }
  };

  const handleDeleteIncome = async (id: string) => {
    try {
      const { error } = await supabase.from('income').delete().eq('id', id);
      if (error) throw error;
      await loadActiveDaybook();
    } catch (err: any) {
      alert(err.message || 'Error deleting income log');
    }
  };

  const handleSubmitDaybook = async () => {
    if (userRole !== 'outlet_manager' && Math.abs(cashDifference) > 0 && !justification.trim()) {
      alert('Justification comments are mandatory when a cash variance exists.');
      return;
    }

    try {
      setLoading(true);
      await handleSaveDraft(true);

      const { error } = await supabase
        .from('daybooks')
        .update({
          status: 'submitted',
          closed_at: new Date().toISOString(),
        })
        .eq('id', daybook.id);

      if (error) throw error;
      await loadActiveDaybook();
    } catch (err: any) {
      alert(err.message || 'Failed to submit daybook');
    } finally {
      setLoading(false);
    }
  };

  const handleDenomChange = (field: string, val: string) => {
    const parsed = parseInt(val) || 0;
    setDenomCounts(prev => ({ ...prev, [field]: parsed }));
  };

  const handleSplitChange = (channel: string, val: string) => {
    const parsed = parseFloat(val) || 0;
    setSalesSplits(prev => ({ ...prev, [channel]: parsed }));
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-350 border-t-primary"></div>
        <p className="text-sm font-semibold text-slate-500">Loading daily worksheet...</p>
      </div>
    );
  }

  // Daybook Closed / Not Initialized Initial State
  if (!daybook) {
    return (
      <div className="mx-auto max-w-md mt-16 px-4">
        <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-xl rounded-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Wallet className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Initialize Daybook</CardTitle>
            <CardDescription className="text-slate-500 text-sm">
              Provide starting cash float and bank opening balance to open today's outlet sheet.
            </CardDescription>
          </CardHeader>
          <form onSubmit={openForm.handleSubmit(handleOpenDaybook)}>
            <CardContent className="space-y-4 pt-4">
              {errorMsg && (
                <div className="p-3 text-xs bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="opening_cash" className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Starting Cash Float (₹)
                </Label>
                <Input
                  id="opening_cash"
                  type="number"
                  step="0.01"
                  placeholder="₹10,000.00"
                  className={`font-semibold text-lg h-12 focus:ring-primary ${openForm.formState.errors.opening_cash ? 'border-rose-500' : 'border-stone-200'}`}
                  {...openForm.register('opening_cash')}
                />
                {openForm.formState.errors.opening_cash && (
                  <p className="text-xs text-rose-500">{openForm.formState.errors.opening_cash.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bank_opening_balance" className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Bank Opening Balance (₹)
                </Label>
                <Input
                  id="bank_opening_balance"
                  type="number"
                  step="0.01"
                  placeholder="₹50,000.00"
                  className={`font-semibold text-lg h-12 focus:ring-primary ${openForm.formState.errors.bank_opening_balance ? 'border-rose-500' : 'border-stone-200'}`}
                  {...openForm.register('bank_opening_balance')}
                />
                {openForm.formState.errors.bank_opening_balance && (
                  <p className="text-xs text-rose-500">{openForm.formState.errors.bank_opening_balance.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2 pb-6">
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 rounded-xl shadow-md transition-all duration-200">
                Initialize Shift Open
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // List of active tabs
  const tabs = [
    { id: 'sales', label: 'Daily Sales 📈', icon: ClipboardList },
    { id: 'purchases', label: 'Items Bought 🛒', icon: ShoppingBag },
    { id: 'expenses', label: 'Shop Expenses 💸', icon: Receipt },
    { id: 'bank', label: 'Safe Box & Bank 🏦', icon: Building },
    { id: 'cashbook', label: 'Cash Counter 🪙', icon: Coins },
  ].filter(tab => {
    if (userRole === 'outlet_manager') {
      return tab.id === 'sales' || tab.id === 'purchases' || tab.id === 'expenses';
    }
    return true;
  });

  // Tab live progress metrics helpers
  const getTabLiveValue = (id: string) => {
    switch (id) {
      case 'sales':
        return formatRupee(totalSalesSplits);
      case 'purchases':
        return formatRupee(totalPurchasesValue);
      case 'expenses':
        return formatRupee(expenses.reduce((sum: number, e: any) => sum + (e.is_approved ? Number(e.amount) : 0), 0));
      case 'bank':
        return bankDeposits > 0 || bankWithdrawals > 0 
          ? `In: ${formatRupee(bankDeposits)} / Out: ${formatRupee(bankWithdrawals)}` 
          : 'No bank flows';
      case 'cashbook':
        return formatRupee(actualCash);
      default:
        return '';
    }
  };

  const getTabStatus = (id: string) => {
    switch (id) {
      case 'sales':
        return isSalesInvalid ? 'error' : totalSalesSplits > 0 ? 'success' : 'empty';
      case 'purchases':
        return purchases.length > 0 ? 'success' : 'empty';
      case 'expenses':
        return expenses.length > 0 ? 'success' : 'empty';
      case 'bank':
        return (bankDeposits > 0 || bankWithdrawals > 0) ? 'success' : 'empty';
      case 'cashbook':
        return actualCash > 0 ? 'success' : 'empty';
      default:
        return 'empty';
    }
  };

  const successTabsCount = ['sales', 'purchases', 'expenses', 'bank', 'cashbook']
    .map(getTabStatus)
    .filter(status => status === 'success').length;
  const progressPercent = (successTabsCount / 5) * 100;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-4 md:px-6">
      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Daily Daybook Worksheet</h1>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wide ${
              daybook.status === 'draft' 
                ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/50' 
                : daybook.status === 'submitted'
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20'
                : daybook.status === 'approved'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20'
                : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20'
            }`}>
              {daybook.status}
            </span>
            {daybook.status === 'draft' && (
              <span className="text-[10px] text-stone-500 font-medium flex items-center gap-1.5 ml-2 bg-stone-100 dark:bg-stone-900 px-2 py-0.5 rounded-full">
                {savingDraft ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span>Auto-saving draft...</span>
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Draft auto-saved</span>
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Log your daily sales, items bought, shop expenses, bank/safe box flows, and cash counter.
          </p>
        </div>
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-stone-100/50 dark:bg-slate-900 border dark:border-slate-800 px-4 py-2 rounded-xl">
          Business Date: {new Date(daybook.business_date).toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </div>
      </div>

      {/* Rejection Notification Banner */}
      {daybook.status === 'rejected' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/10 text-sm text-rose-800 dark:text-rose-400 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Daybook Rejected by Area Manager/HQ</p>
              <p className="mt-1 text-xs text-rose-700 dark:text-rose-500">
                <strong>HQ Comment:</strong> {daybook.variance_justification || 'No reason provided.'}
              </p>
            </div>
          </div>
          <Button 
            onClick={async () => {
              try {
                const { error } = await supabase
                  .from('daybooks')
                  .update({ status: 'draft' })
                  .eq('id', daybook.id);
                if (error) throw error;
                loadActiveDaybook();
              } catch (err: any) {
                alert(err.message || 'Failed to re-open daybook');
              }
            }}
            className="bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs px-4 h-9 shadow-sm shrink-0"
          >
            Re-open for Correction
          </Button>
        </div>
      )}

      {/* Three Panel Workspace Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        
        {/* PANEL 1: Left Step Navigator & Progress (xl:col-span-3) */}
        {userRole !== 'outlet_manager' && (
          <div className="xl:col-span-3 space-y-4">
            <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-4 rounded-2xl shadow-sm flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Daybook Progress</span>
                  <span className="text-xs font-mono font-black text-primary">{successTabsCount}/5 filled</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <nav className="flex flex-col gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.id;
                  const status = getTabStatus(tab.id);
                  const liveVal = getTabLiveValue(tab.id);

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full flex flex-col gap-1 items-start text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/10'
                          : 'bg-white border-stone-200 hover:bg-stone-50 hover:border-stone-300 text-stone-700 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-350 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 w-full">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="text-[11px] font-extrabold uppercase tracking-wider flex-1">{tab.label}</span>
                        {status === 'success' && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10 shrink-0" />
                        )}
                        {status === 'error' && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 ring-4 ring-rose-500/10 shrink-0" />
                        )}
                        {status === 'empty' && (
                          <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                        )}
                      </div>
                      {liveVal && (
                        <span className={`text-[10px] font-extrabold font-mono ml-6.5 ${isSelected ? 'text-primary-foreground/80' : 'text-slate-500'}`}>
                          {liveVal}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </Card>
          </div>
        )}

        {/* PANEL 2: Center Active Worksheet Form (xl:col-span-6 or col-span-12) */}
        <div className={userRole === 'outlet_manager' ? "col-span-12 max-w-4xl mx-auto w-full space-y-6" : "xl:col-span-6 space-y-6"}>
                  {activeTab === 'sales' && (
            <div className="space-y-6">
              <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-stone-100 dark:border-slate-900 bg-stone-50/50 dark:bg-slate-950/20 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold tracking-tight text-slate-800 dark:text-white">Daily Sales Receipts (₹)</CardTitle>
                      <CardDescription className="text-xs">Enter your POS system sales and how your customers paid (UPI, Swiggy, Card, etc.). Cash is calculated automatically.</CardDescription>
                    </div>
                    <div className="text-lg font-extrabold font-mono text-primary">
                      Total Billing: {formatRupee(totalSalesSplits)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
                  {(() => {
                    const itemsToRender = [
                      { key: 'systemSales', label: 'Total Sales', icon: ClipboardList, color: 'text-primary' },
                      { key: 'gpay', label: 'UPI / G-Pay Sales', icon: CreditCard, color: 'text-indigo-500' },
                      { key: 'card', label: 'Credit Card / Card Sales', icon: CreditCard, color: 'text-blue-500' },
                      { key: 'swiggy', label: 'Swiggy', icon: TrendingUp, color: 'text-orange-500' },
                      { key: 'zomato', label: 'Zomato', icon: TrendingUp, color: 'text-rose-500' },
                      ...(userRole !== 'outlet_manager' ? [{ key: 'online', label: 'Other Online Orders', icon: ArrowRight, color: 'text-slate-500' }] : []),
                    ];

                    return itemsToRender.map(item => (
                      <div key={item.key} className="space-y-1.5 p-4 rounded-xl border border-stone-100 dark:border-stone-900 bg-stone-50/10">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide">
                          <item.icon className={`h-4 w-4 ${item.color}`} />
                          <span>{item.label}</span>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={!isEditable}
                          value={salesSplits[item.key as keyof typeof salesSplits] || ''}
                          placeholder="₹0.00"
                          onChange={(e) => handleSplitChange(item.key, e.target.value)}
                          className="font-bold font-mono text-lg h-12 text-slate-800 dark:text-slate-100 focus:ring-primary"
                        />
                      </div>
                    ));
                  })()}

                  {/* Auto Calculated Cash Sales */}
                  <div className="space-y-1.5 p-4 rounded-xl border border-stone-100 dark:border-stone-900 bg-stone-50/10 col-span-1 sm:col-span-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide">
                      <Wallet className="h-4 w-4 text-emerald-500" />
                      <span>Calculated Cash Sales (Auto-computed)</span>
                    </div>
                    <div className={`font-bold font-mono text-xl h-12 flex items-center px-3 rounded-lg border bg-stone-100/50 text-slate-850 dark:text-slate-100 ${isSalesInvalid ? 'border-rose-300 text-rose-600 bg-rose-50/20' : 'border-stone-200'}`}>
                      {formatRupee(calculatedCash)}
                    </div>
                    {isSalesInvalid && (
                      <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Warning: Your digital payments exceed the total billed sales. Cash sales cannot be negative.</span>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Cash & Bank Excel Summaries */}
              {userRole === 'outlet_manager' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in-50 duration-200">
                  
                  {/* Card 3: Closing Drawer Summary (Cash) */}
                  <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-stone-100 dark:border-slate-900 bg-stone-50/50 dark:bg-slate-950/20 py-4">
                      <CardTitle className="text-base font-bold tracking-tight text-slate-800 dark:text-white">Closing Drawer Summary (Cash)</CardTitle>
                      <CardDescription className="text-xs">Verify cash drawer closing balance and calculate excess or short cash.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      
                      <div className="grid grid-cols-2 gap-4">
                        {/* Opening Cash Input */}
                        <div className="space-y-1.5">
                          <Label htmlFor="mgr-opening-cash" className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Opening Cash (₹)
                          </Label>
                          <Input
                            id="mgr-opening-cash"
                            type="number"
                            step="0.01"
                            disabled={!isEditable}
                            value={daybook.opening_cash || ''}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setDaybook({ ...daybook, opening_cash: val });
                            }}
                            className="font-bold font-mono text-base h-11 text-slate-800 dark:text-slate-100 focus:ring-primary"
                            placeholder="₹0.00"
                          />
                        </div>

                        {/* Calculated Cash Sales */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                            Calculated Cash Sales
                          </span>
                          <div className="font-bold font-mono text-base h-11 flex items-center px-3 rounded-lg border border-stone-200 bg-stone-100/50 text-slate-850 dark:text-slate-100">
                            {formatRupee(totalCashSales)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Total Purchases */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                            Total Purchases (Cash)
                          </span>
                          <div className="font-bold font-mono text-base h-11 flex items-center px-3 rounded-lg border border-stone-200 bg-stone-100/50 text-slate-850 dark:text-slate-100">
                            {formatRupee(totalCashPurchases)}
                          </div>
                        </div>

                        {/* Total Expenses */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                            Total Expenses (Cash)
                          </span>
                          <div className="font-bold font-mono text-base h-11 flex items-center px-3 rounded-lg border border-stone-200 bg-stone-100/50 text-slate-850 dark:text-slate-100">
                            {formatRupee(totalCashExpenses)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Expected Closing Cash */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                            Expected Cash
                          </span>
                          <div className="font-bold font-mono text-base h-11 flex items-center px-3 rounded-lg border border-stone-200 bg-stone-100/50 text-slate-850 dark:text-slate-100">
                            {formatRupee(expectedCash)}
                          </div>
                        </div>

                        {/* Cash in Hand Input */}
                        <div className="space-y-1.5">
                          <Label htmlFor="mgr-physical-cash" className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Cash in Hand
                          </Label>
                          <Input
                            id="mgr-physical-cash"
                            type="number"
                            step="0.01"
                            disabled={!isEditable}
                            value={daybook.physical_cash || ''}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setDaybook({ ...daybook, physical_cash: val });
                            }}
                            className="font-bold font-mono text-base h-11 text-slate-800 dark:text-slate-100 focus:ring-primary"
                            placeholder="₹0.00"
                          />
                        </div>
                      </div>

                      {/* Excess / Short */}
                      <div className="space-y-1.5 pt-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                          Excess / Short (₹)
                        </span>
                        <div className={`font-bold font-mono text-lg h-11 flex items-center px-3 rounded-lg border ${
                          cashDifference === 0 
                            ? 'border-emerald-200 bg-emerald-50/20 text-emerald-700' 
                            : cashDifference < 0 
                              ? 'border-rose-200 bg-rose-50/20 text-rose-600' 
                              : 'border-amber-200 bg-amber-50/20 text-amber-700'
                        }`}>
                          {cashDifference > 0 ? `+${formatRupee(cashDifference)}` : formatRupee(cashDifference)}
                          {cashDifference === 0 && ' (Perfect Balance)'}
                          {cashDifference < 0 && ' (Short)'}
                          {cashDifference > 0 && ' (Excess)'}
                        </div>
                      </div>

                    </CardContent>
                  </Card>

                  {/* Card 4: Closing Bank Summary (Bank) */}
                  <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden animate-in fade-in-50 duration-200">
                    <CardHeader className="border-b border-stone-100 dark:border-slate-900 bg-stone-50/50 dark:bg-slate-955/20 py-4">
                      <CardTitle className="text-base font-bold tracking-tight text-slate-800 dark:text-white">Closing Bank Summary (Excel)</CardTitle>
                      <CardDescription className="text-xs">Verify bank opening balance, UPI / digital settlements, and closing balance.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      
                      <div className="grid grid-cols-2 gap-4">
                        {/* Opening Bank Input */}
                        <div className="space-y-1.5">
                          <Label htmlFor="mgr-bank-opening" className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Opening Bank (₹)
                          </Label>
                          <Input
                            id="mgr-bank-opening"
                            type="number"
                            step="0.01"
                            disabled={!isEditable}
                            value={bankOpening || ''}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setBankOpening(val);
                            }}
                            className="font-bold font-mono text-base h-11 text-slate-800 dark:text-slate-100 focus:ring-primary"
                            placeholder="₹0.00"
                          />
                        </div>

                        {/* Calculated Bank Sales */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                            Bank Sales (Settled)
                          </span>
                          <div className="font-bold font-mono text-base h-11 flex items-center px-3 rounded-lg border border-stone-200 bg-stone-100/50 text-slate-850 dark:text-slate-100">
                            {formatRupee(Number(salesSplits.gpay) + Number(salesSplits.card) + Number(salesSplits.swiggy) + Number(salesSplits.zomato))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Total Purchases (Bank) */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                            Total Purchases (Bank)
                          </span>
                          <div className="font-bold font-mono text-base h-11 flex items-center px-3 rounded-lg border border-stone-200 bg-stone-100/50 text-slate-850 dark:text-slate-100">
                            {formatRupee(purchases.filter((p: any) => p.payment_mode === 'bank').reduce((a: number, b: any) => a + Number(b.amount), 0))}
                          </div>
                        </div>

                        {/* Total Expenses (Bank) */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                            Total Expenses (Bank)
                          </span>
                          <div className="font-bold font-mono text-base h-11 flex items-center px-3 rounded-lg border border-stone-200 bg-stone-100/50 text-slate-850 dark:text-slate-100">
                            {formatRupee(expenses.filter((e: any) => e.payment_mode === 'bank' && e.is_approved).reduce((a: number, b: any) => a + Number(b.amount), 0))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Bank Income / Receipts */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                            Bank Income / Receipts
                          </span>
                          <div className="font-bold font-mono text-base h-11 flex items-center px-3 rounded-lg border border-stone-200 bg-stone-100/50 text-slate-850 dark:text-slate-100">
                            {formatRupee(incomeList.filter((i: any) => i.payment_method === 'bank').reduce((a: number, b: any) => a + Number(b.amount), 0))}
                          </div>
                        </div>

                        {/* Safe Box Deposits */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                            Safe Box Deposits
                          </span>
                          <div className="font-bold font-mono text-base h-11 flex items-center px-3 rounded-lg border border-stone-200 bg-stone-100/50 text-slate-850 dark:text-slate-100">
                            {formatRupee(bankDeposits)}
                          </div>
                        </div>
                      </div>

                      {/* Expected Closing Bank Balance */}
                      <div className="space-y-1.5 pt-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                          Closing Balance (Calculated) (₹)
                        </span>
                        <div className="font-bold font-mono text-lg h-11 flex items-center px-3 rounded-lg border border-emerald-200 bg-emerald-50/20 text-emerald-800">
                          {formatRupee(
                            bankOpening + 
                            (Number(salesSplits.gpay) + Number(salesSplits.card) + Number(salesSplits.swiggy) + Number(salesSplits.zomato)) +
                            incomeList.filter((i: any) => i.payment_method === 'bank').reduce((a: number, b: any) => a + Number(b.amount), 0) +
                            bankDeposits -
                            purchases.filter((p: any) => p.payment_mode === 'bank').reduce((a: number, b: any) => a + Number(b.amount), 0) -
                            expenses.filter((e: any) => e.payment_mode === 'bank' && e.is_approved).reduce((a: number, b: any) => a + Number(b.amount), 0)
                          )}
                        </div>
                      </div>

                    </CardContent>
                  </Card>

                </div>
              )}
              {userRole === 'outlet_manager' && renderWorkflowFooter()}
            </div>
          )}
          {activeTab === 'purchases' && (
            <div className="space-y-6">
              <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-stone-100 dark:border-slate-900 bg-stone-50/50 dark:bg-slate-950/20 py-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold tracking-tight text-slate-800 dark:text-white">Store Procurements (Items Bought) (₹)</CardTitle>
                    <CardDescription className="text-xs">Log raw materials bought today (like milk, banana, sugar, cups, etc.)</CardDescription>
                  </div>
                  {isEditable && (
                    <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
                      <DialogTrigger render={
                        <Button variant="outline" size="sm" className="gap-1.5 h-9 font-semibold text-xs rounded-xl border-stone-300">
                          <Plus className="h-4 w-4" /> Add Bill / Invoice
                        </Button>
                      } />
                      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border dark:border-slate-800">
                        <DialogHeader>
                          <DialogTitle>Add Purchase Entry</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={purForm.handleSubmit(handleAddPurchase)} className="space-y-4 pt-2">
                          <div>
                            <Label htmlFor="vendor_id" className="text-xs font-semibold">Supplier / Vendor</Label>
                            <Select onValueChange={(v: any) => purForm.setValue('vendor_id', v)}>
                              <SelectTrigger className="w-full mt-1.5 h-11">
                                <SelectValue placeholder="Select supplier" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-950 border dark:border-slate-800">
                                {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="purchase_head_id" className="text-xs font-semibold">Item Category</Label>
                            <Select onValueChange={(v: any) => purForm.setValue('purchase_head_id', v)}>
                              <SelectTrigger className="w-full mt-1.5 h-11">
                                <SelectValue placeholder="Select category (Milk, Banana, Sugar, etc.)" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-950 border dark:border-slate-800">
                                {heads.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="invoice_number" className="text-xs font-semibold">Bill / Invoice Number</Label>
                              <Input id="invoice_number" {...purForm.register('invoice_number')} className="mt-1.5 h-11" />
                            </div>
                            <div>
                              <Label htmlFor="amount" className="text-xs font-semibold">Bill Value (₹)</Label>
                              <Input id="amount" type="number" step="0.01" {...purForm.register('amount')} className="mt-1.5 h-11" />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="payment_mode" className="text-xs font-semibold">How did you pay?</Label>
                            <Select onValueChange={(v) => purForm.setValue('payment_mode', v as any)} defaultValue="cash">
                              <SelectTrigger className="w-full mt-1.5 h-11">
                                <SelectValue placeholder="How did you pay?" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-950 border dark:border-slate-800">
                                <SelectItem value="cash">Paid with Cash (from Cash Drawer)</SelectItem>
                                <SelectItem value="bank">Paid with Bank (UPI / Card)</SelectItem>
                                <SelectItem value="credit">Buy on Credit (Pay supplier later)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <DialogFooter className="pt-2">
                            <Button type="submit" className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold h-11">
                              Save Purchase
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-stone-50/50 dark:bg-slate-950/20">
                      <TableRow className="border-stone-100 dark:border-slate-900">
                        <TableHead className="pl-6">Bill No.</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Paid via</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        {isEditable && <TableHead className="w-12"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.length > 0 ? (
                        purchases.map((row) => (
                          <TableRow key={row.id} className="border-stone-100 dark:border-slate-900">
                            <TableCell className="pl-6 font-semibold text-slate-800 dark:text-slate-200">{row.invoice_number}</TableCell>
                            <TableCell className="text-slate-650">{vendors.find(v => v.id === row.vendor_id)?.name || 'Unknown Vendor'}</TableCell>
                            <TableCell className="text-slate-500">{heads.find(h => h.id === row.purchase_head_id)?.name || 'Purchases'}</TableCell>
                            <TableCell>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                                row.payment_mode === 'credit'
                                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                                  : 'bg-slate-50 border-stone-200 text-slate-650'
                              }`}>
                                {row.payment_mode}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-slate-800">{formatRupee(Number(row.amount))}</TableCell>
                            {isEditable && (
                              <TableCell className="pr-6 text-center">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDeletePurchase(row.id)}
                                  className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={isEditable ? 6 : 5} className="text-center py-12 text-slate-400">
                            <Info className="h-5 w-5 mx-auto text-stone-300 mb-1.5" />
                            <p className="text-xs font-medium">No purchases logged today.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
                {userRole === 'outlet_manager' && renderWorkflowFooter()}
              </Card>

              {/* Purchase % Analysis Card */}
              <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden animate-in fade-in-50 duration-200">
                <CardHeader className="border-b border-stone-100 dark:border-slate-900 bg-stone-50/50 dark:bg-slate-950/20 py-4">
                  <CardTitle className="text-base font-bold tracking-tight text-slate-800 dark:text-white">GL Head Purchase % Analysis</CardTitle>
                  <CardDescription className="text-xs">Daily & Monthly cost percentages of Net Sales (Net Sales = Gross POS Sales / 1.05)</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-stone-50/50 dark:bg-slate-950/20">
                      <TableRow className="border-stone-100 dark:border-slate-900">
                        <TableHead className="pl-6">GL Purchase Head</TableHead>
                        <TableHead className="text-right">Daily Cost</TableHead>
                        <TableHead className="text-right">Daily %</TableHead>
                        <TableHead className="text-right">Monthly Cost</TableHead>
                        <TableHead className="text-right">Monthly %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {heads.map((head) => {
                        const dailyAmt = purchases.filter(p => p.purchase_head_id === head.id).reduce((acc, p) => acc + Number(p.amount), 0);
                        const dailyPct = netSales > 0 ? (dailyAmt / netSales) * 100 : 0;
                        
                        const monthlyAmt = monthlyPurchases.filter(p => p.purchase_head_id === head.id).reduce((acc, p) => acc + Number(p.amount), 0);
                        const monthlyNetSales = (monthlySalesTotal * 100) / 105;
                        const monthlyPct = monthlyNetSales > 0 ? (monthlyAmt / monthlyNetSales) * 100 : 0;

                        if (dailyAmt === 0 && monthlyAmt === 0) return null; // hide inactive heads

                        return (
                          <TableRow key={head.id} className="border-stone-100 dark:border-slate-900">
                            <TableCell className="pl-6 font-semibold text-slate-800 dark:text-slate-200">{head.name}</TableCell>
                            <TableCell className="text-right font-mono text-slate-800">{formatRupee(dailyAmt)}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-primary">{dailyPct.toFixed(2)}%</TableCell>
                            <TableCell className="text-right font-mono text-slate-500">{formatRupee(monthlyAmt)}</TableCell>
                            <TableCell className="text-right font-mono text-slate-500">{monthlyPct.toFixed(2)}%</TableCell>
                          </TableRow>
                        );
                      })}
                      {(purchases.length === 0 && monthlyPurchases.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                            <Info className="h-5 w-5 mx-auto text-stone-300 mb-1.5" />
                            <p className="text-xs font-medium">No procurement logs registered for this month yet.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: EXPENSES */}
          {activeTab === 'expenses' && (
            <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-stone-100 dark:border-slate-900 bg-stone-50/50 dark:bg-slate-950/20 py-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold tracking-tight text-slate-800 dark:text-white">Shop Expenses (₹)</CardTitle>
                  <CardDescription className="text-xs">Record everyday operational expenses (like electricity bills, water tankers, staff food, cleaning supplies).</CardDescription>
                </div>
                {isEditable && (
                  <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
                    <DialogTrigger render={
                      <Button variant="outline" size="sm" className="gap-1.5 h-9 font-semibold text-xs rounded-xl border-stone-300">
                        <Plus className="h-4 w-4" /> Add Expense
                      </Button>
                    } />
                    <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border dark:border-slate-800">
                      <DialogHeader>
                        <DialogTitle>Add Shop Expense</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={expForm.handleSubmit(handleAddExpense)} className="space-y-4 pt-2">
                        <div>
                          <Label htmlFor="expense_category_id" className="text-xs font-semibold">Expense Category</Label>
                          <Select onValueChange={(v: any) => expForm.setValue('expense_category_id', v)}>
                            <SelectTrigger className="w-full mt-1.5 h-11">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-950 border dark:border-slate-800">
                              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="amount" className="text-xs font-semibold">Expense Amount (₹)</Label>
                          <Input id="amount" type="number" step="0.01" {...expForm.register('amount')} className="mt-1.5 h-11 font-mono focus:ring-primary" />
                        </div>
                        <div>
                          <Label htmlFor="description" className="text-xs font-semibold">Details / Description</Label>
                          <Input id="description" placeholder="e.g. Electricity bill payout / Broom stick buy" {...expForm.register('description')} className="mt-1.5 h-11 focus:ring-primary" />
                        </div>
                        <div>
                          <Label htmlFor="payment_mode" className="text-xs font-semibold">How did you pay?</Label>
                          <Select onValueChange={(v) => expForm.setValue('payment_mode', v as any)} defaultValue="cash">
                            <SelectTrigger className="w-full mt-1.5 h-11">
                              <SelectValue placeholder="How did you pay?" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-950 border dark:border-slate-800">
                              <SelectItem value="cash">Paid with Drawer Cash</SelectItem>
                              <SelectItem value="bank">Paid with Bank (UPI)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter className="pt-2">
                          <Button type="submit" className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold h-11">
                            Save Expense
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-stone-50/50 dark:bg-slate-950/20">
                    <TableRow className="border-stone-100 dark:border-slate-900">
                      <TableHead className="pl-6">Category</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Paid via</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      {isEditable && <TableHead className="w-12"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.length > 0 ? (
                      expenses.map((row) => (
                        <TableRow key={row.id} className="border-stone-100 dark:border-slate-900">
                          <TableCell className="pl-6 font-semibold text-slate-800 dark:text-slate-200">
                            {categories.find(c => c.id === row.expense_category_id)?.name || 'General Expense'}
                          </TableCell>
                          <TableCell className="text-slate-600">{row.description}</TableCell>
                          <TableCell className="text-xs uppercase font-semibold text-slate-500">{row.payment_mode}</TableCell>
                          <TableCell>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                              row.is_approved 
                                ? 'bg-emerald-50 border-emerald-250 text-emerald-700 dark:bg-emerald-950/10' 
                                : 'bg-amber-50 border-amber-250 text-amber-700 dark:bg-amber-950/10'
                            }`}>
                              {row.is_approved ? 'Approved' : 'Pending HQ'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-800">{formatRupee(Number(row.amount))}</TableCell>
                          {isEditable && (
                            <TableCell className="pr-6 text-center">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteExpense(row.id)}
                                className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={isEditable ? 6 : 5} className="text-center py-12 text-slate-400">
                          <Info className="h-5 w-5 mx-auto text-stone-300 mb-1.5" />
                          <p className="text-xs font-medium">No petty expenses logged today.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              {userRole === 'outlet_manager' && renderWorkflowFooter()}
            </Card>
          )}

          {/* TAB 4: BANK & SAFE */}
          {activeTab === 'bank' && (
            <div className="space-y-6">
              <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-stone-100 dark:border-slate-900 bg-stone-50/50 dark:bg-slate-950/20 py-4">
                  <CardTitle className="text-base font-bold tracking-tight text-slate-800 dark:text-white">Safe Box & Bank Flows (₹)</CardTitle>
                  <CardDescription className="text-xs">Record any cash deposited into the bank/safe box or withdrawn for shop usage.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                  <div className="space-y-1.5 p-4 rounded-xl border border-stone-150 dark:border-stone-900 bg-stone-50/10">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Bank Opening Balance</span>
                    <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-1 block">{formatRupee(bankOpening)}</span>
                  </div>
                  <div className="space-y-1.5 p-4 rounded-xl border border-emerald-100 dark:border-emerald-950/25 bg-emerald-50/20">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide block">Calculated Bank Closing</span>
                    <span className="text-2xl font-bold font-mono text-emerald-700 block mt-1">{formatRupee(bankOpening + bankDeposits - bankWithdrawals)}</span>
                  </div>
                  <div className="space-y-1.5 p-4 rounded-xl border border-stone-150 dark:border-stone-900 bg-stone-50/10">
                    <Label htmlFor="bank_deposits" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cash Deposited to Bank / Safe Box</Label>
                    <Input
                      id="bank_deposits"
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={!isEditable}
                      value={bankDeposits || ''}
                      placeholder="₹0.00"
                      onChange={(e) => setBankDeposits(parseFloat(e.target.value) || 0)}
                      className="font-bold font-mono text-lg h-12 mt-1.5 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5 p-4 rounded-xl border border-stone-150 dark:border-stone-900 bg-stone-50/10">
                    <Label htmlFor="bank_withdrawals" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cash Withdrawn from Bank</Label>
                    <Input
                      id="bank_withdrawals"
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={!isEditable}
                      value={bankWithdrawals || ''}
                      placeholder="₹0.00"
                      onChange={(e) => setBankWithdrawals(parseFloat(e.target.value) || 0)}
                      className="font-bold font-mono text-lg h-12 mt-1.5"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Local Branch Income in same Tab */}
              <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-stone-100 dark:border-slate-900 bg-stone-50/50 dark:bg-slate-950/20 py-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold tracking-tight text-slate-800 dark:text-white">Other Income Logs (₹)</CardTitle>
                    <CardDescription className="text-xs">Record scrap sales, party orders, or miscellaneous income</CardDescription>
                  </div>
                  {isEditable && (
                    <Dialog open={incomeOpen} onOpenChange={setIncomeOpen}>
                      <DialogTrigger render={
                        <Button variant="outline" size="sm" className="gap-1.5 h-9 font-semibold text-xs rounded-xl border-stone-300">
                          <Plus className="h-4 w-4" /> Add Miscellaneous Income
                        </Button>
                      } />
                      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border dark:border-slate-800">
                        <DialogHeader>
                          <DialogTitle>Log Local Branch Income</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={incForm.handleSubmit(handleAddIncome)} className="space-y-4 pt-2">
                          <div>
                            <Label htmlFor="source" className="text-xs font-semibold">Income Source</Label>
                            <Input id="source" placeholder="e.g. Scrap carton sales / Party advance" {...incForm.register('source')} className="mt-1.5 h-11" />
                          </div>
                          <div>
                            <Label htmlFor="amount" className="text-xs font-semibold">Value (₹)</Label>
                            <Input id="amount" type="number" step="0.01" {...incForm.register('amount')} className="mt-1.5 h-11" />
                          </div>
                          <div>
                            <Label htmlFor="payment_method" className="text-xs font-semibold">Payment Channel</Label>
                            <Select onValueChange={(v) => incForm.setValue('payment_method', v as any)} defaultValue="cash">
                              <SelectTrigger className="w-full mt-1.5 h-11">
                                <SelectValue placeholder="Select Payment Channel" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-950 border dark:border-slate-800">
                                <SelectItem value="cash">Cash (Drawer Inflow)</SelectItem>
                                <SelectItem value="gpay">GPay / UPI</SelectItem>
                                <SelectItem value="card">Card Swipe</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="description" className="text-xs font-semibold">Description / Remarks</Label>
                            <Input id="description" placeholder="Optional comments..." {...incForm.register('description')} className="mt-1.5 h-11" />
                          </div>
                          <DialogFooter className="pt-2">
                            <Button type="submit" className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold h-11">
                              Save Income
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-stone-50/50 dark:bg-slate-950/20">
                      <TableRow className="border-stone-100 dark:border-slate-900">
                        <TableHead className="pl-6">Source</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        {isEditable && <TableHead className="w-12"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomeList.length > 0 ? (
                        incomeList.map((row) => (
                          <TableRow key={row.id} className="border-stone-100 dark:border-slate-900">
                            <TableCell className="pl-6 font-semibold text-slate-800 dark:text-slate-200">{row.source}</TableCell>
                            <TableCell className="text-slate-600">{row.description || '-'}</TableCell>
                            <TableCell className="text-xs uppercase font-semibold text-slate-550">{row.payment_method}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-slate-800">{formatRupee(Number(row.amount))}</TableCell>
                            {isEditable && (
                              <TableCell className="pr-6 text-center">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDeleteIncome(row.id)}
                                  className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={isEditable ? 5 : 4} className="text-center py-12 text-slate-400">
                            <Info className="h-5 w-5 mx-auto text-stone-300 mb-1.5" />
                            <p className="text-xs font-medium">No miscellaneous income logs recorded.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 5: CASH & DENOMINATIONS */}
          {activeTab === 'cashbook' && (
            <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-stone-100 dark:border-slate-900 bg-stone-50/50 dark:bg-slate-950/20 py-4">
                <CardTitle className="text-base font-bold tracking-tight text-slate-800 dark:text-white">Cash Counter (Count your money) 🪙</CardTitle>
                <CardDescription className="text-xs">Count the physical notes and coins in the cash drawer to find your total cash.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                {(() => {
                  const getDenomStyle = (field: string) => {
                    switch (field) {
                      case 'denom_500': return 'border-l-4 border-stone-500 bg-stone-500/5';
                      case 'denom_200': return 'border-l-4 border-orange-400 bg-orange-400/5';
                      case 'denom_100': return 'border-l-4 border-indigo-400 bg-indigo-400/5';
                      case 'denom_50': return 'border-l-4 border-cyan-400 bg-cyan-400/5';
                      case 'denom_20': return 'border-l-4 border-lime-500 bg-lime-500/5';
                      case 'denom_10': return 'border-l-4 border-amber-600 bg-amber-600/5';
                      case 'denom_5': return 'border-l-4 border-emerald-500 bg-emerald-500/5';
                      case 'denom_2': return 'border-l-4 border-rose-450 bg-rose-450/5';
                      case 'denom_1': return 'border-l-4 border-slate-400 bg-slate-400/5';
                      case 'denom_coins': return 'border-l-4 border-yellow-500 bg-yellow-500/5';
                      default: return 'border-l border-stone-200';
                    }
                  };

                  return denominationList.map((denom) => {
                    const borderStyle = getDenomStyle(denom.field);
                    return (
                      <div key={denom.field} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl hover:bg-stone-50/50 transition-all ${borderStyle}`}>
                        <div className="flex items-center justify-between sm:justify-start gap-4 flex-1">
                          <span className="text-sm font-extrabold text-slate-700 dark:text-slate-350 min-w-24">
                            {denom.field === 'denom_coins' ? 'Other Coins' : `₹${denom.val} Note/Coin`}
                          </span>
                          <span className="text-xs text-slate-450 font-bold hidden sm:inline">×</span>
                        </div>
                        
                        {/* Touch Stepper Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={!isEditable}
                            onClick={() => {
                              const curr = Number(denomCounts[denom.field] || 0);
                              if (curr > 0) {
                                handleDenomChange(denom.field, String(curr - 1));
                              }
                            }}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:active:bg-slate-700 border border-stone-250 dark:border-slate-850 text-slate-800 dark:text-slate-100 font-extrabold text-lg select-none disabled:opacity-40 transition-colors cursor-pointer"
                          >
                            -
                          </button>
                          
                          <Input
                            type="number"
                            min="0"
                            disabled={!isEditable}
                            value={denomCounts[denom.field] || ''}
                            placeholder="0"
                            onChange={(e) => handleDenomChange(denom.field, e.target.value)}
                            className="w-16 text-center font-extrabold font-mono h-10 text-base focus:ring-primary bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-0"
                          />
                          
                          <button
                            type="button"
                            disabled={!isEditable}
                            onClick={() => {
                              const curr = Number(denomCounts[denom.field] || 0);
                              handleDenomChange(denom.field, String(curr + 1));
                            }}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:active:bg-slate-700 border border-stone-250 dark:border-slate-850 text-slate-800 dark:text-slate-100 font-extrabold text-lg select-none disabled:opacity-40 transition-colors cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        
                        <span className="text-base font-extrabold text-slate-900 dark:text-white min-w-28 text-right font-mono self-end sm:self-auto">
                          {formatRupee(denom.val * (denomCounts[denom.field] || 0))}
                        </span>
                      </div>
                    );
                  });
                })()}
                <div className="border-t border-stone-150 dark:border-slate-900 pt-4 mt-6 flex justify-between items-center bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <span className="text-sm font-extrabold text-primary uppercase tracking-wide">Actual Counted Total</span>
                  <span className="text-xl font-black font-mono text-primary">{formatRupee(actualCash)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Side: Sticky Summary Audit Panel (Live update) */}
        {userRole !== 'outlet_manager' && (
          <div className="xl:col-span-3">
            <div className="xl:sticky xl:top-6 self-start space-y-6">
              
              <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-stone-150 dark:border-slate-900 bg-stone-50/80 dark:bg-slate-950/30 py-4">
                  <CardTitle className="text-sm font-extrabold uppercase tracking-widest text-slate-700 dark:text-slate-350">
                    Daily Balance Check 💰
                  </CardTitle>
                  <CardDescription className="text-xs">Compare expected cash in the drawer against what you counted.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {/* Statistics Lists */}
                  {userRole === 'outlet_manager' ? (
                    <div className="space-y-2.5 text-xs font-semibold text-slate-650 dark:text-slate-400">
                      <div className="flex justify-between items-center">
                        <span>Total Sales</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{formatRupee(totalSalesSplits)}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-600">
                        <span>Calculated Cash Sales</span>
                        <span className="font-mono">{formatRupee(calculatedCash)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Total Purchases (Items Bought)</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{formatRupee(totalPurchasesValue)}</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-600">
                        <span>Total Shop Expenses</span>
                        <span className="font-mono">-{formatRupee(expenses.reduce((sum: number, e: any) => sum + (e.is_approved ? Number(e.amount) : 0), 0))}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-xs font-semibold text-slate-650 dark:text-slate-400">
                      <div className="flex justify-between items-center">
                        <span>Opening Drawer Cash</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{formatRupee(Number(daybook.opening_cash))}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Cash Billed Sales (+)</span>
                        <span className="font-mono text-slate-850 dark:text-slate-200">{formatRupee(totalCashSales)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Extra Cash Received (+)</span>
                        <span className="font-mono text-slate-850 dark:text-slate-200">{formatRupee(totalCashIncome)}</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-600">
                        <span>Cash Paid Out (Items/Expenses) (-)</span>
                        <span className="font-mono">-{formatRupee(totalCashPurchases + totalCashExpenses)}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-stone-150 dark:border-slate-900 pb-2">
                        <span>Cash Sent to Safe/Bank (-)</span>
                        <span className="font-mono text-rose-600">-{formatRupee(bankDeposits - bankWithdrawals)}</span>
                      </div>
                    </div>
                  )}

                  {userRole !== 'outlet_manager' && (
                    <>
                      {/* Audit Drawer Check */}
                      <div className="space-y-2.5 pt-2 border-b border-stone-150 dark:border-slate-900 pb-4">
                        <div className="flex justify-between items-center text-xs font-extrabold text-slate-700 dark:text-slate-300">
                          <span>Expected Cash in Drawer:</span>
                          <span className="font-mono text-sm">{formatRupee(expectedCash)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-extrabold text-slate-700 dark:text-slate-300">
                          <span>Actual Counted Cash:</span>
                          <span className="font-mono text-sm">{formatRupee(actualCash)}</span>
                        </div>
                      </div>

                      {/* Dynamic Status Variance Badge */}
                      {cashDifference === 0 ? (
                        <div className="p-4 rounded-xl border border-emerald-250 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 flex flex-col items-center justify-center gap-1.5 text-center">
                          <span className="text-xl font-bold">🎉 Perfect Balance!</span>
                          <p className="text-[11px] leading-snug font-semibold text-emerald-700 dark:text-emerald-400">Counted cash matches expected cash exactly. Great job!</p>
                        </div>
                      ) : (
                        <div className={`p-4 rounded-xl border flex flex-col gap-1 transition-all duration-200 ${
                          Math.abs(cashDifference) <= 200
                            ? 'bg-amber-50 border-amber-250 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/50'
                            : 'bg-rose-50 border-rose-250 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50'
                        }`}>
                          <div className="flex items-center justify-between font-extrabold text-sm">
                            <span>Drawer Difference:</span>
                            <span className="font-mono text-base">
                              {cashDifference > 0 ? `+${formatRupee(cashDifference)}` : formatRupee(cashDifference)}
                            </span>
                          </div>
                          <p className="text-[10px] opacity-90 leading-snug font-semibold">
                            {cashDifference < 0 
                              ? `Drawer is short by ${formatRupee(Math.abs(cashDifference))}. Please type a short reason below.`
                              : `Drawer has an extra ${formatRupee(cashDifference)}. Please type a short reason below.`
                            }
                          </p>
                        </div>
                      )}

                      {/* Variance Comments Field */}
                      {Math.abs(cashDifference) > 0 && (
                        <div className="space-y-1.5 pt-2">
                          <Label htmlFor="justification" className="text-xs font-bold text-rose-600 dark:text-rose-455 flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Reason for Cash Difference</span>
                          </Label>
                          <textarea
                            id="justification"
                            rows={3}
                            disabled={!isEditable}
                            placeholder="e.g., Cashier short change given, or forgot to log banana local purchase..."
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            className="w-full rounded-xl border border-stone-200 dark:border-slate-800 bg-transparent p-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-slate-455 font-semibold text-slate-800 dark:text-slate-100"
                          />
                        </div>
                      )}

                      {/* KPI Metrics */}
                      <div className="border-t border-stone-150 dark:border-slate-900 pt-4 mt-6 space-y-1.5 text-xs text-slate-550 font-semibold">
                        <div className="flex justify-between items-center">
                          <span>Total Sales Billed (POS)</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">{formatRupee(totalSalesSplits)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Net Sales (Excl. Tax)</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">{formatRupee(netSales)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Total Purchases logged today</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">{formatRupee(totalPurchasesValue)}</span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-slate-700 dark:text-slate-350">
                          <span>Ingredient Cost % (Food Cost)</span>
                          <span className="font-mono text-primary text-sm">{foodCostPercent.toFixed(1)}%</span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>

                {/* Action Buttons Footer with workflow status routing */}
                <CardFooter className="pt-2 pb-6 flex flex-col gap-3 border-t border-stone-100 dark:border-slate-900 bg-stone-50/20 py-4 px-6">
                  {isEditable && (
                    <>
                      <Button 
                        onClick={() => handleSaveDraft(false)}
                        className="w-full border border-stone-250 bg-white hover:bg-stone-50 text-slate-850 font-bold py-5 rounded-xl flex items-center justify-center gap-2 shadow-sm dark:bg-stone-900 dark:border-slate-850 dark:text-slate-100 transition-all"
                      >
                        <Save className="h-4 w-4" /> Manual Save Draft
                      </Button>
                      <Button 
                        onClick={handleSubmitDaybook}
                        disabled={isSalesInvalid}
                        className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Submit to Branch Manager
                      </Button>
                    </>
                  )}

                  {daybook.status === 'submitted' && (
                    <>
                      {(userRole === 'branch_manager' || userRole === 'super_admin') ? (
                        <>
                          <Button 
                            onClick={handleApproveWorkflow}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 rounded-xl flex items-center justify-center gap-2 shadow-md"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Approve (Branch Manager)
                          </Button>
                          <Button 
                            onClick={() => setRejectOpen(true)}
                            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-5 rounded-xl flex items-center justify-center gap-2 shadow-md"
                          >
                            <XCircle className="h-4 w-4" /> Reject Sheet
                          </Button>
                        </>
                      ) : (
                        <div className="w-full flex items-center gap-2 justify-center p-3 rounded-xl border border-amber-250 bg-amber-50/20 text-amber-700 font-bold text-xs">
                          <Lock className="h-4 w-4" />
                          <span>Submitted - Awaiting Branch Manager Approval</span>
                        </div>
                      )}
                    </>
                  )}

                  {daybook.status === 'branch_approved' && (
                    <>
                      {(userRole === 'finance_head' || userRole === 'accountant' || userRole === 'super_admin') ? (
                        <>
                          <Button 
                            onClick={handleApproveWorkflow}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 rounded-xl flex items-center justify-center gap-2 shadow-md"
                          >
                            <Lock className="h-4 w-4" /> Finance Approve & Lock
                          </Button>
                          <Button 
                            onClick={() => setRejectOpen(true)}
                            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-5 rounded-xl flex items-center justify-center gap-2 shadow-md"
                          >
                            <XCircle className="h-4 w-4" /> Reject Sheet
                          </Button>
                        </>
                      ) : (
                        <div className="w-full flex items-center gap-2 justify-center p-3 rounded-xl border border-blue-200 bg-blue-50/20 text-blue-700 font-bold text-xs">
                          <Lock className="h-4 w-4" />
                          <span>Awaiting Finance Approval & Lock</span>
                        </div>
                      )}
                    </>
                  )}

                  {daybook.status === 'approved' && (
                    <>
                      {(userRole === 'finance_head' || userRole === 'accountant' || userRole === 'super_admin') ? (
                        <Button 
                          onClick={handleReopenWorkflow}
                          className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-5 rounded-xl flex items-center justify-center gap-2 shadow-md"
                        >
                          <Unlock className="h-4 w-4" /> Re-open Daybook Sheet
                        </Button>
                      ) : (
                        <div className="w-full flex items-center gap-2 justify-center p-3 rounded-xl border border-emerald-250 bg-emerald-50/20 text-emerald-700 font-bold text-xs">
                          <Lock className="h-4 w-4" />
                          <span>Locked & Approved by Finance</span>
                        </div>
                      )}
                    </>
                  )}
                </CardFooter>

                {/* Rejection comments reason modal */}
                <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                  <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border dark:border-slate-800">
                    <DialogHeader>
                      <DialogTitle className="text-rose-650 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span>Reject & Return Daybook Sheet</span>
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <Label htmlFor="daybook_reject_reason" className="font-semibold text-slate-700 dark:text-slate-350">Reason for rejecting this sheet (Required)</Label>
                      <textarea
                        id="daybook_reject_reason"
                        rows={3}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Write a brief explanation for the cashier to fix this sheet..."
                        className="w-full rounded-xl border border-stone-200 dark:border-slate-800 bg-transparent p-3 text-xs outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-slate-800 dark:text-slate-100 font-semibold"
                      />
                    </div>
                    <DialogFooter>
                      <Button 
                        onClick={handleRejectWorkflow}
                        disabled={!rejectionReason.trim()}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold py-5 rounded-xl"
                      >
                        Reject and Return
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </Card>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function DaybookPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-primary"></div>
        <p className="text-sm font-semibold text-slate-500">Loading daily worksheet...</p>
      </div>
    }>
      <DaybookContent />
    </Suspense>
  );
}
