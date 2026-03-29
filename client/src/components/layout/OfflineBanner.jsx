import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline  = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="bg-yellow-900 border-b border-yellow-700 text-yellow-200 text-sm px-4 py-2 flex items-center gap-2">
      <span>⚠️</span>
      <span>Sin conexión — los cambios se sincronizarán cuando vuelva la red.</span>
    </div>
  );
}
