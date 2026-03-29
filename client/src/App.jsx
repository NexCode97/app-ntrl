import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import AppRouter from "./router/AppRouter.jsx";
import { useAuthStore } from "./stores/authStore.js";

export default function App() {
  const { setAuth, clearAuth } = useAuthStore();

  // Al cargar la app, intentar renovar sesión con cookie httpOnly.
  // Usa axios directo (no la instancia api) para no activar el interceptor 401.
  useEffect(() => {
    const base = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";
    const rt = localStorage.getItem("ntrl_rt");
    axios.post(`${base}/auth/refresh`, { refreshToken: rt }, { withCredentials: true })
      .then(({ data }) => {
        return axios.get(`${base}/auth/me`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${data.accessToken}` },
        }).then(({ data: me }) => setAuth(me.user, data.accessToken));
      })
      .catch(() => {
        clearAuth();
      });
  }, []);

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
