"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Modal } from "@/components/ui/Modal";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { projectSchema, ProjectFormData } from "@/lib/validations";

interface Client { id: string; name: string; }
interface Project {
    id: string; client_id: string; name: string;
    status: 'draft' | 'active' | 'paused' | 'completed' | 'canceled';
    total_value_original: number; currency: 'COP' | 'USD' | 'EUR';
    exchange_rate: number | null; total_value_cop: number; notes: string | null;
    is_active: boolean; created_at: string; clients: { name: string };
}

const statusMap = {
    draft: { label: 'Borrador', color: 'bg-zinc-600' },
    active: { label: 'Activo', color: 'bg-blue-600' },
    paused: { label: 'Pausado', color: 'bg-amber-600' },
    completed: { label: 'Completado', color: 'bg-emerald-600' },
    canceled: { label: 'Cancelado', color: 'bg-rose-600' }
};

function ProyectosContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const clientIdParam = searchParams.get("client_id");

    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [filterClient, setFilterClient] = useState(clientIdParam || "");
    const [filterStatus, setFilterStatus] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<ProjectFormData>({
        resolver: zodResolver(projectSchema) as any,
        defaultValues: {
            name: "",
            client_id: clientIdParam || "",
            status: "active",
            total_value_original: 0,
            currency: "COP",
            exchange_rate: null,
            notes: "",
        }
    });

    const watchCurrency = watch("currency");
    const watchValueOriginal = watch("total_value_original");
    const watchExchangeRate = watch("exchange_rate");

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }
            await Promise.all([loadProjects(), loadClients()]);
            setLoading(false);
        }
        init();
    }, [router]);

    async function loadProjects() {
        const { data } = await supabase.from("projects").select("*, clients(name)").order("created_at", { ascending: false });
        setProjects(data || []);
    }

    async function loadClients() {
        const { data } = await supabase.from("clients").select("id, name").order("name");
        setClients(data || []);
    }

    function openCreateModal() {
        setEditingProject(null);
        reset({
            name: "",
            client_id: clientIdParam || "",
            status: "active",
            total_value_original: 0,
            currency: "COP",
            exchange_rate: null,
            notes: "",
        });
        setShowModal(true);
    }

    function openEditModal(p: Project) {
        setEditingProject(p);
        reset({
            name: p.name,
            client_id: p.client_id,
            status: p.status,
            total_value_original: p.total_value_original,
            currency: p.currency,
            exchange_rate: p.exchange_rate,
            notes: p.notes || "",
        });
        setShowModal(true);
    }

    async function onSubmit(data: ProjectFormData) {
        const valueOriginal = data.total_value_original;
        let rate = data.currency === 'COP' ? null : data.exchange_rate;

        if (data.currency !== 'COP' && (!rate || rate <= 0)) {
            // This should be caught by Zod but double checking
            return;
        }

        const valueCop = data.currency === 'COP' ? valueOriginal : valueOriginal * (rate || 0);

        const projectData = {
            name: data.name.trim(),
            client_id: data.client_id,
            status: data.status,
            total_value_original: valueOriginal,
            currency: data.currency,
            exchange_rate: rate,
            total_value_cop: valueCop,
            notes: data.notes?.trim() || null
        };

        const result = editingProject
            ? await supabase.from("projects").update(projectData).eq("id", editingProject.id)
            : await supabase.from("projects").insert(projectData);

        if (result.error) {
            alert(result.error.message);
        } else {
            setShowModal(false);
            reset();
            await loadProjects();
        }
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`¿Eliminar el proyecto "${name}"?`)) return;
        const { error } = await supabase.from("projects").delete().eq("id", id);
        if (error) alert(error.message); else await loadProjects();
    }

    const filteredProjects = projects.filter(p => {
        const matchClient = filterClient ? p.client_id === filterClient : true;
        const matchStatus = filterStatus ? p.status === filterStatus : true;
        return matchClient && matchStatus;
    });

    if (loading) return <div className="min-h-screen bg-[#07090D] p-4 md:p-6"><SkeletonList items={3} /></div>;

    return (
        <AppLayout title="Gestión de Proyectos" subtitle="Presupuestos y Entregas"
            actionButton={<button onClick={openCreateModal} className="px-5 py-2 bg-[#3ED6D8] hover:bg-[#4FF0F2] text-[#07090D] font-bold text-xs rounded-lg transition-all flex items-center gap-2 uppercase tracking-wider"><span className="text-base">+</span> Nuevo Proyecto</button>}
        >
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="bg-[#12161F] border border-white/10 text-white px-4 py-3 rounded-xl outline-none text-sm">
                    <option value="">Todos los clientes</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-[#12161F] border border-white/10 text-white px-4 py-3 rounded-xl outline-none text-sm">
                    <option value="">Todos los estados</option>
                    {Object.entries(statusMap).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
                </select>
            </div>

            {/* Projects Table */}
            <div className="bg-[#12161F] border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-black/20 text-zinc-400 text-xs font-bold uppercase tracking-wider border-b border-white/10">
                            <th className="px-5 py-4">Proyecto / Cliente</th>
                            <th className="px-5 py-4 text-center">Estado</th>
                            <th className="px-5 py-4 text-right">Valor Original</th>
                            <th className="px-5 py-4 text-right">Valor en COP</th>
                            <th className="px-5 py-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredProjects.map((p) => (
                            <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-5 py-4">
                                    <p className="font-semibold text-white">{p.name}</p>
                                    <p className="text-zinc-500 text-sm">{p.clients?.name}</p>
                                </td>
                                <td className="px-5 py-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusMap[p.status].color} text-white`}>{statusMap[p.status].label}</span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <p className="font-mono text-zinc-200">{p.total_value_original.toLocaleString()} {p.currency}</p>
                                    {p.currency !== 'COP' && <p className="text-[10px] text-zinc-500">TRM: {p.exchange_rate}</p>}
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <p className="font-bold text-emerald-400 font-mono">${p.total_value_cop.toLocaleString('es-CO')}</p>
                                </td>
                                <td className="px-5 py-4 text-center">
                                    <div className="flex justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditModal(p)} className="text-zinc-400 hover:text-[#3ED6D8] px-2 py-1 text-xs">Editar</button>
                                        <button onClick={() => handleDelete(p.id, p.name)} className="text-zinc-400 hover:text-rose-400 px-2 py-1 text-xs">Eliminar</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredProjects.length === 0 && <div className="p-16 text-center text-zinc-500 border-t border-white/10">No se encontraron proyectos.</div>}
            </div>

            {/* Modal */}
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset(); }} title={editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input label="Nombre del Proyecto" {...register("name")} placeholder="Ej: Rediseño Web" error={errors.name?.message} />
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Cliente" {...register("client_id")} error={errors.client_id?.message} options={[{ value: '', label: 'Seleccione...' }, ...clients.map(c => ({ value: c.id, label: c.name }))]} />
                        <Select label="Estado" {...register("status")} error={errors.status?.message} options={Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v.label }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Moneda"
                            {...register("currency")}
                            error={errors.currency?.message}
                            onChange={(e) => {
                                setValue("currency", e.target.value as any);
                                if (e.target.value === 'COP') setValue("exchange_rate", null);
                            }}
                            options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]}
                        />
                        <Input
                            label={`Valor en ${watchCurrency}`}
                            type="number"
                            step="0.01"
                            {...register("total_value_original", { valueAsNumber: true })}
                            placeholder="0.00"
                            error={errors.total_value_original?.message}
                        />
                    </div>
                    {watchCurrency !== 'COP' && (
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label={`TRM (${watchCurrency} → COP)`}
                                type="number"
                                step="0.01"
                                {...register("exchange_rate", { valueAsNumber: true })}
                                placeholder="4000"
                                error={errors.exchange_rate?.message}
                            />
                            <div className="flex flex-col justify-center bg-black/30 rounded-lg px-4 py-2 border border-white/10">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold">Total Calculado</p>
                                <p className="text-emerald-400 font-bold font-mono">${((watchValueOriginal || 0) * (watchExchangeRate || 0)).toLocaleString('es-CO')} COP</p>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Notas / Alcance</label>
                        <textarea
                            {...register("notes")}
                            className={`w-full bg-black/30 border rounded-lg px-3 py-2 text-white outline-none focus:ring-1 focus:ring-[#3ED6D8] min-h-[80px] text-sm ${errors.notes ? 'border-rose-500' : 'border-white/10'}`}
                            placeholder="Describa el alcance..."
                        />
                        {errors.notes && <p className="text-rose-400 text-[10px] mt-1">{errors.notes.message}</p>}
                    </div>
                    <div className="pt-2 flex gap-3">
                        <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowModal(false); reset(); }}>Cancelar</Button>
                        <Button type="submit" className="flex-1" isLoading={isSubmitting}>{editingProject ? 'Actualizar' : 'Crear Proyecto'}</Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}

export default function ProyectosPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-[#07090D] flex items-center justify-center text-[#3ED6D8]">Cargando...</div>}>
            <ProyectosContent />
        </Suspense>
    );
}
