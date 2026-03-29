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
    axios.post("/api/auth/refresh", {}, { withCredentials: true })
      .then(({ data }) => {
        return axios.get("/api/auth/me", {
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
