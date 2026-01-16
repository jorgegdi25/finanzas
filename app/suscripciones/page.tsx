"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { subscriptionSchema, SubscriptionFormData } from "@/lib/validations";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Icons } from "@/components/Icons";

interface Subscription {
    id: string;
    name: string;
    type: "personal" | "business";
    amount: number;
    currency: string;
    frequency: string;
    billing_day: number | null;
    account_id: string | null;
    category_id: string | null;
    start_date: string;
    end_date: string | null;
    next_payment_date: string | null;
    is_active: boolean;
    notes: string | null;
    accounts?: { name: string } | null;
    categories?: { name: string } | null;
}

interface Account {
    id: string;
    name: string;
}

interface Category {
    id: string;
    name: string;
}

export default function SuscripcionesPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingSub, setEditingSub] = useState<Subscription | null>(null);
    const [activeTab, setActiveTab] = useState<"personal" | "business">("personal");

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<SubscriptionFormData>({
        resolver: zodResolver(subscriptionSchema) as any,
        defaultValues: {
            type: "personal",
            currency: "COP",
            frequency: "monthly",
            start_date: new Date().toISOString().split("T")[0],
        },
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push("/login");
            return;
        }

        const [subsRes, accRes, catRes] = await Promise.all([
            supabase.from("subscriptions").select("*, accounts(name), categories(name)").order("name"),
            supabase.from("accounts").select("id, name").eq("is_active", true).order("name"),
            supabase.from("categories").select("id, name").eq("type", "expense").order("name"),
        ]);

        if (subsRes.data) setSubscriptions(subsRes.data);
        if (accRes.data) setAccounts(accRes.data);
        if (catRes.data) setCategories(catRes.data);
        setLoading(false);
    }

    async function onSubmit(data: SubscriptionFormData) {
        // Calcular próxima fecha de pago
        const today = new Date();
        let nextPayment = new Date(data.start_date);
        if (data.billing_day) {
            nextPayment.setDate(data.billing_day);
            if (nextPayment < today) {
                nextPayment.setMonth(nextPayment.getMonth() + 1);
            }
        }

        const subData = {
            ...data,
            category_id: data.category_id || null,
            end_date: data.end_date || null,
            next_payment_date: nextPayment.toISOString().split("T")[0],
            is_active: true,
        };

        const { error } = editingSub
            ? await supabase.from("subscriptions").update(subData).eq("id", editingSub.id)
            : await supabase.from("subscriptions").insert(subData);

        if (error) {
            showToast(`Error: ${error.message}`, "error");
            return;
        }

        showToast(editingSub ? "Suscripción actualizada" : "Suscripción creada", "success");
        setShowModal(false);
        setEditingSub(null);
        reset();
        fetchData();
    }

    async function handleDelete(sub: Subscription) {
        if (!confirm(`¿Eliminar "${sub.name}"?`)) return;
        const { error } = await supabase.from("subscriptions").delete().eq("id", sub.id);
        if (error) {
            showToast(`Error: ${error.message}`, "error");
            return;
        }
        showToast("Suscripción eliminada", "success");
        fetchData();
    }

    async function toggleActive(sub: Subscription) {
        const { error } = await supabase.from("subscriptions").update({ is_active: !sub.is_active }).eq("id", sub.id);
        if (error) {
            showToast(`Error: ${error.message}`, "error");
            return;
        }
        showToast(sub.is_active ? "Suscripción pausada" : "Suscripción activada", "success");
        fetchData();
    }

    function openEdit(sub: Subscription) {
        setEditingSub(sub);
        reset({
            name: sub.name,
            type: sub.type,
            amount: sub.amount,
            currency: sub.currency as "COP" | "USD" | "EUR",
            frequency: sub.frequency as "weekly" | "monthly" | "yearly",
            billing_day: sub.billing_day,
            account_id: sub.account_id || "",
            category_id: sub.category_id || "",
            start_date: sub.start_date,
            end_date: sub.end_date || "",
            notes: sub.notes || "",
        });
        setShowModal(true);
    }

    const filteredSubs = subscriptions.filter(s => s.type === activeTab);
    const totalMonthly = filteredSubs
        .filter(s => s.is_active)
        .reduce((sum, s) => {
            if (s.frequency === "monthly") return sum + s.amount;
            if (s.frequency === "yearly") return sum + s.amount / 12;
            if (s.frequency === "weekly") return sum + s.amount * 4;
            return sum;
        }, 0);

    const frequencyLabels: Record<string, string> = {
        weekly: "Semanal",
        monthly: "Mensual",
        yearly: "Anual",
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="space-y-4">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white">Suscripciones</h1>
                        <p className="text-zinc-400 text-sm">Gestiona tus servicios recurrentes</p>
                    </div>
                    <Button onClick={() => { setEditingSub(null); reset(); setShowModal(true); }}>
                        + Nueva Suscripción
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-white/10 pb-2">
                    <button
                        onClick={() => setActiveTab("personal")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold transition-colors ${activeTab === "personal" ? "bg-[#3ED6D8] text-[#0B0E14]" : "text-zinc-400 hover:text-white"}`}
                    >
                        <Icons.Home /> Personal
                    </button>
                    <button
                        onClick={() => setActiveTab("business")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold transition-colors ${activeTab === "business" ? "bg-[#F2A08F] text-[#0B0E14]" : "text-zinc-400 hover:text-white"}`}
                    >
                        <Icons.Building /> Empresarial
                    </button>
                </div>

                {/* Resumen */}
                <div className="bg-[#12161F] border border-white/10 rounded-xl p-4">
                    <p className="text-zinc-400 text-sm uppercase font-bold tracking-wider mb-1">
                        Gasto mensual en suscripciones {activeTab === "personal" ? "personales" : "empresariales"}
                    </p>
                    <p className={`text-3xl font-black font-mono ${activeTab === "personal" ? "text-[#3ED6D8]" : "text-[#F2A08F]"}`}>
                        ${totalMonthly.toLocaleString("es-CO")}
                    </p>
                </div>

                {/* Lista */}
                <div className="space-y-3">
                    {filteredSubs.length === 0 ? (
                        <p className="text-zinc-500 text-center py-8">No hay suscripciones {activeTab === "personal" ? "personales" : "empresariales"}</p>
                    ) : (
                        filteredSubs.map(sub => (
                            <div
                                key={sub.id}
                                className={`bg-[#12161F] border rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${sub.is_active ? "border-white/10" : "border-white/5 opacity-50"}`}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-white font-bold">{sub.name}</h3>
                                        {!sub.is_active && <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">Pausada</span>}
                                    </div>
                                    <p className="text-zinc-400 text-sm">
                                        {frequencyLabels[sub.frequency]} • {sub.accounts?.name || "Sin cuenta"} • {sub.categories?.name || "Sin categoría"}
                                    </p>
                                    {sub.next_payment_date && (
                                        <p className="text-zinc-500 text-xs mt-1">
                                            Próximo pago: {new Date(sub.next_payment_date).toLocaleDateString("es-CO")}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className={`text-xl font-black font-mono ${activeTab === "personal" ? "text-[#3ED6D8]" : "text-[#F2A08F]"}`}>
                                        ${sub.amount.toLocaleString("es-CO")}
                                        <span className="text-xs text-zinc-500 ml-1">{sub.currency}</span>
                                    </p>
                                    <div className="flex gap-3">
                                        <button onClick={() => toggleActive(sub)} className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
                                            {sub.is_active ? <Icons.Pause /> : <Icons.Play />}
                                        </button>
                                        <button onClick={() => openEdit(sub)} className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"><Icons.Edit /></button>
                                        <button onClick={() => handleDelete(sub)} className="text-zinc-400 hover:text-red-400 p-1 rounded hover:bg-white/10 transition-colors"><Icons.Trash /></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingSub ? "Editar Suscripción" : "Nueva Suscripción"}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input label="Nombre" placeholder="Netflix, Spotify..." {...register("name")} error={errors.name?.message} />

                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Tipo" {...register("type")} error={errors.type?.message}>
                            <option value="personal">Personal</option>
                            <option value="business">Empresarial</option>
                        </Select>
                        <Select label="Frecuencia" {...register("frequency")} error={errors.frequency?.message}>
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensual</option>
                            <option value="yearly">Anual</option>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Monto" type="number" {...register("amount")} error={errors.amount?.message} />
                        <Select label="Moneda" {...register("currency")} error={errors.currency?.message}>
                            <option value="COP">COP</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Día de cobro (1-31)" type="number" {...register("billing_day")} />
                        <Input label="Fecha inicio" type="date" {...register("start_date")} error={errors.start_date?.message} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Cuenta" {...register("account_id")} error={errors.account_id?.message}>
                            <option value="">Selecciona una cuenta</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </Select>
                        <Select label="Categoría" {...register("category_id")}>
                            <option value="">Sin categoría</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </Select>
                    </div>

                    <Input label="Notas (opcional)" {...register("notes")} />

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isSubmitting}>
                            {isSubmitting ? "Guardando..." : editingSub ? "Actualizar" : "Crear"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
