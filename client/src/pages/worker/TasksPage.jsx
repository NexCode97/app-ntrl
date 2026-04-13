import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "../../config/api.js";
import { useAuthStore } from "../../stores/authStore.js";
import { fileUrl } from "../../utils/fileUrl.js";
import { hardRefresh } from "../../utils/hardRefresh.js";

const AREA_LABELS = {
  corte: "Corte", diseno: "Diseño", impresion: "Impresión",
  sublimacion: "Sublimación", ensamble: "Ensamble", terminados: "Terminados",
};

const STATUS_COLORS = {
  pending:     "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  done:        "bg-brand-green/20 text-brand-green border border-brand-green/30",
};
const STATUS_LABELS = { pending: "Pendiente", in_progress: "En proceso", done: "Listo" };

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

export default function TasksPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["my-tasks"],
    queryFn:  () => api.get("/production/my-tasks").then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: suppliesData } = useQuery({
    queryKey: ["supplies-worker"],
    queryFn:  () => api.get("/supplies").then((r) => r.data.data),
  });

  const [mutError, setMutError] = useState(null);

  function handleRefresh() {
    hardRefresh();
  }

  const mutation = useMutation({
    mutationFn: ({ taskId, status }) => api.patch(`/production/tasks/${taskId}/status`, { status }),
    onSuccess:  () => {
      setMutError(null);
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      qc.invalidateQueries({ queryKey: ["production-overview"] });
    },
    onError: (err) => {
      setMutError(err.response?.data?.message || "No se pudo actualizar la tarea. Intenta de nuevo.");
    },
  });

  // SSE: refrescar tareas cuando un pedido es eliminado
  useEffect(() => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return;
    const es = new EventSource(`${API_BASE}/notifications/stream?token=${accessToken}`);
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "order_deleted") {
          qc.invalidateQueries({ queryKey: ["my-tasks"] });
        }
      } catch { /* ignorar */ }
    };
    return () => es.close();
  }, [qc]);

  const [statusFilter, setStatusFilter] = useState(null);

  const pending    = tasks?.filter((t) => t.status === "pending").length ?? 0;
  const inProgress = tasks?.filter((t) => t.status === "in_progress").length ?? 0;
  const done       = tasks?.filter((t) => t.status === "done").length ?? 0;
  const supPending = suppliesData?.filter((s) => s.status === "pending").length ?? 0;

  const visibleTasks = statusFilter
    ? (tasks?.filter((t) => t.status === statusFilter) ?? [])
    : (tasks?.filter((t) => t.status !== "done") ?? []);

  function toggleFilter(status) {
    setStatusFilter((prev) => (prev === status ? null : status));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Saludo */}
      <div className="card">
        <div className="flex items-center gap-4">
          {user?.avatar ? (
            <img src={fileUrl(user.avatar)} alt="" className="w-12 h-12 rounded-full object-cover border border-zinc-600 shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-brand-green/20 border border-brand-green/30 flex items-center justify-center text-brand-green text-xl font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-zinc-400 text-sm">{greet()},</p>
            <p className="text-white font-semibold text-lg leading-tight">{user?.name}</p>
            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-green/20 text-brand-green border border-brand-green/30">
              {AREA_LABELS[user?.area] ?? user?.area}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Pendientes",  value: pending,    color: "text-yellow-400",  status: "pending"     },
          { label: "En proceso",  value: inProgress, color: "text-blue-400",    status: "in_progress" },
          { label: "Completadas", value: done,       color: "text-brand-green", status: "done"        },
          { label: "Suministros", value: supPending, color: "text-zinc-400",    status: null, sub: "pendientes" },
        ].map(({ label, value, color, status, sub }) => {
          const active = statusFilter === status && status !== null;
          return (
            <div
              key={label}
              onClick={() => status && toggleFilter(status)}
              className={`card py-3 text-center transition-colors ${status ? "cursor-pointer hover:border-zinc-500" : ""} ${active ? "border border-brand-green/60 bg-brand-green/5" : ""}`}
            >
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
              {sub && <p className="text-zinc-600 text-[10px]">{sub}</p>}
              {active && <p className="text-brand-green text-[10px] mt-0.5">● Filtro activo</p>}
            </div>
          );
        })}
      </div>

      {/* Tareas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Mis tareas</h2>
          <button onClick={handleRefresh} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-3 py-1.5 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Actualizar</button>
        </div>

        {mutError && (
          <div className="mb-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {mutError}
          </div>
        )}

        {isLoading && <p className="text-zinc-500 text-center py-8 text-sm">Cargando...</p>}

        {!isLoading && visibleTasks.length === 0 && (
          <div className="card text-center py-10">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-white font-medium">¡Todo al día!</p>
            <p className="text-zinc-500 text-sm mt-1">No tienes tareas pendientes por ahora.</p>
          </div>
        )}

        <div className="space-y-3">
          {visibleTasks.map((task) => (
            <div key={task.id} className="card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-brand-green font-mono font-bold text-sm">#{task.order_number_fmt}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[task.status]}`}>
                      {STATUS_LABELS[task.status]}
                    </span>
                  </div>
                  <p className="text-white font-medium truncate">{task.customer_name}</p>
                  {task.delivery_date && (
                    <p className="text-zinc-600 text-xs mt-1">
                      Entrega: {new Date(String(task.delivery_date).slice(0, 10) + "T12:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                  <button
                    className="btn-secondary py-1.5 px-3 text-sm"
                    onClick={() => navigate(`/tasks/${task.order_id}`)}
                  >
                    Ver pedido
                  </button>
                  {task.status === "pending" && (
                    <button
                      className="btn-secondary py-1.5 px-4 text-sm"
                      onClick={() => mutation.mutate({ taskId: task.id, status: "in_progress" })}
                      disabled={mutation.isPending}
                    >
                      Empezar
                    </button>
                  )}
                  {task.status === "in_progress" && (
                    <button
                      className="btn-primary py-1.5 px-4 text-sm"
                      onClick={() => mutation.mutate({ taskId: task.id, status: "done" })}
                      disabled={mutation.isPending}
                    >
                      Marcar listo ✓
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
