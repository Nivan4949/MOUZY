-- ============================================================================
-- SQL Migration: 20260625000000_init_schema.sql
-- Project: Mouzy ERP (Daybook-only Scope Revision V2)
-- Target Environment: PostgreSQL 16+ (Supabase Architecture)
-- ============================================================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create Schemas
CREATE SCHEMA IF NOT EXISTS audit;

-- ============================================================================
-- 1. Helper Functions & Automation Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Core Config & RBAC Tables
-- ============================================================================

-- tenants Table
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    subdomain VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tenant_status CHECK (status IN ('active', 'suspended', 'archived'))
);

CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- branches Table
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    region VARCHAR(50) NOT NULL,
    city VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_branch_code UNIQUE (tenant_id, code)
);

CREATE TRIGGER trg_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_branches_tenant_id ON public.branches(tenant_id);

-- roles Table
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    role_name VARCHAR(50) NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_role UNIQUE (tenant_id, role_name)
);

CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- users Table (Links to Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY, -- Populated with auth.users.id
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    primary_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- financial_periods Table (Period locking)
CREATE TABLE public.financial_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_period_dates CHECK (start_date <= end_date)
);

CREATE TRIGGER trg_financial_periods_updated_at
    BEFORE UPDATE ON public.financial_periods
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_financial_periods_lookup ON public.financial_periods(tenant_id, start_date, end_date);

-- ============================================================================
-- 3. Operational Master Tables
-- ============================================================================

-- purchase_heads Table
CREATE TABLE public.purchase_heads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    gl_code VARCHAR(30) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_gl_code UNIQUE (tenant_id, gl_code)
);

CREATE TRIGGER trg_purchase_heads_updated_at
    BEFORE UPDATE ON public.purchase_heads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- expense_categories (Expense Heads) Table
CREATE TABLE public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    approval_threshold NUMERIC(15,2) NOT NULL DEFAULT 100.00 CONSTRAINT chk_threshold CHECK (approval_threshold >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_expense_cat UNIQUE (tenant_id, name)
);

CREATE TRIGGER trg_expense_categories_updated_at
    BEFORE UPDATE ON public.expense_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- vendors Table
CREATE TABLE public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    credit_terms_days INT NOT NULL DEFAULT 0 CONSTRAINT chk_credit_terms CHECK (credit_terms_days >= 0),
    tax_number VARCHAR(50),
    current_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_vendor_code UNIQUE (tenant_id, code)
);

CREATE TRIGGER trg_vendors_updated_at
    BEFORE UPDATE ON public.vendors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bank_accounts Table
CREATE TABLE public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bank_account UNIQUE (tenant_id, account_number)
);

CREATE TRIGGER trg_bank_accounts_updated_at
    BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. Daybooks & Transaction Tables
-- ============================================================================

-- daybooks Table
CREATE TABLE public.daybooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    business_date DATE NOT NULL,
    
    -- Cash float
    opening_cash NUMERIC(15,2) NOT NULL DEFAULT 0.00 CONSTRAINT chk_opening_cash_positive CHECK (opening_cash >= 0),
    expected_cash NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    physical_cash NUMERIC(15,2) NOT NULL DEFAULT 0.00 CONSTRAINT chk_physical_cash_positive CHECK (physical_cash >= 0),
    cash_difference NUMERIC(15,2) GENERATED ALWAYS AS (physical_cash - expected_cash) STORED,
    variance_justification TEXT,
    
    -- Salessplit summary columns (Automatically populated via trigger on sales_transactions)
    sales_cash NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    sales_gpay NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    sales_card NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    sales_swiggy NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    sales_zomato NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    sales_online NUMERIC(15,2) NOT NULL DEFAULT 0.00, -- Other Online Sales
    
    -- Bank balances summary
    bank_opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    bank_deposits NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    bank_withdrawals NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    bank_closing_balance NUMERIC(15,2) GENERATED ALWAYS AS (bank_opening_balance + bank_deposits - bank_withdrawals) STORED,
    
    -- Denominations count
    denom_500 INT NOT NULL DEFAULT 0,
    denom_200 INT NOT NULL DEFAULT 0,
    denom_100 INT NOT NULL DEFAULT 0,
    denom_50 INT NOT NULL DEFAULT 0,
    denom_20 INT NOT NULL DEFAULT 0,
    denom_10 INT NOT NULL DEFAULT 0,
    denom_coins INT NOT NULL DEFAULT 0,
    
    -- Other income
    other_income NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    
    CONSTRAINT uq_branch_business_date UNIQUE (branch_id, business_date),
    CONSTRAINT chk_daybook_status CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    CONSTRAINT chk_variance_reason CHECK (ABS(cash_difference) = 0 OR variance_justification IS NOT NULL)
);

CREATE TRIGGER trg_daybooks_updated_at
    BEFORE UPDATE ON public.daybooks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_daybooks_lookup ON public.daybooks(branch_id, business_date, status);

-- sales_transactions Table
CREATE TABLE public.sales_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    daybook_id UUID NOT NULL REFERENCES public.daybooks(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) NOT NULL,
    payment_method VARCHAR(30) NOT NULL, -- 'cash', 'gpay', 'card', 'swiggy', 'zomato', 'online'
    amount_gross NUMERIC(15,2) NOT NULL CONSTRAINT chk_sales_gross CHECK (amount_gross >= 0),
    amount_discount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CONSTRAINT chk_sales_discount CHECK (amount_discount >= 0),
    amount_tax NUMERIC(15,2) NOT NULL DEFAULT 0.00 CONSTRAINT chk_sales_tax CHECK (amount_tax >= 0),
    amount_net NUMERIC(15,2) NOT NULL CONSTRAINT chk_sales_net CHECK (amount_net >= 0),
    transaction_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sales_math CHECK (amount_net = amount_gross - amount_discount + amount_tax),
    CONSTRAINT chk_sales_method CHECK (payment_method IN ('cash', 'gpay', 'card', 'swiggy', 'zomato', 'online'))
);

