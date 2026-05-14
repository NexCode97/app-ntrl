import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../config/api.js";
import {
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const ESTADO_BADGE = {
  activo:    "bg-green-500/10 text-green-400 border border-green-500/20",
  licencia:  "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  terminado: "bg-red-500/10 text-red-400 border border-red-500/20",
};

const ESTADO_LABEL = {
  activo: "Activo", licencia: "Licencia", terminado: "Terminado",
};

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

const EMPTY_FORM = {
  nombre: "", email: "", cargo: "", salario_base: "",
  cuenta_banco: "", banco: "", tipo_identificacion: "CC",
  numero_identificacion: "", fecha_ingreso: "", estado_laboral: "activo", notas: "",
};

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // null = crear, obj = editar
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  // ── Fetch ────────────────────────────────────────────────────
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

  // ── Mutations ────────────────────────────────────────────────
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

  // ── Handlers ─────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  }

  function openEdit(emp) {
    setEditing(emp);
    setForm({
      nombre: emp.nombre,
      email: emp.email ?? "",
      cargo: emp.cargo,
      salario_base: emp.salario_base,
      cuenta_banco: emp.cuenta_banco ?? "",
      banco: emp.banco ?? "",
      tipo_identificacion: emp.tipo_identificacion,
      numero_identificacion: emp.numero_identificacion,
      fecha_ingreso: emp.fecha_ingreso?.slice(0, 10) ?? "",
      estado_laboral: emp.estado_laboral,
      notas: emp.notas ?? "",
    });
    setError("");
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditing(null); setForm(EMPTY_FORM); setError(""); }

  function handleSubmit(e) {
    e.preventDefault();
    const body = { ...form, salario_base: Number(form.salario_base) };
    if (editing) updateMut.mutate({ id: editing.id, body });
    else createMut.mutate(body);
  }

  function confirmDelete(emp) {
    if (confirm(`¿Eliminar a ${emp.nombre}? Esta acción no se puede deshacer.`))
      deleteMut.mutate(emp.id);
  }

  const employees = data ?? [];
  const isBusy = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center">
            <UserGroupIcon className="w-5 h-5 text-brand-green" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">Empleados</h1>
            <p className="text-zinc-400 text-sm">{employees.length} registrado(s)</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-green text-black font-semibold rounded-lg hover:bg-brand-green/90 transition-colors text-sm"
        >
          <PlusIcon className="w-4 h-4" />
          Nuevo empleado
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o cargo..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-brand-green"
          />
        </div>
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="licencia">Licencia</option>
          <option value="terminado">Terminado</option>
        </select>
      </div>

      {/* Tabla */}
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
                    <td className="px-4 py-3 text-zinc-300">
                      {emp.tipo_identificacion} {emp.numero_identificacion}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{emp.cargo}</td>
                    <td className="px-4 py-3 text-right text-white font-mono font-medium">
                      {fmt(emp.salario_base)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[emp.estado_laboral]}`}>
                        {ESTADO_LABEL[emp.estado_laboral]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(emp)}
                          className="p-1.5 text-zinc-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(emp)}
                          className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Eliminar"
                        >
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

      {/* Modal crear/editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold text-lg">
                {editing ? "Editar empleado" : "Nuevo empleado"}
              </h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

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
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isBusy}
                  className="px-5 py-2 bg-brand-green text-black font-semibold rounded-lg hover:bg-brand-green/90 transition-colors text-sm disabled:opacity-50">
                  {isBusy ? "Guardando..." : editing ? "Guardar cambios" : "Crear empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
