import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Fetch oldest pending report job
    const { data: job, error: jobErr } = await supabase
      .from('report_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (jobErr) throw jobErr;

    if (!job) {
      return NextResponse.json({ status: 'idle', message: 'No pending report jobs found.' });
    }

    // 2. Set status to processing
    await supabase
      .from('report_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', job.id);

    const { report_type, parameters } = job;
    const { start_date, end_date, branch_id, export_format, report_name } = parameters || {};

    let csvContent = '';

    // 3. Aggregate data depending on report type
    if (report_type === 'daily_sales') {
      let query = supabase
        .from('sales_transactions')
        .select('invoice_number, payment_method, amount_gross, amount_discount, amount_tax, amount_net, transaction_timestamp')
        .eq('tenant_id', job.tenant_id);

      if (branch_id && branch_id !== 'all') {
        query = query.eq('branch_id', branch_id);
      }
      if (start_date) {
        query = query.gte('transaction_timestamp', `${start_date}T00:00:00Z`);
      }
      if (end_date) {
        query = query.lte('transaction_timestamp', `${end_date}T23:59:59Z`);
      }

      const { data: sales, error: dataErr } = await query;
      if (dataErr) throw dataErr;

      csvContent = 'Invoice Number,Payment Method,Gross Amount,Discount,Tax,Net Amount (₹),Timestamp\n';
      sales?.forEach((s: any) => {
        csvContent += `"${s.invoice_number}","${s.payment_method}",${s.amount_gross},${s.amount_discount},${s.amount_tax},${s.amount_net},"${s.transaction_timestamp}"\n`;
      });

    } else if (report_type === 'daily_purchase') {
      let query = supabase
        .from('purchases')
        .select('invoice_number, invoice_date, amount, payment_mode, payment_status')
        .eq('tenant_id', job.tenant_id);

      if (branch_id && branch_id !== 'all') {
        query = query.eq('branch_id', branch_id);
      }
      if (start_date) {
        query = query.gte('invoice_date', start_date);
      }
      if (end_date) {
        query = query.lte('invoice_date', end_date);
      }

      const { data: purchases, error: dataErr } = await query;
      if (dataErr) throw dataErr;

      csvContent = 'Invoice Number,Invoice Date,Amount (₹),Payment Mode,Payment Status\n';
      purchases?.forEach((p: any) => {
        csvContent += `"${p.invoice_number}","${p.invoice_date}",${p.amount},"${p.payment_mode}","${p.payment_status}"\n`;
      });

    } else if (report_type === 'daily_expense') {
      let query = supabase
        .from('expenses')
        .select('amount, description, payment_mode, requires_hq_approval, is_approved, created_at')
        .eq('tenant_id', job.tenant_id);

      if (branch_id && branch_id !== 'all') {
        query = query.eq('branch_id', branch_id);
      }
      if (start_date) {
        query = query.gte('created_at', `${start_date}T00:00:00Z`);
      }
      if (end_date) {
        query = query.lte('created_at', `${end_date}T23:59:59Z`);
      }

      const { data: expenses, error: dataErr } = await query;
      if (dataErr) throw dataErr;

      csvContent = 'Voucher Cost (₹),Description,Payment Mode,HQ Overrides Required,Approval Status,Timestamp\n';
      expenses?.forEach((e: any) => {
        csvContent += `${e.amount},"${e.description.replace(/"/g, '""')}",${e.payment_mode},${e.requires_hq_approval},${e.is_approved},"${e.created_at}"\n`;
      });

    } else if (report_type === 'cash_variance') {
      let query = supabase
        .from('daybooks')
        .select('business_date, opening_cash, expected_cash, physical_cash, cash_difference, variance_justification')
        .eq('tenant_id', job.tenant_id);

      if (branch_id && branch_id !== 'all') {
        query = query.eq('branch_id', branch_id);
      }
      if (start_date) {
        query = query.gte('business_date', start_date);
      }
      if (end_date) {
        query = query.lte('business_date', end_date);
      }

      const { data: daybooks, error: dataErr } = await query;
      if (dataErr) throw dataErr;

      csvContent = 'Business Date,Opening Cash (₹),Expected Drawer (₹),Physical Counted (₹),Drawer Variance (₹),Justification\n';
      daybooks?.forEach((db: any) => {
        csvContent += `"${db.business_date}",${db.opening_cash},${db.expected_cash},${db.physical_cash},${db.cash_difference},"${(db.variance_justification || '').replace(/"/g, '""')}"\n`;
      });

    } else {
      csvContent = 'Report Type,Start Date,End Date,Parameters\n';
      csvContent += `"${report_type}","${start_date}","${end_date}","${JSON.stringify(parameters).replace(/"/g, '""')}"\n`;
    }

    // 4. Save to public exports folder
    const exportsDir = path.join(process.cwd(), 'public', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const filename = `report_${report_type}_${job.id}.${export_format === 'pdf' ? 'pdf' : 'csv'}`;
    const filePath = path.join(exportsDir, filename);

    fs.writeFileSync(filePath, csvContent, 'utf-8');

    // 5. Update database record as completed
    const downloadUrl = `/exports/${filename}`;
    await supabase
      .from('report_jobs')
      .update({
        status: 'completed',
        download_url: downloadUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    return NextResponse.json({
      status: 'success',
      message: `Report job ${job.id} processed successfully.`,
      job_id: job.id,
      download_url: downloadUrl
    });

  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', message: err.message || 'Error processing report job.' },
      { status: 500 }
    );
  }
}
