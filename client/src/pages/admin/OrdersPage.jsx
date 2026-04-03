import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../config/api.js";

const STATUS_LABELS = {
  pending:     { label: "Pendiente",   cls: "badge-pending"   },
  in_progress: { label: "En proceso",  cls: "badge-progress"  },
  completed:   { label: "Completado",  cls: "badge-completed" },
  delivered:   { label: "Entregado",   cls: "badge-delivered" },
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const [search,     setSearch]     = useState("");
  const [statusFilter, setStatus]   = useState("");
  const [page,       setPage]       = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page, search, statusFilter],
    queryFn:  () => api.get(`/orders?page=${page}&limit=20&search=${search}&status=${statusFilter}`)
                       .then((r) => r.data),
    keepPreviousData: true,
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <input
            className="input-field flex-1 md:max-w-xs"
            placeholder="Buscar por # o cliente..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <button className="btn-primary shrink-0 whitespace-nowrap" onClick={() => navigate("/orders/new")}>
            + Nuevo Pedido
          </button>
        </div>
        <select className="input-field w-full md:w-40" value={statusFilter}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-zinc-800 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3 text-left">Entrega</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Cargando...</td></tr>
            )}
            {data?.data?.map((order) => {
              const s = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
              return (
                <tr key={order.id}
                  className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/orders/${order.id}`)}>
                  <td className="px-4 py-3 font-mono text-brand-green font-semibold">#{order.order_number}</td>
                  <td className="px-4 py-3 text-white">{order.customer_name}</td>
                  <td className="px-4 py-3 text-center"><span className={`${s.cls} whitespace-nowrap`}>{s.label}</span></td>
                  <td className="px-4 py-3 text-right text-white">${Number(order.total).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-yellow-400">${Number(order.balance).toLocaleString()}</td>
                  <td className="px-4 py-3 text-zinc-400">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString("es-CO") : "—"}</td>
                </tr>
              );
            })}
            {!isLoading && !data?.data?.length && (
              <tr><td colSpan={6} className="text-center py-8 text-zinc-500">No hay pedidos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data?.total > 20 && (
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>Mostrando {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} de {data.total}</span>
          <div className="flex gap-2">
            <button className="btn-secondary py-1 px-3" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
            <button className="btn-secondary py-1 px-3" disabled={page * 20 >= data.total} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
          </div>
        </div>
      )}
    </div>
  );
}
