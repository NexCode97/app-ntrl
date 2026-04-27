import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../config/api.js";
import { useAuthStore } from "../../stores/authStore.js";
import { fileUrl } from "../../utils/fileUrl.js";
import DownloadIcon from "../../components/ui/DownloadIcon.jsx";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// ─── Igual que admin ──────────────────────────────────────────────────────────
function PdfThumbnail({ url, label, onClick, width = 96, btnClassName = "" }) {
  const [error, setError] = useState(false);
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick}
      style={{ width, height: width }}
      className={`relative overflow-hidden bg-white flex-shrink-0 ${btnClassName}`}>
      {!error ? (
        <Document file={url} onLoadError={() => setError(true)} loading={null}>
          <Page pageNumber={1} width={width} renderAnnotationLayer={false} renderTextLayer={false} />
        </Document>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full gap-1 text-zinc-600">
          <span className="text-2xl">📄</span>
          {label && <span className="text-[9px] truncate w-full text-center px-1">{label}</span>}
        </div>
      )}
      {label && width >= 64 && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center truncate px-1 py-0.5">
          {label}
        </div>
      )}
    </Tag>
  );
}

function parseFiles(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map((item) => typeof item === "string" ? { url: item, name: null } : item);
  } catch {
    return [{ url: raw, name: null }];
  }
}

function isPdfUrl(url) {
  return String(url).toLowerCase().endsWith(".pdf") || String(url).includes("/raw/upload/");
}

