import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../config/api.js";
import { useAuthStore } from "../../stores/authStore.js";
import { fileUrl } from "../../utils/fileUrl.js";

const AREA_LABELS = {
  corte: "Corte", diseno: "Diseño",
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

// ── Sub-paso dentro de la tarjeta de diseño ────────────────────────────────
function DesignStep({ label, task, onMutate, isPending }) {
  if (!task) return null;
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-t border-zinc-700/60 first:border-t-0 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-zinc-300 text-sm font-medium w-20">{label}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>
      <div className="flex gap-2">
        {task.status === "pending" && (
          <button
            className="btn-secondary py-1 px-3 text-xs"
            onClick={() => onMutate({ taskId: task.id, status: "in_progress" })}
            disabled={isPending}
          >
            Empezar
          </button>
        )}
        {task.status === "in_progress" && (
          <button
            className="btn-primary py-1 px-3 text-xs"
            onClick={() => onMutate({ taskId: task.id, status: "done" })}
            disabled={isPending}
          >
            Marcar listo ✓
          </button>
        )}
        {task.status === "done" && (
          <span className="text-brand-green text-xs font-medium">Completado ✓</span>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isDiseno = user?.area === "diseno";

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
    const es = new EventSource(`/api/notifications/stream?token=${accessToken}`);
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

  // ── Stats (siempre por tarea individual) ──────────────────────────────────
  const pending    = tasks?.filter((t) => t.status === "pending").length ?? 0;
  const inProgress = tasks?.filter((t) => t.status === "in_progress").length ?? 0;
  const done       = tasks?.filter((t) => t.status === "done").length ?? 0;
  const supPending = suppliesData?.filter((s) => s.status === "pending").length ?? 0;

  // ── Lista de ítems a renderizar ───────────────────────────────────────────
  // Para diseño: agrupa las dos tareas del mismo pedido en un solo objeto
  // Para el resto: filtra las completadas (se muestran solo en stats)
  const activeItems = useMemo(() => {
    if (!tasks) return [];

    if (!isDiseno) {
      return tasks.filter((t) => t.status !== "done");
    }

    // Agrupar por order_id
    const map = {};
    tasks.forEach((t) => {
      if (!map[t.order_id]) {
        map[t.order_id] = {
          order_id:          t.order_id,
          order_number_fmt:  t.order_number_fmt,
          customer_name:     t.customer_name,
          delivery_date:     t.delivery_date,
          disenar:           null,
          imprimir:          null,
        };
      }
      if (t.area === "diseno_disenar") map[t.order_id].disenar = t;
      if (t.area === "diseno_imprimir") map[t.order_id].imprimir = t;
    });

    // Solo pedidos donde al menos una tarea no esté lista
    return Object.values(map).filter(
      (g) => g.disenar?.status !== "done" || g.imprimir?.status !== "done"
    );
  }, [tasks, isDiseno]);

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
          { label: "Pendientes",  value: pending,    color: "text-yellow-400" },
          { label: "En proceso",  value: inProgress, color: "text-blue-400"   },
          { label: "Completadas", value: done,       color: "text-brand-green"},
          { label: "Suministros", value: supPending, color: "text-zinc-400", sub: "pendientes" },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="card py-3 text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
            {sub && <p className="text-zinc-600 text-[10px]">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Tareas */}
      <div>
        <h2 className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-3">Mis tareas</h2>

        {mutError && (
          <div className="mb-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {mutError}
          </div>
        )}

        {isLoading && <p className="text-zinc-500 text-center py-8 text-sm">Cargando...</p>}

        {!isLoading && activeItems.length === 0 && (
          <div className="card text-center py-10">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-white font-medium">¡Todo al día!</p>
            <p className="text-zinc-500 text-sm mt-1">No tienes tareas pendientes por ahora.</p>
          </div>
        )}

        <div className="space-y-3">
          {activeItems.map((item) =>
            isDiseno ? (
              /* ── Tarjeta agrupada para diseño ── */
              <div key={item.order_id} className="card">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div className="min-w-0">
                    <span className="text-brand-green font-mono font-bold text-sm">#{item.order_number_fmt}</span>
                    <p className="text-white font-medium truncate mt-0.5">{item.customer_name}</p>
                    {item.delivery_date && (
                      <p className="text-zinc-600 text-xs mt-1">
                        Entrega: {new Date(String(item.delivery_date).slice(0, 10) + "T12:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <button
                    className="btn-secondary py-1.5 px-3 text-sm shrink-0"
                    onClick={() => navigate(`/tasks/${item.order_id}`)}
                  >
                    Ver pedido
                  </button>
                </div>

                {/* Sub-pasos */}
                <div className="space-y-0">
                  <DesignStep label="Diseñar"  task={item.disenar}  onMutate={(p) => mutation.mutate(p)} isPending={mutation.isPending} />
                  <DesignStep label="Imprimir" task={item.imprimir} onMutate={(p) => mutation.mutate(p)} isPending={mutation.isPending} />
                </div>
              </div>
            ) : (
              /* ── Tarjeta normal para otras áreas ── */
              <div key={item.id} className="card">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-brand-green font-mono font-bold text-sm">#{item.order_number_fmt}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    <p className="text-white font-medium truncate">{item.customer_name}</p>
                    {item.delivery_date && (
                      <p className="text-zinc-600 text-xs mt-1">
                        Entrega: {new Date(String(item.delivery_date).slice(0, 10) + "T12:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    <button
                      className="btn-secondary py-1.5 px-3 text-sm"
                      onClick={() => navigate(`/tasks/${item.order_id}`)}
                    >
                      Ver pedido
                    </button>
                    {item.status === "pending" && (
                      <button
                        className="btn-secondary py-1.5 px-4 text-sm"
                        onClick={() => mutation.mutate({ taskId: item.id, status: "in_progress" })}
                        disabled={mutation.isPending}
                      >
                        Empezar
                      </button>
                    )}
                    {item.status === "in_progress" && (
                      <button
                        className="btn-primary py-1.5 px-4 text-sm"
                        onClick={() => mutation.mutate({ taskId: item.id, status: "done" })}
                        disabled={mutation.isPending}
                      >
                        Marcar listo ✓
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
