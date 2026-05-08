import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../config/api.js";
import { COLOMBIA, DEPARTAMENTOS } from "../../data/colombia.js";
const IconEye = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;

const DOC_LABELS = { cedula: "C.C.", nit: "NIT", ce: "C.E.", pp: "PP" };

function DocBadge({ type, number }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-[10px] font-bold bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">
        {DOC_LABELS[type] ?? type?.toUpperCase()}
      </span>
      <span className="text-zinc-300">{number}</span>
    </span>
  );
}

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [form,   setForm]   = useState(null); // null | {} (new) | {...} (edit)
  const [viewing, setViewing] = useState(null); // null | {...} (view)

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search],
    queryFn:  () => api.get(`/customers?search=${search}&limit=50`).then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (d) => d.id ? api.put(`/customers/${d.id}`, d) : api.post("/customers", d),
    onSuccess:  () => { qc.invalidateQueries(["customers"]); setForm(null); },
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/customers/${id}`),
    onSuccess:  () => qc.invalidateQueries(["customers"]),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-white font-bold text-xl lg:hidden">Clientes</h1>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <input
          className="input-field flex-1"
          placeholder="Buscar por nombre o documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-primary shrink-0 whitespace-nowrap" onClick={() => setForm({})}>
          + Nuevo cliente
        </button>
      </div>

      {/* Cards */}
      {isLoading ? (
        <p className="text-zinc-500 text-sm text-center py-8">Cargando...</p>
      ) : !data?.data?.length ? (
        <div className="card text-center py-10">
          <p className="text-zinc-500">No hay clientes.</p>
        </div>
      ) : (
        <div className="space-y-3 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-4 md:space-y-0">
          {data.data.map((c) => (
            <div key={c.id} className="card border border-zinc-800 hover:border-zinc-600 transition-colors space-y-2">
              {/* Nombre + tipo */}
              <div className="flex items-start justify-between gap-2">
                <p className="text-white font-medium text-sm leading-snug">{c.name}</p>
                {c.is_company && (
                  <span className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded shrink-0">Empresa</span>
                )}
              </div>

              {/* Documento */}
              <DocBadge type={c.document_type} number={c.document_number} />

              {/* Contacto */}
              <div className="pt-1 border-t border-zinc-800 space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>📞 <span className="text-zinc-400">{c.phone || "—"}</span></span>
                  <span className="truncate ml-2 text-zinc-400">{c.email || "—"}</span>
                </div>
                {(c.city || c.department) && (
                  <p className="text-xs text-zinc-600">{[c.city, c.department].filter(Boolean).join(", ")}</p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => setViewing(c)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-brand-green border border-zinc-700 hover:border-brand-green/50 rounded-lg py-1.5 transition-colors">
                  <IconEye /> Ver
                </button>
                <button onClick={() => setForm(c)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg py-1.5 transition-colors">
                  <IconEdit /> Editar
                </button>
                <button onClick={() => { if (confirm(`¿Eliminar a ${c.name}?`)) remove.mutate(c.id); }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/50 rounded-lg py-1.5 transition-colors">
                  <IconTrash /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form !== null && <CustomerModal form={form} onSave={(d) => save.mutate(d)} onClose={() => setForm(null)} saving={save.isLoading} />}
      {viewing && <CustomerView customer={viewing} onEdit={() => { setForm(viewing); setViewing(null); }} onClose={() => setViewing(null)} />}
    </div>
  );
}

function CustomerView({ customer: c, onEdit, onClose }) {
  const initials = c.name?.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">

        {/* Header con gradiente */}
        <div className="relative bg-gradient-to-br from-zinc-800 to-zinc-900 px-6 pt-6 pb-8">
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-green/20 border border-brand-green/30 flex items-center justify-center shrink-0">
              <span className="text-brand-green font-black text-xl">{initials}</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">{c.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <DocBadge type={c.document_type} number={c.document_number} />
                {c.is_company && <span className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">Empresa</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="px-6 py-4 space-y-3 -mt-2">

          {/* Contacto */}
          <div className="bg-zinc-800/50 rounded-xl p-3 space-y-2.5">
            <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Contacto</p>
            {c.phone && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <span className="text-zinc-200 text-sm">{c.phone}</span>
              </div>
            )}
            {c.email && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <span className="text-zinc-200 text-sm break-all">{c.email}</span>
              </div>
            )}
          </div>

          {/* Ubicación */}
          {(c.city || c.department || c.address) && (
            <div className="bg-zinc-800/50 rounded-xl p-3 space-y-2.5">
              <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Ubicación</p>
              {(c.city || c.department) && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <span className="text-zinc-200 text-sm">{[c.city, c.department].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {c.address && (
                <div className="flex items-start gap-3 mt-0.5">
                  <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <span className="text-zinc-200 text-sm leading-snug">{c.address}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="px-6 pb-5 flex gap-2">
          <button className="flex-1 btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="flex-1 btn-primary" onClick={onEdit}>Editar</button>
        </div>
      </div>
    </div>
  );
}

function CustomerModal({ form, onSave, onClose, saving }) {
  const [data, setData] = useState({ document_type: "cedula", is_company: false, ...form });
  const [error, setError] = useState("");
  const set = (k, v) => setData((p) => ({ ...p, [k]: v }));

  const cities = data.department ? (COLOMBIA[data.department] || []) : [];

  function handleSave() {
    if (!data.name?.trim())            return setError("El nombre es obligatorio.");
    if (!data.document_number?.trim()) return setError("El número de documento es obligatorio.");
    if (!data.phone?.trim())           return setError("El teléfono es obligatorio.");
    if (!data.email?.trim())           return setError("El correo es obligatorio.");
    if (!data.department)              return setError("El departamento es obligatorio.");
    if (!data.city)                    return setError("La ciudad es obligatoria.");
    setError("");
    onSave(data);
  }

  const initials = data.name?.trim()
    ? data.name.trim().split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()
    : (data.id ? "?" : "+");

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-auto">

        {/* Header */}
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 px-6 pt-6 pb-7 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-green/20 border border-brand-green/30 flex items-center justify-center shrink-0">
              <span className="text-brand-green font-black text-xl">{initials}</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">{data.id ? "Editar cliente" : "Nuevo cliente"}</h2>
              {data.name && <p className="text-zinc-400 text-sm mt-0.5">{data.name}</p>}
            </div>
          </div>
        </div>

        {/* Campos */}
        <div className="px-6 py-4 space-y-4">

          {/* Identidad */}
          <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
            <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Identidad</p>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nombre <span className="text-red-400">*</span></label>
              <input className="input-field" value={data.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="Nombre completo o razón social" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Tipo doc. <span className="text-red-400">*</span></label>
                <select className="input-field" value={data.document_type} onChange={(e) => set("document_type", e.target.value)}>
                  <option value="cedula">C.C.</option>
                  <option value="nit">NIT</option>
                  <option value="ce">C.E.</option>
                  <option value="pp">Pasaporte</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Número doc. <span className="text-red-400">*</span></label>
                <input className="input-field" value={data.document_number || ""} onChange={(e) => set("document_number", e.target.value)} placeholder="123456789" />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
            <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Contacto</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Teléfono <span className="text-red-400">*</span></label>
                <input className="input-field" value={data.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="300 123 4567" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Correo <span className="text-red-400">*</span></label>
                <input className="input-field" type="email" value={data.email || ""} onChange={(e) => set("email", e.target.value)} placeholder="correo@mail.com" />
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
            <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Ubicación</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Departamento <span className="text-red-400">*</span></label>
                <select className="input-field" value={data.department || ""}
                  onChange={(e) => { set("department", e.target.value); set("city", ""); }}>
                  <option value="">Seleccionar...</option>
                  {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Ciudad / Municipio <span className="text-red-400">*</span></label>
                <select className="input-field" value={data.city || ""} onChange={(e) => set("city", e.target.value)} disabled={!data.department}>
                  <option value="">Seleccionar...</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Dirección</label>
              <input className="input-field" value={data.address || ""} onChange={(e) => set("address", e.target.value)} placeholder="Calle 123 # 45 - 67" />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs bg-red-950/50 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        {/* Acciones */}
        <div className="px-6 pb-6 flex gap-2">
          <button className="flex-1 btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="flex-1 btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
