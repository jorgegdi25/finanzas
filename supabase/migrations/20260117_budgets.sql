-- =====================================================
-- MIGRACIÓN: Presupuestos Mensuales por Categoría
-- Fecha: 17 de Enero, 2026
-- =====================================================

-- Tabla: budgets (Presupuestos mensuales por categoría)
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL,              -- Formato: "2026-01"
    budget_amount NUMERIC NOT NULL,        -- Monto presupuestado
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category_id, month_year)
);

-- Habilitar RLS para budgets
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own budgets"
ON budgets FOR ALL
USING (auth.uid() = user_id);

-- Índice para búsquedas rápidas por mes
CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON budgets(user_id, month_year);

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
