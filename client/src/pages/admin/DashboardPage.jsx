import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback } from "react";
import { api } from "../../config/api.js";
import { useAuthStore } from "../../stores/authStore.js";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Sector,
} from "recharts";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import CountUp from "react-countup";

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
          <CalendarDaysIcon className="w-3 h-3 inline-block mr-0.5 -mt-0.5" /> {new Date(String(order.delivery_date).slice(0,10) + "T12:00:00").toLocaleDateString("es-CO", { day:"2-digit", month:"short" })}
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

const KANBAN_PREVIEW = 5;

function KanbanSection({ production, navigate }) {
  const [expanded, setExpanded] = useState(false);
  const total = (production ?? []).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold">Producción en curso</h2>
        {total > KANBAN_PREVIEW && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-brand-green hover:text-white border border-brand-green/40 hover:border-brand-green rounded-lg px-3 py-1 transition-colors"
          >
            {expanded ? "Ver menos" : `Ver completo (${total})`}
          </button>
        )}
      </div>

      {!production?.length ? (
        <div className="card text-center py-6">
          <p className="text-zinc-500 text-sm">No hay pedidos en producción.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const orders = (production ?? []).filter((o) => o.order_status === col.key);
            const visible = expanded ? orders : orders.slice(0, KANBAN_PREVIEW);
            const hidden  = orders.length - visible.length;
            return (
              <div key={col.key} className={`bg-zinc-900/50 border ${col.border} rounded-xl p-3`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                  <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                  <span className="ml-auto text-xs text-white font-bold bg-zinc-700 rounded-full px-2 py-0.5">{orders.length}</span>
                </div>
                {orders.length === 0 ? (
                  <p className="text-zinc-700 text-xs text-center py-4">Sin pedidos</p>
                ) : (
                  <div className="space-y-2">
                    {visible.map((order) => (
                      <KanbanCard
                        key={order.id}
                        order={order}
                        onClick={() => navigate(`/orders/${order.id}`)}
                      />
                    ))}
                    {!expanded && hidden > 0 && (
                      <button
                        onClick={() => setExpanded(true)}
                        className="w-full text-xs text-zinc-500 hover:text-white py-2 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors"
                      >
                        +{hidden} más
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isVendedor = user?.role === "vendedor";

  const [refreshing, setRefreshing] = useState(false);
  const [showAllPending,    setShowAllPending]    = useState(false);
  const [showAllProduction, setShowAllProduction] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await api.delete("/dashboard/cache").catch(() => {});
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (_) {}
    window.location.replace(window.location.pathname + "?v=" + Date.now());
  }

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn:  () => api.get("/dashboard").then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
    enabled: !isVendedor,
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

  const { data: pendingBalances } = useQuery({
    queryKey: ["pending-balances"],
    queryFn:  () => api.get("/dashboard/pending-balances").then((r) => r.data.data),
    refetchInterval: 60000,
    enabled: isVendedor,
  });

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(null); // null = mes actual
  const [activePieIndex, setActivePieIndex] = useState(null);
  const onPieEnter = useCallback((_, index) => setActivePieIndex(index), []);
  const onPieLeave = useCallback(() => setActivePieIndex(null), []);
  const [selectedSport, setSelectedSport] = useState(null);

  const { data: monthlyHistory } = useQuery({
    queryKey: ["dashboard-history"],
    queryFn:  () => api.get("/dashboard/history").then((r) => r.data.data),
    staleTime: 0,
    enabled: !isVendedor,
  });

  const { data: sportByMonth } = useQuery({
    queryKey: ["sport-by-month", selectedMonth ?? currentMonth],
    queryFn:  () => api.get(`/dashboard/sport-by-month?month=${selectedMonth ?? currentMonth}`).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  // Datos del mes seleccionado (historial) o del mes actual (live)
  const selectedSnapshot = useMemo(() => {
    if (!selectedMonth) return null;
    return (monthlyHistory ?? []).find((s) => s.month === selectedMonth) ?? null;
  }, [selectedMonth, monthlyHistory]);

  const financialDisplay = selectedSnapshot
    ? { total_revenue: selectedSnapshot.total_revenue, collected: selectedSnapshot.collected, pending: selectedSnapshot.pending }
    : data?.financial;

  // Datos siempre presentes — si no hay info real se muestran en cero
  const byStatusData = useMemo(() => {
    const base = { pending: 0, in_progress: 0, completed: 0, delivered: 0 };
    if (selectedSnapshot) {
      Object.entries(selectedSnapshot.status_counts ?? {}).forEach(([k, v]) => { base[k] = Number(v); });
    } else {
      (data?.byStatus ?? []).forEach((r) => { base[r.status] = Number(r.total); });
    }
    return Object.entries(base).map(([status, total]) => ({
      status, total,
      label: { pending:"Pendiente", in_progress:"En proceso", completed:"Completado", delivered:"Entregado" }[status],
    }));
  }, [data?.byStatus, selectedSnapshot]);

  const monthlyData = useMemo(() => {
    if (data?.monthly?.length) return data.monthly.map((r) => ({ ...r, Ingresos: Number(r.revenue) }));
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { month: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`, orders: 0, Ingresos: 0 };
    });
  }, [data?.monthly]);

  const bySportData = useMemo(() => {
    const src = sportByMonth ?? data?.bySport ?? [];
    if (src.length) return src.map((r) => ({ ...r, Ingresos: Number(r.revenue) }));
    return [{ sport: "Sin datos aún", Ingresos: 0, orders: 0 }];
  }, [sportByMonth, data?.bySport]);

  // Dona — estado del dinero
  const donutData = useMemo(() => {
    const collected = Number(financialDisplay?.collected || 0);
    const pending   = Number(financialDisplay?.pending   || 0);
    if (collected === 0 && pending === 0) return [];
    return [
      { name: "Recaudado",  value: collected, color: "#98f909" },
      { name: "Por cobrar", value: pending,   color: "#eab308" },
    ];
  }, [financialDisplay]);

  const formatPesos = (v) => `$${Number(v).toLocaleString("es-CO")}`;
  const formatShort = (v) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })}M`;
    if (v >= 1_000)     return `$${(v / 1_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })}K`;
    return `$${v}`;
  };
  const formatMonth = (m) => {
    if (!m) return "";
    const [year, month] = m.split("-");
    return new Date(year, month - 1).toLocaleDateString("es-CO", { month: "short", year: "numeric" });
  };

  if (isLoading && !isVendedor) return <div className="text-zinc-500 text-center py-12">Cargando dashboard...</div>;

  /* ── Vista Vendedor ── */
  if (isVendedor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="lg:hidden text-white font-bold text-xl">Dashboard</h1>
          <button onClick={handleRefresh} className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-3 py-1.5 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? "animate-spin" : ""}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> {refreshing ? "Actualizando..." : "Actualizar"}</button>
        </div>

        {/* Próximas entregas */}
        <div>
          <h2 className="text-white font-semibold mb-3">Entregas próximas</h2>
          <div className="card space-y-2">
            {(() => {
              const upcoming = upcomingDeliveries ?? [];
              if (!upcoming.length) return <p className="text-zinc-600 text-sm text-center py-4">Sin entregas programadas.</p>;
              return upcoming.map((o) => {
                const diff = (new Date(String(o.delivery_date).slice(0,10) + "T12:00:00") - new Date()) / 86400000;
                const isToday   = diff >= -1 && diff < 0;
                const isOverdue = diff < -1;
                const isUrgent  = diff >= 0 && diff <= 3;
                return (
                  <div key={o.id} onClick={() => navigate(`/orders/${o.id}`)}
                    className="flex items-center justify-between gap-3 py-2 border-b border-zinc-800 last:border-0 cursor-pointer hover:bg-zinc-800/40 rounded px-1 -mx-1 transition-colors">
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

        {/* Pendiente de cobro */}
        <div>
          <div className="card divide-y divide-zinc-800/60 p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-white font-semibold">Pendiente de cobro</h2>
              {pendingBalances?.length > 0 && (
                <span className="text-yellow-400 font-bold text-sm">
                  ${pendingBalances.reduce((s, o) => s + Number(o.balance), 0).toLocaleString("es-CO")}
                </span>
              )}
            </div>
            {!pendingBalances?.length ? (
              <p className="text-zinc-600 text-sm text-center py-6">Sin saldos pendientes.</p>
            ) : (
              <>
                {(showAllPending ? pendingBalances : pendingBalances.slice(0, 5)).map((o) => (
                  <div key={o.id}
                    onClick={() => navigate(`/orders/${o.id}?tab=financial`)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 cursor-pointer transition-colors">
                    <span className="text-brand-green font-mono font-bold text-sm shrink-0 w-12">
                      #{o.order_number_fmt}
                    </span>
                    <span className="text-zinc-200 text-sm truncate flex-1 min-w-0">
                      {o.customer_name}
                    </span>
                    <div className="text-right shrink-0">
                      <p className="text-yellow-400 font-bold text-sm leading-tight">
                        ${Number(o.balance).toLocaleString("es-CO")}
                      </p>
                      <p className="text-zinc-600 text-[11px] leading-tight">
                        de ${Number(o.total).toLocaleString("es-CO")}
                      </p>
                    </div>
                  </div>
                ))}
                {pendingBalances.length > 5 && (
                  <button
                    onClick={() => setShowAllPending((v) => !v)}
                    className="w-full py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors text-center">
                    {showAllPending
                      ? "Ver menos ↑"
                      : `Ver todos (${pendingBalances.length - 5} más) ↓`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Producción en curso */}
        <div>
          <h2 className="text-white font-semibold mb-3">Producción en curso</h2>
          {!production?.length ? (
            <div className="card text-center py-6">
              <p className="text-zinc-500 text-sm">No hay pedidos en producción.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {KANBAN_COLUMNS.map((col) => {
                const orders = (production ?? []).filter((o) => o.order_status === col.key);
                const LIMIT = 3;
                const visible = showAllProduction ? orders : orders.slice(0, LIMIT);
                const hidden  = orders.length - LIMIT;
                return (
                  <div key={col.key} className={`bg-zinc-900/50 border ${col.border} rounded-xl p-3`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                      <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                      <span className="ml-auto text-xs text-white font-bold bg-zinc-700 rounded-full px-2 py-0.5">{orders.length}</span>
                    </div>
                    {orders.length === 0 ? (
                      <p className="text-zinc-700 text-xs text-center py-4">Sin pedidos</p>
                    ) : (
                      <div className="space-y-2">
                        {visible.map((order) => (
                          <KanbanCard key={order.id} order={order} onClick={() => navigate(`/orders/${order.id}`)} />
                        ))}
                        {!showAllProduction && hidden > 0 && (
                          <button
                            onClick={() => setShowAllProduction(true)}
                            className="w-full text-center text-[11px] text-zinc-500 hover:text-white py-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors">
                            +{hidden} más
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {showAllProduction && (production ?? []).some((o) => KANBAN_COLUMNS.some((c) => c.key === o.order_status)) && (
            <button
              onClick={() => setShowAllProduction(false)}
              className="mt-2 w-full text-center text-xs text-zinc-500 hover:text-white py-2 transition-colors">
              Ver menos ↑
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón refresh */}
      <div className="flex items-center justify-between">
        <h1 className="lg:hidden text-white font-bold text-xl">Dashboard</h1>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-3 py-1.5 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? "animate-spin" : ""}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> {refreshing ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {/* Selector de mes */}
      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-xs shrink-0">Ver mes:</span>
        <select
          value={selectedMonth ?? ""}
          onChange={(e) => { setSelectedMonth(e.target.value || null); setSelectedSport(null); }}
          className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-green cursor-pointer"
        >
          <option value="">{formatMonth(currentMonth)} (actual)</option>
          {(monthlyHistory ?? []).map((s) => (
            <option key={s.month} value={s.month}>{formatMonth(s.month)}</option>
          ))}
        </select>
      </div>

      {/* FILA 1 — KPIs financieros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total facturado",    value: Number(financialDisplay?.total_revenue || 0), color: "text-brand-green" },
          { label: "Recaudado",          value: Number(financialDisplay?.collected     || 0), color: "text-white"       },
          { label: "Pendiente de cobro", value: Number(financialDisplay?.pending       || 0), color: "text-yellow-400"  },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            className="card text-center"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
          >
            <p className="text-zinc-400 text-sm mb-1">{kpi.label}</p>
            <p className={`${kpi.color} text-2xl font-bold`}>
              $<CountUp
                end={kpi.value}
                duration={1.2}
                separator="."
                decimal=","
                preserveValue
              />
            </p>
          </motion.div>
        ))}
      </div>

      {/* FILA 2 — Dona + Ventas por deporte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Dona — estado del dinero */}
        <motion.div
          className="card flex flex-col"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
        >
          <h2 className="text-white font-semibold mb-3">
            Estado del dinero
            <span className="text-zinc-500 font-normal text-xs ml-2">{formatMonth(selectedMonth ?? currentMonth)}</span>
          </h2>
          {donutData.length === 0 ? (
            <p className="text-zinc-600 text-xs text-center py-10">Sin datos financieros.</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 flex-1">
              <div className="w-[180px] h-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={78}
                      isAnimationActive animationBegin={200} animationDuration={900} animationEasing="ease-out"
                      dataKey="value"
                      activeIndex={activePieIndex}
                      activeShape={(props) => {
                        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
                        const total = donutData.reduce((s, d) => s + d.value, 0);
                        return (
                          <g>
                            <text x={cx} y={cy - 10} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight="700">{payload.name}</text>
                            <text x={cx} y={cy + 10} textAnchor="middle" fill={fill} fontSize={13} fontWeight="800">
                              {`${Math.round((payload.value / total) * 100)}%`}
                            </text>
                            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 7} startAngle={startAngle} endAngle={endAngle} fill={fill} />
                            <Sector cx={cx} cy={cy} innerRadius={innerRadius - 5} outerRadius={innerRadius - 2} startAngle={startAngle} endAngle={endAngle} fill={fill} />
                          </g>
                        );
                      }}
                      onMouseEnter={onPieEnter}
                      onMouseLeave={onPieLeave}
                    >
                      {donutData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#a1a1aa" }}
                      itemStyle={{ color: "#ffffff" }}
                      formatter={(v, name) => [formatPesos(v), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1 min-w-0 w-full">
                {donutData.map((d) => {
                  const total = donutData.reduce((s, x) => s + x.value, 0);
                  const pct   = Math.round((d.value / total) * 100);
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
                          <span className="text-zinc-300 text-sm">{d.name}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: d.color }}>{pct}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: d.color }} />
                      </div>
                      <p className="text-zinc-400 text-xs mt-0.5">{formatPesos(d.value)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Ventas por deporte */}
        <motion.div
          className="card flex flex-col flex-1 min-h-[260px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18, ease: "easeOut" }}
        >
          <h2 className="text-white font-semibold mb-3">
            Ventas por deporte
            <span className="text-zinc-500 font-normal text-xs ml-2">{formatMonth(selectedMonth ?? currentMonth)}</span>
          </h2>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySportData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="sport" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={formatShort} width={55} />
                <Tooltip
                  cursor={{ fill: "#27272a" }}
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#a1a1aa" }}
                  itemStyle={{ color: "#ffffff" }}
                  formatter={(v, name, props) => [
                    `${formatPesos(v)} · ${props.payload.orders} pedido${props.payload.orders !== 1 ? "s" : ""}`,
                    "Ingresos",
                  ]}
                />
                <Bar
                  dataKey="Ingresos"
                  radius={[4,4,0,0]}
                  cursor="pointer"
                  onClick={(data) => setSelectedSport(data.sport === selectedSport ? null : data.sport)}
                  activeBar={{ fill: "#c5ff3a", filter: "drop-shadow(0 0 6px #98f909)" }}
                  isAnimationActive animationDuration={900} animationEasing="ease-out"
                >
                  {bySportData.map((entry) => (
                    <Cell
                      key={entry.sport}
                      fill={selectedSport === null || entry.sport === selectedSport ? "#98f909" : "#3f3f46"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* FILA 4 — Ventas mensuales + Pedidos por estado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <motion.div
          className="card flex flex-col flex-1 min-h-[260px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22, ease: "easeOut" }}
        >
          <h2 className="text-white font-semibold mb-3">Ventas mensuales</h2>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={formatMonth} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={formatShort} width={55} />
                <Tooltip
                  cursor={{ fill: "#27272a" }}
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#a1a1aa" }}
                  itemStyle={{ color: "#ffffff" }}
                  formatter={(v, name, props) => [
                    `${formatPesos(v)} · ${props.payload.orders} pedido${props.payload.orders !== 1 ? "s" : ""}`,
                    "Ingresos",
                  ]}
                  labelFormatter={(m) => `${formatMonth(m)}${m === (selectedMonth ?? currentMonth) ? " ● seleccionado" : " — clic para seleccionar"}`}
                />
                <Bar
                  dataKey="Ingresos"
                  radius={[4,4,0,0]}
                  cursor="pointer"
                  onClick={(data) => setSelectedMonth(data.month === currentMonth ? null : data.month)}
                  activeBar={{ fill: "#c5ff3a", filter: "drop-shadow(0 0 6px #98f909)" }}
                  isAnimationActive animationDuration={900} animationEasing="ease-out"
                >
                  {monthlyData.map((entry) => (
                    <Cell
                      key={entry.month}
                      fill={entry.month === (selectedMonth ?? currentMonth) ? "#c5ff3a" : "#98f909"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          className="card flex flex-col flex-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3, ease: "easeOut" }}
        >
          <h2 className="text-white font-semibold mb-3">
            Pedidos por estado
            <span className="text-zinc-500 font-normal text-xs ml-2">{formatMonth(selectedMonth ?? currentMonth)}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 flex-1">
            {byStatusData.map((item, i) => (
              <motion.div
                key={item.status}
                className="bg-zinc-800/50 rounded-xl text-center flex flex-col items-center justify-center py-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.32 + i * 0.06, ease: "easeOut" }}
              >
                <p className="text-3xl font-black" style={{ color: STATUS_COLORS[item.status] }}>
                  <CountUp end={item.total} duration={1} preserveValue />
                </p>
                <p className="text-zinc-500 text-xs mt-1">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Entregas próximas — fila separada debajo */}
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

      {/* Producción en curso */}
      <KanbanSection production={production} navigate={navigate} />
    </div>
  );
}
