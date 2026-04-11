import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "../../config/api.js";
import { useAuthStore } from "../../stores/authStore.js";

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return "ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function NotificationBell() {
  const { accessToken, user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [open,         setOpen]         = useState(false);
  const [unread,       setUnread]       = useState(0);
  const [notifications,setNotifications]= useState([]);
  const [loading,      setLoading]      = useState(false);
  const dropdownRef = useRef(null);
  const esRef       = useRef(null);

  // Cargar conteo inicial
  const fetchCount = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications/unread-count");
      setUnread(data.count);
    } catch { /* ignorar */ }
  }, []);

  // Cargar lista cuando se abre
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/notifications?limit=20");
      setNotifications(data.data);
    } catch { /* ignorar */ } finally {
      setLoading(false);
    }
  }, []);

  // SSE — escuchar eventos en tiempo real
  useEffect(() => {
    if (!accessToken) return;

    const es = new EventSource(`${API_BASE}/notifications/stream?token=${accessToken}`);

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type) {
          setUnread((n) => n + 1);
          // Actualizar datos relacionados en tiempo real
          qc.invalidateQueries({ queryKey: ["production-overview"] });
          qc.invalidateQueries({ queryKey: ["orders"] });
          qc.invalidateQueries({ queryKey: ["order"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          qc.invalidateQueries({ queryKey: ["upcoming-deliveries"] });
          // Si el dropdown está abierto, recargar lista
          setOpen((isOpen) => {
            if (isOpen) fetchList();
            return isOpen;
          });
        }
      } catch { /* ignorar */ }
    };

    esRef.current = es;
    return () => es.close();
  }, [accessToken]);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  useEffect(() => {
    if (open) fetchList();
  }, [open]);

  // Cerrar al click fuera
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleMarkAllRead() {
    await api.patch("/notifications/read-all");
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handleClick(notif) {
    if (!notif.is_read) {
      await api.patch(`/notifications/${notif.id}/read`);
      setUnread((n) => Math.max(0, n - 1));
      setNotifications((prev) =>
        prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n)
      );
    }
    // Navegar al pedido si la notificación tiene orderId
    if (notif.data?.orderId) {
      navigate(`/orders/${notif.data.orderId}`);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Campana */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        aria-label="Notificaciones"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="text-white font-semibold text-sm">Notificaciones</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-brand-green hover:underline"
              >
                Marcar todo leído
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <p className="text-zinc-500 text-sm text-center py-8">Cargando...</p>
            )}
            {!loading && notifications.length === 0 && (
              <p className="text-zinc-500 text-sm text-center py-8">Sin notificaciones</p>
            )}
            {!loading && notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800 transition-colors flex gap-3 items-start ${!n.is_read ? "bg-zinc-800/50" : ""}`}
              >
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.is_read ? "bg-brand-green" : "bg-zinc-700"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.is_read ? "text-white" : "text-zinc-400"}`}>
                    {n.message}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">{timeAgo(n.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