// ─── Visor imagen ────────────────────────────────────────────────────────────
function ImageLightbox({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}>
      <button className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-zinc-300"
        onClick={onClose}>✕</button>
      <img src={src} alt="Diseño del pedido"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl"
        onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

// ─── Visor PDF (Google Docs, igual que admin) ─────────────────────────────────
function PdfViewer({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <span className="text-white text-sm font-medium">Vista previa PDF</span>
        <div className="flex items-center gap-3">
          <a href={src} download className="text-zinc-400 hover:text-white text-sm flex items-center gap-1"><DownloadIcon /> Descargar</a>
          <button onClick={onClose} className="text-white text-2xl leading-none hover:text-zinc-300">✕</button>
        </div>
      </div>
      <iframe
        src={`https://docs.google.com/viewer?url=${encodeURIComponent(src)}&embedded=true`}
        className="flex-1 w-full border-0"
        title="Vista previa PDF"
      />
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [pdfSrc,      setPdfSrc]      = useState(null);

  // Área del trabajador (mapeo "diseno" → "diseno_disenar")
  const myArea = user?.area === "diseno" ? "diseno_disenar" : user?.area;

  const { data, isLoading } = useQuery({
    queryKey: ["order-for-worker", id],
    queryFn:  () => api.get(`/orders/${id}`).then((r) => r.data.data),
  });

  const { data: progress } = useQuery({
    queryKey: ["order-progress", id],
    queryFn:  () => api.get(`/production/order/${id}/progress`).then((r) => r.data.data),
  });

  // Set de "itemId|area|size" que están done
  const doneSet = new Set(
    (progress || [])
      .filter((p) => p.is_done)
      .map((p) => `${p.order_item_id}|${p.area}|${p.size}`)
  );

  const toggleProgress = useMutation({
    mutationFn: ({ itemId, size, isDone }) =>
      api.patch(`/production/progress/${itemId}/${myArea}/${encodeURIComponent(size)}`, { is_done: isDone }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["order-progress", id] }),
  });

  if (isLoading) return <div className="text-zinc-500 text-center py-12">Cargando...</div>;
  if (!data)     return <div className="text-zinc-500 text-center py-12">Pedido no encontrado.</div>;

  const files = parseFiles(data.design_file);

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Lightbox imagen */}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Visor PDF */}
      {pdfSrc && <PdfViewer src={pdfSrc} onClose={() => setPdfSrc(null)} />}

      <button className="btn-secondary" onClick={() => navigate("/tasks")}>← Volver</button>

      {/* Info del pedido */}
      <div className="card">
        <h2 className="text-brand-green font-mono font-bold text-xl mb-1">#{data.order_number}</h2>
        <p className="text-white text-lg">{data.customer_name}</p>
        {data.delivery_date && (
          <p className="text-zinc-400 text-sm mt-1">
            Entrega: {new Date(String(data.delivery_date).slice(0, 10) + "T12:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        )}
        {data.description && <p className="text-zinc-300 text-sm mt-2 bg-zinc-800 rounded-lg p-3">{data.description}</p>}
      </div>

      {/* Diseños adjuntos — idéntico al admin */}
      {files.length > 0 && (
        <div className="card">
          <p className="text-xs text-zinc-500 mb-3">
            Diseño{files.length > 1 ? "s" : ""} adjunto{files.length > 1 ? "s" : ""}
          </p>
          <div className="flex gap-3 flex-wrap">
            {files.map((f, i) => {
              const url   = fileUrl(f.url);
              const pdf   = isPdfUrl(f.url ?? "");
              const label = f.name
                ? f.name.replace(/\.[^.]+$/, "")
                : (files.length > 1 ? `Archivo ${i + 1}` : "Archivo");
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pdf ? setPdfSrc(url) : setLightboxSrc(url)}
                  className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 relative border border-zinc-700 hover:border-brand-green transition-colors focus:outline-none"
                >
                  {pdf ? (
                    <>
                      <div className="w-full h-full bg-white overflow-hidden flex items-start justify-center">
                        <Document file={url} loading={null} onLoadError={() => {}}>
                          <Page pageNumber={1} width={96} renderAnnotationLayer={false} renderTextLayer={false} />
                        </Document>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center truncate px-1 py-0.5">
                        {label}
                      </div>
                    </>
                  ) : (
                    <img src={url} alt={label} className="w-full h-full object-cover" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Productos */}
      <div className="card space-y-2">
        <h3 className="text-white font-medium mb-3">Productos</h3>
        {data.items?.map((item) => {
          const df      = item.design_file_index != null ? files[item.design_file_index] : null;
          const dfUrl   = df ? fileUrl(df.url ?? df) : null;
          const dfIsPdf = df ? isPdfUrl(df.url ?? df) : false;
          const itemQty = Object.values(item.sizes).reduce((s, q) => s + (Number(q) || 0), 0);
          return (
            <div key={item.id} className="bg-zinc-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  {df && (
                    dfIsPdf ? (
                      <PdfThumbnail url={dfUrl} width={32} btnClassName="rounded border border-zinc-600" />
                    ) : (
                      <img src={dfUrl} alt="diseño" className="w-8 h-8 rounded object-cover bg-white shrink-0" />
                    )
                  )}
                  <p className="text-white font-medium text-sm">
                    {item.product_name} — {item.gender ? item.gender.charAt(0).toUpperCase() + item.gender.slice(1) : ""}
                  </p>
                </div>
                <span className="text-zinc-400 text-xs shrink-0">{itemQty} und.</span>
              </div>
              <div className="flex flex-col gap-1.5 mt-2">
                {Object.entries(item.sizes).filter(([, q]) => q > 0).map(([size, qty]) => {
                  const key  = `${item.id}|${myArea}|${size}`;
                  const done = doneSet.has(key);
                  return (
                    <label key={size}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors
                        ${done ? "bg-brand-green/10 border border-brand-green/40" : "bg-zinc-700 border border-zinc-700 hover:border-zinc-500"}`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={done}
                          disabled={!myArea || toggleProgress.isPending}
                          onChange={(e) => toggleProgress.mutate({ itemId: item.id, size, isDone: e.target.checked })}
                          className="w-5 h-5 accent-brand-green cursor-pointer"
                        />
                        <span className={`text-sm ${done ? "text-brand-green line-through" : "text-white"}`}>
                          Talla {size} — {qty} und.
                        </span>
                      </div>
                      {done && <span className="text-brand-green text-xs">✓ Hecho</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
        {/* Total general */}
        {data.items?.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-zinc-700 mt-2">
            <span className="text-zinc-400 text-sm font-medium">Total unidades</span>
            <span className="text-white font-bold text-sm">
              {data.items.reduce((sum, item) =>
                sum + Object.values(item.sizes).reduce((s, q) => s + (Number(q) || 0), 0), 0
              )} und.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
