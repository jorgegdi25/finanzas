"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { AppLayout } from "@/components/AppLayout";
import { Icons } from "@/components/Icons";
import { SkeletonList } from "@/components/ui/Skeleton";
import { savingSchema, SavingFormData } from "@/lib/validations";

interface Saving {
    id: string;
    name: string;
    type: string;
    currency: string;
    is_locked: boolean;
    is_active: boolean;
    goal_name: string | null;
    goal_amount: number | null;
    goal_date: string | null;
}

interface SavingWithTotal extends Saving {
    total_cop: number;
    goal_percentage: number;
}

export default function AhorrosPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [savings, setSavings] = useState<SavingWithTotal[]>([]);
    const [totalGeneral, setTotalGeneral] = useState(0);

    const [showCreateForm, setShowCreateForm] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<SavingFormData>({
        resolver: zodResolver(savingSchema) as any,
        defaultValues: {
            name: "",
            type: "bank",
            currency: "COP",
            is_locked: false,
        }
    });

    useEffect(() => {
        async function init() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            await loadSavings();
            setLoading(false);
        }
        init();
    }, [router]);

    async function loadSavings() {
        const { data: savingsData } = await supabase
            .from("savings")
            .select("id, name, type, currency, is_locked, is_active, goal_name, goal_amount, goal_date")
            .eq("is_active", true)
            .order("name");

        const { data: movementsData } = await supabase
            .from("savings_movements")
            .select("saving_id, direction, amount_cop");

        const savingsWithTotals: SavingWithTotal[] = (savingsData || []).map((saving) => {
            const movements = (movementsData || []).filter((m) => m.saving_id === saving.id);
            const deposits = movements.filter((m) => m.direction === "deposit").reduce((sum, m) => sum + (parseFloat(m.amount_cop) || 0), 0);
            const withdrawals = movements.filter((m) => m.direction === "withdraw").reduce((sum, m) => sum + (parseFloat(m.amount_cop) || 0), 0);
            const total_cop = deposits - withdrawals;
            const goal_percentage = saving.goal_amount ? (total_cop / saving.goal_amount) * 100 : 0;
            return { ...saving, total_cop, goal_percentage };
        });

        setSavings(savingsWithTotals);
        setTotalGeneral(savingsWithTotals.reduce((sum, s) => sum + s.total_cop, 0));
    }

    async function onSubmit(data: SavingFormData) {
        const { error } = await supabase.from("savings").insert({
            name: data.name.trim(),
            type: data.type,
            currency: data.currency,
            is_locked: data.is_locked,
            goal_name: data.goal_name?.trim() || null,
            goal_amount: data.goal_amount || null,
            goal_date: data.goal_date || null,
        });

        if (error) {
            showToast(error.message, "error");
        } else {
            showToast("Ahorro creado exitosamente", "success");
            reset();
            setShowCreateForm(false);
            await loadSavings();
        }
    }

    async function handleDeleteSaving(saving: SavingWithTotal) {
        const confirmed = confirm(`¿Eliminar el ahorro "${saving.name}"? Esto eliminará también todos sus movimientos.`);
        if (!confirmed) return;
        const { error } = await supabase.from("savings").delete().eq("id", saving.id);
        if (error) {
            showToast(error.message, "error");
        } else {
            showToast("Ahorro eliminado", "success");
            await loadSavings();
        }
    }

    if (loading) return <div className="min-h-screen bg-[#07090D] p-4 md:p-6"><SkeletonList items={3} /></div>;

    const typeLabels: Record<string, string> = {
        cash: "Efectivo",
        bank: "Banco",
        investment: "Inversión",
        crypto: "Crypto",
    };

    return (
        <AppLayout
            title="Gestión de Ahorros"
            subtitle="Metas Financieras"
            actionButton={
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-5 py-2 bg-[#3ED6D8] hover:bg-[#4FF0F2] text-[#07090D] font-bold text-xs rounded-lg transition-all flex items-center gap-2 uppercase tracking-wider"
                >
                    <span className="text-base">+</span> Nuevo Ahorro
                </button>
            }
        >
            <div className="space-y-4">
                {/* Total Card */}
                <div className="bg-[#12161F] border border-[#3ED6D8]/30 rounded-xl p-5 flex justify-between items-center">
                    <div>
                        <p className="text-[#3ED6D8] text-xs font-bold uppercase tracking-wider mb-1">Total Ahorros</p>
                        <p className="text-3xl font-black text-white tracking-tight">
                            ${totalGeneral.toLocaleString("es-CO")} <span className="text-lg text-zinc-500">COP</span>
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{savings.length} Fondos</p>
                    </div>
                </div>

                {/* Savings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savings.map((saving) => (
                        <div
                            key={saving.id}
                            className="bg-[#12161F] border border-white/10 hover:border-[#3ED6D8]/50 rounded-xl p-5 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-bold text-white text-lg">{saving.name}</h3>
                                        {saving.is_locked && <span className="text-[#3ED6D8]" title="Bloqueado"><Icons.Lock /></span>}
                                    </div>
                                    <span className="px-2 py-1 bg-white/5 text-zinc-400 text-xs font-medium rounded border border-white/10">
                                        {typeLabels[saving.type] || saving.type}
                                    </span>
                                </div>
                                <span className="text-zinc-600 font-mono text-xs">{saving.currency}</span>
                            </div>

                            <div className="mb-4">
                                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Saldo Actual</p>
                                <p className={`text-2xl font-black font-mono tracking-tight ${saving.total_cop >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                    ${saving.total_cop.toLocaleString("es-CO")}
                                </p>
                            </div>

                            {/* Meta de Ahorro */}
                            {saving.goal_amount && (
                                <div className="mb-4 p-3 bg-black/20 rounded-lg border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-[#3ED6D8] text-xs font-bold">
                                            🎯 {saving.goal_name || 'Meta'}
                                        </p>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${saving.goal_percentage >= 100 ? 'bg-emerald-500/20 text-emerald-400' :
                                            saving.goal_percentage >= 75 ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-white/10 text-zinc-400'
                                            }`}>
                                            {saving.goal_percentage.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-black/30 rounded-full overflow-hidden mb-2">
                                        <div
                                            className={`h-full transition-all duration-500 ${saving.goal_percentage >= 100 ? 'bg-emerald-500' :
                                                saving.goal_percentage >= 75 ? 'bg-amber-500' :
                                                    'bg-[#3ED6D8]'
                                                }`}
                                            style={{ width: `${Math.min(saving.goal_percentage, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-500">
                                            Meta: ${saving.goal_amount.toLocaleString("es-CO")}
                                        </span>
                                        {saving.goal_date && (
                                            <span className="text-zinc-600">
                                                📅 {new Date(saving.goal_date).toLocaleDateString("es-CO")}
                                            </span>
                                        )}
                                    </div>
                                    {saving.goal_percentage >= 100 && (
                                        <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
                                            🎉 ¡Meta alcanzada!
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                <Link href={`/ahorros/${saving.id}`} className="flex-1">
                                    <button className="w-full py-2 bg-white/5 hover:bg-[#3ED6D8]/10 text-zinc-300 hover:text-[#3ED6D8] text-xs font-bold rounded-lg transition-all border border-white/10 hover:border-[#3ED6D8]/30">
                                        Ver Detalle
                                    </button>
                                </Link>
                                <button
                                    onClick={() => handleDeleteSaving(saving)}
                                    className="px-3 py-2 bg-white/5 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 text-sm rounded-lg transition-all border border-white/10 hover:border-rose-500/30"
                                >
                                    <Icons.Trash />
                                </button>
                            </div>
                        </div>
                    ))}

                    {savings.length === 0 && (
                        <div className="col-span-full text-center py-16 text-zinc-500 border border-dashed border-white/10 rounded-xl bg-[#12161F]/50">
                            <p className="text-lg">No tienes ahorros registrados aún.</p>
                            <p className="text-sm mt-2">Crea tu primer fondo de ahorro para comenzar.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            <Modal isOpen={showCreateForm} onClose={() => { setShowCreateForm(false); reset(); }} title="Nuevo Ahorro">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <Input
                        label="Nombre"
                        placeholder="Ej: Fondo de Emergencia"
                        {...register("name")}
                        error={errors.name?.message}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Tipo"
                            {...register("type")}
                            error={errors.type?.message}
                            options={[
                                { value: 'bank', label: 'Banco' },
                                { value: 'cash', label: 'Efectivo' },
                                { value: 'investment', label: 'Inversión' },
                                { value: 'crypto', label: 'Crypto' }
                            ]}
                        />
                        <Select
                            label="Moneda"
                            {...register("currency")}
                            error={errors.currency?.message}
                            options={[
                                { value: 'COP', label: 'COP' },
                                { value: 'USD', label: 'USD' },
                                { value: 'EUR', label: 'EUR' },
                                { value: 'CRYPTO', label: 'CRYPTO' }
                            ]}
                        />
                    </div>
                    <label className="flex items-center gap-3 p-4 bg-black/30 rounded-lg cursor-pointer border border-white/10 hover:border-[#3ED6D8]/50 transition-colors">
                        <input
                            type="checkbox"
                            {...register("is_locked")}
                            className="w-5 h-5 accent-[#3ED6D8]"
                        />
                        <div>
                            <span className="block text-white font-semibold text-sm">Bloquear Retiros</span>
                            <span className="block text-zinc-500 text-xs">Marcar como 'Intocable' para evitar gastos impulsivos.</span>
                        </div>
                    </label>

                    {/* Sección de Meta */}
                    <div className="space-y-4 p-4 bg-[#3ED6D8]/5 rounded-lg border border-[#3ED6D8]/20">
                        <p className="text-[#3ED6D8] text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            🎯 Meta de Ahorro (Opcional)
                        </p>
                        <Input
                            label="Nombre de la meta"
                            placeholder="Ej: Viaje a Europa, Carro nuevo..."
                            {...register("goal_name")}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Monto objetivo"
                                type="number"
                                placeholder="0"
                                {...register("goal_amount")}
                            />
                            <Input
                                label="Fecha objetivo"
                                type="date"
                                {...register("goal_date")}
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" isLoading={isSubmitting}>Crear Ahorro</Button>
                </form>
            </Modal>
        </AppLayout>
    );
}
