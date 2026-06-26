'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Users, FileText, CheckCircle2, AlertTriangle, Plus, ChevronRight } from 'lucide-react';

// Form validation schema
const paymentSchema = z.object({
  vendor_id: z.string().uuid('Select a vendor'),
  bank_account_id: z.string().uuid('Select a bank account'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  reference_document: z.string().min(3, 'Reference document ID required'),
  description: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function VendorsPage() {
  const supabase = createClient();
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [aging, setAging] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const payForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as any,
  });

  // Helper: Format Rupee
  const formatRupee = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  };

  // 1. Fetch Vendors AP Registry
  async function fetchVendors() {
    try {
      const { data: vList } = await supabase.from('vendors').select('*').order('name', { ascending: true });
      setVendors(vList || []);
      if (vList && vList.length > 0 && !selectedVendorId) {
        setSelectedVendorId(vList[0].id);
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
    }
  }

  // 2. Fetch Active Ledger Statement
  async function fetchLedgerStatement(vendorId: string) {
    try {
      const { data } = await supabase
        .from('vendor_ledger')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('transaction_date', { ascending: true })
        .order('created_at', { ascending: true });
      setLedger(data || []);
    } catch (err) {
      console.error('Error fetching ledger statement:', err);
    }
  }

  // 3. Fetch AP Aging Metrics
  async function calculateAgingReport() {
    try {
      const { data: vList } = await supabase.from('vendors').select('*');
      const { data: pList } = await supabase.from('purchases').select('*').neq('payment_status', 'paid');

      const agingReport = ((vList || []) as any[]).map((v: any) => {
        const vendorPurchases = ((pList || []) as any[]).filter((p: any) => p.vendor_id === v.id);

        let current = 0;
        let bucket1_30 = 0;
        let bucket31_60 = 0;
        let bucket61plus = 0;

        vendorPurchases.forEach((p: any) => {
          const invDate = new Date(p.invoice_date);
          const dueDate = new Date(invDate.getTime() + v.credit_terms_days * 24 * 60 * 60 * 1000);
          const diffTime = new Date().getTime() - dueDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 0) {
            current += Number(p.amount);
          } else if (diffDays <= 30) {
            bucket1_30 += Number(p.amount);
          } else if (diffDays <= 60) {
            bucket31_60 += Number(p.amount);
          } else {
            bucket61plus += Number(p.amount);
          }
        });

        return {
          id: v.id,
          name: v.name,
          code: v.code,
          total: Number(v.current_balance),
          current,
          bucket1_30,
          bucket31_60,
          bucket61plus,
        };
      });

      setAging(agingReport);
    } catch (err) {
      console.error('Error calculating aging metrics:', err);
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchVendors();
      await calculateAgingReport();
      const { data: bk } = await supabase.from('bank_accounts').select('id, bank_name, account_number');
      setBanks(bk || []);
      setLoading(false);
    }
    init();
  }, [supabase]);

  useEffect(() => {
    if (selectedVendorId) {
      fetchLedgerStatement(selectedVendorId);
    }
  }, [selectedVendorId]);

  // 4. Form Actions
  const handleRegisterPayment = async (values: PaymentFormValues) => {
    try {
      const selectedVendorObj = vendors.find(v => v.id === values.vendor_id);
      if (!selectedVendorObj) return;

      // Call database RPC function to process atomically in SQL transaction
      const { data, error } = await supabase.rpc('record_vendor_payout', {
        p_tenant_id: selectedVendorObj.tenant_id,
        p_vendor_id: values.vendor_id,
        p_amount: values.amount,
        p_payment_mode: 'bank',
        p_reference_document: values.reference_document,
        p_transaction_date: new Date().toISOString().split('T')[0]
      });

      if (error) throw error;

      setPaymentOpen(false);
      payForm.reset();
      await fetchVendors();
      await calculateAgingReport();
      if (selectedVendorId) {
        await fetchLedgerStatement(selectedVendorId);
      }
    } catch (err: any) {
      alert(err.message || 'Error processing vendor payment');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-emerald-600"></div>
        <p className="text-sm font-medium text-slate-500">Loading vendor ledgers and accounts payables...</p>
      </div>
    );
  }

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Accounts Payable & Vendor Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage vendor accounts, record bank payouts, and audit aging liabilities in Rupees (₹).
          </p>
        </div>
        <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
          <DialogTrigger render={
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5 self-start">
              <Plus className="h-4 w-4" /> Record Payout
            </Button>
          } />
          <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border dark:border-slate-800">
            <DialogHeader>
              <DialogTitle>Register Vendor Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={payForm.handleSubmit(handleRegisterPayment)} className="space-y-4">
              <div>
                <Label htmlFor="vendor_id">Supplier Name</Label>
                <Select onValueChange={(v: any) => payForm.setValue('vendor_id', v)}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-950 border dark:border-slate-800">
                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bank_account_id">Source Bank Account</Label>
                <Select onValueChange={(v: any) => payForm.setValue('bank_account_id', v)}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-950 border dark:border-slate-800">
                    {banks.map(b => <SelectItem key={b.id} value={b.id}>{b.bank_name} ({b.account_number})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Payment Amount (₹)</Label>
                  <Input id="amount" type="number" step="0.01" {...payForm.register('amount')} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="reference_document">Bank Transfer Reference</Label>
                  <Input id="reference_document" placeholder="Ref/Chq Number" {...payForm.register('reference_document')} className="mt-1" />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Payment Comments</Label>
                <Input id="description" placeholder="e.g. Cleared pending invoices" {...payForm.register('description')} className="mt-1" />
              </div>
              <DialogFooter className="pt-2">
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                  Record and Allocate (FIFO)
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="ledgers" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 border dark:border-slate-800 rounded-md">
          <TabsTrigger value="ledgers">Chronological Ledgers</TabsTrigger>
          <TabsTrigger value="aging">Liability Aging Report</TabsTrigger>
        </TabsList>

        {/* Tab 1: Ledger Statement */}
        <TabsContent value="ledgers" className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Vendors List Sidepanel */}
            <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-900">
                <CardTitle className="text-sm font-semibold uppercase text-slate-500 tracking-wider">Vendor Directory</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-900">
                  {vendors.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVendorId(v.id)}
                      className={`flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 ${
                        selectedVendorId === v.id ? 'bg-slate-50 dark:bg-slate-900 border-l-2 border-emerald-500 font-semibold' : ''
                      }`}
                    >
                      <div className="overflow-hidden pr-4">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{v.name}</p>
                        <p className="text-xs text-slate-500 truncate font-normal">Terms: {v.credit_terms_days} days</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                          {formatRupee(Number(v.current_balance))}
                        </p>
                        <p className="text-[10px] text-slate-400 font-normal">Balance Owed</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Selected Vendor Ledger Statement */}
            <div className="lg:col-span-2 space-y-6">
              {selectedVendor && (
                <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 rounded-2xl shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-6 gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="h-5 w-5 text-slate-400" />
                        <span>{selectedVendor.name}</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">Vendor Code: {selectedVendor.code} | Tax ID: {selectedVendor.tax_number || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 text-right">
                      <p className="text-xs text-slate-500">Current Outstanding Balance</p>
                      <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                        {formatRupee(Number(selectedVendor.current_balance))}
                      </p>
                    </div>
                  </div>

                  <CardContent className="px-0 pt-6">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200 dark:border-slate-800">
                          <TableHead>Date</TableHead>
                          <TableHead>Doc Ref</TableHead>
                          <TableHead className="text-right">Debit (Payment)</TableHead>
                          <TableHead className="text-right">Credit (Invoice)</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledger.length > 0 ? (
                          ledger.map((row) => (
                            <TableRow key={row.id} className="border-slate-100 dark:border-slate-900">
                              <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                {new Date(row.transaction_date).toLocaleDateString('en-IN')}
                              </TableCell>
                              <TableCell className="text-sm text-slate-900 dark:text-white font-medium flex items-center gap-1.5 py-3">
                                <FileText className="h-3.5 w-3.5 text-slate-400" />
                                <span>{row.reference_document}</span>
                              </TableCell>
                              <TableCell className="text-sm text-emerald-600 dark:text-emerald-500 font-mono text-right">
                                {Number(row.debit_amount) > 0 ? formatRupee(Number(row.debit_amount)) : '-'}
                              </TableCell>
                              <TableCell className="text-sm text-rose-600 dark:text-rose-400 font-mono text-right">
                                {Number(row.credit_amount) > 0 ? formatRupee(Number(row.credit_amount)) : '-'}
                              </TableCell>
                              <TableCell className="text-sm font-bold font-mono text-slate-900 dark:text-white text-right">
                                {formatRupee(Number(row.running_balance))}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-400">No statement history for this vendor.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Aging Schedule */}
        <TabsContent value="aging" className="pt-6">
          <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6 rounded-2xl shadow-sm">
            <CardHeader className="px-0 pt-0 pb-6 border-b border-slate-100 dark:border-slate-900">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Liability Aging Schedule</CardTitle>
              <CardDescription>Outstanding balance balances categorized by credit terms limits.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-slate-800">
                    <TableHead>Vendor Code</TableHead>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead className="text-right">Total Owed</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">1-30 Days</TableHead>
                    <TableHead className="text-right">31-60 Days</TableHead>
                    <TableHead className="text-right">Over 60 Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aging.map((row) => (
                    <TableRow key={row.id} className="border-slate-100 dark:border-slate-900">
                      <TableCell className="font-semibold text-slate-700 dark:text-slate-300">{row.code}</TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-white">{row.name}</TableCell>
                      <TableCell className="font-bold font-mono text-right text-rose-600 dark:text-rose-400">{formatRupee(row.total)}</TableCell>
                      <TableCell className="font-mono text-right text-slate-500">{formatRupee(row.current)}</TableCell>
                      <TableCell className="font-mono text-right text-slate-500">{formatRupee(row.bucket1_30)}</TableCell>
                      <TableCell className="font-mono text-right text-slate-500">{formatRupee(row.bucket31_60)}</TableCell>
                      <TableCell className="font-mono text-right text-rose-600 dark:text-rose-400 font-semibold font-bold">
                        {formatRupee(row.bucket61plus)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-transparent font-bold">
                    <TableCell colSpan={2} className="font-bold text-slate-900 dark:text-white pl-4">Total Liabilities</TableCell>
                    <TableCell className="font-bold font-mono text-right text-rose-600 dark:text-rose-400">
                      {formatRupee(aging.reduce((acc, row) => acc + row.total, 0))}
                    </TableCell>
                    <TableCell className="font-bold font-mono text-right text-slate-900 dark:text-white">
                      {formatRupee(aging.reduce((acc, row) => acc + row.current, 0))}
                    </TableCell>
                    <TableCell className="font-bold font-mono text-right text-slate-900 dark:text-white">
                      {formatRupee(aging.reduce((acc, row) => acc + row.bucket1_30, 0))}
                    </TableCell>
                    <TableCell className="font-bold font-mono text-right text-slate-900 dark:text-white">
                      {formatRupee(aging.reduce((acc, row) => acc + row.bucket31_60, 0))}
                    </TableCell>
                    <TableCell className="font-bold font-mono text-right text-rose-600 dark:text-rose-400">
                      {formatRupee(aging.reduce((acc, row) => acc + row.bucket61plus, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
