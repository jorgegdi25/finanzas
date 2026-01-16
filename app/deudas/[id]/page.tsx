"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
}

interface Payment {
    id: string;
    date: string;
    amount_cop: number;
    kind: string;
    note: string | null;
}

export default function DeudaDetallePage() {
    const router = useRouter();
    const params = useParams();
    const debtId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [debt, setDebt] = useState<Debt | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);

    // Create payment form
    const [showForm, setShowForm] = useState(false);
    const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
    const [formAmount, setFormAmount] = useState("");
    const [formKind, setFormKind] = useState("minimum");
    const [formNote, setFormNote] = useState("");
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    // Edit payment modal
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [editDate, setEditDate] = useState("");
    const [editAmount, setEditAmount] = useState("");
    const [editKind, setEditKind] = useState("minimum");
    const [editNote, setEditNote] = useState("");
    const [editError, setEditError] = useState("");
    const [editLoading, setEditLoading] = useState(false);

    // Edit Debt basic info
    const [showEditDebt, setShowEditDebt] = useState(false);
    const [editDebtName, setEditDebtName] = useState("");
    const [editDebtBalance, setEditDebtBalance] = useState("");
    const [editDebtRateValue, setEditDebtRateValue] = useState("");
    const [editDebtRateType, setEditDebtRateType] = useState("EA");
    const [editDebtMinPayment, setEditDebtMinPayment] = useState("");
    const [editDebtTotalInstallments, setEditDebtTotalInstallments] = useState("");
    const [editDebtDueDay, setEditDebtDueDay] = useState("");
    const [editDebtLoading, setEditDebtLoading] = useState(false);
    const [editDebtError, setEditDebtError] = useState("");


    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }
            await loadData();
            setLoading(false);
        }
        init();
    }, [router, debtId]);

    async function loadData() {
        // Get debt info
        const { data: debtData } = await supabase
            .from("debts")
            .select("*")
            .eq("id", debtId)
            .single();

        if (!debtData) {
            router.push("/deudas");
            return;
        }

        setDebt(debtData);

        // Get last 30 payments
        const { data: paymentsData } = await supabase
            .from("debt_payments")
            .select("*")
            .eq("debt_id", debtId)
            .order("date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(30);

        setPayments(paymentsData as Payment[] || []);
    }

    async function handleCreatePayment(e: React.FormEvent) {
        e.preventDefault();
        if (!debt) return;
        setFormError("");
        setFormLoading(true);

        // Validations
        if (!formDate) {
            setFormError("Fecha obligatoria");
            setFormLoading(false);
            return;
        }

        const amount = parseFloat(formAmount);
        if (isNaN(amount) || amount <= 0) {
            setFormError("Monto debe ser mayor a 0");
            setFormLoading(false);
            return;
        }

        if (amount > debt.balance_cop) {
            setFormError("El monto excede el saldo de la deuda");
            setFormLoading(false);
            return;
        }

        // Insert payment
        const { error: paymentError } = await supabase.from("debt_payments").insert({
            debt_id: debtId,
            date: formDate,
            amount_cop: amount,
            kind: formKind,
            note: formNote || null,
        });

        if (paymentError) {
            setFormError(paymentError.message);
            setFormLoading(false);
            return;
        }

        // Update debt balance
        const currentBalance = parseFloat(String(debt.balance_cop)) || 0;
        const newBalance = currentBalance - amount;
        let updateData: any = { balance_cop: newBalance };

        // If minimum payment and has installments, increment paid_installments
        if (formKind === "minimum" && debt.total_installments && debt.paid_installments !== null) {
            updateData.paid_installments = (parseInt(String(debt.paid_installments)) || 0) + 1;
        }

        // If balance is 0, close the debt
        if (newBalance <= 0) {
            updateData.status = "closed";
            updateData.balance_cop = 0;
        }

        const { error: updateError } = await supabase
            .from("debts")
            .update(updateData)
            .eq("id", debtId);

        setFormLoading(false);

        if (updateError) {
            setFormError(updateError.message);
        } else {
            setFormAmount("");
            setFormNote("");
            setShowForm(false);
            await loadData();
        }
    }

    async function handleDeletePayment(payment: Payment) {
        if (!debt) return;

        const confirmed = confirm(`¿Eliminar este pago de ${payment.amount_cop.toLocaleString("es-CO")} COP? Esto revertirá el saldo.`);
        if (!confirmed) return;

        console.log("Attempting to delete payment:", payment.id);

        // Delete payment
        const { data, error: deleteError } = await supabase
            .from("debt_payments")
            .delete()
            .eq("id", payment.id)
            .select();

        console.log("Delete result:", { data, deleteError });

        if (deleteError) {
            console.error("Error deleting payment:", deleteError);
            alert(`Error al eliminar: ${deleteError.message}`);
            return;
        }

        console.log("Payment deleted successfully, updating debt balance...");

        // Revert debt balance
        const currentBalance = parseFloat(String(debt.balance_cop)) || 0;
        const paymentAmount = parseFloat(String(payment.amount_cop)) || 0;
        const newBalance = currentBalance + paymentAmount;
        let updateData: any = { balance_cop: newBalance, status: "active" };

        // If was minimum payment and has installments, decrement paid_installments
        const currentPaid = parseInt(String(debt.paid_installments)) || 0;
        if (payment.kind === "minimum" && debt.total_installments && currentPaid > 0) {
            updateData.paid_installments = currentPaid - 1;
        }

        console.log("Updating debt with:", updateData);

        const { error: updateError } = await supabase
            .from("debts")
            .update(updateData)
            .eq("id", debtId);

        if (updateError) {
            console.error("Error updating debt:", updateError);
            alert(`Error al actualizar saldo: ${updateError.message}`);
        } else {
            console.log("Debt updated successfully, reloading data...");
            await loadData();
        }
    }

    // Open edit modal
    function openEditModal(payment: Payment) {
        setEditingPayment(payment);
        setEditDate(payment.date);
        setEditAmount(String(payment.amount_cop));
        setEditKind(payment.kind);
        setEditNote(payment.note || "");
        setEditError("");
    }

    // Close edit modal
    function closeEditModal() {
        setEditingPayment(null);
        setEditError("");
    }

    // Update payment
    async function handleUpdatePayment(e: React.FormEvent) {
        e.preventDefault();
        if (!debt || !editingPayment) return;
        setEditError("");
        setEditLoading(true);

        // Validations
        if (!editDate) {
            setEditError("Fecha obligatoria");
            setEditLoading(false);
            return;
        }

        const newAmount = parseFloat(editAmount);
        if (isNaN(newAmount) || newAmount <= 0) {
            setEditError("Monto debe ser mayor a 0");
            setEditLoading(false);
            return;
        }

        const oldAmount = parseFloat(String(editingPayment.amount_cop)) || 0;
        const oldKind = editingPayment.kind;

        // Calculate balance adjustment: revert old payment, apply new payment
        const currentDebtBalance = parseFloat(String(debt.balance_cop)) || 0;
        const balanceAdjustment = oldAmount - newAmount;
        const newBalance = currentDebtBalance + balanceAdjustment;

        if (newBalance < 0) {
            setEditError("El nuevo monto excede el saldo disponible");
            setEditLoading(false);
            return;
        }

        // Update payment
        const { error: updatePaymentError } = await supabase
            .from("debt_payments")
            .update({
                date: editDate,
                amount_cop: newAmount,
                kind: editKind,
                note: editNote || null,
            })
            .eq("id", editingPayment.id);

        if (updatePaymentError) {
            setEditError(updatePaymentError.message);
            setEditLoading(false);
            return;
        }

        // Update debt balance and installments
        let updateData: any = { balance_cop: newBalance };

        // Adjust installments if kind changed
        if (debt.total_installments && debt.paid_installments !== null) {
            let newPaidInstallments = parseInt(String(debt.paid_installments)) || 0;

            // If changed from minimum to extra
            if (oldKind === "minimum" && editKind === "extra" && newPaidInstallments > 0) {
                newPaidInstallments -= 1;
            }
            // If changed from extra to minimum
            else if (oldKind === "extra" && editKind === "minimum") {
                newPaidInstallments += 1;
            }

            updateData.paid_installments = newPaidInstallments;
        }

        // Update status
        if (newBalance <= 0) {
            updateData.status = "closed";
            updateData.balance_cop = 0;
        } else {
            updateData.status = "active";
        }

        const { error: updateDebtError } = await supabase
            .from("debts")
            .update(updateData)
            .eq("id", debtId);

        setEditLoading(false);

        if (updateDebtError) {
            setEditError(updateDebtError.message);
        } else {
            closeEditModal();
            await loadData();
        }
    }

    // Debt Entity Actions
    function openEditDebtModal() {
        if (!debt) return;
        setEditDebtName(debt.name);
        setEditDebtBalance(String(debt.balance_cop));
        setEditDebtRateValue(String(debt.interest_rate_value * 100));
        setEditDebtRateType(debt.interest_rate_type);
        setEditDebtMinPayment(String(debt.minimum_payment_cop));
        setEditDebtTotalInstallments(debt.total_installments ? String(debt.total_installments) : "");
        setEditDebtDueDay(debt.due_day ? String(debt.due_day) : "");
        setShowEditDebt(true);
        setEditDebtError("");
    }

    async function handleUpdateDebt(e: React.FormEvent) {
        e.preventDefault();
        if (!debt) return;
        setEditDebtError("");
        setEditDebtLoading(true);

        const rateValue = parseFloat(editDebtRateValue) / 100;
        const balance = parseFloat(editDebtBalance);
        const minPayment = parseFloat(editDebtMinPayment);

        if (isNaN(rateValue) || isNaN(balance) || isNaN(minPayment)) {
            setEditDebtError("Por favor verifica los valores numéricos");
            setEditDebtLoading(false);
            return;
        }

        const { error: updateError } = await supabase
            .from("debts")
            .update({
                name: editDebtName,
                balance_cop: balance,
                interest_rate_value: rateValue,
                interest_rate_type: editDebtRateType,
                minimum_payment_cop: minPayment,
                total_installments: editDebtTotalInstallments ? parseInt(editDebtTotalInstallments) : null,
                due_day: editDebtDueDay ? parseInt(editDebtDueDay) : null,
            })
            .eq("id", debtId);

        setEditDebtLoading(false);

        if (updateError) {
            setEditDebtError(updateError.message);
        } else {
            setShowEditDebt(false);
            await loadData();
        }
    }

    async function handleDeleteDebt() {
        if (!debt) return;
        const confirmed = confirm(`¿Estás seguro de eliminar la deuda "${debt.name}"? Se borrarán también todos sus pagos asociados. Esta acción no se puede deshacer.`);
        if (!confirmed) return;

        const { error } = await supabase
            .from("debts")
            .delete()
            .eq("id", debtId);

        if (error) {
            alert(`Error al eliminar: ${error.message}`);
        } else {
            router.push("/deudas");
        }
    }


    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-900">
                <p className="text-white text-xl">Cargando...</p>
            </div>
        );
    }

    if (!debt) {
        return null;
    }

    return (
        <div className="min-h-screen bg-zinc-900 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <Link href="/deudas" className="text-zinc-400 text-sm hover:text-white">
                            ← Volver a Deudas
                        </Link>
                        <h1 className="text-2xl font-bold text-white">{debt.name}</h1>
                        <p className="text-zinc-400 text-sm">
                            Tasa: {(debt.interest_rate_value * 100).toFixed(2)}% {debt.interest_rate_type} •
                            Pago mínimo: ${debt.minimum_payment_cop.toLocaleString("es-CO")}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={openEditDebtModal}
                            className="px-3 py-1 bg-zinc-700 text-white text-sm rounded hover:bg-zinc-600"
                        >
                            Editar Deuda
                        </button>
                        <button
                            onClick={handleDeleteDebt}
                            className="px-3 py-1 bg-red-900/50 text-red-400 text-sm rounded hover:bg-red-900 border border-red-900/50"
                        >
                            Eliminar Deuda
                        </button>
                    </div>

                </div>

                {/* Saldo */}
                <div className="bg-zinc-800 rounded-lg p-4 mb-6">
                    <p className="text-zinc-400 text-sm">Saldo Actual</p>
                    <p className="text-3xl font-bold text-red-400">
                        ${debt.balance_cop.toLocaleString("es-CO")} COP
                    </p>
                    {debt.total_installments && debt.paid_installments !== null && (
                        <p className="text-zinc-400 text-sm mt-2">
                            Cuotas pagadas: {debt.paid_installments} de {debt.total_installments}
                        </p>
                    )}
                </div>

                {/* Botón Agregar Pago */}
                <div className="mb-6">
                    {!showForm ? (
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            + Registrar Pago
                        </button>
                    ) : (
                        <div className="bg-zinc-800 rounded-lg p-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Registrar Pago</h2>
                            <form onSubmit={handleCreatePayment} className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Fecha *</label>
                                        <input
                                            type="date"
                                            value={formDate}
                                            onChange={(e) => setFormDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Monto (COP) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formAmount}
                                            onChange={(e) => setFormAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Tipo</label>
                                        <select
                                            value={formKind}
                                            onChange={(e) => setFormKind(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                        >
                                            <option value="minimum">Pago mínimo</option>
                                            <option value="extra">Pago extra</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-zinc-400 mb-1">Nota (opcional)</label>
                                    <input
                                        type="text"
                                        value={formNote}
                                        onChange={(e) => setFormNote(e.target.value)}
                                        placeholder="Descripción del pago"
                                        className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                    />
                                </div>

                                {formError && <p className="text-red-400 text-sm">{formError}</p>}

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="flex-1 py-2 bg-zinc-600 text-white rounded hover:bg-zinc-500"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formLoading}
                                        className="flex-1 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {formLoading ? "Guardando..." : "Guardar"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* Lista de Pagos */}
                <div className="bg-zinc-800 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-white mb-4">Historial de Pagos</h2>

                    {payments.length === 0 ? (
                        <p className="text-zinc-400">No hay pagos registrados.</p>
                    ) : (
                        <div className="space-y-2">
                            {payments.map((payment) => (
                                <div
                                    key={payment.id}
                                    className="flex justify-between items-center p-3 bg-zinc-700 rounded"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-0.5 rounded ${payment.kind === "minimum" ? "bg-blue-600" : "bg-green-600"
                                                } text-white`}>
                                                {payment.kind === "minimum" ? "Pago mínimo" : "Pago extra"}
                                            </span>
                                            <span className="text-zinc-400 text-sm">{payment.date}</span>
                                        </div>
                                        {payment.note && <p className="text-zinc-400 text-sm mt-1">{payment.note}</p>}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="font-semibold text-green-400">
                                            -${payment.amount_cop.toLocaleString("es-CO")} COP
                                        </p>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openEditModal(payment)}
                                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDeletePayment(payment)}
                                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* Edit Payment Modal */}
                {editingPayment && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                        <div className="bg-zinc-800 rounded-lg p-6 w-full max-w-md">
                            <h2 className="text-xl font-bold text-white mb-4">Editar Pago</h2>
                            <form onSubmit={handleUpdatePayment} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-zinc-400 mb-1">Fecha *</label>
                                    <input
                                        type="date"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-400 mb-1">Monto (COP) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editAmount}
                                        onChange={(e) => setEditAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-400 mb-1">Tipo</label>
                                    <select
                                        value={editKind}
                                        onChange={(e) => setEditKind(e.target.value)}
                                        className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                    >
                                        <option value="minimum">Pago mínimo</option>
                                        <option value="extra">Pago extra</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-400 mb-1">Nota (opcional)</label>
                                    <input
                                        type="text"
                                        value={editNote}
                                        onChange={(e) => setEditNote(e.target.value)}
                                        placeholder="Descripción del pago"
                                        className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                    />
                                </div>

                                {editError && <p className="text-red-400 text-sm">{editError}</p>}

                                <div className="flex gap-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={closeEditModal}
                                        className="flex-1 py-2 bg-zinc-600 text-white rounded hover:bg-zinc-500"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={editLoading}
                                        className="flex-1 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {editLoading ? "Guardando..." : "Guardar Cambios"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Debt Entity Modal */}
                {showEditDebt && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                        <div className="bg-zinc-800 rounded-lg p-6 w-full max-w-md overflow-y-auto max-h-[90vh]">
                            <h2 className="text-xl font-bold text-white mb-4">Editar Datos de la Deuda</h2>
                            <form onSubmit={handleUpdateDebt} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-zinc-400 mb-1">Nombre de la deuda *</label>
                                    <input
                                        type="text"
                                        value={editDebtName}
                                        onChange={(e) => setEditDebtName(e.target.value)}
                                        className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Saldo Actual (COP) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editDebtBalance}
                                            onChange={(e) => setEditDebtBalance(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Pago Mínimo (COP) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editDebtMinPayment}
                                            onChange={(e) => setEditDebtMinPayment(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Tasa % *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editDebtRateValue}
                                            onChange={(e) => setEditDebtRateValue(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Tipo Tasa</label>
                                        <select
                                            value={editDebtRateType}
                                            onChange={(e) => setEditDebtRateType(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                        >
                                            <option value="EA">E.A. (Anual)</option>
                                            <option value="EM">E.M. (Mensual)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Cuotas Totales (opc)</label>
                                        <input
                                            type="number"
                                            value={editDebtTotalInstallments}
                                            onChange={(e) => setEditDebtTotalInstallments(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Día Pago (1-31)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={editDebtDueDay}
                                            onChange={(e) => setEditDebtDueDay(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-700 text-white rounded"
                                        />
                                    </div>
                                </div>

                                {editDebtError && <p className="text-red-400 text-sm">{editDebtError}</p>}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditDebt(false)}
                                        className="flex-1 py-2 bg-zinc-600 text-white rounded hover:bg-zinc-500"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={editDebtLoading}
                                        className="flex-1 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {editDebtLoading ? "Guardando..." : "Guardar Cambios"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
