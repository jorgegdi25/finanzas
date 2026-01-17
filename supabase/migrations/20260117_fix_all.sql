-- =====================================================
-- MIGRACIÓN CONSOLIDADA: TODAS LAS FUNCIONALIDADES RECIENTES
-- Fecha: 17 de Enero, 2026
-- Ejecuta este script para poner tu base de datos al día.
-- Es seguro ejecutarlo aunque ya tengas algunas partes.
-- =====================================================

-- 1. ESTRUCTURA BASE (Suscripciones y Mejoras)
-- Columnas en transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Columnas en categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT false;

-- Columnas en accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS owner_type TEXT DEFAULT 'personal';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_number TEXT;

-- 2. PRESUPUESTOS (Budgets)
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL,
    budget_amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category_id, month_year)
);

-- Habilitar RLS es idempotente
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Borrar política si existe para recrearla sin error
DROP POLICY IF EXISTS "Users can manage their own budgets" ON budgets;
CREATE POLICY "Users can manage their own budgets" ON budgets FOR ALL USING (auth.uid() = user_id);

-- 3. METAS DE AHORRO
ALTER TABLE savings ADD COLUMN IF NOT EXISTS goal_amount NUMERIC DEFAULT NULL;
ALTER TABLE savings ADD COLUMN IF NOT EXISTS goal_date DATE DEFAULT NULL;
ALTER TABLE savings ADD COLUMN IF NOT EXISTS goal_name TEXT DEFAULT NULL;

-- 4. RECORDATORIOS DE PAGO
ALTER TABLE debts ADD COLUMN IF NOT EXISTS payment_due_day INTEGER DEFAULT NULL;

-- Actualizar suscripciones: solo las que no tengan fecha
UPDATE subscriptions 
SET next_payment_date = CURRENT_DATE + INTERVAL '5 days'
WHERE is_active = true AND next_payment_date IS NULL;

-- =====================================================
-- FIN DE MIGRACIÓN CONSOLIDADA
-- =====================================================
