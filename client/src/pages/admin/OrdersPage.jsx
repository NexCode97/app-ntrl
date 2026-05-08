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

function OrderCard({ order, onClick }) {
  const s = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
  return (
    <div
      onClick={onClick}
      className="card cursor-pointer hover:border-zinc-600 border border-zinc-800 transition-colors space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-brand-green font-mono font-bold text-sm">#{order.order_number}</span>
        <span className={`${s.cls} whitespace-nowrap`}>{s.label}</span>
      </div>
      <p className="text-white font-medium text-sm leading-snug">{order.customer_name}</p>
      {order.name && (
        <p className="text-zinc-400 text-xs truncate">{order.name}</p>
      )}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-xs text-zinc-500">
        <span>{order.created_at ? new Date(order.created_at).toLocaleDateString("es-CO") : "—"}</span>
        <div className="flex items-center gap-3">
          <span className="text-white font-medium">${Number(order.total).toLocaleString()}</span>
          {Number(order.balance) > 0 && (
            <span className="text-yellow-400">Saldo: ${Number(order.balance).toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [search,       setSearch]  = useState("");
  const [statusFilter, setStatus]  = useState("");
  const [page,         setPage]    = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page, search, statusFilter],
    queryFn:  () => api.get(`/orders?page=${page}&limit=20&search=${search}&status=${statusFilter}`)
                       .then((r) => r.data),
    keepPreviousData: true,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-white font-bold text-xl lg:hidden">Pedidos</h1>

      {/* Toolbar */}
      <div className="space-y-2">
        <input
          className="input-field w-full md:max-w-xs"
          placeholder="Buscar por # o cliente..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <div className="flex items-center gap-3">
          <button className="btn-primary w-full md:w-auto whitespace-nowrap" onClick={() => navigate("/orders/new")}>
            + Nuevo pedido
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

      {/* Mobile — Cards */}
      <div className="md:hidden space-y-3">
        {isLoading && (
          <p className="text-center text-zinc-500 py-8">Cargando...</p>
        )}
        {data?.data?.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onClick={() => navigate(`/orders/${order.id}`)}
          />
        ))}
        {!isLoading && !data?.data?.length && (
          <p className="text-center text-zinc-500 py-8">No hay pedidos.</p>
        )}
      </div>

      {/* Desktop — Table */}
      <div className="hidden md:block card overflow-hidden p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-zinc-800 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-center">Creación</th>
              <th className="px-4 py-3 text-center">Entrega</th>
              <th className="px-4 py-3 text-center">Total</th>
              <th className="px-4 py-3 text-center">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {isLoading && (
              <tr><td colSpan={8} className="text-center py-8 text-zinc-500">Cargando...</td></tr>
            )}
            {data?.data?.map((order) => {
              const s = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
              return (
                <tr key={order.id}
                  className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/orders/${order.id}`)}>
                  <td className="px-4 py-3 font-mono text-brand-green font-semibold">#{order.order_number}</td>
                  <td className="px-4 py-3 text-zinc-300 max-w-[180px] truncate">{order.name || <span className="text-zinc-600">—</span>}</td>
                  <td className="px-4 py-3 text-white">{order.customer_name}</td>
                  <td className="px-4 py-3 text-center"><span className={`${s.cls} whitespace-nowrap`}>{s.label}</span></td>
                  <td className="px-4 py-3 text-center text-zinc-400">{order.created_at ? new Date(order.created_at).toLocaleDateString("es-CO") : "—"}</td>
                  <td className="px-4 py-3 text-center text-zinc-400">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString("es-CO") : "—"}</td>
                  <td className="px-4 py-3 text-center text-white">${Number(order.total).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-yellow-400">${Number(order.balance).toLocaleString()}</td>
                </tr>
              );
            })}
            {!isLoading && !data?.data?.length && (
              <tr><td colSpan={8} className="text-center py-8 text-zinc-500">No hay pedidos.</td></tr>
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