-- cash_transactions Table (Auditing Cash Ledger)
CREATE TABLE public.cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    daybook_id UUID NOT NULL REFERENCES public.daybooks(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(30) NOT NULL, -- 'sales_cash', 'petty_cash_expense', 'safe_drop', 'cash_purchase', 'cash_withdrawal'
    direction VARCHAR(3) NOT NULL, -- 'in' or 'out'
    amount NUMERIC(15,2) NOT NULL CONSTRAINT chk_cash_amount CHECK (amount > 0),
    recipient_info VARCHAR(150),
    reference_id UUID, -- References sales_transaction.id, purchase.id, expense.id
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cash_direction CHECK (direction IN ('in', 'out')),
    CONSTRAINT chk_cash_tx_type CHECK (transaction_type IN ('sales_cash', 'petty_cash_expense', 'safe_drop', 'cash_purchase', 'cash_withdrawal'))
);

CREATE INDEX idx_cash_transactions_lookup ON public.cash_transactions(daybook_id, direction);

-- purchases Table
CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    daybook_id UUID REFERENCES public.daybooks(id) ON DELETE RESTRICT,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
    purchase_head_id UUID NOT NULL REFERENCES public.purchase_heads(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    amount NUMERIC(15,2) NOT NULL CONSTRAINT chk_purchase_amount CHECK (amount >= 0),
    payment_mode VARCHAR(30) NOT NULL, -- 'cash', 'bank', 'credit'
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_purchase_payment CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid')),
    CONSTRAINT chk_purchase_mode CHECK (payment_mode IN ('cash', 'bank', 'credit'))
);

CREATE TRIGGER trg_purchases_updated_at
    BEFORE UPDATE ON public.purchases
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_purchases_daybook ON public.purchases(daybook_id) WHERE daybook_id IS NOT NULL;

-- expenses Table
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    daybook_id UUID NOT NULL REFERENCES public.daybooks(id) ON DELETE RESTRICT,
    expense_category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    amount NUMERIC(15,2) NOT NULL CONSTRAINT chk_expense_amount CHECK (amount > 0),
    description TEXT NOT NULL,
    payment_mode VARCHAR(30) NOT NULL DEFAULT 'cash', -- 'cash', 'bank'
    requires_hq_approval BOOLEAN NOT NULL DEFAULT FALSE,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    approved_by UUID REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_expense_mode CHECK (payment_mode IN ('cash', 'bank'))
);

CREATE TRIGGER trg_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_expenses_daybook ON public.expenses(daybook_id);

-- income Table
CREATE TABLE public.income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    daybook_id UUID NOT NULL REFERENCES public.daybooks(id) ON DELETE RESTRICT,
    source VARCHAR(100) NOT NULL,
    amount NUMERIC(15,2) NOT NULL CONSTRAINT chk_income_amount CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL, -- 'cash', 'gpay', 'card'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- bank_transactions Table
CREATE TABLE public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
    transaction_date DATE NOT NULL,
    reference_number VARCHAR(100),
    description TEXT NOT NULL,
    debit_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CONSTRAINT chk_bank_debit CHECK (debit_amount >= 0),
    credit_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CONSTRAINT chk_bank_credit CHECK (credit_amount >= 0),
    is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
    reconciled_with UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_bank_tx_exclusivity CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0))
);

-- vendor_ledger Table
CREATE TABLE public.vendor_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(30) NOT NULL, -- 'invoice', 'payment', 'return'
    reference_id UUID NOT NULL,
    reference_document VARCHAR(100) NOT NULL,
    transaction_date DATE NOT NULL,
    debit_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CONSTRAINT chk_ledger_debit CHECK (debit_amount >= 0),
    credit_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CONSTRAINT chk_ledger_credit CHECK (credit_amount >= 0),
    running_balance NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_ledger_exclusivity CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0))
);

CREATE INDEX idx_vendor_ledger_history ON public.vendor_ledger(vendor_id, transaction_date DESC, created_at DESC);

