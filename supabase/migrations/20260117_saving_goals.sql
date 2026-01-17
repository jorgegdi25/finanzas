-- =====================================================
-- MIGRACIÓN: Metas de Ahorro
-- Fecha: 17 de Enero, 2026
-- =====================================================

-- Agregar columnas de meta a la tabla savings existente
ALTER TABLE savings ADD COLUMN IF NOT EXISTS goal_amount NUMERIC DEFAULT NULL;
ALTER TABLE savings ADD COLUMN IF NOT EXISTS goal_date DATE DEFAULT NULL;
ALTER TABLE savings ADD COLUMN IF NOT EXISTS goal_name TEXT DEFAULT NULL;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
