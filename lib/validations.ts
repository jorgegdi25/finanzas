import { z } from 'zod';

// === CUENTA ===
export const accountSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
    type: z.enum(['bank', 'cash', 'wallet']),
    currency: z.enum(['COP', 'USD', 'EUR']),
    initial_balance: z.coerce.number().min(0, 'El saldo debe ser mayor o igual a 0'),
    is_active: z.boolean().default(true),
});
export type AccountFormData = z.infer<typeof accountSchema>;

// === CATEGORÍA ===
export const categorySchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio').max(50, 'Máximo 50 caracteres'),
    type: z.enum(['income', 'expense', 'both']).default('expense'),
});
export type CategoryFormData = z.infer<typeof categorySchema>;

// === MOVIMIENTO (TRANSACCIÓN) ===
export const movementSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
    type: z.enum(['income', 'expense', 'transfer']),
    amount_original: z.coerce.number().positive('El monto debe ser mayor a 0'),
    currency: z.enum(['COP', 'USD', 'EUR']),
    exchange_rate: z.coerce.number().positive('La tasa debe ser mayor a 0').optional().nullable(),
    account_id: z.string().uuid('Selecciona una cuenta'),
    category_id: z.string().uuid('Selecciona una categoría'),
    note: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
});
export type MovementFormData = z.infer<typeof movementSchema>;

// === CLIENTE ===
export const clientSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
    email: z.string().email('Correo inválido').optional().or(z.literal('')),
    phone: z.string().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
    company: z.string().max(100, 'Máximo 100 caracteres').optional().or(z.literal('')),
    notes: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
});
export type ClientFormData = z.infer<typeof clientSchema>;

// === AHORRO ===
export const savingSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
    type: z.enum(['cash', 'bank', 'investment', 'crypto']),
    currency: z.enum(['COP', 'USD', 'EUR', 'CRYPTO']),
    is_locked: z.boolean().default(false),
});
export type SavingFormData = z.infer<typeof savingSchema>;

// === DEUDA ===
export const debtSchema = z.object({
    name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
    type: z.enum(['credit_card', 'personal_loan', 'mortgage', 'car_loan', 'other']),
    balance_cop: z.coerce.number().positive('El saldo debe ser mayor a 0'),
    interest_rate_value: z.coerce.number().min(0, 'La tasa debe ser mayor o igual a 0').max(1, 'La tasa debe ser entre 0 y 1'),
    interest_rate_type: z.enum(['EA', 'MV']),
    minimum_payment_cop: z.coerce.number().positive('El pago mínimo debe ser mayor a 0'),
    total_installments: z.coerce.number().int().positive().optional().nullable(),
    paid_installments: z.coerce.number().int().min(0).default(0),
    status: z.enum(['active', 'paid', 'refinanced', 'written_off']).default('active'),
});
export type DebtFormData = z.infer<typeof debtSchema>;

// === PROYECTO ===
export const projectSchema = z.object({
    client_id: z.string().uuid('Selecciona un cliente'),
    name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
    total_value_original: z.coerce.number().min(0, 'El valor debe ser mayor o igual a 0'),
    currency: z.enum(['COP', 'USD', 'EUR']),
    exchange_rate: z.coerce.number().positive('La tasa debe ser mayor a 0').optional().nullable(),
    status: z.enum(['draft', 'active', 'paused', 'completed', 'canceled']).default('active'),
    notes: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
});
export type ProjectFormData = z.infer<typeof projectSchema>;

// === LOGIN ===
export const loginSchema = z.object({
    email: z.string().email('Correo electrónico inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});
export type LoginFormData = z.infer<typeof loginSchema>;

// === PERFIL/AJUSTES ===
export const profileSchema = z.object({
    issuer_name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
    issuer_id_number: z.string().min(1, 'El NIT/CC es obligatorio').max(20, 'Máximo 20 caracteres'),
    issuer_tax_regime: z.string().max(100, 'Máximo 100 caracteres').optional().or(z.literal('')),
    issuer_phone: z.string().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
    issuer_email: z.string().email('Correo inválido').optional().or(z.literal('')),
    issuer_address: z.string().max(200, 'Máximo 200 caracteres').optional().or(z.literal('')),
    issuer_payment_account: z.string().max(200, 'Máximo 200 caracteres').optional().or(z.literal('')),
    default_city: z.string().max(50, 'Máximo 50 caracteres').optional().or(z.literal('')),
    default_legal_note: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
});
export type ProfileFormData = z.infer<typeof profileSchema>;

// === DOCUMENTO (COTIZACIÓN/CUENTA DE COBRO) ===
export const documentItemSchema = z.object({
    description: z.string().min(1, 'Descripción requerida').max(200, 'Máximo 200 caracteres'),
    qty: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
    unit_price: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
});

export const documentSchema = z.object({
    type: z.enum(['quote', 'invoice']),
    client_id: z.string().uuid('Selecciona un cliente'),
    project_id: z.string().uuid().optional().nullable().or(z.literal('')),
    city: z.string().min(1, 'Ciudad requerida').max(50, 'Máximo 50 caracteres'),
    issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido').optional().nullable().or(z.literal('')),
    valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido').optional().nullable().or(z.literal('')),
    concept_title: z.string().min(1, 'Título requerido').max(200, 'Máximo 200 caracteres'),
    concept_detail: z.string().max(1000, 'Máximo 1000 caracteres').optional().or(z.literal('')),
    currency: z.enum(['COP', 'USD', 'EUR']),
    exchange_rate: z.coerce.number().positive('La tasa debe ser mayor a 0').optional().nullable(),
    notes: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
    items: z.array(documentItemSchema).min(1, 'Debe haber al menos un ítem'),
});
export type DocumentFormData = z.infer<typeof documentSchema>;
export type DocumentItemFormData = z.infer<typeof documentItemSchema>;
