import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../config/api.js";

const STATUS_COLORS = {
  pending:     "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  delivered:   "bg-brand-green/20 text-brand-green border border-brand-green/30",
};
const STATUS_LABELS = {
  pending: "Pendiente", in_progress: "En proceso", delivered: "Entregado",
};
const AREA_LABELS = {
  corte: "Corte", diseno: "Diseño", sublimacion: "Sublimación",
  ensamble: "Ensamble", terminados: "Terminados",
};

const UNITS = ["unidades", "metros", "kg", "litros", "rollos", "yardas", "piezas", "resma"];

export default function SuppliesPage() {
  const [tab, setTab] = useState("requests"); // "requests" | "suppliers"
  const [showRequestForm,  setShowRequestForm]  = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="order-last sm:order-first flex bg-zinc-800 rounded-lg p-1 gap-1 w-fit">
          <button onClick={() => setTab("requests")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "requests" ? "bg-brand-green text-black" : "text-zinc-400 hover:text-white"}`}>
            Solicitudes
          </button>
          <button onClick={() => setTab("suppliers")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "suppliers" ? "bg-brand-green text-black" : "text-zinc-400 hover:text-white"}`}>
            Proveedores
          </button>
        </div>
        <div className="order-first sm:order-last self-start sm:self-auto">
          {tab === "requests"  && <button className="btn-primary whitespace-nowrap" onClick={() => setShowRequestForm(true)}>+ Nueva solicitud</button>}
          {tab === "suppliers" && <button className="btn-primary whitespace-nowrap" onClick={() => setShowSupplierForm(true)}>+ Nuevo proveedor</button>}
        </div>
      </div>
      {tab === "requests"
        ? <RequestsTab  showForm={showRequestForm}  setShowForm={setShowRequestForm} />
        : <SuppliersTab showForm={showSupplierForm} setShowForm={setShowSupplierForm} />}
    </div>
  );
}

