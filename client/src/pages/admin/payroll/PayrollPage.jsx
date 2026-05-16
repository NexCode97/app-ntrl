import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../../config/api.js";
import {
  BanknotesIcon, UserGroupIcon, PlusIcon, PencilIcon,
  TrashIcon, XMarkIcon, ChevronRightIcon,
} from "@heroicons/react/24/outline";
import TabBar from "../../../components/ui/TabBar.jsx";

// ── Helpers ───────────────────────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v ?? 0);

const MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function genNombre(q, mes, anio) {
  if (!q || !mes || !anio) return "";
  return `${q === 1 ? "Primera" : "Segunda"} Quincena ${MESES[mes]} ${anio}`;
}

function fechasQuincena(q, mes, anio) {
  if (!q || !mes || !anio) return { inicio: "", fin: "" };
  const m = String(mes).padStart(2, "0");
  const inicio = q === 1 ? `${anio}-${m}-01` : `${anio}-${m}-16`;
  const lastDay = new Date(anio, mes, 0).getDate();
  const fin = q === 1 ? `${anio}-${m}-15` : `${anio}-${m}-${lastDay}`;
  return { inicio, fin };
}

// ── Badges ────────────────────────────────────────────────────
const PERIOD_BADGE = {
  borrador: "bg-zinc-700/40 text-zinc-400 border border-zinc-600/30",
  aprobado: "bg-brand-green/10 text-green-400 border border-brand-green/20",
  pagado:   "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30",
};
const PERIOD_LABEL = { borrador:"Borrador", aprobado:"Aprobado", pagado:"Pagado" };

const EMP_BADGE = {
  activo:    "bg-green-500/10 text-green-400 border border-green-500/20",
  licencia:  "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  terminado: "bg-red-500/10 text-red-400 border border-red-500/20",
};
const CONTRATO_BADGE = {
  laboral:               "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  prestacion_servicios:  "bg-purple-500/10 text-purple-400 border border-purple-500/20",
};
const CONTRATO_LABEL = {
  laboral: "Laboral",
  prestacion_servicios: "Prest. Servicios",
};

