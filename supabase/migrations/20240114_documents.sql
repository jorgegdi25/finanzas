-- 1. TABLA DE AJUSTES DEL EMISOR
CREATE TABLE profile_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    issuer_name TEXT NOT NULL,
    issuer_id_number TEXT NOT NULL,
    issuer_tax_regime TEXT, -- Ej: Régimen Simplificado
    issuer_phone TEXT,
    issuer_email TEXT,
    issuer_address TEXT,
    issuer_payment_account TEXT, -- Nequi, Cuenta, etc.
    default_city TEXT,
    default_legal_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile settings"
ON profile_settings FOR ALL
USING (auth.uid() = user_id);

-- 2. TABLA DE DOCUMENTOS
CREATE TYPE document_type AS ENUM ('quote', 'invoice');

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    type document_type NOT NULL,
    number TEXT NOT NULL, -- COT-0001, CC-0001
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    city TEXT,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    valid_until DATE, -- Solo para quotes
    concept_title TEXT NOT NULL,
    concept_detail TEXT,
    period_label TEXT,
    period_start DATE,
    period_end DATE,
    currency TEXT NOT NULL DEFAULT 'COP',
    exchange_rate NUMERIC,
    subtotal_original NUMERIC NOT NULL DEFAULT 0,
    total_original NUMERIC NOT NULL DEFAULT 0,
    subtotal_cop NUMERIC NOT NULL DEFAULT 0,
    total_cop NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL, -- draft, sent, accepted, partial, paid, etc.
    notes TEXT,
    pdf_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own documents"
ON documents FOR ALL
USING (auth.uid() = user_id);

-- 3. TABLA DE ÍTEMS DE DOCUMENTO
CREATE TABLE document_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    qty NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    line_total NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE document_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own document items"
ON document_items FOR ALL
USING (auth.uid() = user_id);

-- 4. TABLA DE PAGOS DE DOCUMENTOS (Solo para Invoices)
CREATE TABLE document_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_original NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    exchange_rate NUMERIC,
    amount_cop NUMERIC NOT NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE document_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own document payments"
ON document_payments FOR ALL
USING (auth.uid() = user_id);

-- 5. TABLA DE CONTADORES PARA NUMERACIÓN
CREATE TABLE document_counters (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    next_quote_int INT NOT NULL DEFAULT 1,
    next_invoice_int INT NOT NULL DEFAULT 1
);

ALTER TABLE document_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own counters"
ON document_counters FOR ALL
USING (auth.uid() = user_id);

-- 6. TRIGGER PARA INICIALIZAR CONTADORES AL CREAR USUARIO (O AL USAR POR PRIMERA VEZ)
-- Como no podemos disparar triggers de auth fácilmente aquí, manejaremos la inserción del contador 
-- programáticamente o mediante una función de ayuda.

-- Función para obtener y aumentar contador
CREATE OR REPLACE FUNCTION get_next_document_number(p_user_id UUID, p_type document_type)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_next_val INT;
    v_result TEXT;
BEGIN
    -- Asegurar que el registro exista
    INSERT INTO document_counters (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;

    IF p_type = 'quote' THEN
        v_prefix := 'COT-';
        UPDATE document_counters SET next_quote_int = next_quote_int + 1 WHERE user_id = p_user_id RETURNING next_quote_int - 1 INTO v_next_val;
    ELSE
        v_prefix := 'CC-';
        UPDATE document_counters SET next_invoice_int = next_invoice_int + 1 WHERE user_id = p_user_id RETURNING next_invoice_int - 1 INTO v_next_val;
    END IF;

    v_result := v_prefix || LPAD(v_next_val::TEXT, 4, '0');
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
