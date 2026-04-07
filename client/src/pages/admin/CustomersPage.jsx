import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../config/api.js";
import { COLOMBIA, DEPARTAMENTOS } from "../../data/colombia.js";

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
      <div className="flex items-center gap-3">
        <input className="input-field max-w-xs" placeholder="Buscar..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
        <button className="btn-primary ml-auto shrink-0 whitespace-nowrap" onClick={() => setForm({})}>+ Nuevo cliente</button>
      </div>

      <div className="card overflow-hidden p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead className="bg-zinc-800 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Documento</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-left">Correo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {isLoading && <tr><td colSpan={5} className="text-center py-8 text-zinc-500">Cargando...</td></tr>}
            {data?.data?.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3 text-white">{c.name}</td>
                <td className="px-4 py-3 text-zinc-400">{c.document_type === "cedula" ? "C.C." : c.document_type.toUpperCase()} {c.document_number}</td>
                <td className="px-4 py-3 text-zinc-400">{c.phone || "—"}</td>
                <td className="px-4 py-3 text-zinc-400">{c.email || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 items-center">
                    <button title="Ver" className="text-zinc-500 hover:text-brand-green text-xs" onClick={() => setViewing(c)}>Ver</button>
                    <button title="Editar" className="text-zinc-500 hover:text-zinc-200 text-xs" onClick={() => setForm(c)}>✎</button>
                    <button title="Eliminar" className="text-zinc-500 hover:text-red-400 text-xs" onClick={() => {
                      if (confirm(`¿Eliminar a ${c.name}? Esta acción no se puede deshacer.`)) remove.mutate(c.id);
                    }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form !== null && <CustomerModal form={form} onSave={(d) => save.mutate(d)} onClose={() => setForm(null)} saving={save.isLoading} />}
      {viewing && <CustomerView customer={viewing} onEdit={() => { setForm(viewing); setViewing(null); }} onClose={() => setViewing(null)} />}
    </div>
  );
}

function CustomerView({ customer: c, onEdit, onClose }) {
  const rows = [
    ["Documento",    `${c.document_type === "cedula" ? "C.C." : c.document_type?.toUpperCase()} ${c.document_number}`],
    ["Teléfono",     c.phone   || "—"],
    ["Correo",       c.email   || "—"],
    ["Departamento", c.department || "—"],
    ["Ciudad",       c.city    || "—"],
    ["Dirección",    c.address || "—"],
  ];
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-white font-semibold text-lg">{c.name}</h2>
            {c.is_company && <span className="text-xs text-zinc-500">Empresa</span>}
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-lg leading-none">✕</button>
        </div>
        <div className="space-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-1.5 border-b border-zinc-800 last:border-0">
              <span className="text-zinc-500 text-sm shrink-0">{label}</span>
              <span className="text-zinc-200 text-sm text-right break-all">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="btn-primary" onClick={onEdit}>Editar</button>
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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-lg space-y-4 my-auto">
        <h2 className="text-white font-semibold">{data.id ? "Editar cliente" : "Nuevo cliente"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-zinc-400 mb-1">Nombre <span className="text-red-400">*</span></label>
            <input className="input-field" value={data.name || ""} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Tipo doc. <span className="text-red-400">*</span></label>
            <select className="input-field" value={data.document_type} onChange={(e) => set("document_type", e.target.value)}>
              <option value="cedula">Cédula</option>
              <option value="nit">NIT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Número doc. <span className="text-red-400">*</span></label>
            <input className="input-field" value={data.document_number || ""} onChange={(e) => set("document_number", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Teléfono <span className="text-red-400">*</span></label>
            <input className="input-field" value={data.phone || ""} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Correo <span className="text-red-400">*</span></label>
            <input className="input-field" type="email" value={data.email || ""} onChange={(e) => set("email", e.target.value)} />
          </div>
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
            <select className="input-field" value={data.city || ""} onChange={(e) => set("city", e.target.value)}
              disabled={!data.department}>
              <option value="">Seleccionar...</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-zinc-400 mb-1">Dirección</label>
            <input className="input-field" value={data.address || ""} onChange={(e) => set("address", e.target.value)} />
          </div>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