-- invoice_allocations Table
CREATE TABLE public.invoice_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    payment_ledger_id UUID NOT NULL REFERENCES public.vendor_ledger(id) ON DELETE CASCADE,
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    amount_allocated NUMERIC(15,2) NOT NULL CONSTRAINT chk_allocated_positive CHECK (amount_allocated > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- report_jobs Table
CREATE TABLE public.report_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    report_type VARCHAR(50) NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CONSTRAINT chk_job_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    download_url TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. Audit & History Logging Engine
-- ============================================================================

CREATE TABLE audit.logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID,
    action_type VARCHAR(20) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB DEFAULT '{}'::jsonb,
    new_values JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

REVOKE UPDATE, DELETE ON audit.logs FROM public;

CREATE INDEX idx_audit_lookup ON audit.logs(tenant_id, table_name, record_id);

CREATE OR REPLACE FUNCTION audit.if_modified_func()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
    v_old JSONB := '{}'::jsonb;
    v_new JSONB := '{}'::jsonb;
BEGIN
    v_user_id := NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    
    IF (TG_OP = 'DELETE') THEN
        v_tenant_id := OLD.tenant_id;
    ELSE
        v_tenant_id := NEW.tenant_id;
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
    ELSIF (TG_OP = 'DELETE') THEN
        v_old := to_jsonb(OLD);
    ELSIF (TG_OP = 'INSERT') THEN
        v_new := to_jsonb(NEW);
    END IF;

    INSERT INTO audit.logs (
        tenant_id,
        user_id,
        action_type,
        table_name,
        record_id,
        old_values,
        new_values,
        ip_address
    ) VALUES (
        v_tenant_id,
        v_user_id,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_old,
        v_new,
        NULLIF(current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for', '')::inet
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_daybooks
    AFTER INSERT OR UPDATE OR DELETE ON public.daybooks
    FOR EACH ROW EXECUTE FUNCTION audit.if_modified_func();

CREATE TRIGGER trg_audit_purchases
    AFTER INSERT OR UPDATE OR DELETE ON public.purchases
    FOR EACH ROW EXECUTE FUNCTION audit.if_modified_func();

CREATE TRIGGER trg_audit_expenses
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION audit.if_modified_func();

-- ============================================================================
-- 6. Trigger Calculations (Expected Cash & Vendor Ledger balance)
-- ============================================================================

-- A. Synchronize sales Split totals on Daybooks
CREATE OR REPLACE FUNCTION public.sync_sales_to_daybook()
RETURNS TRIGGER AS $$
DECLARE
    v_db_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_db_id := OLD.daybook_id;
    ELSE
        v_db_id := NEW.daybook_id;
    END IF;

    IF v_db_id IS NOT NULL THEN
        UPDATE public.daybooks
        SET 
            sales_cash = COALESCE((SELECT SUM(amount_net) FROM public.sales_transactions WHERE daybook_id = v_db_id AND payment_method = 'cash'), 0.00),
            sales_gpay = COALESCE((SELECT SUM(amount_net) FROM public.sales_transactions WHERE daybook_id = v_db_id AND payment_method = 'gpay'), 0.00),
            sales_card = COALESCE((SELECT SUM(amount_net) FROM public.sales_transactions WHERE daybook_id = v_db_id AND payment_method = 'card'), 0.00),
            sales_swiggy = COALESCE((SELECT SUM(amount_net) FROM public.sales_transactions WHERE daybook_id = v_db_id AND payment_method = 'swiggy'), 0.00),
            sales_zomato = COALESCE((SELECT SUM(amount_net) FROM public.sales_transactions WHERE daybook_id = v_db_id AND payment_method = 'zomato'), 0.00),
            sales_online = COALESCE((SELECT SUM(amount_net) FROM public.sales_transactions WHERE daybook_id = v_db_id AND payment_method = 'online'), 0.00)
        WHERE id = v_db_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_sales
    AFTER INSERT OR UPDATE OR DELETE ON public.sales_transactions
    FOR EACH ROW EXECUTE FUNCTION public.sync_sales_to_daybook();

-- B. Sync Cash Sales into Auditable cash_transactions
CREATE OR REPLACE FUNCTION public.sync_cash_sales_ledger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.payment_method = 'cash' THEN
            INSERT INTO public.cash_transactions (tenant_id, branch_id, daybook_id, transaction_type, direction, amount, reference_id)
            VALUES (NEW.tenant_id, NEW.branch_id, NEW.daybook_id, 'sales_cash', 'in', NEW.amount_net, NEW.id);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Delete if changed from cash, update if amount changed
        IF OLD.payment_method = 'cash' AND NEW.payment_method != 'cash' THEN
            DELETE FROM public.cash_transactions WHERE reference_id = OLD.id;
        ELSIF NEW.payment_method = 'cash' THEN
            INSERT INTO public.cash_transactions (tenant_id, branch_id, daybook_id, transaction_type, direction, amount, reference_id)
            VALUES (NEW.tenant_id, NEW.branch_id, NEW.daybook_id, 'sales_cash', 'in', NEW.amount_net, NEW.id)
            ON CONFLICT DO NOTHING;
            
            UPDATE public.cash_transactions
            SET amount = NEW.amount_net
            WHERE reference_id = NEW.id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.cash_transactions WHERE reference_id = OLD.id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_cash_sales
    AFTER INSERT OR UPDATE OR DELETE ON public.sales_transactions
    FOR EACH ROW EXECUTE FUNCTION public.sync_cash_sales_ledger();

-- C. Sync Cash Purchases into Auditable cash_transactions
CREATE OR REPLACE FUNCTION public.sync_cash_purchases_ledger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.payment_mode = 'cash' THEN
            INSERT INTO public.cash_transactions (tenant_id, branch_id, daybook_id, transaction_type, direction, amount, reference_id)
            VALUES (NEW.tenant_id, NEW.branch_id, NEW.daybook_id, 'cash_purchase', 'out', NEW.amount, NEW.id);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.payment_mode = 'cash' AND NEW.payment_mode != 'cash' THEN
            DELETE FROM public.cash_transactions WHERE reference_id = OLD.id;
        ELSIF NEW.payment_mode = 'cash' THEN
            INSERT INTO public.cash_transactions (tenant_id, branch_id, daybook_id, transaction_type, direction, amount, reference_id)
            VALUES (NEW.tenant_id, NEW.branch_id, NEW.daybook_id, 'cash_purchase', 'out', NEW.amount, NEW.id)
            ON CONFLICT DO NOTHING;

            UPDATE public.cash_transactions
            SET amount = NEW.amount
            WHERE reference_id = NEW.id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.cash_transactions WHERE reference_id = OLD.id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_cash_purchases
    AFTER INSERT OR UPDATE OR DELETE ON public.purchases
    FOR EACH ROW EXECUTE FUNCTION public.sync_cash_purchases_ledger();

-- D. Sync Cash Expenses into Auditable cash_transactions
CREATE OR REPLACE FUNCTION public.sync_cash_expenses_ledger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.payment_mode = 'cash' AND NEW.is_approved = TRUE THEN
            INSERT INTO public.cash_transactions (tenant_id, branch_id, daybook_id, transaction_type, direction, amount, reference_id)
            VALUES (NEW.tenant_id, NEW.branch_id, NEW.daybook_id, 'petty_cash_expense', 'out', NEW.amount, NEW.id);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF (OLD.payment_mode = 'cash' AND NEW.payment_mode != 'cash') OR (NEW.is_approved = FALSE) THEN
            DELETE FROM public.cash_transactions WHERE reference_id = OLD.id;
        ELSIF NEW.payment_mode = 'cash' AND NEW.is_approved = TRUE THEN
            INSERT INTO public.cash_transactions (tenant_id, branch_id, daybook_id, transaction_type, direction, amount, reference_id)
            VALUES (NEW.tenant_id, NEW.branch_id, NEW.daybook_id, 'petty_cash_expense', 'out', NEW.amount, NEW.id)
            ON CONFLICT DO NOTHING;

            UPDATE public.cash_transactions
            SET amount = NEW.amount
            WHERE reference_id = NEW.id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.cash_transactions WHERE reference_id = OLD.id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_cash_expenses
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.sync_cash_expenses_ledger();

-- E. Sync Daybooks bank safe drops / withdrawals
CREATE OR REPLACE FUNCTION public.sync_daybook_bank_flows_ledger()
RETURNS TRIGGER AS $$
BEGIN
    -- Safe Drop (Outflow)
    IF NEW.bank_deposits > 0 THEN
        INSERT INTO public.cash_transactions (tenant_id, branch_id, daybook_id, transaction_type, direction, amount, reference_id)
        VALUES (NEW.tenant_id, NEW.branch_id, NEW.id, 'safe_drop', 'out', NEW.bank_deposits, NEW.id)
        ON CONFLICT DO NOTHING;

        UPDATE public.cash_transactions
        SET amount = NEW.bank_deposits
        WHERE reference_id = NEW.id AND transaction_type = 'safe_drop';
    ELSE
        DELETE FROM public.cash_transactions WHERE reference_id = NEW.id AND transaction_type = 'safe_drop';
    END IF;

    -- Bank Withdrawal (Inflow)
    IF NEW.bank_withdrawals > 0 THEN
        INSERT INTO public.cash_transactions (tenant_id, branch_id, daybook_id, transaction_type, direction, amount, reference_id)
        VALUES (NEW.tenant_id, NEW.branch_id, NEW.id, 'cash_withdrawal', 'in', NEW.bank_withdrawals, NEW.id)
        ON CONFLICT DO NOTHING;

        UPDATE public.cash_transactions
        SET amount = NEW.bank_withdrawals
        WHERE reference_id = NEW.id AND transaction_type = 'cash_withdrawal';
    ELSE
        DELETE FROM public.cash_transactions WHERE reference_id = NEW.id AND transaction_type = 'cash_withdrawal';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_daybook_bank_flows
    AFTER UPDATE OF bank_deposits, bank_withdrawals ON public.daybooks
    FOR EACH ROW EXECUTE FUNCTION public.sync_daybook_bank_flows_ledger();

-- F. Recalculate Expected Closing Cash on Daybook
CREATE OR REPLACE FUNCTION public.calculate_daybook_expected_cash(p_daybook_id UUID)
RETURNS NUMERIC(15,2) AS $$
DECLARE
    v_opening_cash NUMERIC(15,2) := 0.00;
    v_inflows NUMERIC(15,2) := 0.00;
    v_outflows NUMERIC(15,2) := 0.00;
    v_other_income NUMERIC(15,2) := 0.00;
BEGIN
    SELECT opening_cash, other_income INTO v_opening_cash, v_other_income FROM public.daybooks WHERE id = p_daybook_id;
    
    -- Inflows from cash_transactions
    SELECT COALESCE(SUM(amount), 0.00) INTO v_inflows
    FROM public.cash_transactions
    WHERE daybook_id = p_daybook_id AND direction = 'in';

    -- Outflows from cash_transactions
    SELECT COALESCE(SUM(amount), 0.00) INTO v_outflows
    FROM public.cash_transactions
    WHERE daybook_id = p_daybook_id AND direction = 'out';

    RETURN v_opening_cash + v_inflows + v_other_income - v_outflows;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_daybook_expected_cash()
RETURNS TRIGGER AS $$
DECLARE
    v_db_id UUID;
    v_calc NUMERIC(15,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_db_id := OLD.daybook_id;
    ELSE
        v_db_id := NEW.daybook_id;
    END IF;

    IF v_db_id IS NOT NULL THEN
        v_calc := public.calculate_daybook_expected_cash(v_db_id);
        UPDATE public.daybooks
        SET expected_cash = v_calc
        WHERE id = v_db_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalc_expected_cash
    AFTER INSERT OR UPDATE OR DELETE ON public.cash_transactions
    FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_daybook_expected_cash();

-- G. Auto-log Credit Purchases to Vendor Ledger
CREATE OR REPLACE FUNCTION public.sync_credit_purchases_to_ledger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.payment_mode = 'credit' THEN
            INSERT INTO public.vendor_ledger (tenant_id, vendor_id, transaction_type, reference_id, reference_document, transaction_date, credit_amount, running_balance)
            VALUES (NEW.tenant_id, NEW.vendor_id, 'invoice', NEW.id, NEW.invoice_number, NEW.invoice_date, NEW.amount, 0.00);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.payment_mode = 'credit' AND NEW.payment_mode != 'credit' THEN
            DELETE FROM public.vendor_ledger WHERE reference_id = OLD.id AND transaction_type = 'invoice';
        ELSIF NEW.payment_mode = 'credit' THEN
            INSERT INTO public.vendor_ledger (tenant_id, vendor_id, transaction_type, reference_id, reference_document, transaction_date, credit_amount, running_balance)
            VALUES (NEW.tenant_id, NEW.vendor_id, 'invoice', NEW.id, NEW.invoice_number, NEW.invoice_date, NEW.amount, 0.00)
            ON CONFLICT DO NOTHING;

            UPDATE public.vendor_ledger
            SET credit_amount = NEW.amount, transaction_date = NEW.invoice_date, reference_document = NEW.invoice_number
            WHERE reference_id = NEW.id AND transaction_type = 'invoice';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.vendor_ledger WHERE reference_id = OLD.id AND transaction_type = 'invoice';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_credit_purchases
    AFTER INSERT OR UPDATE OR DELETE ON public.purchases
    FOR EACH ROW EXECUTE FUNCTION public.sync_credit_purchases_to_ledger();

-- H. Auto-calculate running vendor ledger balance
CREATE OR REPLACE FUNCTION public.process_vendor_ledger_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_balance_diff NUMERIC(15,2);
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_balance_diff := NEW.credit_amount - NEW.debit_amount;
        
        UPDATE public.vendors
        SET current_balance = current_balance + v_balance_diff
        WHERE id = NEW.vendor_id;

        SELECT current_balance INTO NEW.running_balance
        FROM public.vendors
        WHERE id = NEW.vendor_id;

        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vendor_ledger_insert
    BEFORE INSERT ON public.vendor_ledger
    FOR EACH ROW EXECUTE FUNCTION public.process_vendor_ledger_entry();

-- ============================================================================
-- 7. Views & Analytics
-- ============================================================================

-- View: daybook_financial_summaries
CREATE OR REPLACE VIEW public.daybook_financial_summaries AS
SELECT 
    db.id AS daybook_id,
    db.tenant_id,
    db.branch_id,
    db.business_date,
    -- Net Sales split
    (db.sales_cash + db.sales_gpay + db.sales_card + db.sales_swiggy + db.sales_zomato + db.sales_online) AS net_sales,
    -- Purchase value
    COALESCE((SELECT SUM(amount) FROM public.purchases p WHERE p.daybook_id = db.id), 0.00) AS purchase_value,
    -- Food Cost %
    CASE 
        WHEN (db.sales_cash + db.sales_gpay + db.sales_card + db.sales_swiggy + db.sales_zomato + db.sales_online) > 0 
        THEN ROUND((COALESCE((SELECT SUM(amount) FROM public.purchases p WHERE p.daybook_id = db.id), 0.00) / (db.sales_cash + db.sales_gpay + db.sales_card + db.sales_swiggy + db.sales_zomato + db.sales_online) * 100), 2)
        ELSE 0.00
    END AS food_cost_percentage,
    -- Purchase %
    CASE 
        WHEN (db.sales_cash + db.sales_gpay + db.sales_card + db.sales_swiggy + db.sales_zomato + db.sales_online) > 0 
        THEN ROUND((COALESCE((SELECT SUM(amount) FROM public.purchases p WHERE p.daybook_id = db.id), 0.00) / (db.sales_cash + db.sales_gpay + db.sales_card + db.sales_swiggy + db.sales_zomato + db.sales_online) * 100), 2)
        ELSE 0.00
    END AS purchase_percentage
FROM public.daybooks db;

-- View: branch_revenue_rankings
CREATE OR REPLACE VIEW public.branch_revenue_rankings AS
SELECT 
    b.tenant_id,
    b.id AS branch_id,
    b.name AS branch_name,
    COALESCE(SUM(st.amount_net), 0.00) AS sales
FROM public.branches b
LEFT JOIN public.sales_transactions st ON st.branch_id = b.id
GROUP BY b.tenant_id, b.id, b.name;

-- ============================================================================
-- 8. Context Extraction Helper Functions for RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Try to get from JWT metadata first (fastest, no recursion)
    v_tenant_id := NULLIF(current_setting('request.jwt.claim.user_metadata.tenant_id', true), '')::uuid;
    IF v_tenant_id IS NOT NULL THEN
        RETURN v_tenant_id;
    END IF;
    
    -- Fallback to querying public.users if not set in JWT metadata
    SELECT tenant_id INTO v_tenant_id FROM public.users WHERE id = auth.uid();
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    -- Try to get from JWT metadata first
    v_role := current_setting('request.jwt.claim.user_metadata.app_role', true);
    IF v_role IS NOT NULL AND v_role <> '' THEN
        RETURN v_role;
    END IF;
    
    -- Fallback to querying roles table
    SELECT r.role_name INTO v_role 
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid();
    RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_branch_id()
RETURNS UUID AS $$
DECLARE
    v_branch_id UUID;
BEGIN
    -- Try to get from JWT metadata first
    v_branch_id := NULLIF(current_setting('request.jwt.claim.user_metadata.branch_id', true), '')::uuid;
    IF v_branch_id IS NOT NULL THEN
        RETURN v_branch_id;
    END IF;
    
    -- Fallback to querying public.users
    SELECT primary_branch_id INTO v_branch_id FROM public.users WHERE id = auth.uid();
    RETURN v_branch_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_hq_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.current_user_role() IN ('super_admin', 'finance_head', 'accountant', 'area_manager');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 9. Row-Level Security (RLS) Enablement & Policies
-- ============================================================================

-- tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenants_isolation_policy ON public.tenants
    FOR ALL TO authenticated
    USING (id = public.current_user_tenant_id())
    WITH CHECK (id = public.current_user_tenant_id() AND public.current_user_role() = 'super_admin');

-- branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY branches_isolation_policy ON public.branches
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id() AND public.current_user_role() = 'super_admin');

-- roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY roles_isolation_policy ON public.roles
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id() AND public.current_user_role() = 'super_admin');

-- users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_isolation_policy ON public.users
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id() AND public.current_user_role() = 'super_admin');

-- financial_periods
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_periods_isolation_policy ON public.financial_periods
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id() AND public.current_user_role() IN ('super_admin', 'finance_head'));

