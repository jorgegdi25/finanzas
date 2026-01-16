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

export default function AjustesPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

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
            const { data: profile } = await supabase.from("profile_settings").select("*").eq("user_id", user.id).single();
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
            setLoading(false);
        }
        init();
    }, [router, reset]);

    async function onSubmit(data: ProfileFormData) {
        if (!userId) return;
        const { error } = await supabase.from("profile_settings").upsert({
            user_id: userId,
            ...data
        }, { onConflict: 'user_id' });

        if (error) {
            showToast("Error: " + error.message, "error");
        } else {
            showToast("Ajustes guardados exitosamente ✅", "success");
        }
    }

    if (loading) return <div className="min-h-screen bg-[#07090D] p-4 md:p-6"><SkeletonDashboard /></div>;

    return (
        <AppLayout
            title="Configuración"
            subtitle="Perfil de Emisor"
            actionButton={
                <button onClick={() => router.back()} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 uppercase tracking-wider border border-white/10">
                    ← Volver
                </button>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-3xl">
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
