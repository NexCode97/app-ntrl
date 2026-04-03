import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../config/api.js";

const AREAS = ["corte", "diseno", "sublimacion", "ensamble", "terminados"];
const AREA_LABELS = {
  corte: "Corte", diseno: "Diseño",
  sublimacion: "Sublimación", ensamble: "Ensamble", terminados: "Terminados",
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn:  () => api.get("/users?limit=100").then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (d) => d.id ? api.put(`/users/${d.id}`, d) : api.post("/users", d),
    onSuccess:  () => { qc.invalidateQueries(["users"]); setForm(null); },
  });

  const deactivate = useMutation({
    mutationFn: (id) => api.put(`/users/${id}`, { is_active: false }),
    onSuccess:  () => qc.invalidateQueries(["users"]),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-start">
        <button className="btn-primary whitespace-nowrap" onClick={() => setForm({})}>+ Nuevo usuario</button>
      </div>

      <div className="card overflow-hidden p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[580px]">
          <thead className="bg-zinc-800 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Correo</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left">Área / Cargo</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {isLoading && <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Cargando...</td></tr>}
            {data?.data?.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3 text-white">{u.name}</td>
                <td className="px-4 py-3 text-zinc-400">{u.email}</td>
                <td className="px-4 py-3"><span className={`badge ${u.role === "admin" ? "badge-completed" : "badge-pending"}`}>{u.role}</span></td>
                <td className="px-4 py-3 text-zinc-400">{u.role === "admin" ? (u.position || "—") : (AREA_LABELS[u.area] || "—")}</td>
                <td className="px-4 py-3"><span className={`badge ${u.is_active ? "badge-completed" : "badge-pending"}`}>{u.is_active ? "Activo" : "Inactivo"}</span></td>
                <td className="px-4 py-3 flex gap-2">
                  <button className="text-zinc-500 hover:text-brand-green text-xs" onClick={() => setForm(u)}>Editar</button>
                  {u.is_active && <button className="text-zinc-500 hover:text-red-400 text-xs" onClick={() => deactivate.mutate(u.id)}>Desactivar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form !== null && <UserModal form={form} onSave={(d) => save.mutate(d)} onClose={() => setForm(null)} saving={save.isLoading} error={save.error?.response?.data?.message} />}
    </div>
  );
}

function UserModal({ form, onSave, onClose, saving, error }) {
  const [data, setData] = useState({ role: "worker", ...form, password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const set = (k, v) => setData((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-white font-semibold">{data.id ? "Editar usuario" : "Nuevo usuario"}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nombre</label>
            <input className="input-field" placeholder="Nombre completo" value={data.name || ""} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Correo</label>
            <input className="input-field" placeholder="correo@empresa.com" type="email" value={data.email || ""} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              {data.id ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
            </label>
            <div className="relative">
              <input
                className="input-field pr-10"
                placeholder="••••••••"
                type={showPwd ? "text" : "password"}
                value={data.password || ""}
                onChange={(e) => set("password", e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
              >
                {showPwd ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Rol</label>
              <select className="input-field" value={data.role} onChange={(e) => set("role", e.target.value)}>
                <option value="worker">Trabajador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            {data.role === "worker" && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Área</label>
                <select className="input-field" value={data.area || ""} onChange={(e) => set("area", e.target.value)}>
                  <option value="">Seleccionar área</option>
                  {AREAS.map((a) => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}
                </select>
              </div>
            )}
            {data.role === "admin" && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Cargo</label>
                <input className="input-field" placeholder="Ej: Gerente, Subgerente..." value={data.position || ""} onChange={(e) => set("position", e.target.value)} />
              </div>
            )}
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(data)} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
