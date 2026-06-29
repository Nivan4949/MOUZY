// Mock Supabase Client implementation for local testing without database setups.
// Stores mock tables dynamically in localStorage (client) and simulates Postgres triggers.

const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000099',
  email: 'manager.402@mouzyerp.com',
  user_metadata: {
    tenant_id: '00000000-0000-0000-0000-000000000001',
    branch_id: '00000000-0000-0000-0000-000000000010',
    app_role: 'super_admin'
  }
};

export function getMockDefaults(table: string): any[] {
  switch (table) {
    case 'tenants':
      return [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Mouzy Outlets', subdomain: 'mouzy', status: 'active' }
      ];
    case 'branches':
      return [
        { id: '00000000-0000-0000-0000-000000000010', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Bangalore Indiranagar', code: 'BLR01', region: 'South', city: 'Bangalore', address: '12nd Main, Indiranagar', timezone: 'Asia/Kolkata', is_active: true }
      ];
    case 'roles':
      return [
        { id: '00000000-0000-0000-0000-000000000100', tenant_id: '00000000-0000-0000-0000-000000000001', role_name: 'super_admin', permissions: ['*'] }
      ];
    case 'users':
      return [
        { id: '00000000-0000-0000-0000-000000000099', tenant_id: '00000000-0000-0000-0000-000000000001', role_id: '00000000-0000-0000-0000-000000000100', primary_branch_id: '00000000-0000-0000-0000-000000000010', full_name: 'Bangalore Manager', email: 'manager.402@mouzyerp.com', is_active: true }
      ];
    case 'purchase_heads':
      return [
        { id: '00000000-0000-0000-0000-000000000201', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Food Ingredients', gl_code: 'PUR-001', is_active: true },
        { id: '00000000-0000-0000-0000-000000000202', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Dairy & Milk', gl_code: 'PUR-002', is_active: true },
        { id: '00000000-0000-0000-0000-000000000203', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Beverages', gl_code: 'PUR-003', is_active: true },
        { id: '00000000-0000-0000-0000-000000000204', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Packaging & Disposables', gl_code: 'PUR-004', is_active: true },
        { id: '00000000-0000-0000-0000-000000000205', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Banana', gl_code: 'PUR-005', is_active: true },
        { id: '00000000-0000-0000-0000-000000000206', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Sugar', gl_code: 'PUR-007', is_active: true },
        { id: '00000000-0000-0000-0000-000000000207', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Mouzy Distributors', gl_code: 'PUR-008', is_active: true },
        { id: '00000000-0000-0000-0000-000000000208', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Nuts', gl_code: 'PUR-009', is_active: true },
        { id: '00000000-0000-0000-0000-000000000209', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Dry Fruits', gl_code: 'PUR-010', is_active: true },
        { id: '00000000-0000-0000-0000-000000000210', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Toppings / Crushes', gl_code: 'PUR-011', is_active: true },
        { id: '00000000-0000-0000-0000-000000000211', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Ice Creams', gl_code: 'PUR-012', is_active: true },
        { id: '00000000-0000-0000-0000-000000000212', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Fruits', gl_code: 'PUR-013', is_active: true },
        { id: '00000000-0000-0000-0000-000000000213', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Breads', gl_code: 'PUR-014', is_active: true },
        { id: '00000000-0000-0000-0000-000000000214', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Chicken', gl_code: 'PUR-015', is_active: true },
        { id: '00000000-0000-0000-0000-000000000215', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Cheesy Items', gl_code: 'PUR-016', is_active: true },
        { id: '00000000-0000-0000-0000-000000000216', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Shake Pulps', gl_code: 'PUR-017', is_active: true },
        { id: '00000000-0000-0000-0000-000000000217', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Doodh Malai Items', gl_code: 'PUR-018', is_active: true },
        { id: '00000000-0000-0000-0000-000000000218', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Falooda Items', gl_code: 'PUR-019', is_active: true },
        { id: '00000000-0000-0000-0000-000000000219', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Fizz Items', gl_code: 'PUR-020', is_active: true },
        { id: '00000000-0000-0000-0000-000000000220', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Water', gl_code: 'PUR-021', is_active: true },
        { id: '00000000-0000-0000-0000-000000000221', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Avil Local Purchase', gl_code: 'PUR-023', is_active: true }
      ];
    case 'expense_categories':
      return [
        { id: '00000000-0000-0000-0000-000000000310', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Electricity & Power', approval_threshold: 2000.00, is_active: true },
        { id: '00000000-0000-0000-0000-000000000320', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Water Tankers', approval_threshold: 1000.00, is_active: true },
        { id: '00000000-0000-0000-0000-000000000330', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Staff Daily Food', approval_threshold: 500.00, is_active: true }
      ];
    case 'vendors':
      return [
        { id: '00000000-0000-0000-0000-000000000410', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Metro Wholesale', code: 'METRO01', credit_terms_days: 15, current_balance: 0 },
        { id: '00000000-0000-0000-0000-000000000420', tenant_id: '00000000-0000-0000-0000-000000000001', name: 'Amul Dairy Distributors', code: 'AMUL02', credit_terms_days: 7, current_balance: 0 }
      ];
    case 'bank_accounts':
      return [
        { id: '00000000-0000-0000-0000-000000000510', tenant_id: '00000000-0000-0000-0000-000000000001', bank_name: 'HDFC Bank Ltd', account_name: 'Mouzy Retail', account_number: '50100123456789' }
      ];
    default:
      return [];
  }
}

// Emulate Postgres trigger side effects in client-side mock datastore
function handleMockTriggers(table: string, rows: any[], action: 'INSERT' | 'UPDATE' | 'DELETE') {
  if (typeof window === 'undefined') return;

  // Retrieve primary daybook ID affected
  const firstRow = rows[0];
  const daybookId = firstRow?.daybook_id;
  if (!daybookId) return;

  const dbKey = 'mouzy_mock_daybooks';
  const dbRaw = localStorage.getItem(dbKey);
  const daybooks = dbRaw ? JSON.parse(dbRaw) : [];
  const dbIndex = daybooks.findIndex((d: any) => d.id === daybookId);
  if (dbIndex === -1) return;

  const daybook = daybooks[dbIndex];

  // 1. If sales_transactions changed, aggregate sales channels on the Daybook
  if (table === 'sales_transactions') {
    const txRaw = localStorage.getItem('mouzy_mock_sales_transactions') || '[]';
    const txs = JSON.parse(txRaw).filter((tx: any) => tx.daybook_id === daybookId);

    daybook.sales_cash = txs.filter((t: any) => t.payment_method === 'cash').reduce((a: any, b: any) => a + Number(b.amount_net), 0);
    daybook.sales_gpay = txs.filter((t: any) => t.payment_method === 'gpay').reduce((a: any, b: any) => a + Number(b.amount_net), 0);
    daybook.sales_card = txs.filter((t: any) => t.payment_method === 'card').reduce((a: any, b: any) => a + Number(b.amount_net), 0);
    daybook.sales_swiggy = txs.filter((t: any) => t.payment_method === 'swiggy').reduce((a: any, b: any) => a + Number(b.amount_net), 0);
    daybook.sales_zomato = txs.filter((t: any) => t.payment_method === 'zomato').reduce((a: any, b: any) => a + Number(b.amount_net), 0);
    daybook.sales_online = txs.filter((t: any) => t.payment_method === 'online').reduce((a: any, b: any) => a + Number(b.amount_net), 0);
  }

  // 2. Compute Expected Cash
  // Expected Cash = opening_cash + cash_sales + cash_income - cash_purchases - cash_expenses - bank_deposits + bank_withdrawals
  const cashSales = daybook.sales_cash || 0;
  
  const incRaw = localStorage.getItem('mouzy_mock_income') || '[]';
  const cashIncome = JSON.parse(incRaw)
    .filter((i: any) => i.daybook_id === daybookId && i.payment_method === 'cash')
    .reduce((a: any, b: any) => a + Number(b.amount), 0);

  const purRaw = localStorage.getItem('mouzy_mock_purchases') || '[]';
  const cashPurchases = JSON.parse(purRaw)
    .filter((p: any) => p.daybook_id === daybookId && p.payment_mode === 'cash')
    .reduce((a: any, b: any) => a + Number(b.amount), 0);

  const expRaw = localStorage.getItem('mouzy_mock_expenses') || '[]';
  const cashExpenses = JSON.parse(expRaw)
    .filter((e: any) => e.daybook_id === daybookId && e.payment_mode === 'cash' && e.is_approved)
    .reduce((a: any, b: any) => a + Number(b.amount), 0);

  const bankDeposits = Number(daybook.bank_deposits) || 0;
  const bankWithdrawals = Number(daybook.bank_withdrawals) || 0;

  daybook.expected_cash = Number(daybook.opening_cash) + cashSales + cashIncome - cashPurchases - cashExpenses - bankDeposits + bankWithdrawals;
  daybook.cash_difference = (Number(daybook.physical_cash) || 0) - daybook.expected_cash;

  daybooks[dbIndex] = daybook;
  localStorage.setItem(dbKey, JSON.stringify(daybooks));
}

// Mock Query Builder
class MockQueryBuilder {
  table: string;
  filters: ((item: any) => boolean)[] = [];
  sortCol: string | null = null;
  sortAscending = true;
  limitCount: number | null = null;
  isSingle = false;
  isMaybeSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  private getData() {
    if (typeof window === 'undefined') return [];
    const key = `mouzy_mock_${this.table}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    
    const defaults = getMockDefaults(this.table);
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }

  private saveData(data: any[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`mouzy_mock_${this.table}`, JSON.stringify(data));
  }

  select(fields?: string) {
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push((item) => item[col] === val);
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push((item) => item[col] !== val);
    return this;
  }

  in(col: string, vals: any[]) {
    this.filters.push((item) => vals.includes(item[col]));
    return this;
  }

  gte(col: string, val: any) {
    this.filters.push((item) => item[col] >= val);
    return this;
  }

  lte(col: string, val: any) {
    this.filters.push((item) => item[col] <= val);
    return this;
  }

  order(col: string, options?: { ascending?: boolean }) {
    this.sortCol = col;
    this.sortAscending = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  // Then handler for async await
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    let data = this.getData();
    
    // Apply filters
    for (const filter of this.filters) {
      data = data.filter(filter);
    }

    // Apply sort
    if (this.sortCol) {
      const col = this.sortCol;
      const asc = this.sortAscending;
      data.sort((a: any, b: any) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitCount !== null) {
      data = data.slice(0, this.limitCount);
    }

    let result: any = data;
    if (this.isSingle) {
      result = data[0] || null;
    } else if (this.isMaybeSingle) {
      result = data[0] || null;
    }

    const resObj = { data: result, error: null };
    return Promise.resolve(resObj).then(onfulfilled, onrejected);
  }

  async insert(rows: any | any[]) {
    const list = this.getData();
    const newRows = Array.isArray(rows) ? rows : [rows];
    
    const prepared = newRows.map((row: any) => ({
      id: row.id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...row
    }));

    list.push(...prepared);
    this.saveData(list);
    
    handleMockTriggers(this.table, prepared, 'INSERT');

    return { data: Array.isArray(rows) ? prepared : prepared[0], error: null };
  }

  async update(fields: any) {
    let list = this.getData();
    let updatedRows: any[] = [];
    
    list = list.map((item: any) => {
      let matches = true;
      for (const filter of this.filters) {
        if (!filter(item)) matches = false;
      }
      
      if (matches) {
        const updated = { ...item, ...fields, updated_at: new Date().toISOString() };
        updatedRows.push(updated);
        return updated;
      }
      return item;
    });

    this.saveData(list);
    handleMockTriggers(this.table, updatedRows, 'UPDATE');
    
    return { data: this.isSingle ? (updatedRows[0] || null) : updatedRows, error: null };
  }

  async delete() {
    const list = this.getData();
    const kept: any[] = [];
    const deleted: any[] = [];

    list.forEach((item: any) => {
      let matches = true;
      for (const filter of this.filters) {
        if (!filter(item)) matches = false;
      }
      if (matches) {
        deleted.push(item);
      } else {
        kept.push(item);
      }
    });

    this.saveData(kept);
    handleMockTriggers(this.table, deleted, 'DELETE');
    
    return { data: deleted, error: null };
  }
}

// Simulated RPC procedures
async function handleMockRPC(fn: string, args: any): Promise<any> {
  if (typeof window === 'undefined') return { data: null, error: null };

  if (fn === 'approve_daybook') {
    const dbKey = 'mouzy_mock_daybooks';
    const daybooks = JSON.parse(localStorage.getItem(dbKey) || '[]');
    const idx = daybooks.findIndex((d: any) => d.id === args.p_daybook_id);
    if (idx !== -1) {
      const currentStatus = daybooks[idx].status;
      if (currentStatus === 'submitted') {
        daybooks[idx].status = 'branch_approved';
      } else if (currentStatus === 'branch_approved') {
        daybooks[idx].status = 'approved';
        daybooks[idx].approved_by = args.p_user_id;
        daybooks[idx].closed_at = new Date().toISOString();
      } else {
        return { data: null, error: new Error('Daybook cannot be approved from status: ' + currentStatus) };
      }
      localStorage.setItem(dbKey, JSON.stringify(daybooks));
      return { data: null, error: null };
    }
    return { data: null, error: new Error('Daybook not found') };
  }

  if (fn === 'reject_daybook') {
    const dbKey = 'mouzy_mock_daybooks';
    const daybooks = JSON.parse(localStorage.getItem(dbKey) || '[]');
    const idx = daybooks.findIndex((d: any) => d.id === args.p_daybook_id);
    if (idx !== -1) {
      const currentStatus = daybooks[idx].status;
      if (currentStatus === 'submitted' || currentStatus === 'branch_approved') {
        daybooks[idx].status = 'rejected';
        daybooks[idx].variance_justification = (daybooks[idx].variance_justification || '') + `\n[Rejected by ${args.p_user_id}]: ${args.p_reason}`;
        localStorage.setItem(dbKey, JSON.stringify(daybooks));
        return { data: null, error: null };
      }
      return { data: null, error: new Error('Daybook cannot be rejected from status: ' + currentStatus) };
    }
    return { data: null, error: new Error('Daybook not found') };
  }

  if (fn === 'reopen_daybook') {
    const dbKey = 'mouzy_mock_daybooks';
    const daybooks = JSON.parse(localStorage.getItem(dbKey) || '[]');
    const idx = daybooks.findIndex((d: any) => d.id === args.p_daybook_id);
    if (idx !== -1) {
      const currentStatus = daybooks[idx].status;
      if (currentStatus === 'approved' || currentStatus === 'rejected') {
        daybooks[idx].status = 'draft';
        localStorage.setItem(dbKey, JSON.stringify(daybooks));
        return { data: null, error: null };
      }
      return { data: null, error: new Error('Daybook cannot be re-opened from status: ' + currentStatus) };
    }
    return { data: null, error: new Error('Daybook not found') };
  }

  if (fn === 'record_vendor_payout') {
    // Process FIFO payments in localstorage
    const vLedgerKey = 'mouzy_mock_vendor_ledger';
    const ledger = JSON.parse(localStorage.getItem(vLedgerKey) || '[]');
    const payoutAmount = args.p_amount;

    // Save payout transaction row
    const newPayout = {
      id: crypto.randomUUID(),
      tenant_id: args.p_tenant_id,
      vendor_id: args.p_vendor_id,
      transaction_type: 'payment',
      reference_id: crypto.randomUUID(),
      reference_document: args.p_reference_document,
      transaction_date: args.p_transaction_date,
      debit_amount: payoutAmount,
      credit_amount: 0,
      running_balance: 0
    };

    // Update vendor balances
    const vendors = JSON.parse(localStorage.getItem('mouzy_mock_vendors') || '[]');
    const vIdx = vendors.findIndex((v: any) => v.id === args.p_vendor_id);
    if (vIdx !== -1) {
      vendors[vIdx].current_balance = Number(vendors[vIdx].current_balance) - payoutAmount;
      newPayout.running_balance = vendors[vIdx].current_balance;
      localStorage.setItem('mouzy_mock_vendors', JSON.stringify(vendors));
    }

    ledger.push(newPayout);
    localStorage.setItem(vLedgerKey, JSON.stringify(ledger));

    // Allocate payment using FIFO rules
    const purKey = 'mouzy_mock_purchases';
    const purchases = JSON.parse(localStorage.getItem(purKey) || '[]');
    let remaining = payoutAmount;

    for (let i = 0; i < purchases.length; i++) {
      const p = purchases[i];
      if (p.vendor_id === args.p_vendor_id && p.payment_mode === 'credit' && p.payment_status !== 'paid') {
        const allocKey = 'mouzy_mock_invoice_allocations';
        const allocations = JSON.parse(localStorage.getItem(allocKey) || '[]');
        const totalAllocatedExisting = allocations
          .filter((a: any) => a.purchase_id === p.id)
          .reduce((sum: number, a: any) => sum + Number(a.amount_allocated), 0);
        
        const unpaid = Number(p.amount) - totalAllocatedExisting;
        if (unpaid > 0) {
          const allocated = Math.min(remaining, unpaid);
          allocations.push({
            id: crypto.randomUUID(),
            tenant_id: args.p_tenant_id,
            payment_ledger_id: newPayout.id,
            purchase_id: p.id,
            amount_allocated: allocated,
            created_at: new Date().toISOString()
          });
          localStorage.setItem(allocKey, JSON.stringify(allocations));

          if (totalAllocatedExisting + allocated >= Number(p.amount)) {
            purchases[i].payment_status = 'paid';
          } else {
            purchases[i].payment_status = 'partially_paid';
          }

          remaining -= allocated;
          if (remaining <= 0) break;
        }
      }
    }
    localStorage.setItem(purKey, JSON.stringify(purchases));
    return { data: newPayout.id, error: null };
  }

  return { data: null, error: null };
}

// Main Client Class
export class MockSupabaseClient {
  auth = {
    getUser: async () => {
      if (typeof window === 'undefined') return { data: { user: null } };
      const isLoggedIn = localStorage.getItem('sb-mock-logged-in') === 'true';
      if (!isLoggedIn) {
        return { data: { user: null } };
      }
      const role = localStorage.getItem('sb-mock-role') || 'super_admin';
      const email = localStorage.getItem('sb-mock-email') || 'mouzy@mouzyerp.com';
      return { data: { user: { 
        ...MOCK_USER, 
        email, 
        user_metadata: { ...MOCK_USER.user_metadata, app_role: role } 
      } } };
    },
    signInWithPassword: async ({ email, password }: any) => {
      const normalizedEmail = email?.toLowerCase().trim();
      
      // Check default credentials
      const isDefaultUser = normalizedEmail === 'mouzy' || normalizedEmail === 'mouzy@mouzyerp.com';
      const isDefaultPassword = password === 'Mouzy@123';

      let matchedUser: any = null;
      let isPasswordMatch = false;
      let userEmail = 'mouzy@mouzyerp.com';

      if (isDefaultUser && isDefaultPassword) {
        isPasswordMatch = true;
      } else if (typeof window !== 'undefined') {
        const createdUsersRaw = localStorage.getItem('mouzy_mock_created_users') || '[]';
        const createdUsers = JSON.parse(createdUsersRaw);
        matchedUser = createdUsers.find(
          (u: any) => u.username.toLowerCase() === normalizedEmail || `${u.username.toLowerCase()}@mouzyerp.com` === normalizedEmail
        );
        if (matchedUser && matchedUser.password === password) {
          isPasswordMatch = true;
          userEmail = matchedUser.username.includes('@') ? matchedUser.username : `${matchedUser.username}@mouzyerp.com`;
        }
      }

      if (!isPasswordMatch) {
        return { 
          data: { user: null }, 
          error: { message: 'Invalid credentials. Please use username "mouzy" and password "Mouzy@123".' } 
        };
      }

      const role = 'super_admin';
      if (typeof window !== 'undefined') {
        localStorage.setItem('sb-mock-logged-in', 'true');
        localStorage.setItem('sb-mock-email', userEmail);
        localStorage.setItem('sb-mock-role', role);
        document.cookie = `sb-mock-session=true; path=/; max-age=36000`;
        document.cookie = `sb-mock-role=${role}; path=/; max-age=36000`;
        document.cookie = `sb-mock-email=${userEmail}; path=/; max-age=36000`;
      }
      return { data: { user: { ...MOCK_USER, email: userEmail, user_metadata: { ...MOCK_USER.user_metadata, app_role: role } } }, error: null };
    },
    signOut: async () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sb-mock-logged-in');
        localStorage.removeItem('sb-mock-role');
        localStorage.removeItem('sb-mock-email');
        document.cookie = `sb-mock-session=; path=/; max-age=0`;
        document.cookie = `sb-mock-role=; path=/; max-age=0`;
        document.cookie = `sb-mock-email=; path=/; max-age=0`;
      }
      return { error: null };
    }
  };

  from(table: string) {
    return new MockQueryBuilder(table);
  }

  rpc(fn: string, args: any) {
    return handleMockRPC(fn, args);
  }

  channel(name: string) {
    const mockChan = {
      on: (event: string, filter: any, callback: () => void) => {
        return mockChan;
      },
      subscribe: () => {
        return mockChan;
      }
    };
    return mockChan;
  }

  removeChannel(chan: any) {
    return;
  }
}