-- purchase_heads
ALTER TABLE public.purchase_heads ENABLE ROW LEVEL SECURITY;
CREATE POLICY purchase_heads_isolation_policy ON public.purchase_heads
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id() AND public.current_user_role() IN ('super_admin', 'finance_head', 'accountant'));

-- expense_categories
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY expense_categories_isolation_policy ON public.expense_categories
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id() AND public.current_user_role() IN ('super_admin', 'finance_head', 'accountant'));

-- vendors
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendors_isolation_policy ON public.vendors
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id() AND public.current_user_role() IN ('super_admin', 'finance_head', 'accountant'));

-- bank_accounts
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_accounts_isolation_policy ON public.bank_accounts
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id() AND public.current_user_role() IN ('super_admin', 'finance_head', 'accountant'));

-- daybooks
ALTER TABLE public.daybooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY daybooks_isolation_policy ON public.daybooks
    FOR ALL TO authenticated
    USING (
        tenant_id = public.current_user_tenant_id()
        AND (public.is_hq_user() OR branch_id = public.current_user_branch_id())
    )
    WITH CHECK (
        tenant_id = public.current_user_tenant_id()
        AND (public.is_hq_user() OR branch_id = public.current_user_branch_id())
    );

-- sales_transactions
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sales_transactions_isolation_policy ON public.sales_transactions
    FOR ALL TO authenticated
    USING (
        tenant_id = public.current_user_tenant_id()
        AND (public.is_hq_user() OR branch_id = public.current_user_branch_id())
    )
    WITH CHECK (
        tenant_id = public.current_user_tenant_id()
        AND (public.is_hq_user() OR branch_id = public.current_user_branch_id())
    );

