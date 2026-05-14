import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../../config/api.js";
import {
  BanknotesIcon,
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowRightIcon,
  XMarkIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

// ── Formatters ─────────────────────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v ?? 0);
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ── Constantes ─────────────────────────────────────────────────
const PERIOD_ESTADO_BADGE = {
  borrador: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
  generado: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  aprobado: "bg-brand-green/10 text-green-400 border border-brand-green/20",
  pagado:   "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
};
const PERIOD_ESTADO_LABEL = { borrador:"Borrador", generado:"Generado", aprobado:"Aprobado", pagado:"Pagado" };

const EMP_ESTADO_BADGE = {
  activo:    "bg-green-500/10 text-green-400 border border-green-500/20",
  licencia:  "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  terminado: "bg-red-500/10 text-red-400 border border-red-500/20",
};
const EMP_ESTADO_LABEL = { activo:"Activo", licencia:"Licencia", terminado:"Terminado" };

const EMPTY_EMP = {
  nombre:"", email:"", cargo:"", salario_base:"",
  cuenta_banco:"", banco:"", tipo_identificacion:"CC",
  numero_identificacion:"", fecha_ingreso:"", estado_laboral:"activo", notas:"",
};

// ══════════════════════════════════════════════════════════════
export default function PayrollPage() {
  const [tab, setTab] = useState("periodos"); // "periodos" | "empleados"

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center">
          <BanknotesIcon className="w-5 h-5 text-brand-green" />
        </div>
        <div>
          <h1 className="text-white font-bold text-xl">Nómina</h1>
          <p className="text-zinc-400 text-sm">Gestión de empleados y períodos quincenales</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setTab("periodos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "periodos"
              ? "bg-brand-green text-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <BanknotesIcon className="w-4 h-4" />
          Períodos
        </button>
        <button
          onClick={() => setTab("empleados")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "empleados"
              ? "bg-brand-green text-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <UserGroupIcon className="w-4 h-4" />
          Empleados
        </button>
      </div>

      {/* Contenido */}
      {tab === "periodos" ? <PeriodsTab /> : <EmployeesTab />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB: PERÍODOS
// ══════════════════════════════════════════════════════════════
function PeriodsTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", fecha_inicio: "", fecha_fin: "" });
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["payroll-periods"],
    queryFn: async () => { const { data } = await api.get("/payroll"); return data.data; },
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

  function closeModal() { setShowModal(false); setForm({ nombre:"", fecha_inicio:"", fecha_fin:"" }); setError(""); }

  function handleFechaChange(field, val) {
    const next = { ...form, [field]: val };
    if (next.fecha_inicio && next.fecha_fin && !form.nombre) {
      const ini = new Date(next.fecha_inicio);
      const fin = new Date(next.fecha_fin);
      next.nombre = `Quincena ${ini.toLocaleDateString("es-CO", { day:"2-digit", month:"short" })} – ${fin.toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" })}`;
    }
    setForm(next);
  }

  const periods = data ?? [];

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-green text-black font-semibold rounded-lg hover:bg-brand-green/90 transition-colors text-sm">
          <PlusIcon className="w-4 h-4" /> Nuevo período
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-brand-green animate-pulse">Cargando...</div>
      ) : periods.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <BanknotesIcon className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No hay períodos de nómina creados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((p) => (
            <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-white font-semibold truncate">{p.nombre}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PERIOD_ESTADO_BADGE[p.estado]}`}>
                      {PERIOD_ESTADO_LABEL[p.estado]}
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
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {p.estado === "borrador" && (
                    <button onClick={() => generateMut.mutate(p.id)} disabled={generateMut.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors text-xs font-medium">
                      Generar nómina <ArrowRightIcon className="w-3 h-3" />
                    </button>
                  )}
                  {p.estado === "generado" && (
                    <>
                      <button onClick={() => navigate(`/payroll/${p.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors text-xs font-medium">
                        Ver detalle <ArrowRightIcon className="w-3 h-3" />
                      </button>
                      <button onClick={() => { if (confirm("¿Aprobar esta nómina?")) approveMut.mutate(p.id); }} disabled={approveMut.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-green/10 text-green-400 border border-brand-green/20 rounded-lg hover:bg-brand-green/20 transition-colors text-xs font-medium">
                        <CheckCircleIcon className="w-3.5 h-3.5" /> Aprobar
                      </button>
                    </>
                  )}
                  {p.estado === "aprobado" && (
                    <>
                      <button onClick={() => navigate(`/payroll/${p.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors text-xs font-medium">
                        Ver detalle <ArrowRightIcon className="w-3 h-3" />
                      </button>
                      <button onClick={() => { if (confirm("¿Marcar como pagado?")) paidMut.mutate(p.id); }} disabled={paidMut.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors text-xs font-medium">
                        Marcar pagado
                      </button>
                    </>
                  )}
                  {p.estado === "pagado" && (
                    <button onClick={() => navigate(`/payroll/${p.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors text-xs font-medium">
                      Ver detalle <ArrowRightIcon className="w-3 h-3" />
                    </button>
                  )}
                  {["borrador","generado"].includes(p.estado) && (
                    <button onClick={() => { if (confirm(`¿Eliminar "${p.nombre}"?`)) deleteMut.mutate(p.id); }}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
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
              <button onClick={closeModal} className="text-zinc-400 hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="p-5 space-y-4">
              {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
              <div>
                <label className="block text-zinc-400 text-xs mb-1">Fecha inicio *</label>
                <input required type="date" value={form.fecha_inicio} onChange={(e) => handleFechaChange("fecha_inicio", e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
              </div>
              <div>
                <label className="block text-zinc-400 text-xs mb-1">Fecha fin *</label>
                <input required type="date" value={form.fecha_fin} min={form.fecha_inicio} onChange={(e) => handleFechaChange("fecha_fin", e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
              </div>
              <div>
                <label className="block text-zinc-400 text-xs mb-1">Nombre del período *</label>
                <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Quincena 1 – Mayo 2026"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-zinc-400 hover:text-white text-sm">Cancelar</button>
                <button type="submit" disabled={createMut.isPending}
                  className="px-5 py-2 bg-brand-green text-black font-semibold rounded-lg hover:bg-brand-green/90 transition-colors text-sm disabled:opacity-50">
                  {createMut.isPending ? "Creando..." : "Crear período"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB: EMPLEADOS
// ══════════════════════════════════════════════════════════════
function EmployeesTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_EMP);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["employees", q, estadoFiltro],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (estadoFiltro) params.set("estado", estadoFiltro);
      const { data } = await api.get(`/employees?${params}`);
      return data.data;
    },
  });

  const createMut = useMutation({
    mutationFn: (body) => api.post("/employees", body),
    onSuccess: () => { qc.invalidateQueries(["employees"]); closeModal(); },
    onError: (e) => setError(e.response?.data?.message ?? "Error al guardar."),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/employees/${id}`, body),
    onSuccess: () => { qc.invalidateQueries(["employees"]); closeModal(); },
    onError: (e) => setError(e.response?.data?.message ?? "Error al guardar."),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/employees/${id}`),
    onSuccess: () => qc.invalidateQueries(["employees"]),
    onError: (e) => alert(e.response?.data?.message ?? "No se pudo eliminar."),
  });

  function openCreate() { setEditing(null); setForm(EMPTY_EMP); setError(""); setShowModal(true); }

  function openEdit(emp) {
    setEditing(emp);
    setForm({
      nombre: emp.nombre, email: emp.email ?? "", cargo: emp.cargo,
      salario_base: emp.salario_base, cuenta_banco: emp.cuenta_banco ?? "",
      banco: emp.banco ?? "", tipo_identificacion: emp.tipo_identificacion,
      numero_identificacion: emp.numero_identificacion,
      fecha_ingreso: emp.fecha_ingreso?.slice(0,10) ?? "",
      estado_laboral: emp.estado_laboral, notas: emp.notas ?? "",
    });
    setError(""); setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditing(null); setForm(EMPTY_EMP); setError(""); }

  function handleSubmit(e) {
    e.preventDefault();
    const body = { ...form, salario_base: Number(form.salario_base) };
    if (editing) updateMut.mutate({ id: editing.id, body });
    else createMut.mutate(body);
  }

  const employees = data ?? [];
  const isBusy = createMut.isPending || updateMut.isPending;

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input type="text" placeholder="Buscar por nombre, cédula o cargo..." value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-brand-green" />
        </div>
        <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green">
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="licencia">Licencia</option>
          <option value="terminado">Terminado</option>
        </select>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-green text-black font-semibold rounded-lg hover:bg-brand-green/90 transition-colors text-sm whitespace-nowrap">
          <PlusIcon className="w-4 h-4" /> Nuevo empleado
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-brand-green animate-pulse">Cargando...</div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <UserGroupIcon className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No hay empleados registrados</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Identificación</th>
                  <th className="px-4 py-3 text-left">Cargo</th>
                  <th className="px-4 py-3 text-right">Salario base</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{emp.nombre}</p>
                      {emp.email && <p className="text-zinc-500 text-xs">{emp.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{emp.tipo_identificacion} {emp.numero_identificacion}</td>
                    <td className="px-4 py-3 text-zinc-300">{emp.cargo}</td>
                    <td className="px-4 py-3 text-right text-white font-mono font-medium">{fmt(emp.salario_base)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${EMP_ESTADO_BADGE[emp.estado_laboral]}`}>
                        {EMP_ESTADO_LABEL[emp.estado_laboral]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(emp)}
                          className="p-1.5 text-zinc-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition-colors">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm(`¿Eliminar a ${emp.nombre}?`)) deleteMut.mutate(emp.id); }}
                          className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal crear/editar empleado */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold text-lg">{editing ? "Editar empleado" : "Nuevo empleado"}</h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 text-xs mb-1">Nombre completo *</label>
                  <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Tipo ID</label>
                  <select value={form.tipo_identificacion} onChange={(e) => setForm({ ...form, tipo_identificacion: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green">
                    <option value="CC">Cédula (CC)</option>
                    <option value="CE">Cédula Extranjería (CE)</option>
                    <option value="PA">Pasaporte (PA)</option>
                    <option value="NIT">NIT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Número de identificación *</label>
                  <input required value={form.numero_identificacion} onChange={(e) => setForm({ ...form, numero_identificacion: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Cargo *</label>
                  <input required value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                    placeholder="Ej: Costurera, Diseñador..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Salario base (COP) *</label>
                  <input required type="number" min="0" value={form.salario_base} onChange={(e) => setForm({ ...form, salario_base: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Fecha de ingreso *</label>
                  <input required type="date" value={form.fecha_ingreso} onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Banco</label>
                  <input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })}
                    placeholder="Ej: Bancolombia, Nequi..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Número de cuenta</label>
                  <input value={form.cuenta_banco} onChange={(e) => setForm({ ...form, cuenta_banco: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Estado laboral</label>
                  <select value={form.estado_laboral} onChange={(e) => setForm({ ...form, estado_laboral: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green">
                    <option value="activo">Activo</option>
                    <option value="licencia">Licencia</option>
                    <option value="terminado">Terminado</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 text-xs mb-1">Notas</label>
                  <textarea rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-zinc-400 hover:text-white text-sm">Cancelar</button>
                <button type="submit" disabled={isBusy}
                  className="px-5 py-2 bg-brand-green text-black font-semibold rounded-lg hover:bg-brand-green/90 transition-colors text-sm disabled:opacity-50">
                  {isBusy ? "Guardando..." : editing ? "Guardar cambios" : "Crear empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
