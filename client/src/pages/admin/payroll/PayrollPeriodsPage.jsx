import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../../config/api.js";
import {
  BanknotesIcon,
  PlusIcon,
  TrashIcon,
  ArrowRightIcon,
  XMarkIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const ESTADO_BADGE = {
  borrador:  "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
  generado:  "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  aprobado:  "bg-brand-green/10 text-green-400 border border-brand-green/20",
  pagado:    "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
};

const ESTADO_LABEL = {
  borrador: "Borrador", generado: "Generado", aprobado: "Aprobado", pagado: "Pagado",
};

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v ?? 0);

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function PayrollPeriodsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", fecha_inicio: "", fecha_fin: "" });
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["payroll-periods"],
    queryFn: async () => {
      const { data } = await api.get("/payroll");
      return data.data;
    },
  });

  const createMut = useMutation({
    mutationFn: (body) => api.post("/payroll", body),
    onSuccess: () => { qc.invalidateQueries(["payroll-periods"]); closeModal(); },
    onError: (e) => setError(e.response?.data?.message ?? "Error al crear período."),
  });

  const generateMut = useMutation({
    mutationFn: (id) => api.post(`/payroll/${id}/generate`),
    onSuccess: (_, id) => { qc.invalidateQueries(["payroll-periods"]); navigate(`/payroll/${id}`); },
    onError: (e) => alert(e.response?.data?.message ?? "Error al generar nómina."),
  });

  const approveMut = useMutation({
    mutationFn: (id) => api.post(`/payroll/${id}/approve`),
    onSuccess: () => qc.invalidateQueries(["payroll-periods"]),
    onError: (e) => alert(e.response?.data?.message ?? "Error al aprobar."),
  });

  const paidMut = useMutation({
    mutationFn: (id) => api.post(`/payroll/${id}/mark-paid`),
    onSuccess: () => qc.invalidateQueries(["payroll-periods"]),
    onError: (e) => alert(e.response?.data?.message ?? "Error al marcar como pagado."),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/payroll/${id}`),
    onSuccess: () => qc.invalidateQueries(["payroll-periods"]),
    onError: (e) => alert(e.response?.data?.message ?? "No se pudo eliminar."),
  });

  function closeModal() { setShowModal(false); setForm({ nombre: "", fecha_inicio: "", fecha_fin: "" }); setError(""); }

  function handleSubmit(e) {
    e.preventDefault();
    createMut.mutate(form);
  }

  // Sugerir nombre automático al cambiar fechas
  function handleFechaChange(field, val) {
    const next = { ...form, [field]: val };
    if (next.fecha_inicio && next.fecha_fin && !form.nombre) {
      const ini = new Date(next.fecha_inicio);
      const fin = new Date(next.fecha_fin);
      next.nombre = `Quincena ${ini.toLocaleDateString("es-CO", { day: "2-digit", month: "short" })} – ${fin.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    setForm(next);
  }

  const periods = data ?? [];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center">
            <BanknotesIcon className="w-5 h-5 text-brand-green" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">Nómina</h1>
            <p className="text-zinc-400 text-sm">Períodos quincenales</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-green text-black font-semibold rounded-lg hover:bg-brand-green/90 transition-colors text-sm"
        >
          <PlusIcon className="w-4 h-4" />
          Nuevo período
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-brand-green animate-pulse">Cargando...</div>
      ) : periods.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <BanknotesIcon className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No hay períodos de nómina creados</p>
          <p className="text-xs mt-1">Crea el primero para empezar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((p) => (
            <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-white font-semibold truncate">{p.nombre}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[p.estado]}`}>
                      {ESTADO_LABEL[p.estado]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                    <span>{fmtDate(p.fecha_inicio)} → {fmtDate(p.fecha_fin)}</span>
                    <span>{p.total_empleados ?? 0} empleado(s)</span>
                    <span className="text-white font-medium">{fmt(p.total_nomina)}</span>
                    {p.created_by_nombre && <span>Creado por {p.created_by_nombre}</span>}
                    {p.approved_by_nombre && <span>· Aprobado por {p.approved_by_nombre}</span>}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {p.estado === "borrador" && (
                    <button
                      onClick={() => generateMut.mutate(p.id)}
                      disabled={generateMut.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors text-xs font-medium"
                    >
                      Generar nómina <ArrowRightIcon className="w-3 h-3" />
                    </button>
                  )}
                  {p.estado === "generado" && (
                    <>
                      <button
                        onClick={() => navigate(`/payroll/${p.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors text-xs font-medium"
                      >
                        Ver detalle <ArrowRightIcon className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => { if (confirm("¿Aprobar esta nómina?")) approveMut.mutate(p.id); }}
                        disabled={approveMut.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-green/10 text-green-400 border border-brand-green/20 rounded-lg hover:bg-brand-green/20 transition-colors text-xs font-medium"
                      >
                        <CheckCircleIcon className="w-3.5 h-3.5" /> Aprobar
                      </button>
                    </>
                  )}
                  {p.estado === "aprobado" && (
                    <>
                      <button
                        onClick={() => navigate(`/payroll/${p.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors text-xs font-medium"
                      >
                        Ver detalle <ArrowRightIcon className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => { if (confirm("¿Marcar como pagado?")) paidMut.mutate(p.id); }}
                        disabled={paidMut.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors text-xs font-medium"
                      >
                        Marcar pagado
                      </button>
                    </>
                  )}
                  {p.estado === "pagado" && (
                    <button
                      onClick={() => navigate(`/payroll/${p.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors text-xs font-medium"
                    >
                      Ver detalle <ArrowRightIcon className="w-3 h-3" />
                    </button>
                  )}
                  {["borrador", "generado"].includes(p.estado) && (
                    <button
                      onClick={() => { if (confirm(`¿Eliminar período "${p.nombre}"?`)) deleteMut.mutate(p.id); }}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nuevo período */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold text-lg">Nuevo período de nómina</h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
              )}
              <div>
                <label className="block text-zinc-400 text-xs mb-1">Fecha inicio *</label>
                <input required type="date" value={form.fecha_inicio}
                  onChange={(e) => handleFechaChange("fecha_inicio", e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
              </div>
              <div>
                <label className="block text-zinc-400 text-xs mb-1">Fecha fin *</label>
                <input required type="date" value={form.fecha_fin} min={form.fecha_inicio}
                  onChange={(e) => handleFechaChange("fecha_fin", e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
              </div>
              <div>
                <label className="block text-zinc-400 text-xs mb-1">Nombre del período *</label>
                <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Quincena 1 – Mayo 2026"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={createMut.isPending}
                  className="px-5 py-2 bg-brand-green text-black font-semibold rounded-lg hover:bg-brand-green/90 transition-colors text-sm disabled:opacity-50">
                  {createMut.isPending ? "Creando..." : "Crear período"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