-- cash_transactions
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_transactions_isolation_policy ON public.cash_transactions
    FOR ALL TO authenticated
    USING (
        tenant_id = public.current_user_tenant_id()
        AND (public.is_hq_user() OR branch_id = public.current_user_branch_id())
    )
    WITH CHECK (
        tenant_id = public.current_user_tenant_id()
        AND (public.is_hq_user() OR branch_id = public.current_user_branch_id())
    );

-- purchases
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY purchases_isolation_policy ON public.purchases
    FOR ALL TO authenticated
    USING (
        tenant_id = public.current_user_tenant_id()
        AND (public.is_hq_user() OR branch_id = public.current_user_branch_id())
    )
    WITH CHECK (
        tenant_id = public.current_user_tenant_id()
        AND (public.is_hq_user() OR branch_id = public.current_user_branch_id())
    );

-- expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY expenses_isolation_policy ON public.expenses
    FOR ALL TO authenticated
    USING (
        tenant_id = public.current_user_tenant_id()
        AND (public.is_hq_user() OR branch_id = public.current_user_branch_id())
    )
    WITH CHECK (
        tenant_id = public.current_user_tenant_id()
        AND (public.is_hq_user() OR branch_id = public.current_user_branch_id())
    );

-- income
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
CREATE POLICY income_isolation_policy ON public.income
    FOR ALL TO authenticated
    USING (
        tenant_id = public.current_user_tenant_id()
        AND (public.is_hq_user() OR branch_id = public.current_user_branch_id())
    )
    WITH CHECK (
        tenant_id = public.current_user_tenant_id()
        AND (public.is_hq_user() OR branch_id = public.current_user_branch_id())
    );

