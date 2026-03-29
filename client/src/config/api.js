import axios from "axios";
import { useAuthStore } from "../stores/authStore.js";

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export const api = axios.create({
  baseURL:         BASE,
  withCredentials: true, // necesario para enviar/recibir cookies httpOnly
  timeout:         15000,
});

// Adjuntar access token en cada petición
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Cola para peticiones en espera durante refresh
let refreshing = false;
let waitQueue  = [];

function processQueue(error, token = null) {
  waitQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  waitQueue = [];
}

// Si responde 401 → intentar refresh automático
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    // No interceptar llamadas al endpoint de refresh — el caller maneja el error
    if (original.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (refreshing) {
      return new Promise((resolve, reject) => {
        waitQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    refreshing = true;

    try {
      const { data } = await axios.post(`${BASE}/auth/refresh`, {}, { withCredentials: true });
      const { accessToken } = data;
      useAuthStore.getState().setAuth(useAuthStore.getState().user, accessToken);
      processQueue(null, accessToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (err) {
      processQueue(err);
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
      return Promise.reject(err);
    } finally {
      refreshing = false;
    }
  }
);
