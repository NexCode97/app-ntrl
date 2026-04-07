import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { api } from "../../config/api.js";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";

const STATUS_COLORS = {
  pending: "#71717a", in_progress: "#eab308", completed: "#22c55e", delivered: "#98f909",
};

const AREA_LABELS = {
  corte: "Corte", diseno_disenar: "Diseño", impresion: "Impresión",
  sublimacion: "Sublimación", ensamble: "Ensamble", terminados: "Terminados",
};

const TASK_DOT = {
  pending:     "bg-zinc-600",
  in_progress: "bg-yellow-400",
  done:        "bg-brand-green",
};

const KANBAN_COLUMNS = [
  { key: "pending",     label: "Pendiente",        color: "text-yellow-400", border: "border-yellow-500/40",  dot: "bg-yellow-400"  },
  { key: "in_progress", label: "En producción",    color: "text-blue-400",   border: "border-blue-500/40",    dot: "bg-blue-400"    },
  { key: "completed",   label: "Listo p/ entrega", color: "text-brand-green",border: "border-brand-green/40", dot: "bg-brand-green" },
];

function KanbanCard({ order, onClick }) {
  const progress = Math.round(
    (order.tasks.filter((t) => t.status === "done").length / order.tasks.length) * 100
  );
  const isUrgent = order.delivery_date && (() => {
    const diff = (new Date(String(order.delivery_date).slice(0,10) + "T12:00:00") - new Date()) / 86400000;
    return diff <= 3 && diff >= 0;
  })();

  return (
    <div
      onClick={onClick}
      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-3 cursor-pointer transition-colors space-y-2"
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-brand-green font-mono font-bold text-sm">#{order.order_number_fmt}</span>
        {isUrgent && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full">Urgente</span>}
      </div>
      <p className="text-white text-xs font-medium truncate">{order.customer_name}</p>
      {order.delivery_date && (
        <p className="text-zinc-500 text-[11px]">
          📅 {new Date(String(order.delivery_date).slice(0,10) + "T12:00:00").toLocaleDateString("es-CO", { day:"2-digit", month:"short" })}
        </p>
      )}
      <div className="w-full bg-zinc-800 rounded-full h-1">
        <div className="bg-brand-green h-1 rounded-full" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex flex-wrap gap-1">
        {order.tasks.map((t) => (
          <span key={t.area} className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${TASK_DOT[t.status] ?? "bg-zinc-600"}`} />
            <span className="text-zinc-500 text-[10px]">{AREA_LABELS[t.area] ?? t.area}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function handleRefresh() {
    await api.delete("/dashboard/cache").catch(() => {});
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["production-overview"] });
    qc.invalidateQueries({ queryKey: ["upcoming-deliveries"] });
  }

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn:  () => api.get("/dashboard").then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: production } = useQuery({
    queryKey: ["production-overview"],
    queryFn:  () => api.get("/production/overview").then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: upcomingDeliveries } = useQuery({
    queryKey: ["upcoming-deliveries"],
    queryFn:  () => api.get("/dashboard/upcoming-deliveries").then((r) => r.data.data),
    refetchInterval: 60000,
  });

  // Datos siempre presentes — si no hay info real se muestran en cero
  const byStatusData = useMemo(() => {
    const base = { pending: 0, in_progress: 0, completed: 0, delivered: 0 };
    (data?.byStatus ?? []).forEach((r) => { base[r.status] = Number(r.total); });
    return Object.entries(base).map(([status, total]) => ({
      status, total,
      label: { pending:"Pendiente", in_progress:"En proceso", completed:"Completado", delivered:"Entregado" }[status],
    }));
  }, [data?.byStatus]);

  const monthlyData = useMemo(() => {
    if (data?.monthly?.length) return data.monthly.map((r) => ({ ...r, revenue: Number(r.revenue) }));
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { month: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`, orders: 0, revenue: 0 };
    });
  }, [data?.monthly]);

  const bySportData = useMemo(() => {
    if (data?.bySport?.length) return data.bySport.map((r) => ({ ...r, revenue: Number(r.revenue) }));
    return [{ sport: "Sin datos aún", revenue: 0, orders: 0 }];
  }, [data?.bySport]);

  if (isLoading) return <div className="text-zinc-500 text-center py-12">Cargando dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Header con botón refresh */}
      <div className="flex items-center justify-between">
        <h1 className="text-white font-bold text-xl">Dashboard</h1>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-3 py-1.5 transition-colors"
        >
          ↻ Actualizar
        </button>
      </div>

      {/* KPIs financieros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-zinc-400 text-sm mb-1">Total facturado</p>
          <p className="text-brand-green text-2xl font-bold">${Number(data?.financial?.total_revenue || 0).toLocaleString()}</p>
        </div>
        <div className="card text-center">
          <p className="text-zinc-400 text-sm mb-1">Recaudado</p>
          <p className="text-white text-2xl font-bold">${Number(data?.financial?.collected || 0).toLocaleString()}</p>
        </div>
        <div className="card text-center">
          <p className="text-zinc-400 text-sm mb-1">Pendiente de cobro</p>
          <p className="text-yellow-400 text-2xl font-bold">${Number(data?.financial?.pending || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Pedidos por estado + Entregas próximas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div>
          <h2 className="text-white font-semibold mb-3">Pedidos por estado</h2>
          <div className="grid grid-cols-2 gap-3">
            {byStatusData.map((item) => (
              <div key={item.status} className="card text-center flex flex-col items-center justify-center py-4">
                <p className="text-3xl font-black" style={{ color: STATUS_COLORS[item.status] }}>{item.total}</p>
                <p className="text-zinc-500 text-xs mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-white font-semibold mb-3">Entregas próximas</h2>
          <div className="card space-y-2">
            {(() => {
              const upcoming = upcomingDeliveries ?? [];
              if (!upcoming.length) return (
                <p className="text-zinc-600 text-sm text-center py-4">Sin entregas programadas.</p>
              );
              return upcoming.map((o) => {
                const diff = (new Date(String(o.delivery_date).slice(0,10) + "T12:00:00") - new Date()) / 86400000;
                const isToday   = diff >= -1 && diff < 0;
                const isOverdue = diff < -1;
                const isUrgent  = diff >= 0 && diff <= 3;
                return (
                  <div
                    key={o.id}
                    onClick={() => navigate(`/orders/${o.id}`)}
                    className="flex items-center justify-between gap-3 py-2 border-b border-zinc-800 last:border-0 cursor-pointer hover:bg-zinc-800/40 rounded px-1 -mx-1 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-brand-green font-mono font-bold text-xs">#{o.order_number_fmt}</span>
                        {isOverdue && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full">Vencido</span>}
                        {isToday && <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-full">Hoy</span>}
                        {isUrgent && !isToday && <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded-full">Urgente</span>}
                      </div>
                      <p className="text-zinc-300 text-xs truncate">{o.customer_name}</p>
                    </div>
                    <p className={`text-xs shrink-0 font-medium ${isOverdue ? "text-red-400" : isToday ? "text-blue-400" : isUrgent ? "text-orange-400" : "text-zinc-500"}`}>
                      {new Date(String(o.delivery_date).slice(0,10) + "T12:00:00").toLocaleDateString("es-CO", { day:"2-digit", month:"short" })}
                    </p>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Ventas mensuales + Ventas por deporte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <div className="flex flex-col">
          <h2 className="text-white font-semibold mb-3">Ventas mensuales</h2>
          <div className="card flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} />
                <Bar dataKey="revenue" fill="#98f909" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col">
          <h2 className="text-white font-semibold mb-3">Ventas por deporte</h2>
          <div className="card flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySportData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="sport" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a" }} />
                <Bar dataKey="revenue" fill="#98f909" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Producción en curso */}
      <div>
        <h2 className="text-white font-semibold mb-3">Producción en curso</h2>

        {/* Tablero Kanban */}
        {!production?.length ? (
          <div className="card text-center py-6">
            <p className="text-zinc-500 text-sm">No hay pedidos en producción.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {KANBAN_COLUMNS.map((col) => {
              const orders = (production ?? []).filter((o) => o.order_status === col.key);
              return (
                <div key={col.key} className={`bg-zinc-900/50 border ${col.border} rounded-xl p-3`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                    <span className="ml-auto text-xs text-zinc-600 bg-zinc-800 rounded-full px-2 py-0.5">{orders.length}</span>
                  </div>
                  {orders.length === 0 ? (
                    <p className="text-zinc-700 text-xs text-center py-4">Sin pedidos</p>
                  ) : (
                    <div className="space-y-2">
                      {orders.map((order) => (
                        <KanbanCard
                          key={order.id}
                          order={order}
                          onClick={() => navigate(`/orders/${order.id}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
