"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Icons } from "@/components/Icons";

interface Category {
    id: string;
    name: string;
}

interface Budget {
    id: string;
    category_id: string;
    month_year: string;
    budget_amount: number;
    categories?: { name: string } | null;
}

interface CategorySpending {
    category_id: string;
    category_name: string;
    budget_amount: number;
    spent_amount: number;
    percentage: number;
}

export default function PresupuestosPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [spending, setSpending] = useState<CategorySpending[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });

    // Form state
    const [formCategoryId, setFormCategoryId] = useState("");
    const [formAmount, setFormAmount] = useState("");

    useEffect(() => {
        fetchData();
    }, [selectedMonth]);

    async function fetchData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push("/login");
            return;
        }

        // Obtener categorías de gasto
        const { data: catData } = await supabase
            .from("categories")
            .select("id, name")
            .eq("type", "expense")
            .eq("is_active", true)
            .order("name");
        setCategories(catData || []);

        // Obtener presupuestos del mes seleccionado
        const { data: budgetData } = await supabase
            .from("budgets")
            .select("*, categories(name)")
            .eq("month_year", selectedMonth);
        setBudgets(budgetData || []);

        // Obtener gastos del mes por categoría
        const [year, month] = selectedMonth.split("-");
        const startDate = `${year}-${month}-01`;
        const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split("T")[0];

        const { data: txData } = await supabase
            .from("transactions")
            .select("category_id, amount_cop, categories(name)")
            .eq("type", "expense")
            .gte("date", startDate)
            .lte("date", endDate);

        // Calcular gastos por categoría
        const spendingByCategory: Record<string, { name: string; total: number }> = {};
        (txData || []).forEach((tx: any) => {
            const id = tx.category_id;
            if (!spendingByCategory[id]) {
                spendingByCategory[id] = { name: tx.categories?.name || "Sin categoría", total: 0 };
            }
            spendingByCategory[id].total += parseFloat(String(tx.amount_cop)) || 0;
        });

        // Combinar presupuestos con gastos
        const combinedData: CategorySpending[] = (budgetData || []).map((b: Budget) => {
            const spent = spendingByCategory[b.category_id]?.total || 0;
            const percentage = b.budget_amount > 0 ? (spent / b.budget_amount) * 100 : 0;
            return {
                category_id: b.category_id,
                category_name: b.categories?.name || "Sin categoría",
                budget_amount: b.budget_amount,
                spent_amount: spent,
                percentage
            };
        });

        // Ordenar por porcentaje (mayor primero)
        combinedData.sort((a, b) => b.percentage - a.percentage);
        setSpending(combinedData);
        setLoading(false);
    }

    async function handleSave() {
        if (!formCategoryId || !formAmount) {
            showToast("Completa todos los campos", "error");
            return;
        }

        const amount = parseFloat(formAmount);
        if (isNaN(amount) || amount <= 0) {
            showToast("Monto inválido", "error");
            return;
        }

        if (editingBudget) {
            // Actualizar
            const { error } = await supabase
                .from("budgets")
                .update({ budget_amount: amount, updated_at: new Date().toISOString() })
                .eq("id", editingBudget.id);

            if (error) {
                showToast(`Error: ${error.message}`, "error");
                return;
            }
            showToast("Presupuesto actualizado", "success");
        } else {
            // Crear nuevo
            const { error } = await supabase
                .from("budgets")
                .insert({
                    category_id: formCategoryId,
                    month_year: selectedMonth,
                    budget_amount: amount
                });

            if (error) {
                if (error.code === "23505") {
                    showToast("Ya existe un presupuesto para esta categoría este mes", "error");
                } else {
                    showToast(`Error: ${error.message}`, "error");
                }
                return;
            }
            showToast("Presupuesto creado", "success");
        }

        setShowModal(false);
        setEditingBudget(null);
        setFormCategoryId("");
        setFormAmount("");
        fetchData();
    }

    async function handleDelete(budget: Budget) {
        if (!confirm(`¿Eliminar presupuesto de "${budget.categories?.name}"?`)) return;

        const { error } = await supabase.from("budgets").delete().eq("id", budget.id);
        if (error) {
            showToast(`Error: ${error.message}`, "error");
            return;
        }
        showToast("Presupuesto eliminado", "success");
        fetchData();
    }

    function openEdit(budget: Budget) {
        setEditingBudget(budget);
        setFormCategoryId(budget.category_id);
        setFormAmount(String(budget.budget_amount));
        setShowModal(true);
    }

    function openNew() {
        setEditingBudget(null);
        setFormCategoryId("");
        setFormAmount("");
        setShowModal(true);
    }

    // Calcular totales
    const totalBudget = spending.reduce((sum, s) => sum + s.budget_amount, 0);
    const totalSpent = spending.reduce((sum, s) => sum + s.spent_amount, 0);
    const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // Generar opciones de meses (últimos 6 + próximos 3)
    const monthOptions = [];
    const now = new Date();
    for (let i = -6; i <= 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
        monthOptions.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }

    // Categorías sin presupuesto asignado
    const categoriesWithoutBudget = categories.filter(
        c => !budgets.some(b => b.category_id === c.id)
    );

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
                        <h1 className="text-2xl font-black text-white">Presupuestos</h1>
                        <p className="text-zinc-400 text-sm">Control de gastos por categoría</p>
                    </div>
                    <div className="flex gap-2">
                        <Select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            options={monthOptions}
                        />
                        <Button onClick={openNew}>+ Presupuesto</Button>
                    </div>
                </div>

                {/* Resumen Total */}
                <div className="bg-[#12161F] border border-white/10 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-zinc-400 text-sm uppercase font-bold tracking-wider">Resumen del Mes</p>
                        <span className={`text-sm font-bold px-2 py-1 rounded ${totalPercentage >= 100 ? 'bg-rose-500/20 text-rose-400' :
                                totalPercentage >= 80 ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-emerald-500/20 text-emerald-400'
                            }`}>
                            {totalPercentage.toFixed(0)}% usado
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center mb-4">
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold">Presupuestado</p>
                            <p className="text-[#3ED6D8] font-mono font-bold text-lg">${totalBudget.toLocaleString("es-CO")}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold">Gastado</p>
                            <p className="text-[#F2A08F] font-mono font-bold text-lg">${totalSpent.toLocaleString("es-CO")}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold">Disponible</p>
                            <p className={`font-mono font-bold text-lg ${totalBudget - totalSpent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ${(totalBudget - totalSpent).toLocaleString("es-CO")}
                            </p>
                        </div>
                    </div>
                    {/* Barra de progreso total */}
                    <div className="h-3 bg-black/30 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${totalPercentage >= 100 ? 'bg-rose-500' :
                                    totalPercentage >= 80 ? 'bg-amber-500' :
                                        'bg-emerald-500'
                                }`}
                            style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Lista de Presupuestos por Categoría */}
                <div className="space-y-3">
                    {spending.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            <Icons.ChartBar />
                            <p className="mt-2">No hay presupuestos para este mes</p>
                            <Button onClick={openNew} className="mt-4">Crear Presupuesto</Button>
                        </div>
                    ) : (
                        spending.map((item) => (
                            <div
                                key={item.category_id}
                                className="bg-[#12161F] border border-white/10 rounded-xl p-4"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-white font-bold">{item.category_name}</h3>
                                        <p className="text-zinc-500 text-xs">
                                            ${item.spent_amount.toLocaleString("es-CO")} de ${item.budget_amount.toLocaleString("es-CO")}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-bold px-2 py-1 rounded ${item.percentage >= 100 ? 'bg-rose-500/20 text-rose-400' :
                                                item.percentage >= 80 ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-emerald-500/20 text-emerald-400'
                                            }`}>
                                            {item.percentage.toFixed(0)}%
                                        </span>
                                        <button
                                            onClick={() => openEdit(budgets.find(b => b.category_id === item.category_id)!)}
                                            className="p-1 text-zinc-400 hover:text-white"
                                        >
                                            <Icons.Edit />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(budgets.find(b => b.category_id === item.category_id)!)}
                                            className="p-1 text-zinc-400 hover:text-rose-400"
                                        >
                                            <Icons.Trash />
                                        </button>
                                    </div>
                                </div>
                                {/* Barra de progreso */}
                                <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${item.percentage >= 100 ? 'bg-rose-500' :
                                                item.percentage >= 80 ? 'bg-amber-500' :
                                                    'bg-emerald-500'
                                            }`}
                                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                    />
                                </div>
                                {item.percentage >= 100 && (
                                    <p className="text-rose-400 text-xs mt-2 flex items-center gap-1">
                                        <Icons.AlertTriangle /> ¡Presupuesto excedido!
                                    </p>
                                )}
                                {item.percentage >= 80 && item.percentage < 100 && (
                                    <p className="text-amber-400 text-xs mt-2">
                                        Cerca del límite
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingBudget ? "Editar Presupuesto" : "Nuevo Presupuesto"}>
                <div className="space-y-4">
                    {!editingBudget && (
                        <Select
                            label="Categoría"
                            value={formCategoryId}
                            onChange={(e) => setFormCategoryId(e.target.value)}
                            options={[
                                { value: "", label: "Selecciona una categoría" },
                                ...categoriesWithoutBudget.map(c => ({ value: c.id, label: c.name }))
                            ]}
                        />
                    )}
                    {editingBudget && (
                        <div className="bg-black/20 rounded-lg p-3">
                            <p className="text-zinc-500 text-xs uppercase font-bold">Categoría</p>
                            <p className="text-white font-bold">{editingBudget.categories?.name}</p>
                        </div>
                    )}
                    <Input
                        label="Monto Presupuestado"
                        type="number"
                        placeholder="0"
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                    />
                    <div className="flex gap-3 pt-4">
                        <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
                            Cancelar
                        </Button>
                        <Button className="flex-1" onClick={handleSave}>
                            {editingBudget ? "Actualizar" : "Crear"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}
