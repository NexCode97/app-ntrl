import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../config/api.js";

const AREAS = ["corte", "diseno", "impresion", "sublimacion", "ensamble", "terminados"];
const AREA_LABELS = {
  corte: "Corte", diseno: "Diseño", impresion: "Impresión",
  sublimacion: "Sublimación", ensamble: "Ensamble", terminados: "Terminados",
};

function UserAvatar({ name }) {
  return (
    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center font-bold text-white text-sm shrink-0">
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function RoleBadge({ role }) {
  const cls = role === "admin" ? "badge-completed" : role === "vendedor" ? "badge-info" : "badge-pending";
  const label = role === "admin" ? "Admin" : role === "vendedor" ? "Vendedor" : "Trabajador";
  return <span className={`badge ${cls}`}>{label}</span>;
}

function StatusBadge({ active }) {
  return <span className={`badge ${active ? "badge-completed" : "badge-cancelled"}`}>{active ? "Activo" : "Inactivo"}</span>;
}

function areaOrPosition(u) {
  if (u.role === "worker") return AREA_LABELS[u.area] || "—";
  return u.position || "—";
}

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

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => api.put(`/users/${id}`, { is_active }),
    onSuccess:  () => qc.invalidateQueries(["users"]),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess:  () => qc.invalidateQueries(["users"]),
  });

  const users = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-start">
        <button className="btn-primary whitespace-nowrap" onClick={() => setForm({})}>+ Nuevo usuario</button>
      </div>

      {/* ── Mobile / Tablet: cards ── */}
      <div className="lg:hidden space-y-3">
        {isLoading && (
          <div className="text-center py-12 text-zinc-500 text-sm">Cargando...</div>
        )}
        {users.map((u) => (
          <div key={u.id} className="card flex items-center gap-3">
            <UserAvatar name={u.name} />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{u.name}</p>
              <p className="text-zinc-400 text-xs truncate">{areaOrPosition(u)}</p>
              <p className="text-zinc-500 text-xs truncate">{u.email}</p>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <RoleBadge role={u.role} />
                <StatusBadge active={u.is_active} />
              </div>
            </div>
            <div className="flex gap-3 items-center shrink-0">
              {/* Editar */}
              <button
                onClick={() => setForm(u)}
                className="text-zinc-400 hover:text-brand-green transition-colors"
                title="Editar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4 1 1-4 12.362-12.726z" />
                </svg>
              </button>
              {/* Activar / Desactivar */}
              <button
                onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                className={`transition-colors ${u.is_active ? "text-zinc-400 hover:text-yellow-400" : "text-zinc-400 hover:text-brand-green"}`}
                title={u.is_active ? "Desactivar" : "Activar"}
              >
                {u.is_active ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>
              {/* Eliminar */}
              <button
                onClick={() => { if (confirm(`¿Eliminar permanentemente a ${u.name}? Esta acción no se puede deshacer.`)) remove.mutate(u.id); }}
                className="text-zinc-400 hover:text-red-400 transition-colors"
                title="Eliminar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop: table ── */}
      <div className="hidden lg:block card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Correo</th>
              <th className="px-4 py-3 text-center">Rol</th>
              <th className="px-4 py-3 text-left">Área / Cargo</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Cargando...</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={u.name} />
                    <span className="text-white">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-400">{u.email}</td>
                <td className="px-4 py-3 text-center"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3 text-zinc-400">{areaOrPosition(u)}</td>
                <td className="px-4 py-3 text-center"><StatusBadge active={u.is_active} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 justify-end">
                    <button className="text-zinc-500 hover:text-brand-green text-xs transition-colors" onClick={() => setForm(u)}>Editar</button>
                    <button
                      className={`text-zinc-500 text-xs transition-colors ${u.is_active ? "hover:text-yellow-400" : "hover:text-brand-green"}`}
                      onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                    >
                      {u.is_active ? "Desactivar" : "Activar"}
                    </button>
                    <button className="text-zinc-500 hover:text-red-400 text-xs transition-colors" onClick={() => {
                      if (confirm(`¿Eliminar permanentemente a ${u.name}? Esta acción no se puede deshacer.`)) remove.mutate(u.id);
                    }}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form !== null && (
        <UserModal
          form={form}
          onSave={(d) => save.mutate(d)}
          onClose={() => setForm(null)}
          saving={save.isPending}
          error={save.error?.response?.data?.message}
        />
      )}
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
                <option value="vendedor">Vendedor</option>
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
            {data.role === "vendedor" && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Punto de venta / Cargo</label>
                <input className="input-field" placeholder="Ej: Almacén Centro..." value={data.position || ""} onChange={(e) => set("position", e.target.value)} />
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
