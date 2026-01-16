-- =====================================================
-- MIGRACIÓN: Suscripciones y Mejoras de Estructura
-- Fecha: 16 de Enero, 2026
-- =====================================================

-- 1. NUEVA TABLA: subscriptions (Suscripciones recurrentes)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,                          -- Ej: "Netflix", "Hosting Hostinger"
    type TEXT NOT NULL DEFAULT 'personal',       -- 'personal' | 'business'
    amount NUMERIC NOT NULL,                     -- Monto por periodo
    currency TEXT NOT NULL DEFAULT 'COP',        -- COP, USD, EUR
    frequency TEXT NOT NULL DEFAULT 'monthly',   -- 'weekly' | 'monthly' | 'yearly'
    billing_day INT,                             -- Día del mes que se cobra (1-31)
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,                               -- NULL = indefinido
    next_payment_date DATE,                      -- Próximo cobro calculado
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions"
ON subscriptions FOR ALL
USING (auth.uid() = user_id);

-- 2. MEJORAS A transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 3. MEJORAS A categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT false;

-- 4. MEJORAS A accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS owner_type TEXT DEFAULT 'personal';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_number TEXT;

-- NOTA: La categoría "Suscripciones" se puede crear manualmente
-- desde la UI o agregando un INSERT con tu user_id específico.

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
