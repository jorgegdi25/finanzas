-- =====================================================
-- MIGRACIÓN: Configuración de Usuario (Telegram)
-- Fecha: 17 de Enero, 2026
-- =====================================================

-- Tabla para configuraciones extendidas de usuario
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    telegram_chat_id TEXT,
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings"
ON user_settings FOR ALL
USING (auth.uid() = user_id);

-- Trigger para crear settings al crear usuario (opcional, pero buena práctica)
-- Por ahora lo manejaremos desde la UI al guardar settings.

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
