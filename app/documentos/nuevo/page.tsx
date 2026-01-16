"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { documentSchema, DocumentFormData } from "@/lib/validations";

interface Client { id: string; name: string; }
interface Project { id: string; name: string; client_id: string; }

export default function NuevoDocumentoPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<DocumentFormData>({
        resolver: zodResolver(documentSchema) as any,
        defaultValues: {
            type: 'quote',
            client_id: "",
            project_id: "",
            city: "Bogotá",
            issue_date: new Date().toISOString().split("T")[0],
            due_date: "",
            valid_until: "",
            concept_title: "",
            concept_detail: "",
            currency: "COP",
            exchange_rate: 1,
            notes: "",
            items: [{ description: "", qty: 1, unit_price: 0 }],
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    const watchType = watch("type");
    const watchClientId = watch("client_id");
    const watchCurrency = watch("currency");
    const watchExchangeRate = watch("exchange_rate");
    const watchItems = watch("items");

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            setUserId(user.id);
            await Promise.all([loadClients(), loadProjects(), loadProfile(user.id)]);
            setLoading(false);
        }
        init();
    }, [router]);

    async function loadClients() {
        const { data } = await supabase.from("clients").select("id, name").eq("is_active", true).order("name");
        setClients(data || []);
    }

    async function loadProjects() {
        const { data } = await supabase.from("projects").select("id, name, client_id").eq("is_active", true).order("name");
        setProjects(data || []);
    }

    async function loadProfile(uid: string) {
        const { data } = await supabase.from("profile_settings").select("*").eq("user_id", uid).single();
        if (data) {
            setValue("city", data.default_city || "Bogotá");
            setValue("notes", data.default_legal_note || "");
        }
    }

    const calculateTotals = () => {
        const subtotal = watchItems.reduce((sum, item) => sum + ((item.qty || 0) * (item.unit_price || 0)), 0);
        const rate = watchExchangeRate || 1;
        return {
            subtotal,
            total: subtotal,
            subtotalCop: subtotal * rate,
            totalCop: subtotal * rate
        };
    };

    const totals = calculateTotals();

    async function onSubmit(data: DocumentFormData) {
        if (!userId) return;

        try {
            // 1. Obtener número de documento usando la función RPC
            const { data: nextNumber, error: numberError } = await supabase.rpc('get_next_document_number', {
                p_type: data.type,
                p_user_id: userId
            });

            if (numberError) throw numberError;

            // 2. Insertar cabecera
            const { data: doc, error: docError } = await supabase.from("documents").insert({
                user_id: userId,
                type: data.type,
                number: nextNumber,
                client_id: data.client_id,
                project_id: data.project_id || null,
                city: data.city,
                issue_date: data.issue_date,
                due_date: (data.type === 'invoice' && data.due_date) ? data.due_date : null,
                valid_until: (data.type === 'quote' && data.valid_until) ? data.valid_until : null,
                concept_title: data.concept_title,
                concept_detail: data.concept_detail || null,
                currency: data.currency,
                exchange_rate: data.currency !== 'COP' ? data.exchange_rate : 1,
                subtotal_original: totals.subtotal,
                total_original: totals.total,
                subtotal_cop: totals.subtotalCop,
                total_cop: totals.totalCop,
                status: 'draft',
                notes: data.notes || null
            }).select().single();

            if (docError) throw docError;

            // 3. Insertar ítems
            const itemsToInsert = data.items.map(item => ({
                user_id: userId,
                document_id: doc.id,
                description: item.description,
                qty: item.qty,
                unit_price: item.unit_price,
                line_total: item.qty * item.unit_price
            }));

            const { error: itemsError } = await supabase.from("document_items").insert(itemsToInsert);
            if (itemsError) throw itemsError;

            showToast("Documento creado exitosamente", "success");
            router.push(`/documentos/${doc.id}`);
        } catch (err: any) {
            showToast("Error al guardar: " + err.message, "error");
        }
    }

    if (loading) return <div className="p-20 text-center text-white">Cargando formulario...</div>;

    const filteredProjects = projects.filter(p => !watchClientId || p.client_id === watchClientId);

    return (
        <AppLayout
            title="Nuevo Documento"
            subtitle="Generación de Cotización / Factura"
            actionButton={
                <Link href="/documentos">
                    <Button variant="secondary" size="sm">← Volver</Button>
                </Link>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-5xl mx-auto">
                {/* Bloque 1: Configuración Básica */}
                <div className="bg-[#12161F] border border-white/10 rounded-xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Tipo de Documento"
                        {...register("type")}
                        error={errors.type?.message}
                        options={[{ value: 'quote', label: 'Cotización' }, { value: 'invoice', label: 'Cuenta de Cobro' }]}
                    />
                    <Select
                        label="Cliente"
                        {...register("client_id")}
                        error={errors.client_id?.message}
                        options={[{ value: '', label: 'Selecciona un cliente' }, ...clients.map(c => ({ value: c.id, label: c.name }))]}
                    />
                    <Select
                        label="Proyecto (Opcional)"
                        {...register("project_id")}
                        error={errors.project_id?.message}
                        options={[{ value: '', label: 'Sin proyecto asociado' }, ...filteredProjects.map(p => ({ value: p.id, label: p.name }))]}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            label="Fecha Emisión"
                            type="date"
                            {...register("issue_date")}
                            error={errors.issue_date?.message}
                        />
                        {watchType === 'quote' ? (
                            <Input
                                label="Válido hasta"
                                type="date"
                                {...register("valid_until")}
                                error={errors.valid_until?.message}
                            />
                        ) : (
                            <Input
                                label="Fecha Vencimiento"
                                type="date"
                                {...register("due_date")}
                                error={errors.due_date?.message}
                            />
                        )}
                    </div>
                </div>

                {/* Bloque 2: Concepto */}
                <div className="bg-[#12161F] border border-white/10 rounded-xl p-6 shadow-xl space-y-4">
                    <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-widest border-b border-white/10 pb-2">Detalles del Documento</h2>
                    <Input
                        label="Título del Concepto"
                        {...register("concept_title")}
                        placeholder="Ej: Servicios de consultoría mes de Enero"
                        error={errors.concept_title?.message}
                    />
                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Descripción Detallada (Opcional)</label>
                        <textarea
                            {...register("concept_detail")}
                            className={`w-full bg-black/30 border rounded-lg px-3 py-2 text-white outline-none focus:ring-1 focus:ring-[#3ED6D8] min-h-[60px] text-sm ${errors.concept_detail ? 'border-rose-500' : 'border-white/10'}`}
                            placeholder="Añade más contexto si es necesario..."
                            rows={2}
                        />
                        {errors.concept_detail && <p className="text-rose-400 text-[10px] mt-1">{errors.concept_detail.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Moneda"
                            {...register("currency")}
                            error={errors.currency?.message}
                            options={[{ value: 'COP', label: 'COP (Pesos)' }, { value: 'USD', label: 'USD (Dólares)' }, { value: 'EUR', label: 'EUR (Euros)' }]}
                        />
                        {watchCurrency !== 'COP' && (
                            <Input
                                label="Tasa de Cambio (TRM)"
                                type="number"
                                step="0.01"
                                {...register("exchange_rate", { valueAsNumber: true })}
                                error={errors.exchange_rate?.message}
                            />
                        )}
                    </div>
                </div>

                {/* Bloque 3: Ítems Dinámicos */}
                <div className="bg-[#12161F] border border-white/10 rounded-xl p-6 shadow-xl space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Conceptos Cobrados</h2>
                        <Button type="button" size="sm" variant="secondary" onClick={() => append({ description: "", qty: 1, unit_price: 0 })}>
                            + Agregar Línea
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {fields.map((field, idx) => (
                            <div key={field.id} className="flex gap-3 items-start group">
                                <div className="flex-1">
                                    <Input
                                        {...register(`items.${idx}.description` as const)}
                                        placeholder="Descripción del servicio"
                                        error={errors.items?.[idx]?.description?.message}
                                    />
                                </div>
                                <div className="w-24">
                                    <Input
                                        type="number"
                                        {...register(`items.${idx}.qty` as const, { valueAsNumber: true })}
                                        placeholder="Qty"
                                        error={errors.items?.[idx]?.qty?.message}
                                    />
                                </div>
                                <div className="w-40">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...register(`items.${idx}.unit_price` as const, { valueAsNumber: true })}
                                        placeholder="Precio"
                                        error={errors.items?.[idx]?.unit_price?.message}
                                    />
                                </div>
                                <div className="w-32 text-right pt-3 font-bold text-[#3ED6D8] font-mono">
                                    ${((watchItems?.[idx]?.qty || 0) * (watchItems?.[idx]?.unit_price || 0)).toLocaleString()}
                                </div>
                                {fields.length > 1 && (
                                    <button type="button" onClick={() => remove(idx)} className="text-zinc-500 hover:text-rose-400 p-2 pt-3 transition-colors">
                                        <span className="text-xl">×</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Totales Inferiores */}
                    <div className="mt-8 pt-6 border-t border-white/10 flex flex-col items-end space-y-2">
                        <div className="flex gap-10 text-zinc-400">
                            <span>Subtotal:</span>
                            <span>{watchCurrency === 'COP' ? '' : watchCurrency + ' '}{totals.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex gap-10 text-white font-bold text-2xl items-center">
                            <span>TOTAL {watchCurrency}:</span>
                            <span className="text-[#3ED6D8] font-mono">${totals.total.toLocaleString()}</span>
                        </div>
                        {watchCurrency !== 'COP' && (
                            <div className="text-zinc-500 text-xs italic">
                                Equivalente en COP: ${totals.totalCop.toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bloque 4: Notas */}
                <div className="bg-[#12161F] border border-white/10 rounded-xl p-6 shadow-xl space-y-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Notas y Condiciones Legales</label>
                    <textarea
                        {...register("notes")}
                        className={`w-full bg-black/30 border rounded-lg px-3 py-2 text-white font-mono text-xs focus:ring-1 focus:ring-[#3ED6D8] outline-none ${errors.notes ? 'border-rose-500' : 'border-white/10'}`}
                        rows={4}
                    />
                    {errors.notes && <p className="text-rose-400 text-[10px] mt-1">{errors.notes.message}</p>}
                </div>

                <div className="flex gap-4">
                    <Button type="button" variant="secondary" className="flex-1 py-6" onClick={() => router.back()}>Cancelar</Button>
                    <Button type="submit" className="flex-[2] py-6 text-lg font-black uppercase tracking-widest" isLoading={isSubmitting}>
                        Guardar y Ver Detalle
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
