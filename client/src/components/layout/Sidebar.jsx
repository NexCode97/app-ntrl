import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore.js";
import { api, API_BASE } from "../../config/api.js";
import { fileUrl } from "../../utils/fileUrl.js";
import { subscribeToPush } from "../../utils/pushSubscription.js";

const AREA_LABELS = { corte: "Corte", diseno: "Diseño", sublimacion: "Sublimación", ensamble: "Ensamble", terminados: "Terminados" };

const VENDEDOR_LINKS = [
  { to: "/dashboard", label: "Dashboard",   icon: "📊" },
  { to: "/orders",    label: "Pedidos",     icon: "📋" },
  { to: "/customers", label: "Clientes",    icon: "👥" },
  { to: "/catalog",   label: "Catálogo",    icon: "🏷️" },
  { to: "/supplies",  label: "Suministros", icon: "📦" },
  { to: "/chat",      label: "Mensajes",    icon: "💬" },
];

const ADMIN_LINKS = [
  { to: "/dashboard", label: "Dashboard",  icon: "📊" },
  { to: "/orders",    label: "Pedidos",     icon: "📋" },
  { to: "/customers", label: "Clientes",    icon: "👥" },
  { to: "/catalog",   label: "Catálogo",    icon: "🏷️" },
  { to: "/users",     label: "Usuarios",    icon: "👤" },
  { to: "/supplies",  label: "Suministros", icon: "📦" },
  { to: "/reports",   label: "Reportes",    icon: "📈" },
  { to: "/calendar",  label: "Calendario",  icon: "📅" },
  { to: "/chat",      label: "Mensajes",    icon: "💬" },
];

const WORKER_LINKS = [
  { to: "/tasks",    label: "Mis Tareas",   icon: "✅" },
  { to: "/supplies", label: "Suministros",  icon: "📦" },
  { to: "/chat",     label: "Mensajes",     icon: "💬" },
  { to: "/calendar", label: "Calendario",   icon: "📅" },
];

export default function Sidebar() {
  const { user, clearAuth, accessToken } = useAuthStore();
  const navigate = useNavigate();
  const links = user?.role === "admin" ? ADMIN_LINKS : user?.role === "vendedor" ? VENDEDOR_LINKS : WORKER_LINKS;
  const [chatUnread,     setChatUnread]     = useState(0);
  const [tasksCount,     setTasksCount]     = useState(0);
  const [suppliesCount,  setSuppliesCount]  = useState(0);
  const [notifPerm,      setNotifPerm]      = useState(() =>
    "Notification" in window ? Notification.permission : "granted"
  );

  // Cargar conteos al montar
  useEffect(() => {
    if (!user) return;
    api.get("/chat/unread-count").then(({ data }) => setChatUnread(data.count)).catch(() => {});
    if (user.role === "worker") {
      api.get("/production/my-tasks")
        .then(({ data }) => setTasksCount((data.data ?? []).filter((t) => t.status === "pending").length))
        .catch(() => {});
      api.get("/supplies")
        .then(({ data }) => setSuppliesCount((data.data ?? []).filter((s) => s.status === "pending").length))
        .catch(() => {});
    }
    if (user.role === "admin") {
      api.get("/supplies")
        .then(({ data }) => setSuppliesCount((data.data ?? []).filter((s) => s.status === "pending").length))
        .catch(() => {});
    }
  }, [user]);

  // Solicitar permiso y suscribir a push al montar
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      // Ya tiene permiso → asegurar suscripción activa
      subscribeToPush().catch(() => {});
    } else if (Notification.permission === "default") {
      // Pedir permiso y suscribir si acepta
      subscribeToPush().catch(() => {});
    }
  }, []);

  // SSE: actualizar badges en tiempo real
  useEffect(() => {
    if (!accessToken) return;
    const es = new EventSource(`${API_BASE}/notifications/stream?token=${accessToken}`);
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "new_message") {
          setChatUnread((n) => n + 1);
          // Notificación del sistema si la app está en segundo plano
          if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
            new Notification(`Mensaje de ${msg.fromName ?? "Usuario"}`, {
              body: msg.message?.content || "Te envio un archivo adjunto",
              icon: "/icons/icon-192.png",
            });
          }
        }
        // Refrescar tareas y suministros en cualquier evento de producción
        if (["area_completed", "area_started"].includes(msg.type) && user?.role === "worker") {
          api.get("/production/my-tasks")
            .then(({ data }) => setTasksCount((data.data ?? []).filter((t) => t.status === "pending").length))
            .catch(() => {});
        }
      } catch { /* ignorar */ }
    };
    return () => es.close();
  }, [accessToken, user]);

  async function handleLogout() {
    try { await api.post("/auth/logout"); } catch { /* ignorar */ }
    clearAuth();
    navigate("/login");
  }

  return (
    <aside className="w-16 md:w-56 bg-zinc-950 border-r border-zinc-800 flex flex-col py-4">
      {/* Logo */}
      <div className="px-3 mb-4 flex items-center gap-2 justify-center md:justify-start">
        <div className="w-10 h-10 border border-zinc-700 rounded-lg overflow-hidden shrink-0">
          <img
            src="/logo.png"
            alt="Natural Ropa Deportiva"
            className="w-full h-full object-contain"
          />
        </div>
        <span className="hidden md:block text-white font-black text-lg tracking-wider">NTRL</span>
      </div>

      {/* Nav links */}
      <nav className="md:flex-1 px-2 space-y-1 overflow-y-auto max-h-[60vh] md:max-h-none">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => {
              if (to === "/chat")     setChatUnread(0);
              if (to === "/tasks")    setTasksCount(0);
              if (to === "/supplies") setSuppliesCount(0);
            }}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors text-sm font-medium
              ${isActive
                ? "bg-brand-green text-black"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`
            }
          >
            {(() => {
              const count = to === "/chat" ? chatUnread : to === "/tasks" ? tasksCount : (to === "/supplies" && user?.role === "admin") ? suppliesCount : 0;
              return (
                <span className="text-lg w-6 text-center relative">
                  {icon}
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
              );
            })()}
            <span className="hidden md:block flex-1">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="mt-auto px-2 pt-4 border-t border-zinc-800">
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 px-2 py-1.5 mb-1 w-full rounded-lg hover:bg-zinc-800 transition-colors text-left"
        >
          {user?.avatar ? (
            <img
              src={fileUrl(user.avatar)}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border border-zinc-600 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="hidden md:block overflow-hidden">
            <p className="text-white text-xs font-medium truncate">{user?.name}</p>
            <p className="text-zinc-500 text-xs truncate">{user?.role === "admin" ? "Administrador" : user?.role === "vendedor" ? "Vendedor" : (AREA_LABELS[user?.area] ?? user?.area)}</p>
          </div>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-2 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-sm"
        >
          <span className="text-lg w-6 text-center">🚪</span>
          <span className="hidden md:block">Salir</span>
        </button>
      </div>
    </aside>
  );
}
