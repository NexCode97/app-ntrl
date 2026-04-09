import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../config/api.js";

const STATUS_COLORS = {
  pending:     "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  delivered:   "bg-brand-green/20 text-brand-green border border-brand-green/30",
};
const STATUS_LABELS = { pending: "Pendiente", in_progress: "En proceso", delivered: "Entregado" };

const UNITS = ["unidades", "metros", "kg", "litros", "rollos", "yardas", "piezas"];

export default function SuppliesWorkerPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["supplies-worker"],
    queryFn: () => api.get("/supplies").then((r) => r.data.data),
  });

  const { data: ordersData } = useQuery({
    queryKey: ["orders-simple"],
    queryFn: () => api.get("/orders?limit=50").then((r) => r.data.data),
  });

  const create = useMutation({
    mutationFn: (d) => api.post("/supplies", d),
    onSuccess: () => { qc.invalidateQueries(["supplies-worker"]); setShowForm(false); },
  });

  const markReceived = useMutation({
    mutationFn: (id) => api.put(`/supplies/${id}`, { status: "delivered" }),
    onSuccess: () => qc.invalidateQueries(["supplies-worker"]),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/supplies/${id}`),
    onSuccess: () => qc.invalidateQueries(["supplies-worker"]),
  });

  const visible = data?.filter((r) => r.status !== "delivered") ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      <div className="flex justify-start md:justify-end">
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nueva solicitud</button>
      </div>

      {/* Lista de solicitudes */}
      <div className="space-y-3">
        {isLoading && <p className="text-zinc-500 text-center py-8 text-sm">Cargando...</p>}
        {!isLoading && visible.length === 0 && (
          <div className="card text-center py-8">
            <p className="text-zinc-500 text-sm">No tienes solicitudes de suministros.</p>
            <button className="btn-primary mt-3 text-sm" onClick={() => setShowForm(true)}>Hacer primera solicitud</button>
          </div>
        )}
        {visible.map((r) => (
          <div key={r.id} className="card flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-white font-medium">{r.item_name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
              </div>
              <p className="text-zinc-400 text-sm">{r.quantity} {r.unit}</p>
              {r.order_number && (
                <p className="text-zinc-500 text-xs mt-0.5">Pedido #{String(r.order_number).padStart(3,"0")}</p>
              )}
              {r.notes && <p className="text-zinc-600 text-xs mt-0.5 italic">"{r.notes}"</p>}
              {r.admin_notes && (
                <p className="text-blue-400 text-xs mt-1">💬 Admin: {r.admin_notes}</p>
              )}
              <p className="text-zinc-600 text-xs mt-1">
                {new Date(r.created_at).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {(r.status === "pending" || r.status === "in_progress") && (
                <button onClick={() => { if (confirm("¿Confirmar que recibiste este suministro?")) markReceived.mutate(r.id); }}
                  className="btn-primary text-xs py-1 px-3">
                  Recibido
                </button>
              )}
              {r.status === "pending" && (
                <button onClick={() => { if (confirm("¿Cancelar esta solicitud?")) remove.mutate(r.id); }}
                  className="text-zinc-600 hover:text-red-400 text-xs transition-colors">
                  Cancelar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal nueva solicitud */}
      {showForm && (
        <RequestForm
          orders={ordersData ?? []}
          onSave={(d) => create.mutate(d)}
          onClose={() => setShowForm(false)}
          saving={create.isPending}
          error={create.error?.response?.data?.message}
        />
      )}
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
        <h2 className="text-white font-semibold">Solicitar insumo</h2>

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
                <option key={o.id} value={o.id}>
                  #{String(o.order_number).padStart(3,"0")} — {o.customer_name}
                </option>
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
