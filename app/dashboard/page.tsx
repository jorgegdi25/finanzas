"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { SkeletonDashboard } from "@/components/ui/Skeleton";
import { ExpenseDonutChart, ExpenseLegend } from "@/components/Charts";

interface AccountWithBalance {
    id: string;
    name: string;
    currency: string;
    initial_balance: number;
    real_balance: number;
}

interface TopCategory {
    category_id: string;
    category_name: string;
    total: number;
}

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState("");
    const [totalRealBalance, setTotalRealBalance] = useState(0);
    const [accountsWithBalance, setAccountsWithBalance] = useState<AccountWithBalance[]>([]);
    const [monthIncome, setMonthIncome] = useState(0);
    const [monthExpense, setMonthExpense] = useState(0);
    const [topCategories, setTopCategories] = useState<TopCategory[]>([]);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        async function loadDashboard() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { if (isMounted) router.push("/login"); return; }
                if (isMounted) setUserEmail(user.email || "");

                const now = new Date();
                const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
                const endDate = now.toISOString().split("T")[0];

                const results = await Promise.allSettled([
                    supabase.from("accounts").select("id, name, currency, initial_balance").eq("is_active", true),
                    supabase.from("transactions").select("account_id, type, amount_cop").in("type", ["income", "expense"]).order("date", { ascending: false }).limit(500),
                    supabase.from("transactions").select("amount_cop").eq("type", "income").gte("date", startDate).lte("date", endDate),
                    supabase.from("transactions").select("amount_cop").eq("type", "expense").gte("date", startDate).lte("date", endDate),
                    supabase.from("transactions").select("category_id, amount_cop, categories (name)").eq("type", "expense").gte("date", startDate).lte("date", endDate).limit(100)
                ]);

                const getData = (index: number) => {
                    const res = results[index];
                    return (res.status === 'fulfilled' && !res.value.error) ? res.value.data || [] : [];
                };

                const accountsData = getData(0);
                const recentTransactions = getData(1);
                const incomeData = getData(2);
                const expenseData = getData(3);
                const expensesByCategory = getData(4);

                const accountBalances: AccountWithBalance[] = accountsData.map((acc: any) => {
                    const initial = parseFloat(String(acc.initial_balance)) || 0;
                    const inc = recentTransactions.filter((tx: any) => tx.account_id === acc.id && tx.type === "income").reduce((sum: number, tx: any) => sum + (parseFloat(String(tx.amount_cop)) || 0), 0);
                    const exp = recentTransactions.filter((tx: any) => tx.account_id === acc.id && tx.type === "expense").reduce((sum: number, tx: any) => sum + (parseFloat(String(tx.amount_cop)) || 0), 0);
                    return { id: acc.id, name: acc.name, currency: acc.currency, initial_balance: initial, real_balance: initial + inc - exp };
                });

                if (isMounted) {
                    setAccountsWithBalance(accountBalances.sort((a, b) => b.real_balance - a.real_balance));
                    setTotalRealBalance(accountBalances.reduce((sum, acc) => sum + acc.real_balance, 0));
                    setMonthIncome(incomeData.reduce((sum: number, tx: any) => sum + (parseFloat(String(tx.amount_cop)) || 0), 0));
                    setMonthExpense(expenseData.reduce((sum: number, tx: any) => sum + (parseFloat(String(tx.amount_cop)) || 0), 0));

                    const catTotals: Record<string, { name: string; total: number }> = {};
                    expensesByCategory.forEach((tx: any) => {
                        const id = tx.category_id;
                        const name = tx.categories?.name || "Sin categoría";
                        const amt = parseFloat(String(tx.amount_cop)) || 0;
                        if (!catTotals[id]) catTotals[id] = { name, total: 0 };
                        catTotals[id].total += amt;
                    });
                    setTopCategories(Object.entries(catTotals).map(([id, d]) => ({ category_id: id, category_name: d.name, total: d.total })).sort((a, b) => b.total - a.total).slice(0, 5));
                }
            } catch (err: any) {
                if (err?.name !== 'AbortError') console.error(err);
            } finally {
                clearTimeout(timeoutId);
                if (isMounted) setLoading(false);
            }
        }
        loadDashboard();
        return () => { isMounted = false; controller.abort(); clearTimeout(timeoutId); };
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-[#07090D] p-4 md:p-6">
            <SkeletonDashboard />
        </div>
    );

    return (
        <AppLayout
            title={`Bienvenido, ${userEmail.split('@')[0]}`}
            subtitle="Panel de Control"
            actionButton={
                <Link href="/movimientos">
                    <button className="px-4 py-2 bg-[#3ED6D8] hover:bg-[#4FF0F2] text-[#07090D] font-bold text-xs rounded-lg transition-all flex items-center gap-2 uppercase tracking-wider">
                        <span className="text-base">+</span> Nueva Operación
                    </button>
                </Link>
            }
        >
            <div className="space-y-4">
                {/* Patrimonio Total */}
                <div className="bg-[#12161F] border border-white/10 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Patrimonio Total</h2>
                        <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-3xl md:text-4xl font-black text-[#F2A08F] tracking-tight">
                                ${totalRealBalance.toLocaleString("es-CO")}
                            </span>
                            <span className="text-[#3ED6D8] text-xs font-bold uppercase bg-[#3ED6D8]/10 px-3 py-1 rounded-full border border-[#3ED6D8]/20">
                                Saldo Real
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-full border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-xs text-zinc-300 font-medium truncate max-w-[150px]">{userEmail}</span>
                    </div>
                </div>

                {/* Métricas - Grid responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-[#12161F] border border-white/10 rounded-xl p-4">
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Ingresos del Mes</p>
                        <p className="text-[#3ED6D8] text-xl md:text-2xl font-black font-mono tracking-tight">
                            +${monthIncome.toLocaleString("es-CO")}
                        </p>
                    </div>
                    <div className="bg-[#12161F] border border-white/10 rounded-xl p-4">
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Egresos del Mes</p>
                        <p className="text-[#F2A08F] text-xl md:text-2xl font-black font-mono tracking-tight">
                            -${monthExpense.toLocaleString("es-CO")}
                        </p>
                    </div>
                    <div className="bg-[#12161F] border border-white/10 rounded-xl p-4">
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Balance Operativo</p>
                        <p className={`text-xl md:text-2xl font-black font-mono tracking-tight ${(monthIncome - monthExpense) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {(monthIncome - monthExpense) >= 0 ? '+' : ''}{(monthIncome - monthExpense).toLocaleString("es-CO")}
                        </p>
                    </div>
                </div>

                {/* Cuentas y Distribución - Grid responsive */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Cuentas */}
                    <div className="bg-[#12161F] border border-white/10 rounded-xl p-4">
                        <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-3">Estado de Cuentas</h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {accountsWithBalance.map((acc) => (
                                <div key={acc.id} className="group bg-black/30 border-l-2 border-l-[#3ED6D8] border border-white/5 hover:border-white/20 rounded-lg p-3 transition-all flex justify-between items-center">
                                    <div className="min-w-0">
                                        <h4 className="text-white font-bold text-base group-hover:text-[#3ED6D8] transition-colors truncate">{acc.name}</h4>
                                        <span className="text-zinc-400 text-xs font-medium">{acc.currency} • Activa</span>
                                    </div>
                                    <p className={`text-lg md:text-xl font-black font-mono tracking-tight shrink-0 ${acc.real_balance >= 0 ? "text-white" : "text-[#F2A08F]"}`}>
                                        ${acc.real_balance.toLocaleString("es-CO")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Distribución de Gastos - Gráfico Interactivo */}
                    <div className="bg-[#12161F] border border-white/10 rounded-xl p-4">
                        <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Distribución de Gastos</h3>
                        <div className="flex flex-col lg:flex-row items-center gap-6">
                            <div className="w-full lg:w-1/2">
                                <ExpenseDonutChart
                                    data={topCategories.map(cat => ({
                                        name: cat.category_name,
                                        value: cat.total
                                    }))}
                                />
                            </div>
                            <div className="w-full lg:w-1/2">
                                <ExpenseLegend
                                    data={topCategories.map(cat => ({
                                        name: cat.category_name,
                                        value: cat.total
                                    }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