function RequestsTab({ showForm, setShowForm }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter,   setFilter]   = useState("all");
  const [selected, setSelected] = useState(null);

  const { data: allData, isLoading } = useQuery({
    queryKey: ["supplies"],
    queryFn: () => api.get("/supplies").then((r) => r.data.data),
  });

  const data = filter === "all" ? allData : allData?.filter((r) => r.status === filter);

  const updateStatus = useMutation({
    mutationFn: ({ id, status, admin_notes }) => api.put(`/supplies/${id}`, { status, admin_notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplies"] }); setSelected(null); },
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/supplies/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplies"] }); setSelected(null); },
  });

  const create = useMutation({
    mutationFn: (d) => api.post("/supplies", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplies"] }); setShowForm(false); },
  });

  const { data: ordersData } = useQuery({
    queryKey: ["orders-simple"],
    queryFn: () => api.get("/orders?limit=50").then((r) => r.data.data),
  });

  const counts = (allData ?? []).reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});

  return (
    <div className="space-y-4">

      {/* Filtros — dropdown en móvil, botones en escritorio */}
      <div className="md:hidden">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input-field text-sm w-full"
        >
          {[["all","Todos"], ["pending","Pendientes"], ["in_progress","En proceso"], ["delivered","Entregados"]].map(([val, label]) => (
            <option key={val} value={val}>
              {label}{val !== "all" && counts[val] ? ` (${counts[val]})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden md:flex gap-2 flex-wrap">
        {[["all","Todos"], ["pending","Pendientes"], ["in_progress","En proceso"], ["delivered","Entregados"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === val ? "bg-brand-green text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>
            {label}{val !== "all" && counts[val] ? ` (${counts[val]})` : ""}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-zinc-800 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left whitespace-nowrap">Área</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Insumo</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Cantidad</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Unidad</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Pedido</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Estado</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Fecha</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {isLoading && <tr><td colSpan={8} className="text-center py-8 text-zinc-500">Cargando...</td></tr>}
            {!isLoading && data?.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-zinc-600">Sin solicitudes</td></tr>
            )}
            {data?.map((r) => (
              <tr key={r.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white whitespace-nowrap">{AREA_LABELS[r.worker_area] ?? r.worker_area ?? "—"}</p>
                  <p className="text-zinc-500 text-xs whitespace-nowrap">{r.worker_name}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-white">{r.item_name}</p>
                  {r.notes && <p className="text-zinc-500 text-xs truncate max-w-[160px]">{r.notes}</p>}
                </td>
                <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">{r.quantity}</td>
                <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">{r.unit}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {r.order_number
                    ? <button onClick={() => navigate(`/orders/${r.order_id}`)} className="text-brand-green font-mono text-xs hover:underline">#{String(r.order_number).padStart(3,"0")}</button>
                    : <span className="text-zinc-600 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                  {new Date(r.created_at).toLocaleDateString("es-CO", { day:"2-digit", month:"short" })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button onClick={() => setSelected(r)} className="text-zinc-500 hover:text-brand-green text-xs">Gestionar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <RequestForm
          orders={ordersData ?? []}
          onSave={(d) => create.mutate(d)}
          onClose={() => setShowForm(false)}
          saving={create.isPending}
          error={create.error?.response?.data?.message}
        />
      )}

      {selected && (
        <ManageModal
          request={selected}
          onSave={(status, notes) => updateStatus.mutate({ id: selected.id, status, admin_notes: notes })}
          onDelete={() => { if (confirm("¿Eliminar esta solicitud?")) remove.mutate(selected.id); }}
          onClose={() => setSelected(null)}
          saving={updateStatus.isPending}
        />
      )}
    </div>
  );
}

// ── Pestaña de Proveedores ─────────────────────────────────────────
function SuppliersTab({ showForm, setShowForm }) {
  const qc = useQueryClient();
  const [form, setFormInternal] = useState(null);

  useEffect(() => { if (showForm) setFormInternal({}); }, [showForm]);
  const setForm = (v) => { setFormInternal(v); if (!v) setShowForm(false); };

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/supplies/suppliers").then((r) => r.data.data),
  });

  const save = useMutation({
    mutationFn: (d) => d.id ? api.put(`/supplies/suppliers/${d.id}`, d) : api.post("/supplies/suppliers", d),
    onSuccess: () => { qc.invalidateQueries(["suppliers"]); setForm(null); },
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/supplies/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries(["suppliers"]),
  });

  return (
    <div className="space-y-4">
      {isLoading && <p className="text-zinc-500 text-center py-8 text-sm">Cargando...</p>}
      {!isLoading && data?.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-zinc-500 text-sm">Sin proveedores registrados.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((s) => (
          <div key={s.id} className={`card space-y-2 ${!s.is_active ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-white font-semibold">{s.name}</p>
                {!s.is_active && <span className="text-xs text-zinc-500">Inactivo</span>}
              </div>
              <button onClick={() => setForm(s)} className="text-zinc-500 hover:text-brand-green text-xs shrink-0">Editar</button>
            </div>
            <div className="space-y-1 text-sm">
              {s.contact_name && <p className="text-zinc-400">👤 {s.contact_name}</p>}
              {s.phone        && <p className="text-zinc-400">📞 {s.phone}</p>}
              {s.email        && <p className="text-zinc-400">✉️ {s.email}</p>}
              {s.address      && <p className="text-zinc-500 text-xs">{s.address}</p>}
              {s.notes        && <p className="text-zinc-600 text-xs italic">"{s.notes}"</p>}
            </div>
            <div className="pt-1 border-t border-zinc-800 flex justify-end">
              <button onClick={() => { if (confirm(`¿Eliminar a ${s.name}?`)) remove.mutate(s.id); }}
                className="text-zinc-600 hover:text-red-400 text-xs transition-colors">Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {form !== null && (
        <SupplierModal
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

function SupplierModal({ form, onSave, onClose, saving, error }) {
  const [data, setData] = useState({ name:"", contact_name:"", phone:"", email:"", address:"", notes:"", is_active:true, ...form });
  const set = (k, v) => setData((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-white font-semibold">{data.id ? "Editar proveedor" : "Nuevo proveedor"}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nombre *</label>
            <input className="input-field" placeholder="Nombre de la empresa o persona" value={data.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Contacto</label>
            <input className="input-field" placeholder="Nombre del contacto" value={data.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Teléfono</label>
              <input className="input-field" placeholder="3001234567" value={data.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Correo</label>
              <input className="input-field" type="email" placeholder="correo@proveedor.com" value={data.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Dirección</label>
            <input className="input-field" placeholder="Ciudad, dirección..." value={data.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notas</label>
            <textarea className="input-field resize-none h-20" placeholder="Condiciones, horarios, observaciones..." value={data.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          {data.id && (
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
              <input type="checkbox" checked={data.is_active} onChange={(e) => set("is_active", e.target.checked)} className="rounded" />
              Proveedor activo
            </label>
          )}
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(data)} disabled={saving || !data.name.trim()}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestForm({ orders, onSave, onClose, saving, error }) {
  const [data, setData] = useState({ item_name: "", quantity: "", unit: "unidades", order_id: "", notes: "" });
  const set = (k, v) => setData((p) => ({ ...p, [k]: v }));

  function handleSubmit() {
    if (!data.item_name.trim() || !data.quantity) return;
    onSave({ ...data, quantity: parseFloat(data.quantity), order_id: data.order_id || null });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-white font-semibold">Nueva solicitud de insumo</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Insumo *</label>
            <input className="input-field" placeholder="Ej: Hilo negro, Tela sublimación..." value={data.item_name} onChange={(e) => set("item_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Cantidad *</label>
              <input className="input-field" type="number" min="0.01" step="0.01" placeholder="0" value={data.quantity} onChange={(e) => set("quantity", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Unidad</label>
              <select className="input-field" value={data.unit} onChange={(e) => set("unit", e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Pedido relacionado</label>
            <select className="input-field" value={data.order_id} onChange={(e) => set("order_id", e.target.value)}>
              <option value="">Sin pedido específico</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>#{String(o.order_number).padStart(3,"0")} — {o.customer_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notas adicionales</label>
            <textarea className="input-field resize-none h-20" placeholder="Ej: Color específico, referencia..." value={data.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving || !data.item_name.trim() || !data.quantity}>
            {saving ? "Enviando..." : "Enviar solicitud"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ManageModal({ request, onSave, onDelete, onClose, saving }) {
  const [status, setStatus] = useState(request.status);
  const [notes,  setNotes]  = useState(request.admin_notes ?? "");

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-white font-semibold">Gestionar solicitud</h2>

        <div className="bg-zinc-800 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-zinc-400">Área</span><span className="text-white">{AREA_LABELS[request.worker_area] ?? request.worker_area ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Trabajador</span><span className="text-white">{request.worker_name}</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Insumo</span><span className="text-white font-medium">{request.item_name}</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Cantidad</span><span className="text-white">{request.quantity} {request.unit}</span></div>
          {request.order_number && <div className="flex justify-between"><span className="text-zinc-400">Pedido</span><span className="text-brand-green font-mono">#{String(request.order_number).padStart(3,"0")}</span></div>}
          {request.notes && <div className="flex justify-between gap-4"><span className="text-zinc-400 shrink-0">Notas</span><span className="text-zinc-300 text-right">{request.notes}</span></div>}
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Estado</label>
          <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En proceso</option>
            <option value="delivered">Entregado</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Notas del admin (opcional)</label>
          <textarea className="input-field resize-none h-20" placeholder="Ej: Se entrega el martes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-between">
          <button onClick={onDelete} className="text-red-400 hover:text-red-300 text-sm">Eliminar</button>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={() => onSave(status, notes)} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
