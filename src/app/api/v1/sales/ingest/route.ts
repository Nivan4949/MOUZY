import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';

const TransactionItemSchema = z.object({
  menu_item_sku: z.string(),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
});

const IngestTransactionSchema = z.object({
  invoice_number: z.string(),
  payment_method: z.enum(['cash', 'card', 'online', 'aggregator']),
  amount_gross: z.number().positive(),
  amount_discount: z.number().nonnegative(),
  amount_tax: z.number().nonnegative(),
  amount_net: z.number().positive(),
  transaction_timestamp: z.string().datetime(),
  items: z.array(TransactionItemSchema),
});

const IngestPayloadSchema = z.object({
  daybook_id: z.string().uuid(),
  transactions: z.array(IngestTransactionSchema),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate Request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized: Missing or invalid token format.' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    // Set active session in Supabase if token is a standard user JWT
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized: Session invalid or expired.' },
        { status: 401 }
      );
    }

    // 2. Validate Request Body
    const body = await request.json();
    const parseResult = IngestPayloadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { status: 'error', message: 'Bad Request: Invalid payload structure.', errors: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { daybook_id, transactions } = parseResult.data;

    // 3. Fetch Daybook and Tenant ID
    const { data: db, error: dbErr } = await supabase
      .from('daybooks')
      .select('tenant_id, branch_id, status')
      .eq('id', daybook_id)
      .single();

    if (dbErr || !db) {
      return NextResponse.json(
        { status: 'error', message: 'Daybook not found.' },
        { status: 404 }
      );
    }

    if (db.status !== 'draft') {
      return NextResponse.json(
        { status: 'error', message: 'Modifications blocked: Associated Daybook is closed.' },
        { status: 400 }
      );
    }

    let ingestedCount = 0;

    // 4. Ingest Transactions
    for (const tx of transactions) {
      // Perform math check
      const expectedNet = Number((tx.amount_gross - tx.amount_discount + tx.amount_tax).toFixed(2));
      if (Number(tx.amount_net.toFixed(2)) !== expectedNet) {
        return NextResponse.json(
          { status: 'error', message: `Math check failed for invoice ${tx.invoice_number}. Net amount mismatch.` },
          { status: 400 }
        );
      }

      // Write sales_transaction
      const { data: salesTx, error: txErr } = await supabase
        .from('sales_transactions')
        .insert({
          tenant_id: db.tenant_id,
          branch_id: db.branch_id,
          daybook_id,
          invoice_number: tx.invoice_number,
          payment_method: tx.payment_method,
          amount_gross: tx.amount_gross,
          amount_discount: tx.amount_discount,
          amount_tax: tx.amount_tax,
          amount_net: tx.amount_net,
          transaction_timestamp: tx.transaction_timestamp,
        })
        .select('id')
        .single();

      if (txErr || !salesTx) {
        return NextResponse.json(
          { status: 'error', message: `Database error saving invoice ${tx.invoice_number}: ${txErr?.message}` },
          { status: 500 }
        );
      }

      // Write items
      for (const item of tx.items) {
        // Resolve menu item by SKU
        const { data: menuItem } = await supabase
          .from('menu_items')
          .select('id')
          .eq('sku', item.menu_item_sku)
          .eq('tenant_id', db.tenant_id)
          .maybeSingle();

        if (!menuItem) {
          return NextResponse.json(
            { status: 'error', message: `Menu item SKU ${item.menu_item_sku} not found under tenant.` },
            { status: 400 }
          );
        }

        const { error: itemErr } = await supabase
          .from('sales_items')
          .insert({
            sales_transaction_id: salesTx.id,
            menu_item_id: menuItem.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: Number((item.quantity * item.unit_price).toFixed(2)),
          });

        if (itemErr) {
          return NextResponse.json(
            { status: 'error', message: `Database error saving items for invoice ${tx.invoice_number}: ${itemErr.message}` },
            { status: 500 }
          );
        }
      }

      ingestedCount++;
    }

    return NextResponse.json(
      { status: 'success', message: `Successfully ingested ${ingestedCount} POS transactions.`, ingested_count: ingestedCount },
      { status: 201 }
    );

  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', message: err.message || 'Internal Server Error.' },
      { status: 500 }
    );
  }
}
