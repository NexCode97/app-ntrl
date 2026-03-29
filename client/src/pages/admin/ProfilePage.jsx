import { useState, useRef } from "react";
import { useAuthStore } from "../../stores/authStore.js";
import { api } from "../../config/api.js";
import { fileUrl } from "../../utils/fileUrl.js";

function Avatar({ user, size = "lg" }) {
  const dim = size === "lg" ? "w-24 h-24 text-2xl" : "w-10 h-10 text-sm";
  const src = user?.avatar ? fileUrl(user.avatar) : null;

  if (src) {
    return (
      <img
        src={src}
        alt={user.name}
        className={`${dim} rounded-full object-cover border-2 border-zinc-700`}
      />
    );
  }
  return (
    <div className={`${dim} rounded-full bg-zinc-700 flex items-center justify-center font-bold text-white shrink-0`}>
      {user?.name?.[0]?.toUpperCase()}
    </div>
  );
}

export default function ProfilePage() {
  const user    = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name,            setName]            = useState(user?.name  || "");
  const [email,           setEmail]           = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving,          setSaving]          = useState(false);
  const [success,         setSuccess]         = useState("");
  const [error,           setError]           = useState("");

  // Avatar
  const fileRef            = useRef(null);
  const [preview,  setPreview]  = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  function handleAvatarPick(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleAvatarSave() {
    if (!avatarFile) return;
    setAvatarBusy(true);
    try {
      const form = new FormData();
      form.append("avatar", avatarFile);
      const { data } = await api.post("/auth/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAuth(data.user, useAuthStore.getState().accessToken);
      setAvatarFile(null);
      setPreview(null);
    } catch (err) {
      setError(err.response?.data?.message || "Error al subir la foto.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleAvatarDelete() {
    setAvatarBusy(true);
    try {
      const { data } = await api.delete("/auth/me/avatar");
      setAuth(data.user, useAuthStore.getState().accessToken);
      setPreview(null);
      setAvatarFile(null);
    } catch (err) {
      setError(err.response?.data?.message || "Error al eliminar la foto.");
    } finally {
      setAvatarBusy(false);
    }
  }

  function cancelAvatarPick() {
    setAvatarFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccess("");
    setError("");

    if (newPassword && newPassword !== confirmPassword) {
      return setError("La nueva contraseña y su confirmación no coinciden.");
    }
    if (newPassword && !currentPassword) {
      return setError("Debes ingresar tu contraseña actual para establecer una nueva.");
    }

    const payload = {};
    if (name.trim() && name.trim() !== user?.name)    payload.name  = name.trim();
    if (email.trim() && email.trim() !== user?.email) payload.email = email.trim();
    if (currentPassword) payload.current_password = currentPassword;
    if (newPassword)     payload.new_password     = newPassword;

    if (!Object.keys(payload).length) return setError("No hay cambios para guardar.");

    setSaving(true);
    try {
      const { data } = await api.patch("/auth/me", payload);
      setAuth(data.user, useAuthStore.getState().accessToken);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Perfil actualizado correctamente.");
    } catch (err) {
      setError(err.response?.data?.message || "Error al actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  const displaySrc = preview || (user?.avatar ? fileUrl(user.avatar) : null);

  return (
    <div className="max-w-lg mx-auto space-y-6">

      {/* Foto de perfil */}
      <div className="card">
        <h2 className="text-white font-semibold mb-4">Foto de perfil</h2>
        <div className="flex items-center gap-5">
          {/* Preview */}
          {displaySrc ? (
            <img
              src={displaySrc}
              alt="avatar"
              className="w-24 h-24 rounded-full object-cover border-2 border-zinc-700 shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-zinc-700 flex items-center justify-center text-2xl font-bold text-white shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          )}

          <div className="space-y-2">
            {!avatarFile ? (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn-secondary text-sm"
                  disabled={avatarBusy}
                >
                  {user?.avatar ? "Cambiar foto" : "Subir foto"}
                </button>
                {user?.avatar && (
                  <button
                    type="button"
                    onClick={handleAvatarDelete}
                    className="block text-xs text-red-400 hover:text-red-300 transition-colors"
                    disabled={avatarBusy}
                  >
                    {avatarBusy ? "Eliminando..." : "Eliminar foto"}
                  </button>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAvatarSave}
                  className="btn-primary text-sm"
                  disabled={avatarBusy}
                >
                  {avatarBusy ? "Subiendo..." : "Guardar foto"}
                </button>
                <button
                  type="button"
                  onClick={cancelAvatarPick}
                  className="btn-secondary text-sm"
                  disabled={avatarBusy}
                >
                  Cancelar
                </button>
              </div>
            )}
            <p className="text-xs text-zinc-500">JPG o PNG · máx. 5 MB</p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          className="hidden"
          onChange={handleAvatarPick}
        />
      </div>

      {/* Datos del perfil */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="text-white font-semibold">Información personal</h2>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nombre</label>
            <input
              className="input-field"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Correo electrónico</label>
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@empresa.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-zinc-400">Rol</p>
              <p className="text-zinc-300 text-sm capitalize mt-1">{user?.role === "admin" ? "Administrador" : "Trabajador"}</p>
            </div>
            {user?.area && (
              <div>
                <p className="text-xs text-zinc-400">Área</p>
                <p className="text-zinc-300 text-sm mt-1 capitalize">{user.area}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-white font-semibold">Cambiar contraseña</h2>
          <p className="text-zinc-500 text-xs">Deja los campos en blanco si no deseas cambiar tu contraseña.</p>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Contraseña actual</label>
            <input
              className="input-field"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nueva contraseña</label>
            <input
              className="input-field"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Confirmar nueva contraseña</label>
            <input
              className="input-field"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}
        {success && (
          <div className="bg-zinc-900 border border-brand-green text-brand-green text-sm px-3 py-2 rounded-lg">{success}</div>
        )}

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
