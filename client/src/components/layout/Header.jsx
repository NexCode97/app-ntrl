import { useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore.js";
import NotificationBell from "../notifications/NotificationBell.jsx";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/orders":    "Pedidos",
  "/orders/new": "Nuevo Pedido",
  "/customers": "Clientes",
  "/catalog":   "Catálogo",
  "/users":     "Usuarios",
  "/reports":   "Reportes",
  "/supplies":  "Suministros",
  "/profile":   "Mi Perfil",
  "/calendar":  "Calendario",
  "/chat":      "Chats",
  "/tasks":     "Mis Tareas",
};

export default function Header() {
  const location = useLocation();
  const { user } = useAuthStore();

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + "/")
  )?.[1] ?? "APP NTRL";

  return (
    <header className="bg-zinc-950 border-b border-zinc-800 px-4 md:px-6 py-3 flex items-center justify-end shrink-0">
      <div className="flex items-center gap-3 text-sm text-zinc-400">
        <span>{user?.name}</span>
        <span className="badge badge-completed text-center">
          {user?.role === "admin" ? "Admin" : user?.role === "vendedor" ? "Vendedor" : (user?.area ? user.area.charAt(0).toUpperCase() + user.area.slice(1) : "")}
        </span>
        {user?.role === "admin" && <NotificationBell />}
      </div>
    </header>
  );
}
