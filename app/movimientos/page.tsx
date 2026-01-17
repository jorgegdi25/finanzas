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
import { Icons } from "@/components/Icons";
import { SkeletonTable } from "@/components/ui/Skeleton";
import {
    movementSchema,
    MovementFormData,
    accountSchema,
    AccountFormData,
    categorySchema,
    CategoryFormData
} from "@/lib/validations";

interface Account { id: string; name: string; type: string; currency: string; }
interface Category { id: string; name: string; type: string; }
interface Transaction {
    id: string; date: string; type: string; amount_original: number; currency: string;
    exchange_rate: number | null; amount_cop: number; account_id: string; category_id: string;
    note: string | null; accounts: any; categories: any;
}

export default function MovimientosPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    const [showAccountForm, setShowAccountForm] = useState(false);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);

    // Main Transaction Form
    const txForm = useForm<MovementFormData>({
        resolver: zodResolver(movementSchema) as any,
        defaultValues: {
            date: new Date().toISOString().split("T")[0],
            type: "expense",
            amount_original: 0,
            currency: "COP",
            exchange_rate: null,
            account_id: "",
            category_id: "",
            note: "",
        }
    });

    const watchCurrency = txForm.watch("currency");

    // Edit Transaction Form
    const editTxForm = useForm<MovementFormData>({
        resolver: zodResolver(movementSchema) as any,
    });

    const watchEditCurrency = editTxForm.watch("currency");

    // Modal forms
    const accountForm = useForm<AccountFormData>({
        resolver: zodResolver(accountSchema) as any,
        defaultValues: { name: "", type: "bank", currency: "COP", initial_balance: 0, is_active: true }
    });

    const categoryForm = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema) as any,
        defaultValues: { name: "", type: "expense" }
    });

    useEffect(() => {
        async function init() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            setUserId(user.id);
            await loadData();
            setLoading(false);
        }
        init();
    }, [router]);

    async function loadData() {
        const { data: accountsData } = await supabase.from("accounts").select("id, name, type, currency").eq("is_active", true).order("name");
        setAccounts(accountsData || []);

        if (accountsData && accountsData.length > 0) {
            txForm.setValue("account_id", txForm.getValues("account_id") || accountsData[0].id);
        }

        const { data: categoriesData } = await supabase.from("categories").select("id, name, type").eq("is_active", true).order("name");
        setCategories(categoriesData || []);

        if (categoriesData && categoriesData.length > 0) {
            txForm.setValue("category_id", txForm.getValues("category_id") || categoriesData[0].id);
        }

        const { data: transactionsData } = await supabase.from("transactions")
            .select(`id, date, type, amount_original, currency, exchange_rate, amount_cop, account_id, category_id, note, accounts (name), categories (name)`)
            .order("date", { ascending: false }).order("created_at", { ascending: false }).limit(20);
        setTransactions((transactionsData || []) as Transaction[]);
    }

    async function handleCreateTransaction(data: MovementFormData) {
        if (!userId) return;

        let amountCop: number;
        if (data.currency === "COP") {
            amountCop = data.amount_original;
        } else {
            if (!data.exchange_rate || data.exchange_rate <= 0) {
                showToast("Tasa de cambio requerida para moneda extranjera", "error");
                return;
            }
            amountCop = data.amount_original * data.exchange_rate;
        }

        const { error } = await supabase.from("transactions").insert({
            user_id: userId,
            date: data.date,
            type: data.type,
            amount_original: data.amount_original,
            currency: data.currency,
            exchange_rate: data.exchange_rate,
            amount_cop: amountCop,
            account_id: data.account_id,
            category_id: data.category_id,
            note: data.note || null
        });

        if (error) {
            showToast(error.message, "error");
        } else {
            showToast("Movimiento registrado", "success");
            txForm.reset({
                ...txForm.getValues(),
                amount_original: 0,
                exchange_rate: null,
                note: ""
            });
            await loadData();
        }
    }

    async function handleCreateAccount(data: AccountFormData) {
        if (!userId) return;
        const { error } = await supabase.from("accounts").insert({
            user_id: userId,
            name: data.name.trim(),
            type: data.type,
            currency: data.currency,
            initial_balance: data.initial_balance
        });

        if (error) {
            showToast(error.message, "error");
        } else {
            showToast("Cuenta creada", "success");
            accountForm.reset();
            setShowAccountForm(false);
            await loadData();
        }
    }

    async function handleCreateCategory(data: CategoryFormData) {
        if (!userId) return;
        const { error } = await supabase.from("categories").insert({
            user_id: userId,
            name: data.name.trim(),
            type: data.type
        });

        if (error) {
            showToast(error.message, "error");
        } else {
            showToast("Categoría creada", "success");
            categoryForm.reset();
            setShowCategoryForm(false);
            await loadData();
        }
    }

    function openEditModal(tx: Transaction) {
        setEditingTx(tx);
        editTxForm.reset({
            date: tx.date,
            type: tx.type as any,
            amount_original: tx.amount_original,
            currency: tx.currency as any,
            exchange_rate: tx.exchange_rate,
            account_id: tx.account_id,
            category_id: tx.category_id,
            note: tx.note || "",
        });
    }

    function closeEditModal() {
        setEditingTx(null);
        editTxForm.reset();
    }

    async function handleUpdateTransaction(data: MovementFormData) {
        if (!editingTx) return;

        let amountCop: number;
        if (data.currency === "COP") {
            amountCop = data.amount_original;
        } else {
            if (!data.exchange_rate || data.exchange_rate <= 0) {
                showToast("Tasa de cambio requerida", "error");
                return;
            }
            amountCop = data.amount_original * data.exchange_rate;
        }

        const { error } = await supabase.from("transactions").update({
            date: data.date,
            type: data.type,
            amount_original: data.amount_original,
            currency: data.currency,
            exchange_rate: data.exchange_rate,
            amount_cop: amountCop,
            account_id: data.account_id,
            category_id: data.category_id,
            note: data.note || null
        }).eq("id", editingTx.id);

        if (error) {
            showToast(error.message, "error");
        } else {
            showToast("Movimiento actualizado", "success");
            closeEditModal();
            await loadData();
        }
    }

    async function handleDeleteTransaction(tx: Transaction) {
        if (!confirm(`¿Eliminar este movimiento de ${tx.amount_cop.toLocaleString("es-CO")} COP?`)) return;
        const { error } = await supabase.from("transactions").delete().eq("id", tx.id);
        if (error) { showToast(error.message, "error"); } else { showToast("Movimiento eliminado", "success"); await loadData(); }
    }

    if (loading) return <div className="min-h-screen bg-[#07090D] p-4 md:p-6"><SkeletonTable rows={10} /></div>;

    const needsSetup = accounts.length === 0 || categories.length === 0;

    return (
        <AppLayout title="Movimientos" subtitle="Registro de Transacciones">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
                {/* Left: Form */}
                <div className="lg:col-span-1">
                    <div className="bg-[#12161F] border border-white/10 rounded-xl p-5 sticky top-0">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-white text-sm font-bold uppercase tracking-wider">Nuevo Movimiento</h2>
                            <div className="flex gap-2">
                                <button onClick={() => setShowAccountForm(true)} className="p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs rounded-lg transition-all border border-white/10 flex items-center gap-1" title="Nueva Cuenta">
                                    <Icons.CreditCard />
                                    <span className="hidden sm:inline">Cuenta</span>
                                </button>
                                <button onClick={() => setShowCategoryForm(true)} className="p-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs rounded-lg transition-all border border-white/10 flex items-center gap-1" title="Nueva Categoría">
                                    <Icons.Plus />
                                    <span className="hidden sm:inline">Categoría</span>
                                </button>
                            </div>
                        </div>
                        {needsSetup ? (
                            <div className="text-center py-8">
                                <p className="text-amber-400 text-sm mb-4">⚠️ Configura cuentas y categorías primero</p>
                                <div className="flex gap-2 justify-center flex-wrap">
                                    {accounts.length === 0 && <Button size="sm" onClick={() => setShowAccountForm(true)}>+ Cuenta</Button>}
                                    {categories.length === 0 && <Button size="sm" onClick={() => setShowCategoryForm(true)}>+ Categoría</Button>}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={txForm.handleSubmit(handleCreateTransaction)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        label="Fecha"
                                        type="date"
                                        {...txForm.register("date")}
                                        error={txForm.formState.errors.date?.message}
                                    />
                                    <Select
                                        label="Tipo"
                                        {...txForm.register("type")}
                                        error={txForm.formState.errors.type?.message}
                                        options={[{ value: 'expense', label: 'Gasto' }, { value: 'income', label: 'Ingreso' }]}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        label="Monto"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        {...txForm.register("amount_original", { valueAsNumber: true })}
                                        error={txForm.formState.errors.amount_original?.message}
                                    />
                                    <Select
                                        label="Moneda"
                                        {...txForm.register("currency")}
                                        error={txForm.formState.errors.currency?.message}
                                        options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]}
                                    />
                                </div>
                                {watchCurrency !== "COP" && (
                                    <Input
                                        label={`Tasa (1 ${watchCurrency} = X COP)`}
                                        type="number"
                                        step="0.01"
                                        placeholder="4200"
                                        {...txForm.register("exchange_rate", { valueAsNumber: true })}
                                        error={txForm.formState.errors.exchange_rate?.message}
                                    />
                                )}
                                <Select
                                    label="Cuenta"
                                    {...txForm.register("account_id")}
                                    error={txForm.formState.errors.account_id?.message}
                                    options={accounts.map(a => ({ value: a.id, label: `${a.name} (${a.currency})` }))}
                                />
                                <Select
                                    label="Categoría"
                                    {...txForm.register("category_id")}
                                    error={txForm.formState.errors.category_id?.message}
                                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                                />
                                <Input
                                    label="Nota (opcional)"
                                    placeholder="Detalle..."
                                    {...txForm.register("note")}
                                    error={txForm.formState.errors.note?.message}
                                />
                                <Button type="submit" className="w-full" isLoading={txForm.formState.isSubmitting}>Guardar</Button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Right: Transaction List */}
                <div className="lg:col-span-2 flex flex-col min-h-0">
                    <div className="bg-[#12161F] border border-white/10 rounded-xl flex flex-col flex-1 overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/20 shrink-0">
                            <h2 className="text-white text-sm font-bold uppercase tracking-wider">Últimos Movimientos</h2>
                            <div className="flex gap-2">
                                <button onClick={() => setShowAccountForm(true)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 text-xs font-bold rounded-lg transition-all border border-white/10">+ Cuenta</button>
                                <button onClick={() => setShowCategoryForm(true)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 text-xs font-bold rounded-lg transition-all border border-white/10">+ Categoría</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {transactions.length === 0 ? (
                                <div className="text-center py-16 text-zinc-500">
                                    <p className="text-lg">No hay movimientos registrados aún.</p>
                                </div>
                            ) : (
                                transactions.map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:border-white/20 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-1.5 h-12 rounded-full ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                        {tx.type === 'income' ? 'Ingreso' : 'Gasto'}
                                                    </span>
                                                    <span className="text-zinc-500 text-xs">{tx.date}</span>
                                                </div>
                                                <p className="text-white font-semibold">{tx.categories?.name}</p>
                                                <p className="text-zinc-500 text-xs">{tx.accounts?.name} {tx.note && `• ${tx.note}`}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-bold font-mono ${tx.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                                                {tx.type === 'income' ? '+' : '-'}${tx.amount_cop.toLocaleString("es-CO")}
                                            </p>
                                            {tx.currency !== "COP" && <p className="text-zinc-600 text-xs">{tx.amount_original.toLocaleString()} {tx.currency}</p>}
                                            <div className="flex gap-2 justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditModal(tx)} className="px-2 py-1 text-zinc-500 hover:text-[#3ED6D8] text-xs">Editar</button>
                                                <button onClick={() => handleDeleteTransaction(tx)} className="px-2 py-1 text-zinc-500 hover:text-rose-400 text-xs">Eliminar</button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={showAccountForm} onClose={() => { setShowAccountForm(false); accountForm.reset(); }} title="Nueva Cuenta">
                <form onSubmit={accountForm.handleSubmit(handleCreateAccount)} className="space-y-4">
                    <Input label="Nombre" {...accountForm.register("name")} error={accountForm.formState.errors.name?.message} />
                    <Select label="Tipo" {...accountForm.register("type")} options={[{ value: 'bank', label: 'Banco' }, { value: 'cash', label: 'Efectivo' }, { value: 'wallet', label: 'Billetera' }]} />
                    <Select label="Moneda" {...accountForm.register("currency")} options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]} />
                    <Input label="Saldo Inicial" type="number" {...accountForm.register("initial_balance", { valueAsNumber: true })} />
                    <Button type="submit" className="w-full" isLoading={accountForm.formState.isSubmitting}>Crear Cuenta</Button>
                </form>
            </Modal>

            <Modal isOpen={showCategoryForm} onClose={() => { setShowCategoryForm(false); categoryForm.reset(); }} title="Nueva Categoría">
                <form onSubmit={categoryForm.handleSubmit(handleCreateCategory)} className="space-y-4">
                    <Input label="Nombre" {...categoryForm.register("name")} error={categoryForm.formState.errors.name?.message} />
                    <Select label="Tipo" {...categoryForm.register("type")} options={[{ value: 'expense', label: 'Gasto' }, { value: 'income', label: 'Ingreso' }, { value: 'both', label: 'Ambos' }]} />
                    <Button type="submit" className="w-full" isLoading={categoryForm.formState.isSubmitting}>Crear Categoría</Button>
                </form>
            </Modal>

            <Modal isOpen={!!editingTx} onClose={closeEditModal} title="Editar Movimiento">
                {editingTx && (
                    <form onSubmit={editTxForm.handleSubmit(handleUpdateTransaction)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Fecha" type="date" {...editTxForm.register("date")} error={editTxForm.formState.errors.date?.message} />
                            <Select label="Tipo" {...editTxForm.register("type")} options={[{ value: 'expense', label: 'Gasto' }, { value: 'income', label: 'Ingreso' }]} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Monto" type="number" step="0.01" {...editTxForm.register("amount_original", { valueAsNumber: true })} error={editTxForm.formState.errors.amount_original?.message} />
                            <Select label="Moneda" {...editTxForm.register("currency")} options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]} />
                        </div>
                        {watchEditCurrency !== "COP" && (
                            <Input
                                label={`Tasa (1 ${watchEditCurrency})`}
                                type="number"
                                step="0.01"
                                {...editTxForm.register("exchange_rate", { valueAsNumber: true })}
                                error={editTxForm.formState.errors.exchange_rate?.message}
                            />
                        )}
                        <Select label="Cuenta" {...editTxForm.register("account_id")} options={accounts.map(a => ({ value: a.id, label: `${a.name} (${a.currency})` }))} />
                        <Select label="Categoría" {...editTxForm.register("category_id")} options={categories.map(c => ({ value: c.id, label: c.name }))} />
                        <Input label="Nota" {...editTxForm.register("note")} error={editTxForm.formState.errors.note?.message} />
                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="secondary" className="flex-1" onClick={closeEditModal}>Cancelar</Button>
                            <Button type="submit" className="flex-1" isLoading={editTxForm.formState.isSubmitting}>Guardar Cambios</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </AppLayout>
    );
}
