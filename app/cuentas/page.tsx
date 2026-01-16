"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { AppLayout } from "@/components/AppLayout";
import { SkeletonList } from "@/components/ui/Skeleton";
import { accountSchema, AccountFormData } from "@/lib/validations";

interface Account {
    id: string;
    name: string;
    type: string;
    currency: string;
    initial_balance: number;
    is_active: boolean;
}

export default function CuentasPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<Account[]>([]);

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);

    // Form for Creation
    const createForm = useForm<AccountFormData>({
        resolver: zodResolver(accountSchema) as any,
        defaultValues: {
            name: "",
            type: "bank",
            currency: "COP",
            initial_balance: 0,
            is_active: true,
        },
    });

    // Form for Editing
    const editForm = useForm<AccountFormData>({
        resolver: zodResolver(accountSchema) as any,
    });

    useEffect(() => {
        async function init() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            await loadAccounts();
            setLoading(false);
        }
        init();
    }, [router]);

    async function loadAccounts() {
        const { data } = await supabase.from("accounts").select("id, name, type, currency, initial_balance, is_active").order("name");
        setAccounts(data as Account[] || []);
    }

    async function handleCreate(data: AccountFormData) {
        const { error } = await supabase.from("accounts").insert({
            name: data.name.trim(),
            type: data.type,
            currency: data.currency,
            initial_balance: data.initial_balance,
            is_active: data.is_active
        });

        if (error) {
            showToast(error.message, "error");
        } else {
            showToast("Cuenta creada", "success");
            createForm.reset();
            setShowCreateForm(false);
            await loadAccounts();
        }
    }

    function openEditModal(acc: Account) {
        setEditingAccount(acc);
        editForm.reset({
            name: acc.name,
            type: acc.type as any,
            currency: acc.currency as any,
            initial_balance: acc.initial_balance,
            is_active: acc.is_active,
        });
    }

    function closeEditModal() {
        setEditingAccount(null);
        editForm.reset();
    }

    async function handleUpdate(data: AccountFormData) {
        if (!editingAccount) return;

        const { error } = await supabase.from("accounts")
            .update({
                name: data.name.trim(),
                type: data.type,
                currency: data.currency,
                initial_balance: data.initial_balance,
                is_active: data.is_active
            })
            .eq("id", editingAccount.id);

        if (error) {
            showToast(error.message, "error");
        } else {
            showToast("Cuenta actualizada", "success");
            closeEditModal();
            await loadAccounts();
        }
    }

    async function handleDelete(acc: Account) {
        if (!confirm(`¿Eliminar "${acc.name}"?`)) return;
        const { error } = await supabase.from("accounts").delete().eq("id", acc.id);
        if (error) { showToast(error.message, "error"); } else { showToast("Eliminada", "success"); await loadAccounts(); }
    }

    if (loading) return <div className="min-h-screen bg-[#07090D] p-4 md:p-6"><SkeletonList items={4} /></div>;

    const typeLabels: Record<string, string> = { bank: "Banco", cash: "Efectivo", wallet: "Billetera" };

    return (
        <AppLayout title="Cuentas Bancarias" subtitle="Gestión Financiera"
            actionButton={<button onClick={() => setShowCreateForm(true)} className="px-4 py-2 bg-[#3ED6D8] hover:bg-[#4FF0F2] text-[#07090D] font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 uppercase tracking-wider whitespace-nowrap"><span className="text-sm">+</span> Cuenta</button>}
        >
            <div className="bg-[#12161F] border border-white/10 rounded-xl overflow-hidden">
                {accounts.length === 0 ? (
                    <div className="text-center py-16 text-zinc-500"><p className="text-lg">No hay cuentas.</p></div>
                ) : (
                    <>
                        {/* Mobile: Cards */}
                        <div className="md:hidden divide-y divide-white/5">
                            {accounts.map((acc) => (
                                <div key={acc.id} className="p-4 space-y-2">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="min-w-0">
                                            <h3 className="text-white font-bold truncate">{acc.name}</h3>
                                            <p className="text-zinc-500 text-xs">{typeLabels[acc.type]} • {acc.currency}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${acc.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700/30 text-zinc-500'}`}>
                                            {acc.is_active ? "Activa" : "Inactiva"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-white font-mono font-bold">${acc.initial_balance.toLocaleString("es-CO")}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditModal(acc)} className="px-2 py-1 text-[10px] text-[#3ED6D8] bg-[#3ED6D8]/10 rounded">Editar</button>
                                            <button onClick={() => handleDelete(acc)} className="px-2 py-1 text-[10px] text-rose-400 bg-rose-500/10 rounded">Eliminar</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop: Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-zinc-400 text-xs font-bold uppercase tracking-wider border-b border-white/10 bg-black/20">
                                        <th className="py-4 px-5">Nombre</th>
                                        <th className="py-4 px-5">Tipo</th>
                                        <th className="py-4 px-5">Moneda</th>
                                        <th className="py-4 px-5 text-right">Saldo Inicial</th>
                                        <th className="py-4 px-5 text-center">Estado</th>
                                        <th className="py-4 px-5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {accounts.map((acc) => (
                                        <tr key={acc.id} className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-5 text-white font-semibold">{acc.name}</td>
                                            <td className="py-4 px-5 text-zinc-400">{typeLabels[acc.type]}</td>
                                            <td className="py-4 px-5 text-zinc-400">{acc.currency}</td>
                                            <td className="py-4 px-5 text-right text-white font-mono font-bold">${acc.initial_balance.toLocaleString("es-CO")}</td>
                                            <td className="py-4 px-5 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${acc.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700/30 text-zinc-500'}`}>
                                                    {acc.is_active ? "Activa" : "Inactiva"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openEditModal(acc)} className="px-3 py-1.5 text-zinc-400 hover:text-[#3ED6D8] hover:bg-[#3ED6D8]/10 rounded-lg text-sm font-semibold">Editar</button>
                                                    <button onClick={() => handleDelete(acc)} className="px-3 py-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-sm font-semibold">Eliminar</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Create Modal */}
            <Modal isOpen={showCreateForm} onClose={() => { setShowCreateForm(false); createForm.reset(); }} title="Nueva Cuenta">
                <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
                    <Input
                        label="Nombre"
                        placeholder="Ej: Bancolombia"
                        {...createForm.register("name")}
                        error={createForm.formState.errors.name?.message}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Tipo"
                            {...createForm.register("type")}
                            error={createForm.formState.errors.type?.message}
                            options={[{ value: 'bank', label: 'Banco' }, { value: 'cash', label: 'Efectivo' }, { value: 'wallet', label: 'Billetera' }]}
                        />
                        <Select
                            label="Moneda"
                            {...createForm.register("currency")}
                            error={createForm.formState.errors.currency?.message}
                            options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-end">
                        <Input
                            label="Saldo Inicial"
                            type="number"
                            step="0.01"
                            {...createForm.register("initial_balance", { valueAsNumber: true })}
                            error={createForm.formState.errors.initial_balance?.message}
                        />
                        <label className="flex items-center gap-2 text-white pb-3 cursor-pointer">
                            <input
                                type="checkbox"
                                {...createForm.register("is_active")}
                                className="w-5 h-5 accent-[#3ED6D8]"
                            />
                            <span className="text-sm">Activa</span>
                        </label>
                    </div>
                    <Button type="submit" className="w-full" isLoading={createForm.formState.isSubmitting}>Crear Cuenta</Button>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={!!editingAccount} onClose={closeEditModal} title="Editar Cuenta">
                {editingAccount && (
                    <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
                        <Input
                            label="Nombre"
                            {...editForm.register("name")}
                            error={editForm.formState.errors.name?.message}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Tipo"
                                {...editForm.register("type")}
                                error={editForm.formState.errors.type?.message}
                                options={[{ value: 'bank', label: 'Banco' }, { value: 'cash', label: 'Efectivo' }, { value: 'wallet', label: 'Billetera' }]}
                            />
                            <Select
                                label="Moneda"
                                {...editForm.register("currency")}
                                error={editForm.formState.errors.currency?.message}
                                options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 items-end">
                            <Input
                                label="Saldo Inicial"
                                type="number"
                                step="0.01"
                                {...editForm.register("initial_balance", { valueAsNumber: true })}
                                error={editForm.formState.errors.initial_balance?.message}
                            />
                            <label className="flex items-center gap-2 text-white pb-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    {...editForm.register("is_active")}
                                    className="w-5 h-5 accent-[#3ED6D8]"
                                />
                                <span className="text-sm">Activa</span>
                            </label>
                        </div>
                        <div className="flex gap-3">
                            <Button type="button" variant="secondary" className="flex-1" onClick={closeEditModal}>Cancelar</Button>
                            <Button type="submit" className="flex-1" isLoading={editForm.formState.isSubmitting}>Guardar</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </AppLayout>
    );
}