// ══════════════════════════════════════════════════════════════
export default function PayrollPage() {
  const [tab, setTab] = useState("periodos");
  return (
    <div className="space-y-5">
      {/* Mobile select */}
      <div className="md:hidden">
        <select className="input-field w-full" value={tab} onChange={(e) => setTab(e.target.value)}>
          <option value="periodos">Períodos</option>
          <option value="empleados">Empleados</option>
        </select>
      </div>

      {/* Desktop tabs */}
      <TabBar
        tabs={[
          { value: "periodos",  label: "Períodos",  Icon: BanknotesIcon },
          { value: "empleados", label: "Empleados", Icon: UserGroupIcon },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "periodos" ? <PeriodsTab /> : <EmployeesTab />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB PERÍODOS
// ══════════════════════════════════════════════════════════════
function PeriodsTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ quincena: 1, mes: new Date().getMonth() + 1, anio: 2026 });
  const [error, setError]         = useState("");

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ["payroll-periods"],
    queryFn:  () => api.get("/payroll").then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: (body) => api.post("/payroll", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-periods"] });
      setShowModal(false);
    },
    onError: (e) => setError(e.response?.data?.message ?? "Error al crear período."),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/payroll/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payroll-periods"] }),
    onError: (e) => alert(e.response?.data?.message ?? "No se puede eliminar."),
  });

  function handleCreate(e) {
    e.preventDefault();
    setError("");
    const { quincena, mes, anio } = form;
    const { inicio, fin } = fechasQuincena(Number(quincena), Number(mes), Number(anio));
    const nombre = genNombre(Number(quincena), Number(mes), Number(anio));
    createMut.mutate({
      nombre, quincena: Number(quincena),
      mes: Number(mes), anio: Number(anio),
      fecha_inicio: inicio, fecha_fin: fin,
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-zinc-400 text-sm">{periods.length} período{periods.length !== 1 ? "s" : ""} registrado{periods.length !== 1 ? "s" : ""}</p>
        <button onClick={() => { setShowModal(true); setError(""); }} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Nuevo período
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="py-12 text-center text-zinc-500 text-sm">Cargando...</div>
      ) : periods.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-14 text-center">
          <BanknotesIcon className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-500 text-sm">No hay períodos de nómina creados</p>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
            Crear primer período
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {periods.map((p) => {
            const badge = PERIOD_BADGE[p.estado] ?? PERIOD_BADGE.borrador;
            const label = PERIOD_LABEL[p.estado] ?? p.estado;
            const total = Number(p.total_calculado ?? p.total_nomina ?? 0);
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/payroll/${p.id}`)}
                className="card cursor-pointer hover:border-zinc-600 border border-zinc-800 transition-colors flex items-center gap-4"
              >
                {/* Quincena pill */}
                <div className="hidden sm:flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-zinc-800 shrink-0">
                  <span className="text-brand-green font-black text-lg leading-none">{p.quincena}ª</span>
                  <span className="text-zinc-500 text-[10px] leading-none mt-0.5">Qna</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold text-sm truncate">{p.nombre}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge}`}>{label}</span>
                  </div>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {p.total_empleados ?? 0} empleados
                    {p.paid_at ? ` · Pagado ${new Date(p.paid_at).toLocaleDateString("es-CO")}` : ""}
                  </p>
                </div>

                {/* Total */}
                <div className="text-right shrink-0">
                  <p className="text-brand-green font-bold font-mono text-sm">{fmt(total)}</p>
                  <p className="text-zinc-600 text-xs">neto total</p>
                </div>

                {/* Flecha + eliminar */}
                <div className="flex items-center gap-2 shrink-0">
                  {p.estado === "borrador" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("¿Eliminar este período?")) deleteMut.mutate(p.id);
                      }}
                      className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronRightIcon className="w-4 h-4 text-zinc-600" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nuevo período */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold text-base">Nuevo período de nómina</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {error && (
                <p className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</p>
              )}

              {/* Preview del nombre */}
              {form.quincena && form.mes && form.anio && (
                <div className="px-3 py-2 bg-brand-green/5 border border-brand-green/20 rounded-lg">
                  <p className="text-brand-green text-sm font-medium">
                    {genNombre(Number(form.quincena), Number(form.mes), Number(form.anio))}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Quincena *</label>
                  <select required value={form.quincena} onChange={(e) => setForm({ ...form, quincena: e.target.value })}
                    className="input-field w-full">
                    <option value={1}>1ª</option>
                    <option value={2}>2ª</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Mes *</label>
                  <select required value={form.mes} onChange={(e) => setForm({ ...form, mes: e.target.value })}
                    className="input-field w-full">
                    {MESES.slice(1).map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Año *</label>
                  <select required value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })}
                    className="input-field w-full">
                    {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <p className="text-zinc-500 text-xs">
                Se generará automáticamente una fila por cada empleado activo.
              </p>

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary px-4">Cancelar</button>
                <button type="submit" disabled={createMut.isPending} className="btn-primary px-5">
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

// ══════════════════════════════════════════════════════════════
// TAB EMPLEADOS
// ══════════════════════════════════════════════════════════════
const EMPTY_EMP = {
  nombre: "", email: "", cargo: "", salario_base: "",
  tipo_contrato: "prestacion_servicios",
  banco: "", tipo_cuenta: "nequi", numero_cuenta: "",
  anticipo_prest_fijo: "0",
  tipo_identificacion: "CC", numero_identificacion: "",
  fecha_ingreso: "", estado_laboral: "activo", notas: "",
};

function EmployeesTab() {
  const qc = useQueryClient();
  const [modal, setModal]   = useState(null); // null | { mode: "create"|"edit", data?: {} }
  const [form, setForm]     = useState(EMPTY_EMP);
  const [error, setError]   = useState("");
  const [search, setSearch] = useState("");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn:  () => api.get("/employees").then((r) => r.data.data),
  });

  const saveMut = useMutation({
    mutationFn: (body) =>
      modal?.data?.id
        ? api.patch(`/employees/${modal.data.id}`, body)
        : api.post("/employees", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      closeModal();
    },
    onError: (e) => setError(e.response?.data?.message ?? "Error al guardar."),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
    onError: (e) => alert(e.response?.data?.message ?? "No se puede eliminar."),
  });

  function openCreate() {
    setModal({ mode: "create" });
    setForm(EMPTY_EMP);
    setError("");
  }
  function openEdit(emp) {
    setModal({ mode: "edit", data: emp });
    setForm({
      nombre: emp.nombre ?? "",
      email: emp.email ?? "",
      cargo: emp.cargo ?? "",
      salario_base: emp.salario_base ?? "",
      tipo_contrato: emp.tipo_contrato ?? "prestacion_servicios",
      banco: emp.banco ?? "",
      tipo_cuenta: emp.tipo_cuenta ?? "nequi",
      numero_cuenta: emp.numero_cuenta ?? "",
      anticipo_prest_fijo: emp.anticipo_prest_fijo ?? "0",
      tipo_identificacion: emp.tipo_identificacion ?? "CC",
      numero_identificacion: emp.numero_identificacion ?? "",
      fecha_ingreso: emp.fecha_ingreso ? emp.fecha_ingreso.slice(0, 10) : "",
      estado_laboral: emp.estado_laboral ?? "activo",
      notas: emp.notas ?? "",
    });
    setError("");
  }
  function closeModal() { setModal(null); setError(""); }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const body = {
      ...form,
      salario_base: Number(form.salario_base),
      anticipo_prest_fijo: Number(form.anticipo_prest_fijo ?? 0),
    };
    saveMut.mutate(body);
  }

  const filtered = employees.filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return e.nombre?.toLowerCase().includes(s) || e.cargo?.toLowerCase().includes(s);
  });

  const f = (k) => (v) => setForm((p) => ({ ...p, [k]: typeof v === "object" ? v.target.value : v }));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <input className="input-field flex-1" placeholder="Buscar empleado..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <button onClick={openCreate} className="btn-primary shrink-0 flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Agregar
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="py-12 text-center text-zinc-500 text-sm">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-14 text-center">
          <UserGroupIcon className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-500 text-sm">No hay empleados registrados</p>
          <button onClick={openCreate} className="btn-primary text-sm">Agregar empleado</button>
        </div>
      ) : (
        <div className="space-y-2 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-3 md:space-y-0">
          {filtered.map((emp) => (
            <div key={emp.id} className="card border border-zinc-800 hover:border-zinc-700 transition-colors space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{emp.nombre}</p>
                  <p className="text-zinc-500 text-xs">{emp.cargo}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${EMP_BADGE[emp.estado_laboral]}`}>
                  {emp.estado_laboral}
                </span>
              </div>

              {/* Contrato + salario */}
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${CONTRATO_BADGE[emp.tipo_contrato]}`}>
                  {CONTRATO_LABEL[emp.tipo_contrato]}
                </span>
                <span className="text-brand-green font-mono font-bold text-xs">{fmt(emp.salario_base)}</span>
              </div>

              {/* Datos bancarios */}
              {emp.numero_cuenta && (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="uppercase font-medium text-zinc-400">{emp.tipo_cuenta}</span>
                  <span className="font-mono">{emp.numero_cuenta}</span>
                </div>
              )}

              {/* Anticipo fijo (solo prest. servicios) */}
              {emp.tipo_contrato === "prestacion_servicios" && Number(emp.anticipo_prest_fijo) > 0 && (
                <p className="text-xs text-purple-400">Anticipo prest: {fmt(emp.anticipo_prest_fijo)}</p>
              )}

              {/* Acciones */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800">
                <button onClick={() => openEdit(emp)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-zinc-800">
                  <PencilIcon className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => { if (confirm(`¿Eliminar a ${emp.nombre}?`)) deleteMut.mutate(emp.id); }}
                  className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10">
                  <TrashIcon className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal empleado */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4 bg-black/70">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold text-base">
                {modal.mode === "create" ? "Nuevo empleado" : "Editar empleado"}
              </h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <p className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</p>
              )}

              {/* Datos personales */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-zinc-400 text-xs mb-1">Nombre completo *</label>
                  <input required className="input-field" value={form.nombre} onChange={f("nombre")} placeholder="Nombre completo" />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Cargo *</label>
                  <input required className="input-field" value={form.cargo} onChange={f("cargo")} placeholder="Ej: Operaria" />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Salario base *</label>
                  <input required type="number" min="1" className="input-field" value={form.salario_base}
                    onChange={f("salario_base")} placeholder="1750905" />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Tipo ID</label>
                  <select className="input-field" value={form.tipo_identificacion} onChange={f("tipo_identificacion")}>
                    <option value="CC">CC</option><option value="CE">CE</option>
                    <option value="NIT">NIT</option><option value="PA">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Número ID *</label>
                  <input required className="input-field" value={form.numero_identificacion}
                    onChange={f("numero_identificacion")} placeholder="Número" />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Fecha ingreso *</label>
                  <input required type="date" className="input-field" value={form.fecha_ingreso} onChange={f("fecha_ingreso")} />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Estado</label>
                  <select className="input-field" value={form.estado_laboral} onChange={f("estado_laboral")}>
                    <option value="activo">Activo</option>
                    <option value="licencia">Licencia</option>
                    <option value="terminado">Terminado</option>
                  </select>
                </div>
              </div>

              {/* Tipo contrato */}
              <div>
                <label className="block text-zinc-400 text-xs mb-1">Tipo de contrato *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: "prestacion_servicios", label: "Prestación de servicios" },
                    { v: "laboral", label: "Contrato laboral" },
                  ].map(({ v, label }) => (
                    <button key={v} type="button"
                      onClick={() => setForm((p) => ({ ...p, tipo_contrato: v }))}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        form.tipo_contrato === v
                          ? "border-brand-green bg-brand-green/10 text-brand-green"
                          : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
                {form.tipo_contrato === "laboral" && (
                  <p className="text-xs text-blue-400 mt-1.5">
                    ✓ Se calcularán salud (4%) y pensión (4%) + auxilio de transporte
                  </p>
                )}
                {form.tipo_contrato === "prestacion_servicios" && (
                  <p className="text-xs text-purple-400 mt-1.5">
                    ✓ Sin descuentos de ley · Se asigna anticipo a prestaciones
                  </p>
                )}
              </div>

              {/* Anticipo fijo (solo prestación servicios) */}
              {form.tipo_contrato === "prestacion_servicios" && (
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Anticipo prestaciones fijo (por quincena)</label>
                  <input type="number" min="0" className="input-field" value={form.anticipo_prest_fijo}
                    onChange={f("anticipo_prest_fijo")} placeholder="Ej: 213500" />
                  <p className="text-zinc-600 text-xs mt-1">Se cargará automáticamente al crear cada período</p>
                </div>
              )}

              {/* Datos bancarios */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Plataforma</label>
                  <select className="input-field" value={form.tipo_cuenta} onChange={f("tipo_cuenta")}>
                    <option value="nequi">NEQUI</option>
                    <option value="llave">LLAVE</option>
                    <option value="bancolombia">Bancolombia</option>
                    <option value="davivienda">Davivienda</option>
                    <option value="bbva">BBVA</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-zinc-400 text-xs mb-1">Número de cuenta / celular</label>
                  <input className="input-field" value={form.numero_cuenta} onChange={f("numero_cuenta")}
                    placeholder="Ej: 3184818821" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-zinc-400 text-xs mb-1">Correo electrónico</label>
                <input type="email" className="input-field" value={form.email} onChange={f("email")}
                  placeholder="correo@ejemplo.com" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary px-4">Cancelar</button>
                <button type="submit" disabled={saveMut.isPending} className="btn-primary px-5">
                  {saveMut.isPending ? "Guardando..." : modal.mode === "create" ? "Crear empleado" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
