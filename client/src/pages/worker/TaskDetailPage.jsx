import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../config/api.js";
import { fileUrl } from "../../utils/fileUrl.js";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp"];
function isImage(url) {
  const ext = String(url).split("?")[0].split(".").pop().toLowerCase();
  return IMAGE_EXTS.includes(ext);
}
function isPdf(url) {
  return String(url).toLowerCase().endsWith(".pdf") || String(url).includes("/raw/upload/");
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

function PdfViewer({ src }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let url;
    fetch(src)
      .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
      .then((blob) => { url = URL.createObjectURL(blob); setBlobUrl(url); })
      .catch(() => setError(true));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [src]);

  if (error) return (
    <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
      No se pudo cargar el PDF.
    </div>
  );
  if (!blobUrl) return (
    <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Cargando...</div>
  );
  return <iframe src={blobUrl} title="PDF" className="w-full h-full border-0" />;
}

function Lightbox({ src, isPdf, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-zinc-400 leading-none z-10"
        onClick={onClose}
      >
        ✕
      </button>
      {isPdf ? (
        <div
          className="w-full max-w-3xl h-[85vh] rounded-lg overflow-hidden shadow-2xl bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          <PdfViewer src={src} />
        </div>
      ) : (
        <img
          src={src}
          alt="Diseño"
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState(null); // { src, isPdf }

  const { data, isLoading } = useQuery({
    queryKey: ["order-for-worker", id],
    queryFn:  () => api.get(`/orders/${id}`).then((r) => r.data.data),
  });

  if (isLoading) return <div className="text-zinc-500 text-center py-12">Cargando...</div>;
  if (!data)     return <div className="text-zinc-500 text-center py-12">Pedido no encontrado.</div>;

  const files = parseFiles(data.design_file);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {lightbox && <Lightbox src={lightbox.src} isPdf={lightbox.isPdf} onClose={() => setLightbox(null)} />}

      <button className="btn-secondary" onClick={() => navigate("/tasks")}>← Volver</button>

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

      {files.length > 0 && (
        <div className="card">
          <h3 className="text-zinc-400 text-sm font-medium mb-3">
            Diseño adjunto {files.length > 1 && <span className="text-zinc-600">({files.length} archivos)</span>}
          </h3>
          <div className="flex flex-wrap gap-3">
            {files.map((f, i) =>
              isImage(f.url) ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightbox({ src: fileUrl(f.url), isPdf: false })}
                  className="group relative w-32 h-32 rounded-lg overflow-hidden border border-zinc-700 hover:border-brand-green transition-colors"
                >
                  <img
                    src={fileUrl(f.url)}
                    alt={f.name || `Diseño ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium">Ver completo</span>
                  </div>
                </button>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightbox({ src: fileUrl(f.url), isPdf: isPdf(f.url) })}
                  className="group relative w-32 h-32 rounded-lg overflow-hidden border border-zinc-700 hover:border-brand-green transition-colors bg-zinc-800 flex flex-col items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="9" y1="13" x2="15" y2="13"/>
                    <line x1="9" y1="17" x2="15" y2="17"/>
                  </svg>
                  <span className="text-zinc-400 text-[10px] font-medium px-1 text-center truncate w-full">
                    {f.name || String(f.url).split("/").pop()}
                  </span>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium">Ver archivo</span>
                  </div>
                </button>
              )
            )}
          </div>
        </div>
      )}

      <div className="card space-y-2">
        <h3 className="text-white font-medium mb-3">Productos</h3>
        {data.items?.map((item) => (
          <div key={item.id} className="bg-zinc-800 rounded-lg p-3">
            <p className="text-white font-medium text-sm">{item.product_name} — {item.gender ? item.gender.charAt(0).toUpperCase() + item.gender.slice(1) : ""}</p>
            <div className="flex gap-2 flex-wrap text-xs mt-2">
              {Object.entries(item.sizes).filter(([, q]) => q > 0).map(([size, qty]) => (
                <span key={size} className="bg-zinc-700 text-white px-2 py-0.5 rounded">{size}: {qty}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
