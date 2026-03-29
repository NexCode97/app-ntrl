import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../stores/authStore.js";

export default function AuthCallbackPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    const token = params.get("token");
    const rt    = params.get("rt");
    const error = params.get("error");

    if (error || !token) {
      const msg = error ? decodeURIComponent(error) : "Error de autenticación.";
      navigate(`/login?error=${encodeURIComponent(msg)}`, { replace: true });
      return;
    }

    const base = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

    // Obtener datos del usuario con el token recibido
    axios.get(`${base}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(({ data }) => {
        setAuth(data.user, token, rt);
        navigate("/", { replace: true });
      })
      .catch(() => {
        clearAuth();
        navigate("/login?error=Error+al+obtener+tu+perfil.", { replace: true });
      });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-brand-green animate-pulse">Iniciando sesión...</p>
    </div>
  );
}
