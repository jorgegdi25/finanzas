import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Asegúrate de usar supabase-admin si necesitas bypass de RLS, pero por simplicidad usaremos cliente normal con la esperanza de que el token de servicio esté disponible o usaremos public para lectura si es posible. 
// NOTA: En un entorno real, para CRON se debe usar createClient del paquete @supabase/supabase-js con la SERVICE_ROLE_KEY para saltar RLS y leer datos de todos los usuarios.
// Dado que aquí usamos la librería cliente configurada con la anon key, esto solo funcionaría si las tablas fueran públicas o el usuario estuviera logueado, lo cual NO pasa en un Cron.
// SOLUCIÓN: Usaremos una instancia admin local aquí mismo si está disponible la variable, o simularemos.
// Como no tengo acceso a la SERVICE_ROLE_KEY del usuario en el código (solo tengo NEXT_PUBLIC_SUPABASE_ANON_KEY), 
// NO PUEDO implementar un Cron real que lea datos de todos los usuarios sin la Service Key.
// 
// SIN EMBARGO, voy a dejar la estructura lista asumiendo que el usuario configurará la variable SUPABASE_SERVICE_ROLE_KEY en Vercel.

import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage } from '@/lib/telegram';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: Request) {
    // Si no hay service key, no podemos procesar todos los usuarios
    if (!SUPABASE_SERVICE_KEY) {
        return NextResponse.json({ error: 'Falta configuración de SUPABASE_SERVICE_ROLE_KEY para Cron Jobs' }, { status: 500 });
    }

    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    try {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // 1. Obtener usuarios con notificaciones activas y chat_id
        const { data: usersSettings } = await adminSupabase
            .from('user_settings')
            .select('user_id, telegram_chat_id')
            .eq('notifications_enabled', true)
            .not('telegram_chat_id', 'is', null);

        if (!usersSettings || usersSettings.length === 0) {
            return NextResponse.json({ message: 'No hay usuarios para notificar' });
        }

        let notificationsSent = 0;

        for (const setting of usersSettings) {
            const userId = setting.user_id;
            const chatId = setting.telegram_chat_id;

            // 2. Buscar pagos para este usuario (Suscripciones)
            const { data: subscriptions } = await adminSupabase
                .from('subscriptions')
                .select('name, amount, currency, next_payment_date')
                .eq('user_id', userId)
                .eq('is_active', true)
                .or(`next_payment_date.eq.${todayStr},next_payment_date.eq.${tomorrowStr}`);

            // 3. Buscar pagos para este usuario (Deudas)
            // Lógica simplificada: si payment_due_day coincide con hoy o mañana
            const { data: debts } = await adminSupabase
                .from('debts')
                .select('name, minimum_payment_cop, payment_due_day')
                .eq('user_id', userId)
                .eq('status', 'active');

            const relevantDebts = (debts || []).filter(debt => {
                if (!debt.payment_due_day) return false;
                const dueDay = debt.payment_due_day;
                return dueDay === today.getDate() || dueDay === tomorrow.getDate();
            });

            // 4. Enviar notificaciones
            const messages: string[] = [];

            subscriptions?.forEach(sub => {
                const isToday = sub.next_payment_date === todayStr;
                messages.push(`📅 *Suscripción:* ${sub.name}\n💰 ${parseFloat(sub.amount).toLocaleString()} ${sub.currency}\n⏰ ${isToday ? '¡Vence HOY!' : 'Vence MAÑANA'}`);
            });

            relevantDebts?.forEach(debt => {
                const isToday = debt.payment_due_day === today.getDate();
                messages.push(`💳 *Deuda:* ${debt.name}\n💰 Pago mín: $${parseFloat(debt.minimum_payment_cop).toLocaleString()}\n⏰ ${isToday ? '¡Pago HOY!' : 'Pago MAÑANA'}`);
            });

            if (messages.length > 0) {
                const fullMessage = "🔔 *Recordatorio de Pagos*\n\nTienes pagos pendientes:\n\n" + messages.join("\n\n----------------\n\n");
                await sendTelegramMessage(chatId, fullMessage);
                notificationsSent++;
            }
        }

        return NextResponse.json({ success: true, notificationsSent });

    } catch (error) {
        console.error("Error en Cron:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