-- bank_transactions
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_transactions_isolation_policy ON public.bank_transactions
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id() AND public.current_user_role() IN ('super_admin', 'finance_head', 'accountant'));

-- vendor_ledger
ALTER TABLE public.vendor_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_ledger_isolation_policy ON public.vendor_ledger
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id() AND public.current_user_role() IN ('super_admin', 'finance_head', 'accountant'));

-- invoice_allocations
ALTER TABLE public.invoice_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoice_allocations_isolation_policy ON public.invoice_allocations
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id())
    WITH CHECK (tenant_id = public.current_user_tenant_id() AND public.current_user_role() IN ('super_admin', 'finance_head', 'accountant'));

-- report_jobs
ALTER TABLE public.report_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY report_jobs_isolation_policy ON public.report_jobs
    FOR ALL TO authenticated
    USING (tenant_id = public.current_user_tenant_id() AND (public.is_hq_user() OR user_id = auth.uid()))
    WITH CHECK (tenant_id = public.current_user_tenant_id() AND user_id = auth.uid());

-- audit.logs
ALTER TABLE audit.logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_read_policy ON audit.logs
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_user_tenant_id() AND public.current_user_role() IN ('super_admin', 'finance_head'));

-- ============================================================================
-- 10. Default Seed Data
-- ============================================================================

