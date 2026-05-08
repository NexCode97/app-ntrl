import { useState } from "react";
import { fileUrl } from "../../utils/fileUrl.js";

/**
 * Avatar de usuario con fallback a iniciales si la imagen falla o no existe.
 * Props:
 *   user    — objeto con { name, avatar }
 *   size    — "xs" | "sm" | "md" | "lg" | "xl"
 *   className — clases extra opcionales
 */
const SIZES = {
  xs: "w-6  h-6  text-[10px]",
  sm: "w-8  h-8  text-sm",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-24 h-24 text-2xl",
};

export default function UserAvatar({ user, size = "sm", className = "" }) {
  const [imgError, setImgError] = useState(false);
  const dim = SIZES[size] ?? SIZES.sm;
  const src = user?.avatar ? fileUrl(user.avatar) : null;
  const initial = (user?.name ?? user?.other_name ?? "?")[0]?.toUpperCase();

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={user?.name ?? ""}
        onError={() => setImgError(true)}
        className={`${dim} rounded-full object-cover border border-zinc-600 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${dim} rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center font-bold text-white shrink-0 ${className}`}>
      {initial}
    </div>
  );
}
