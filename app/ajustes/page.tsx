"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { SkeletonDashboard } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { profileSchema, ProfileFormData } from "@/lib/validations";
import { useToast } from "@/components/ui/Toast";
import { Icons } from "@/components/Icons";

export default function AjustesPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [telegramChatId, setTelegramChatId] = useState("");
    const [testingTelegram, setTestingTelegram] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema) as any,
        defaultValues: {
            issuer_name: "",
            issuer_id_number: "",
            issuer_tax_regime: "Régimen Simplificado",
            issuer_phone: "",
            issuer_email: "",
            issuer_address: "",
            issuer_payment_account: "",
            default_city: "Bogotá",
            default_legal_note: "",
        }
    });

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            setUserId(user.id);

            const [profileRes, settingsRes] = await Promise.all([
                supabase.from("profile_settings").select("*").eq("user_id", user.id).single(),
                supabase.from("user_settings").select("telegram_chat_id").eq("user_id", user.id).single()
            ]);

            const profile = profileRes.data;
            const settings = settingsRes.data;

            if (profile) {
                reset({
                    issuer_name: profile.issuer_name || "",
                    issuer_id_number: profile.issuer_id_number || "",
                    issuer_tax_regime: profile.issuer_tax_regime || "Régimen Simplificado",
                    issuer_phone: profile.issuer_phone || "",
                    issuer_email: profile.issuer_email || "",
                    issuer_address: profile.issuer_address || "",
                    issuer_payment_account: profile.issuer_payment_account || "",
                    default_city: profile.default_city || "Bogotá",
                    default_legal_note: profile.default_legal_note || "",
                });
            }
            if (settings?.telegram_chat_id) {
                setTelegramChatId(settings.telegram_chat_id);
            }

            setLoading(false);
        }
        init();
    }, [router, reset]);

    async function onSubmit(data: ProfileFormData) {
        if (!userId) return;

        // Guardar perfil
        const { error: profileError } = await supabase.from("profile_settings").upsert({
            user_id: userId,
            ...data
        }, { onConflict: 'user_id' });

        // Guardar settings (Telegram)
        const { error: settingsError } = await supabase.from("user_settings").upsert({
            user_id: userId,
            telegram_chat_id: telegramChatId,
            notifications_enabled: true
        }, { onConflict: 'user_id' });

        if (profileError || settingsError) {
            showToast("Error guardando cambios", "error");
        } else {
            showToast("Ajustes guardados exitosamente ✅", "success");
        }
    }

    async function handleTestTelegram() {
        if (!telegramChatId) {
            showToast("Ingresa un Chat ID primero", "error");
            return;
        }
        setTestingTelegram(true);
        try {
            const res = await fetch("/api/telegram/test", {
                method: "POST",
                body: JSON.stringify({ chatId: telegramChatId })
            });
            const data = await res.json();
            if (data.success) {
                showToast("Mensaje de prueba enviado 🚀", "success");
            } else {
                showToast("Error: " + data.error, "error");
            }
        } catch (e) {
            showToast("Error de conexión", "error");
        } finally {
            setTestingTelegram(false);
        }
    }

    if (loading) return <div className="min-h-screen bg-[#07090D] p-4 md:p-6"><SkeletonDashboard /></div>;

    return (
        <AppLayout
            title="Configuración"
            subtitle="Perfil y Notificaciones"
            actionButton={
                <button onClick={() => router.back()} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 uppercase tracking-wider border border-white/10">
                    ← Volver
                </button>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl pb-20">
                {/* Notificaciones Telegram */}
                <div className="bg-[#12161F] border border-[#2AABEE]/30 rounded-xl p-5 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <Icons.Bell size={100} />
                    </div>
                    <h2 className="text-[#2AABEE] text-sm font-bold uppercase tracking-wider border-b border-[#2AABEE]/20 pb-3 mb-4 flex items-center gap-2">
                        <Icons.Bell /> Notificaciones Telegram
                    </h2>
                    <div className="space-y-4 relative z-10">
                        <div className="text-sm text-zinc-400 space-y-2">
                            <p>Recibe alertas de pagos próximos y metas cumplidas en tu celular.</p>
                            <ol className="list-decimal pl-5 space-y-1 text-xs text-zinc-500">
                                <li>Busca el bot <span className="text-white font-mono bg-white/10 px-1 rounded">@FinanzasJGMBot</span> en Telegram.</li>
                                <li>Envía el comando <span className="text-white font-mono bg-white/10 px-1 rounded">/start</span>.</li>
                                <li>El bot te responderá con tu ID. Cópialo abajo.</li>
                            </ol>
                        </div>
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Telegram Chat ID</label>
                                <input
                                    value={telegramChatId}
                                    onChange={(e) => setTelegramChatId(e.target.value)}
                                    placeholder="123456789"
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white outline-none focus:ring-1 focus:ring-[#2AABEE] text-sm placeholder:text-zinc-600 font-mono"
                                />
                            </div>
                            <Button
                                type="button"
                                onClick={handleTestTelegram}
                                disabled={!telegramChatId || testingTelegram}
                                className="bg-[#2AABEE] hover:bg-[#2AABEE]/80 text-white border-none py-2.5"
                            >
                                {testingTelegram ? '...' : 'Probar'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Información Legal */}
                <div className="bg-[#12161F] border border-white/10 rounded-xl p-5 space-y-4">
                    <h2 className="text-white text-sm font-bold uppercase tracking-wider border-b border-white/10 pb-3 mb-4">Información Legal</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Nombre del Emisor"
                            {...register("issuer_name")}
                            placeholder="Nombre o razón social"
                            error={errors.issuer_name?.message}
                        />
                        <Input
                            label="CC o NIT"
                            {...register("issuer_id_number")}
                            placeholder="900.000.000-1"
                            error={errors.issuer_id_number?.message}
                        />
                    </div>
                    <Input
                        label="Régimen Tributario"
                        {...register("issuer_tax_regime")}
                        placeholder="No responsable de IVA"
                        error={errors.issuer_tax_regime?.message}
                    />
                </div>

                {/* Contacto */}
                <div className="bg-[#12161F] border border-white/10 rounded-xl p-5 space-y-4">
                    <h2 className="text-white text-sm font-bold uppercase tracking-wider border-b border-white/10 pb-3 mb-4">Contacto y Ubicación</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Teléfono"
                            {...register("issuer_phone")}
                            placeholder="300 000 0000"
                            error={errors.issuer_phone?.message}
                        />
                        <Input
                            label="Ciudad por Defecto"
                            {...register("default_city")}
                            placeholder="Bogotá"
                            error={errors.default_city?.message}
                        />
                    </div>
                    <Input
                        label="Correo Electrónico"
                        type="email"
                        {...register("issuer_email")}
                        placeholder="tu@correo.com"
                        error={errors.issuer_email?.message}
                    />
                    <Input
                        label="Dirección"
                        {...register("issuer_address")}
                        placeholder="Calle X # Y - Z"
                        error={errors.issuer_address?.message}
                    />
                </div>

                {/* Datos de Pago */}
                <div className="bg-[#12161F] border border-white/10 rounded-xl p-5 space-y-4">
                    <h2 className="text-white text-sm font-bold uppercase tracking-wider border-b border-white/10 pb-3 mb-4">Datos de Pago y Legales</h2>
                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Información Bancaria (Para PDF)</label>
                        <textarea
                            {...register("issuer_payment_account")}
                            className={`w-full bg-black/30 border rounded-lg px-3 py-2.5 text-white outline-none focus:ring-1 focus:ring-[#3ED6D8] text-sm ${errors.issuer_payment_account ? 'border-rose-500' : 'border-white/10'}`}
                            placeholder="Bancolombia Ahorros 123-456..."
                            rows={2}
                        />
                        {errors.issuer_payment_account && <p className="text-rose-400 text-[10px] mt-1">{errors.issuer_payment_account.message}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Nota Legal Predeterminada</label>
                        <textarea
                            {...register("default_legal_note")}
                            className={`w-full bg-black/30 border rounded-lg px-3 py-2.5 text-white outline-none focus:ring-1 focus:ring-[#3ED6D8] text-sm ${errors.default_legal_note ? 'border-rose-500' : 'border-white/10'}`}
                            placeholder="La presente factura se asimila..."
                            rows={3}
                        />
                        {errors.default_legal_note && <p className="text-rose-400 text-[10px] mt-1">{errors.default_legal_note.message}</p>}
                    </div>
                </div>

                <Button type="submit" className="w-full py-3" isLoading={isSubmitting}>
                    Guardar Ajustes
                </Button>
            </form>
        </AppLayout>
    );
}
