"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SkeletonList } from "@/components/ui/Skeleton";
import { debtSchema, DebtFormData } from "@/lib/validations";
import { useToast } from "@/components/ui/Toast";

interface Debt {
    id: string;
    name: string;
    balance_cop: number;
    interest_rate_value: number;
    interest_rate_type: string;
    minimum_payment_cop: number;
    total_installments: number | null;
    paid_installments: number | null;
    due_day: number | null;
    status: string;
}

export default function DeudasPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [totalDebt, setTotalDebt] = useState(0);

    const [showCreateForm, setShowCreateForm] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<DebtFormData>({
        resolver: zodResolver(debtSchema) as any,
        defaultValues: {
            name: "",
            balance_cop: 0,
            interest_rate_value: 0,
            interest_rate_type: "EA",
            minimum_payment_cop: 0,
            status: "active",
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
            await loadDebts();
            setLoading(false);
        }
        init();
    }, [router]);

    async function loadDebts() {
        const { data } = await supabase
            .from("debts")
            .select("*")
            .eq("status", "active")
            .order("name");

        setDebts(data as Debt[] || []);
        const total = (data || []).reduce((sum, d) => sum + (parseFloat(String(d.balance_cop)) || 0), 0);
        setTotalDebt(total);
    }

    async function onSubmit(data: DebtFormData) {
        const { error } = await supabase.from("debts").insert({
            name: data.name.trim(),
            balance_cop: data.balance_cop,
            interest_rate_value: data.interest_rate_value / 100, // Conversion handling
            interest_rate_type: data.interest_rate_type,
            minimum_payment_cop: data.minimum_payment_cop,
            total_installments: data.total_installments || null,
            paid_installments: data.paid_installments || 0,
            status: "active",
        });

        if (error) {
            showToast(error.message, "error");
        } else {
            showToast("Deuda creada exitosamente", "success");
            reset();
            setShowCreateForm(false);
            await loadDebts();
        }
    }

    if (loading) return <div className="min-h-screen bg-[#07090D] p-4 md:p-6"><SkeletonList items={3} /></div>;

    return (
        <AppLayout
            title="Gestión de Deudas"
            subtitle="Control Financiero"
            actionButton={
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-5 py-2 bg-[#3ED6D8] hover:bg-[#4FF0F2] text-[#07090D] font-bold text-xs rounded-lg transition-all flex items-center gap-2 uppercase tracking-wider"
                >
                    <span className="text-base">+</span> Nueva Deuda
                </button>
            }
        >
            <div className="space-y-4">
                {/* Total Deuda Card */}
                <div className="bg-[#12161F] border border-white/10 rounded-xl p-5 flex justify-between items-center">
                    <div>
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Total Deuda Activa</p>
                        <p className="text-3xl font-black text-[#F2A08F] tracking-tight">
                            ${totalDebt.toLocaleString("es-CO")} <span className="text-lg text-zinc-500">COP</span>
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{debts.length} Deudas</p>
                    </div>
                </div>

                {/* Debt Cards */}
                <div className="bg-[#12161F] border border-white/10 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-black/20">
                        <h2 className="text-white text-sm font-bold uppercase tracking-wider">Deudas Activas</h2>
                    </div>

                    {debts.length === 0 ? (
                        <div className="text-center py-16 text-zinc-500">
                            <p className="text-lg">No hay deudas registradas.</p>
                            <p className="text-sm mt-2">Agrega tu primera deuda para hacer seguimiento.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {debts.map((debt) => (
                                <div
                                    key={debt.id}
                                    className="flex justify-between items-center p-4 hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-semibold text-base truncate">{debt.name}</p>
                                        <div className="text-zinc-500 text-xs mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                            <span>Tasa: <span className="text-zinc-400">{(debt.interest_rate_value * 100).toFixed(2)}% {debt.interest_rate_type}</span></span>
                                            <span>Pago mín: <span className="text-zinc-400">${debt.minimum_payment_cop.toLocaleString("es-CO")}</span></span>
                                            {debt.total_installments && (
                                                <span>Cuotas: <span className="text-zinc-400">{debt.paid_installments || 0}/{debt.total_installments}</span></span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0 ml-4">
                                        <p className="text-xl font-black text-[#F2A08F] font-mono tracking-tight">
                                            ${debt.balance_cop.toLocaleString("es-CO")}
                                        </p>
                                        <Link
                                            href={`/deudas/${debt.id}`}
                                            className="px-4 py-1.5 bg-[#3ED6D8]/10 text-[#3ED6D8] text-xs font-bold rounded-lg hover:bg-[#3ED6D8]/20 transition-all border border-[#3ED6D8]/20"
                                        >
                                            Ver detalle
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            <Modal isOpen={showCreateForm} onClose={() => { setShowCreateForm(false); reset(); }} title="Nueva Deuda">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <Input
                        label="Nombre de la deuda"
                        placeholder="Ej: Tarjeta de crédito"
                        {...register("name")}
                        error={errors.name?.message}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Saldo actual (COP)"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...register("balance_cop", { valueAsNumber: true })}
                            error={errors.balance_cop?.message}
                        />
                        <Input
                            label="Pago mínimo (COP)"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...register("minimum_payment_cop", { valueAsNumber: true })}
                            error={errors.minimum_payment_cop?.message}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Tasa de interés (%)"
                            type="number"
                            step="0.01"
                            placeholder="Ej: 2.5"
                            {...register("interest_rate_value", { valueAsNumber: true })}
                            error={errors.interest_rate_value?.message}
                        />
                        <Select
                            label="Tipo de tasa"
                            {...register("interest_rate_type")}
                            error={errors.interest_rate_type?.message}
                            options={[
                                { value: 'EA', label: 'EA (Efectiva Anual)' },
                                { value: 'MV', label: 'MV (Mensual Vencida)' }
                            ]}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Total cuotas (opcional)"
                            type="number"
                            placeholder="Ej: 24"
                            {...register("total_installments", { valueAsNumber: true })}
                            error={errors.total_installments?.message}
                        />
                        <Input
                            label="Cuotas pagas"
                            type="number"
                            placeholder="Ej: 0"
                            {...register("paid_installments", { valueAsNumber: true })}
                            error={errors.paid_installments?.message}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowCreateForm(false); reset(); }}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="flex-1" isLoading={isSubmitting}>
                            Crear Deuda
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
