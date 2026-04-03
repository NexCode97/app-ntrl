import { useState } from "react";
import { api } from "../../config/api.js";

export default function ReportsPage() {
  const [loading, setLoading] = useState({ pdf: false, excel: false });

  async function downloadReport(type) {
    setLoading((p) => ({ ...p, [type]: true }));
    try {
      const { data } = await api.get(`/dashboard/report/${type}`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-ntrl-${new Date().toISOString().slice(0,10)}.${type === "pdf" ? "pdf" : "xlsx"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Error al generar el reporte.");
    } finally {
      setLoading((p) => ({ ...p, [type]: false }));
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-4 pt-8">
      <h2 className="text-white font-semibold text-lg">Exportar reportes</h2>
      <div className="card space-y-3">
        <p className="text-zinc-400 text-sm">Genera reportes de pedidos y ventas para el período actual.</p>
        <div className="flex gap-3 flex-wrap">
          <button className="btn-primary flex-1" disabled={loading.excel}
            onClick={() => downloadReport("excel")}>
            {loading.excel ? "Generando..." : "📊 Exportar Excel"}
          </button>
          <button className="btn-secondary flex-1" disabled={loading.pdf}
            onClick={() => downloadReport("pdf")}>
            {loading.pdf ? "Generando..." : "📄 Exportar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
