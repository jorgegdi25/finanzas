-- =====================================================
-- MIGRACIÓN: Día de pago para deudas
-- Fecha: 17 de Enero, 2026
-- =====================================================

-- Agregar columna payment_due_day a deudas (día del mes en que se paga)
ALTER TABLE debts ADD COLUMN IF NOT EXISTS payment_due_day INTEGER DEFAULT NULL;

-- Actualizar suscripciones existentes para que tengan próximo pago
UPDATE subscriptions 
SET next_payment_date = CURRENT_DATE + INTERVAL '5 days'
WHERE is_active = true AND next_payment_date IS NULL;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