-- Insert default tenant
INSERT INTO public.tenants (id, name, subdomain, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Mouzy Outlets', 'mouzy', 'active')
ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name;

-- Insert default branches
INSERT INTO public.branches (id, tenant_id, name, code, region, city, address, timezone, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Bangalore Indiranagar', 'BLR01', 'South', 'Bangalore', '12nd Main, Indiranagar', 'Asia/Kolkata', true),
    ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Chennai T-Nagar', 'CHN01', 'South', 'Chennai', 'G N Chetty Road, T-Nagar', 'Asia/Kolkata', true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Insert roles
INSERT INTO public.roles (id, tenant_id, role_name, permissions)
VALUES
    ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'super_admin', '["*"]'::jsonb),
    ('00000000-0000-0000-0000-000000000200', '00000000-0000-0000-0000-000000000001', 'finance_head', '["read:all", "write:finance", "approve:daybook"]'::jsonb),
    ('00000000-0000-0000-0000-000000000300', '00000000-0000-0000-0000-000000000001', 'area_manager', '["read:all", "approve:daybook"]'::jsonb),
    ('00000000-0000-0000-0000-000000000400', '00000000-0000-0000-0000-000000000001', 'branch_manager', '["read:branch", "write:daybook", "write:sales", "write:expense"]'::jsonb),
    ('00000000-0000-0000-0000-000000000500', '00000000-0000-0000-0000-000000000001', 'accountant', '["read:all", "write:ledger", "write:bank"]'::jsonb),
    ('00000000-0000-0000-0000-000000000600', '00000000-0000-0000-0000-000000000001', 'cashier', '["write:daybook", "write:sales"]'::jsonb)
ON CONFLICT (tenant_id, role_name) DO NOTHING;

-- Insert purchase heads
INSERT INTO public.purchase_heads (tenant_id, name, gl_code, is_active)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Food Ingredients', 'PUR-001', true),
    ('00000000-0000-0000-0000-000000000001', 'Dairy & Milk', 'PUR-002', true),
    ('00000000-0000-0000-0000-000000000001', 'Beverages & Soft Drinks', 'PUR-003', true),
    ('00000000-0000-0000-0000-000000000001', 'Packaging & Disposables', 'PUR-004', true)
ON CONFLICT (tenant_id, gl_code) DO NOTHING;

-- Insert expense categories
INSERT INTO public.expense_categories (tenant_id, name, approval_threshold, is_active)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Electricity & Power', 2000.00, true),
    ('00000000-0000-0000-0000-000000000001', 'Water Supply & Tankers', 1000.00, true),
    ('00000000-0000-0000-0000-000000000001', 'Repairs & Maintenance', 1500.00, true),
    ('00000000-0000-0000-0000-000000000001', 'Staff Daily Food allowance', 500.00, true),
    ('00000000-0000-0000-0000-000000000001', 'Stationery & Printing', 300.00, true),
    ('00000000-0000-0000-0000-000000000001', 'Miscellaneous Petty Cash', 200.00, true)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ============================================================================
-- 11. Stored Procedures & Workflows
-- ============================================================================

-- Vendor Ledger FIFO Payment Allocation
CREATE OR REPLACE FUNCTION public.record_vendor_payout(
    p_tenant_id UUID,
    p_vendor_id UUID,
    p_amount NUMERIC(15,2),
    p_payment_mode VARCHAR(30),
    p_reference_document VARCHAR(100),
    p_transaction_date DATE
)
RETURNS UUID AS $$
DECLARE
    v_ledger_id UUID;
    v_remaining_amount NUMERIC(15,2) := p_amount;
    r_purchase RECORD;
    v_allocated NUMERIC(15,2);
    v_unpaid NUMERIC(15,2);
    v_total_allocated_existing NUMERIC(15,2);
BEGIN
    -- Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payout amount must be greater than zero';
    END IF;

    -- 1. Insert payment entry into public.vendor_ledger
    INSERT INTO public.vendor_ledger (
        tenant_id,
        vendor_id,
        transaction_type,
        reference_id,
        reference_document,
        transaction_date,
        debit_amount,
        credit_amount,
        running_balance
    ) VALUES (
        p_tenant_id,
        p_vendor_id,
        'payment',
        gen_random_uuid(), -- dummy reference_id for payment itself
        p_reference_document,
        p_transaction_date,
        p_amount,
        0.00,
        0.00 -- calculated by trigger
    )
    RETURNING id INTO v_ledger_id;

    -- 2. Allocate payment to unpaid/partially paid credit purchases in FIFO order
    FOR r_purchase IN 
        SELECT id, amount 
        FROM public.purchases
        WHERE tenant_id = p_tenant_id
          AND vendor_id = p_vendor_id
          AND payment_mode = 'credit'
          AND payment_status IN ('unpaid', 'partially_paid')
        ORDER BY invoice_date ASC, created_at ASC
    LOOP
        -- Calculate how much has already been allocated to this purchase
        SELECT COALESCE(SUM(amount_allocated), 0.00) INTO v_total_allocated_existing
        FROM public.invoice_allocations
        WHERE purchase_id = r_purchase.id;

        v_unpaid := r_purchase.amount - v_total_allocated_existing;

        IF v_unpaid > 0 THEN
            v_allocated := LEAST(v_remaining_amount, v_unpaid);
            
            -- Insert allocation
            INSERT INTO public.invoice_allocations (
                tenant_id,
                payment_ledger_id,
                purchase_id,
                amount_allocated
            ) VALUES (
                p_tenant_id,
                v_ledger_id,
                r_purchase.id,
                v_allocated
            );

            -- Update purchase payment status
            IF (v_total_allocated_existing + v_allocated) >= r_purchase.amount THEN
                UPDATE public.purchases 
                SET payment_status = 'paid'
                WHERE id = r_purchase.id;
            ELSE
                UPDATE public.purchases 
                SET payment_status = 'partially_paid'
                WHERE id = r_purchase.id;
            END IF;

            v_remaining_amount := v_remaining_amount - v_allocated;

            IF v_remaining_amount <= 0 THEN
                EXIT;
            END IF;
        END IF;
    END LOOP;

    RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Daybook Approval & Rejection Flows
CREATE OR REPLACE FUNCTION public.approve_daybook(
    p_daybook_id UUID,
    p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.daybooks
    SET 
        status = 'approved',
        approved_by = p_user_id,
        closed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_daybook_id AND status = 'submitted';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Daybook not found or not in submitted status';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.reject_daybook(
    p_daybook_id UUID,
    p_user_id UUID,
    p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.daybooks
    SET 
        status = 'rejected',
        variance_justification = COALESCE(variance_justification, '') || E'\n[Rejected by ' || p_user_id || ']: ' || p_reason,
        updated_at = NOW()
    WHERE id = p_daybook_id AND status = 'submitted';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Daybook not found or not in submitted status';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.reopen_daybook(
    p_daybook_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.daybooks
    SET 
        status = 'draft',
        updated_at = NOW()
    WHERE id = p_daybook_id AND status = 'rejected';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Daybook not found or not in rejected status';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. Transaction Controls & Write Protection Triggers
-- ============================================================================

-- A. Daybook status lock check
CREATE OR REPLACE FUNCTION public.check_daybook_lock()
RETURNS TRIGGER AS $$
DECLARE
    v_db_id UUID;
    v_status VARCHAR(20);
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_db_id := OLD.daybook_id;
    ELSE
        v_db_id := NEW.daybook_id;
    END IF;

    IF v_db_id IS NOT NULL THEN
        SELECT status INTO v_status FROM public.daybooks WHERE id = v_db_id;
        IF v_status IN ('submitted', 'approved') THEN
            RAISE EXCEPTION 'Operation blocked: The daybook is locked (status: %).', v_status;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lock_sales_transactions
    BEFORE INSERT OR UPDATE OR DELETE ON public.sales_transactions
    FOR EACH ROW EXECUTE FUNCTION public.check_daybook_lock();

CREATE TRIGGER trg_lock_cash_transactions
    BEFORE INSERT OR UPDATE OR DELETE ON public.cash_transactions
    FOR EACH ROW EXECUTE FUNCTION public.check_daybook_lock();

CREATE TRIGGER trg_lock_purchases
    BEFORE INSERT OR UPDATE OR DELETE ON public.purchases
    FOR EACH ROW EXECUTE FUNCTION public.check_daybook_lock();

CREATE TRIGGER trg_lock_expenses
    BEFORE INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.check_daybook_lock();

CREATE TRIGGER trg_lock_income
    BEFORE INSERT OR UPDATE OR DELETE ON public.income
    FOR EACH ROW EXECUTE FUNCTION public.check_daybook_lock();

-- B. Financial Period Lock Check
CREATE OR REPLACE FUNCTION public.check_financial_period_lock()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_date DATE;
    v_locked BOOLEAN;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_tenant_id := OLD.tenant_id;
        -- Get date depending on table
        IF TG_TABLE_NAME = 'daybooks' THEN
            v_date := OLD.business_date;
        ELSIF TG_TABLE_NAME = 'purchases' THEN
            v_date := OLD.invoice_date;
        ELSIF TG_TABLE_NAME = 'sales_transactions' THEN
            v_date := OLD.transaction_timestamp::date;
        ELSIF TG_TABLE_NAME = 'bank_transactions' THEN
            v_date := OLD.transaction_date;
        ELSE
            v_date := OLD.created_at::date;
        END IF;
    ELSE
        v_tenant_id := NEW.tenant_id;
        IF TG_TABLE_NAME = 'daybooks' THEN
            v_date := NEW.business_date;
        ELSIF TG_TABLE_NAME = 'purchases' THEN
            v_date := NEW.invoice_date;
        ELSIF TG_TABLE_NAME = 'sales_transactions' THEN
            v_date := NEW.transaction_timestamp::date;
        ELSIF TG_TABLE_NAME = 'bank_transactions' THEN
            v_date := NEW.transaction_date;
        ELSE
            v_date := NEW.created_at::date;
        END IF;
    END IF;

    IF v_date IS NOT NULL THEN
        SELECT is_locked INTO v_locked 
        FROM public.financial_periods 
        WHERE tenant_id = v_tenant_id 
          AND start_date <= v_date 
          AND end_date >= v_date;
          
        IF v_locked = TRUE THEN
            RAISE EXCEPTION 'Operation blocked: The financial period for date % is locked.', v_date;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_period_lock_daybooks
    BEFORE INSERT OR UPDATE OR DELETE ON public.daybooks
    FOR EACH ROW EXECUTE FUNCTION public.check_financial_period_lock();

CREATE TRIGGER trg_period_lock_purchases
    BEFORE INSERT OR UPDATE OR DELETE ON public.purchases
    FOR EACH ROW EXECUTE FUNCTION public.check_financial_period_lock();

CREATE TRIGGER trg_period_lock_sales
    BEFORE INSERT OR UPDATE OR DELETE ON public.sales_transactions
    FOR EACH ROW EXECUTE FUNCTION public.check_financial_period_lock();

CREATE TRIGGER trg_period_lock_expenses
    BEFORE INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.check_financial_period_lock();

CREATE TRIGGER trg_period_lock_income
    BEFORE INSERT OR UPDATE OR DELETE ON public.income
    FOR EACH ROW EXECUTE FUNCTION public.check_financial_period_lock();

