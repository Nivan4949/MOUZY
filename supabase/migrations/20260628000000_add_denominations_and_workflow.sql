-- ============================================================================
-- SQL Migration: 20260628000000_add_denominations_and_workflow.sql
-- Description: Extend denominations, add branch_approved status, and update workflows
-- ============================================================================

-- 1. Add Denominations Columns to daybooks
ALTER TABLE public.daybooks 
ADD COLUMN IF NOT EXISTS denom_5 INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS denom_2 INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS denom_1 INT NOT NULL DEFAULT 0;

-- 2. Re-create Status check constraint
ALTER TABLE public.daybooks DROP CONSTRAINT IF EXISTS chk_daybook_status;
ALTER TABLE public.daybooks 
ADD CONSTRAINT chk_daybook_status CHECK (status IN ('draft', 'submitted', 'branch_approved', 'approved', 'rejected'));

-- 3. Update approve_daybook sequential workflow function
CREATE OR REPLACE FUNCTION public.approve_daybook(
    p_daybook_id UUID,
    p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_current_status VARCHAR(20);
BEGIN
    SELECT status INTO v_current_status FROM public.daybooks WHERE id = p_daybook_id;
    
    IF v_current_status = 'submitted' THEN
        -- Cashier Submitted $\rightarrow$ Branch Approved (Awaiting Finance Approval)
        UPDATE public.daybooks
        SET status = 'branch_approved',
            updated_at = NOW()
        WHERE id = p_daybook_id;
    ELSIF v_current_status = 'branch_approved' THEN
        -- Branch Approved $\rightarrow$ Finance Approved / Locked
        UPDATE public.daybooks
        SET status = 'approved',
            approved_by = p_user_id,
            closed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_daybook_id;
    ELSE
        RAISE EXCEPTION 'Daybook cannot be approved from status: %', v_current_status;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update reject_daybook sequential workflow function
CREATE OR REPLACE FUNCTION public.reject_daybook(
    p_daybook_id UUID,
    p_user_id UUID,
    p_reason TEXT
)
RETURNS VOID AS $$
DECLARE
    v_current_status VARCHAR(20);
BEGIN
    SELECT status INTO v_current_status FROM public.daybooks WHERE id = p_daybook_id;
    
    IF v_current_status IN ('submitted', 'branch_approved') THEN
        UPDATE public.daybooks
        SET status = 'rejected',
            variance_justification = COALESCE(variance_justification, '') || E'\n[Rejected by ' || p_user_id || ']: ' || p_reason,
            updated_at = NOW()
        WHERE id = p_daybook_id;
    ELSE
        RAISE EXCEPTION 'Daybook cannot be rejected from status: %', v_current_status;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update reopen_daybook sequential workflow function (Finance-only role restriction in app)
CREATE OR REPLACE FUNCTION public.reopen_daybook(
    p_daybook_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_current_status VARCHAR(20);
BEGIN
    SELECT status INTO v_current_status FROM public.daybooks WHERE id = p_daybook_id;
    
    IF v_current_status IN ('approved', 'rejected') THEN
        UPDATE public.daybooks
        SET status = 'draft',
            updated_at = NOW()
        WHERE id = p_daybook_id;
    ELSE
        RAISE EXCEPTION 'Daybook cannot be re-opened from status: %', v_current_status;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Seed Complete Purchase Heads (GL Masters)
INSERT INTO public.purchase_heads (tenant_id, name, gl_code, is_active)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Banana', 'PUR-005', true),
    ('00000000-0000-0000-0000-000000000001', 'Milk', 'PUR-006', true),
    ('00000000-0000-0000-0000-000000000001', 'Sugar', 'PUR-007', true),
    ('00000000-0000-0000-0000-000000000001', 'Mouzy Distributors', 'PUR-008', true),
    ('00000000-0000-0000-0000-000000000001', 'Nuts', 'PUR-009', true),
    ('00000000-0000-0000-0000-000000000001', 'Dry Fruits', 'PUR-010', true),
    ('00000000-0000-0000-0000-000000000001', 'Toppings / Crushes', 'PUR-011', true),
    ('00000000-0000-0000-0000-000000000001', 'Ice Creams', 'PUR-012', true),
    ('00000000-0000-0000-0000-000000000001', 'Fruits', 'PUR-013', true),
    ('00000000-0000-0000-0000-000000000001', 'Breads', 'PUR-014', true),
    ('00000000-0000-0000-0000-000000000001', 'Chicken', 'PUR-015', true),
    ('00000000-0000-0000-0000-000000000001', 'Cheesy Items', 'PUR-016', true),
    ('00000000-0000-0000-0000-000000000001', 'Shake Pulps', 'PUR-017', true),
    ('00000000-0000-0000-0000-000000000001', 'Doodh Malai Items', 'PUR-018', true),
    ('00000000-0000-0000-0000-000000000001', 'Falooda Items', 'PUR-019', true),
    ('00000000-0000-0000-0000-000000000001', 'Fizz Items', 'PUR-020', true),
    ('00000000-0000-0000-0000-000000000001', 'Water', 'PUR-021', true),
    ('00000000-0000-0000-0000-000000000001', 'Disposable & Packages', 'PUR-022', true),
    ('00000000-0000-0000-0000-000000000001', 'Avil Local Purchase', 'PUR-023', true)
ON CONFLICT (tenant_id, gl_code) DO UPDATE SET 
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;
