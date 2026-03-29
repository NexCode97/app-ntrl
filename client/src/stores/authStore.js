import { create } from "zustand";

/**
 * Token SOLO en memoria — nunca en localStorage/sessionStorage.
 * Si el usuario recarga la página debe refrescar via cookie httpOnly.
 */
export const useAuthStore = create((set) => ({
  user:          null,
  accessToken:   null,
  isLoading:     true,

  setAuth: (user, accessToken, refreshToken) => {
    if (refreshToken) localStorage.setItem("ntrl_rt", refreshToken);
    set({ user, accessToken, isLoading: false });
  },
  clearAuth: () => {
    localStorage.removeItem("ntrl_rt");
    set({ user: null, accessToken: null, isLoading: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
}));
