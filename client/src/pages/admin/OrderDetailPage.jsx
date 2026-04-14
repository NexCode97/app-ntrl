import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "../../config/api.js";
import { useAuthStore } from "../../stores/authStore.js";
import CascadeFilter from "../../components/orders/CascadeFilter.jsx";
import SizeQuantityGrid from "../../components/orders/SizeQuantityGrid.jsx";
import { fileUrl } from "../../utils/fileUrl.js";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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
        <div className="flex flex-col items-center justify-center w-full h-full gap-1 text-zinc-200">
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

const AREA_NAMES = {
  corte: "Corte", diseno_disenar: "Diseño",
  impresion: "Impresión", sublimacion: "Sublimación",
  ensamble: "Ensamble", terminados: "Terminados",
};

const STATUS_LABELS = {
  pending:     { label: "Pendiente",  cls: "badge-pending" },
  in_progress: { label: "En proceso", cls: "badge-progress" },
  done:        { label: "Listo",      cls: "badge-completed" },
  completed:   { label: "Completado", cls: "badge-completed" },
  delivered:   { label: "Entregado",  cls: "badge-delivered" },
};

const GENDERS = [
  { value: "nino",   label: "Niño" },
  { value: "hombre", label: "Hombre" },
  { value: "mujer",  label: "Mujer" },
  { value: "unisex", label: "Unisex" },
];

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { accessToken } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [tab,        setTab]        = useState(searchParams.get("tab") || "items");
  const [showEdit,   setShowEdit]   = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [pdfSrc,     setPdfSrc]     = useState(null);

  async function handleDownloadInvoice() {
    try {
      const res = await api.get(`/orders/${id}/invoice`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `factura-${data?.order_number_fmt || id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignorar */ }
  }

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn:  () => api.get(`/orders/${id}`).then((r) => r.data.data),
    refetchInterval: 30000,
  });

  async function markDelivered() {
    if (!confirm("¿Marcar como entregado?")) return;
    await api.put(`/orders/${id}`, { status: "delivered" });
    qc.invalidateQueries({ queryKey: ["order", id] });
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["production-overview"] });
    qc.invalidateQueries({ queryKey: ["upcoming-deliveries"] });
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el pedido #${data?.order_number}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/orders/${id}`);
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["production-overview"] });
      qc.invalidateQueries({ queryKey: ["upcoming-deliveries"] });
      navigate("/orders");
    } catch (err) {
      alert(err.response?.data?.message || "Error al eliminar el pedido.");
    }
  }

  if (isLoading) return <div className="text-zinc-500 text-center py-12">Cargando pedido...</div>;
  if (!data)     return <div className="text-zinc-500 text-center py-12">Pedido no encontrado.</div>;

  const s          = STATUS_LABELS[data.status] || STATUS_LABELS.pending;
  const designFiles = parseDesignFiles(data.design_file);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="card space-y-4">
        {/* Fila superior: avatar + info + botones */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 h-14 w-14 rounded-lg bg-white flex items-center justify-center">
              <span className="text-black font-bold text-lg leading-none">
                {data.customer_name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-brand-green font-mono font-bold text-xl">#{data.order_number}</span>
                <span className={s.cls}>{s.label}</span>
              </div>
              <p className="text-zinc-400 text-sm mt-1">{data.customer_name} · {data.document_number}</p>
              {data.delivery_date && (
                <p className="text-zinc-500 text-xs mt-0.5">
                  Entrega: {new Date(data.delivery_date).toLocaleDateString("es-CO")}
                </p>
              )}
              {data.created_by_name && (
                <p className="text-zinc-500 text-xs mt-0.5">
                  Creado por: {data.created_by_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn-secondary" onClick={() => navigate("/orders")}>← Volver</button>
            {data.status !== "delivered" && (
              <button className="btn-secondary" onClick={() => setShowEdit(true)}>Editar</button>
            )}
            {data.status !== "delivered" && data.status === "completed" && (
              <button className="btn-primary" onClick={markDelivered}>Marcar entregado</button>
            )}
            <button className="btn-secondary" onClick={handleDownloadInvoice} title="Descargar factura PDF">
              🧾 Factura
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-2 text-sm font-medium rounded-lg text-red-400 hover:text-white hover:bg-red-900 border border-red-800 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>

        {/* Diseños adjuntos */}
        {designFiles.length > 0 && (
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-xs text-zinc-500 mb-3">
              Diseño{designFiles.length > 1 ? "s" : ""} adjunto{designFiles.length > 1 ? "s" : ""}
            </p>
            <div className="flex gap-3 flex-wrap">
              {designFiles.map((f, i) => {
                const url   = fileUrl(f.url);
                const rawUrl = f.url ?? "";
                const pdf   = rawUrl.toLowerCase().endsWith(".pdf") || rawUrl.includes("/raw/upload/");
                const label = f.name ? f.name.replace(/\.[^.]+$/, "") : (designFiles.length > 1 ? `Archivo ${i + 1}` : "Archivo");
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
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxSrc(null)}>
          <button className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-zinc-300"
            onClick={() => setLightboxSrc(null)}>✕</button>
          <img src={lightboxSrc} alt="Diseño del pedido"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {pdfSrc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
            <span className="text-white text-sm font-medium">Vista previa PDF</span>
            <div className="flex items-center gap-3">
              <a href={pdfSrc} download className="text-zinc-400 hover:text-white text-sm">⬇ Descargar</a>
              <button onClick={() => setPdfSrc(null)} className="text-white text-2xl leading-none hover:text-zinc-300">✕</button>
            </div>
          </div>
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfSrc)}&embedded=true`}
            className="flex-1 w-full border-0"
            title="Vista previa PDF"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg overflow-x-auto">
        {[["items","Productos"],["financial","Abonos"],["production","Producción"],["notes","Observaciones"],["history","Historial"]].map(([key, label]) => (
          <button key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors
              ${tab === key ? "bg-brand-green text-black" : "text-zinc-400 hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Productos */}
      {tab === "items" && (
        <div className="card space-y-3">
          {data.items?.map((item) => {
            const df = item.design_file_index != null ? designFiles[item.design_file_index] : null;
            const dfUrl = df ? fileUrl(df.url ?? df) : null;
            const dfIsPdf = df ? (String(df.url ?? df).toLowerCase().endsWith(".pdf") || String(df.url ?? df).includes("/raw/upload/")) : false;
            const itemQty = Object.values(item.sizes).reduce((s, q) => s + (Number(q) || 0), 0);
            const itemSubtotal = itemQty * (Number(item.unit_price) || 0);
            return (
              <div key={item.id} className="bg-zinc-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {df && (
                      dfIsPdf ? (
                        <PdfThumbnail url={dfUrl} width={32} btnClassName="rounded border border-zinc-600" />
                      ) : (
                        <img src={dfUrl} alt="diseño" className="w-8 h-8 rounded object-cover border border-zinc-600 shrink-0" />
                      )
                    )}
                    <span className="text-white font-medium">{item.product_name}</span>
                  </div>
                  <span className="text-zinc-400 text-sm">{item.gender} · {item.line_name} / {item.sport_name}</span>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex gap-2 flex-wrap text-xs">
                    {Object.entries(item.sizes).filter(([,q]) => q > 0).map(([size, qty]) => (
                      <span key={size} className="bg-zinc-700 text-white px-2 py-0.5 rounded">
                        {size}: {qty}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 shrink-0">
                    <span>{itemQty} und.</span>
                    {itemSubtotal > 0 && (
                      <span className="text-white font-medium">
                        ${itemSubtotal.toLocaleString("es-CO")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Total general */}
          {data.items?.length > 0 && (() => {
            const totalQty = data.items.reduce((s, item) =>
              s + Object.values(item.sizes).reduce((a, q) => a + (Number(q) || 0), 0), 0);
            const totalPesos = data.items.reduce((s, item) => {
              const qty = Object.values(item.sizes).reduce((a, q) => a + (Number(q) || 0), 0);
              return s + qty * (Number(item.unit_price) || 0);
            }, 0);
            return (
              <div className="border-t border-zinc-700 pt-3 space-y-1 px-1">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Total unidades</span>
                  <span className="text-white font-bold text-lg">{totalQty}</span>
                </div>
                {totalPesos > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Total pedido</span>
                    <span className="text-brand-green font-bold text-lg">${totalPesos.toLocaleString("es-CO")}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab: Financiero */}
      {tab === "financial" && (
        <FinancialTab order={data} onRefresh={() => {
          qc.invalidateQueries({ queryKey: ["order", id] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        }} onPreviewImage={setLightboxSrc} onPreviewPdf={setPdfSrc} />
      )}

      {/* Tab: Producción */}
      {tab === "production" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {data.tasks?.map((task) => {
            const ts = STATUS_LABELS[task.status] || STATUS_LABELS.pending;
            return (
              <div key={task.id} className="card">
                <p className="text-white font-medium text-sm mb-2">{AREA_NAMES[task.area]}</p>
                <span className={ts.cls}>{ts.label}</span>
                {task.started_by_name && <p className="text-xs text-zinc-500 mt-2">Inició: {task.started_by_name}</p>}
                {task.completed_by_name && <p className="text-xs text-zinc-500">Completó: {task.completed_by_name}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Observaciones */}
      {tab === "notes" && (
        <div className="card">
          {data.description ? (
            <p className="text-zinc-200 whitespace-pre-wrap text-sm leading-relaxed">{data.description}</p>
          ) : (
            <p className="text-zinc-500 text-sm italic">Este pedido no tiene observaciones.</p>
          )}
        </div>
      )}

      {/* Tab: Historial */}
      {tab === "history" && (
        <div className="card">
          <HistoryTab orderId={id} />
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <EditOrderModal
          order={data}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            qc.invalidateQueries({ queryKey: ["order", id] });
            qc.invalidateQueries({ queryKey: ["orders"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["production-overview"] });
            qc.invalidateQueries({ queryKey: ["upcoming-deliveries"] });
          }}
        />
      )}
    </div>
  );
}

// Parsea design_file — soporta formato viejo (string/array de URLs) y nuevo ({url,name})
function parseDesignFiles(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => typeof item === "string" ? { url: item, name: null } : item);
    }
    if (parsed && typeof parsed === "object" && parsed.url) return [parsed];
    return [{ url: raw, name: null }];
  } catch { return [{ url: raw, name: null }]; }
}

function EditOrderModal({ order, onClose, onSaved }) {
  const [customerId,    setCustomerId]    = useState(order.customer_id);
  const [customerQuery, setCustomerQuery] = useState(order.customer_name || "");
  const [customers,     setCustomers]     = useState([]);
  const [deliveryDate,  setDeliveryDate]  = useState(
    order.delivery_date ? order.delivery_date.slice(0, 10) : ""
  );
  const [description,   setDescription]  = useState(order.description || "");
  const [newFiles,      setNewFiles]      = useState([]);
  const [newFilePreviews, setNewFilePreviews] = useState([]);
  const [lightboxSrc,   setLightboxSrc]   = useState(null);
  const [items,         setItems]         = useState(
    (order.items || []).map((item) => ({
      product_id:          item.product_id,
      product_name:        item.product_name,
      gender:              item.gender,
      sizes:               item.sizes,
      unit_price:          item.unit_price ?? 0,
      unit_price_display:  item.unit_price ? Number(item.unit_price).toLocaleString("es-CO") : "",
      design_file_index:   item.design_file_index ?? null,
    }))
  );
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  const [keptFiles,     setKeptFiles]     = useState(() => parseDesignFiles(order.design_file));
  const slotsLeft = true; // sin límite de diseños

  async function searchCustomers(q) {
    setCustomerQuery(q);
    setCustomerId("");
    if (q.length < 2) { setCustomers([]); return; }
    const { data } = await api.get(`/customers?search=${encodeURIComponent(q)}&limit=10`);
    setCustomers(data.data);
  }

  function addItem(product) {
    if (!product) return;
    setItems((prev) => [...prev, { product_id: product.id, product_name: product.name, gender: "hombre", sizes: {}, unit_price: 0, unit_price_display: "", design_file_index: null }]);
  }
  function updateItem(index, field, value) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }
  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!items.length) return setError("Debe haber al menos un producto.");
    setError("");
    setSaving(true);
    try {
      const formData = new FormData();
      if (customerId && customerId !== order.customer_id) formData.append("customer_id", customerId);
      if (deliveryDate) formData.append("delivery_date", deliveryDate);
      formData.append("description", description);
      formData.append("items", JSON.stringify(items.map(({ product_id, gender, sizes, unit_price, design_file_index }) => ({
        product_id, gender, sizes, unit_price: parseFloat(unit_price) || 0, design_file_index: design_file_index ?? null,
      }))));
      formData.append("design_files_keep", JSON.stringify(keptFiles));
      newFiles.forEach((f) => formData.append("design", f));

      await api.put(`/orders/${order.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto py-8">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold">Editar pedido #{order.order_number}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Cliente */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Cliente</label>
            <div className="relative">
              <input className="input-field" placeholder="Buscar por nombre o documento..."
                value={customerQuery}
                onChange={(e) => searchCustomers(e.target.value)} />
              {customerId && customerId === order.customer_id && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">actual</span>
              )}
              {customers.length > 0 && (
                <ul className="absolute z-10 w-full bg-zinc-800 border border-zinc-700 rounded-lg mt-1 shadow-xl">
                  {customers.map((c) => (
                    <li key={c.id}
                      className="px-3 py-2 hover:bg-zinc-700 cursor-pointer text-sm"
                      onClick={() => { setCustomerId(c.id); setCustomerQuery(c.name); setCustomers([]); }}>
                      <span className="text-white font-medium">{c.name}</span>
                      <span className="text-zinc-400 ml-2">{c.document_number}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Fecha de entrega */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Fecha de entrega</label>
            <input type="date" className="input-field" value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)} />
          </div>

          {/* Diseños */}
          <div>
            <label className="block text-xs text-zinc-400 mb-2">
              Diseños adjuntos ({keptFiles.length + newFiles.length})
            </label>

            {/* Miniaturas existentes con opción de eliminar */}
            {keptFiles.length > 0 && (
              <div className="flex gap-3 flex-wrap mb-3">
                {keptFiles.map((f, i) => {
                  const url = fileUrl(f.url ?? f);
                  const rawUrl = f.url ?? f;
                  const pdf = rawUrl.toLowerCase().endsWith(".pdf") || rawUrl.includes("/raw/upload/");
                  const label = f.name ? f.name.replace(/\.[^.]+$/, "") : (keptFiles.length > 1 ? `PDF ${i + 1}` : "PDF");
                  return (
                    <div key={i} className="relative group/thumb">
                      {pdf ? (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center w-16 h-16 rounded-lg
                                     bg-zinc-700 border-2 border-zinc-500 hover:border-brand-green
                                     transition-colors text-zinc-200 hover:text-brand-green text-xs gap-0.5 px-1">
                          <span className="text-2xl">📄</span>
                          <span className="truncate w-full text-center">{label}</span>
                        </a>
                      ) : (
                        <button type="button" onClick={() => setLightboxSrc(url)}
                          className="focus:outline-none">
                          <img src={url} alt={`Diseño ${i + 1}`}
                            className="w-16 h-16 rounded-lg object-cover border border-zinc-700
                                       hover:border-brand-green transition-colors cursor-zoom-in" />
                        </button>
                      )}
                      <button type="button"
                        onClick={() => setKeptFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 text-white
                                   text-xs flex items-center justify-center opacity-0
                                   group-hover/thumb:opacity-100 transition-opacity hover:bg-red-500">
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Agregar nuevos archivos */}
            <>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" multiple className="input-field text-sm"
                onChange={(e) => {
                  const picked = Array.from(e.target.files);
                  e.target.value = "";
                  setNewFiles(prev => {
                    const combined = [...prev, ...picked];
                    setNewFilePreviews(combined.map(f => f.type.startsWith("image/") ? URL.createObjectURL(f) : null));
                    return combined;
                  });
                }} />
              {newFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {newFiles.map((f, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                      {f.name}
                      <button type="button" className="text-zinc-500 hover:text-red-400 ml-1"
                        onClick={() => setNewFiles(prev => {
                          const next = prev.filter((_, idx) => idx !== i);
                          setNewFilePreviews(next.map(f2 => f2.type.startsWith("image/") ? URL.createObjectURL(f2) : null));
                          return next;
                        })}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </>
          </div>

          {/* Lightbox */}
          {lightboxSrc && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
              onClick={() => setLightboxSrc(null)}>
              <button className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-zinc-300"
                onClick={() => setLightboxSrc(null)}>✕</button>
              <img src={lightboxSrc} alt="Diseño"
                className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl"
                onClick={(e) => e.stopPropagation()} />
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Observaciones</label>
            <textarea className="input-field resize-none" rows={6} value={description}
              onChange={(e) => setDescription(e.target.value)} placeholder="Notas adicionales..." />
          </div>

          {/* Productos */}
          <div className="space-y-3">
            <h3 className="text-white font-medium text-sm">Productos</h3>
            <CascadeFilter onProductSelect={addItem} />

            {(() => {
              // Lista unificada de archivos de diseño para el selector
              const allDesignFiles = [
                ...keptFiles.map((f) => {
                  const rawUrl = f.url ?? f;
                  const isPdfFile = String(rawUrl).toLowerCase().endsWith(".pdf") || String(rawUrl).includes("/raw/upload/");
                  const resolvedUrl = fileUrl(rawUrl);
                  return { url: resolvedUrl, previewUrl: isPdfFile ? null : resolvedUrl, isPdf: isPdfFile, label: f.name || String(rawUrl).split("/").pop() };
                }),
                ...newFiles.map((f, fi) => ({
                  url: newFilePreviews[fi] || null,
                  previewUrl: newFilePreviews[fi] || null,
                  isPdf: !newFilePreviews[fi],
                  label: f.name,
                })),
              ];
              return items.map((item, i) => (
                <div key={i} className="bg-zinc-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.design_file_index != null && allDesignFiles[item.design_file_index] ? (
                        allDesignFiles[item.design_file_index].isPdf ? (
                          <PdfThumbnail url={allDesignFiles[item.design_file_index].url} width={32} btnClassName="rounded border border-zinc-600" />
                        ) : (
                          <img src={allDesignFiles[item.design_file_index].previewUrl} alt="diseño"
                            className="w-8 h-8 rounded object-cover border border-zinc-600 shrink-0" />
                        )
                      ) : null}
                      <span className="text-white font-medium text-sm">{item.product_name}</span>
                    </div>
                    <button type="button" onClick={() => removeItem(i)}
                      className="text-zinc-500 hover:text-red-400 transition-colors">✕</button>
                  </div>
                  <div className="flex gap-4 items-center flex-wrap">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Género</label>
                      <select className="input-field w-auto" value={item.gender}
                        onChange={(e) => updateItem(i, "gender", e.target.value)}>
                        {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Precio unitario</label>
                      <input type="text" inputMode="numeric" className="input-field w-36"
                        value={item.unit_price_display ?? ""}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          updateItem(i, "unit_price", Number(digits) || 0);
                          updateItem(i, "unit_price_display", digits ? Number(digits).toLocaleString("es-CO") : "");
                        }}
                        placeholder="$0" />
                    </div>
                  </div>
                  {allDesignFiles.length > 0 && (
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Diseño relacionado</label>
                      <div className="flex gap-2 flex-wrap">
                        {allDesignFiles.map((df, fi) => (
                          <button key={fi} type="button"
                            onClick={() => updateItem(i, "design_file_index", item.design_file_index === fi ? null : fi)}
                            className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-colors flex items-center justify-center shrink-0
                              ${item.design_file_index === fi ? "border-brand-green" : "border-zinc-600 hover:border-zinc-400"}`}>
                            {df.isPdf ? (
                              <PdfThumbnail url={df.url} width={40} />
                            ) : (
                              <img src={df.previewUrl} alt={df.label} className="w-full h-full object-cover" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <SizeQuantityGrid
                    gender={item.gender}
                    sizes={item.sizes}
                    onChange={(sizes) => updateItem(i, "sizes", sizes)}
                  />
                </div>
              ));
            })()}

            {items.length === 0 && (
              <p className="text-zinc-500 text-sm text-center py-3">Sin productos. Agrega uno con el filtro.</p>
            )}
          </div>

          {error && (
            <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const METHODS = [
  { value: "efectivo",      label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "link_bold",     label: "Link Bold" },
];
const BANKS = ["Bancolombia", "Nequi", "Davivienda", "Bold"];

function FinancialTab({ order, onRefresh, onPreviewImage, onPreviewPdf }) {
  const [showForm, setShowForm] = useState(false);
  const [amount,        setAmount]        = useState("");
  const [amountDisplay, setAmountDisplay] = useState("");
  const [method,   setMethod]   = useState("efectivo");
  const [bank,     setBank]     = useState("");
  const [paidAt,   setPaidAt]   = useState(new Date().toISOString().slice(0, 10));
  const [receipt,  setReceipt]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const nextNumber = order.payments?.length
    ? Math.max(...order.payments.map((p) => p.payment_number)) + 1
    : 1;
  const canAdd = order.status !== "delivered" && Number(order.balance) > 0;

  async function handleAddPayment(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return setError("Ingresa un monto válido.");
    if (method === "transferencia" && !bank) return setError("Selecciona el banco.");
    setError("");
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("payment_number", nextNumber);
      formData.append("amount", parseFloat(amount));
      formData.append("method", method);
      if (method === "transferencia") formData.append("bank", bank);
      formData.append("paid_at", paidAt);
      if (receipt) formData.append("receipt", receipt);

      await api.post(`/financial/${order.id}/payments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowForm(false);
      setAmount("");
      setAmountDisplay("");
      setMethod("efectivo");
      setBank("");
      setReceipt(null);
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || "Error al registrar el abono.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(paymentId) {
    if (!confirm("¿Eliminar este abono?")) return;
    try {
      await api.delete(`/financial/${order.id}/payments/${paymentId}`);
      onRefresh();
    } catch {
      alert("No se pudo eliminar el abono.");
    }
  }

  return (
    <div className="card space-y-4">
      {/* Totales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-800 rounded-lg p-3 text-center">
          <p className="text-xs text-zinc-400 mb-1">Total</p>
          <p className="text-white text-xl font-bold">${Number(order.total).toLocaleString()}</p>
        </div>
        <div className="bg-zinc-800 rounded-lg p-3 text-center">
          <p className="text-xs text-zinc-400 mb-1">Pagado</p>
          <p className="text-brand-green text-xl font-bold">${Number(order.amount_paid).toLocaleString()}</p>
        </div>
        <div className="bg-zinc-800 rounded-lg p-3 text-center">
          <p className="text-xs text-zinc-400 mb-1">Saldo</p>
          <p className="text-yellow-400 text-xl font-bold">${Number(order.balance).toLocaleString()}</p>
        </div>
      </div>

      {/* Lista de abonos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-zinc-400 text-sm font-medium">Abonos</h3>
          {canAdd && !showForm && (
            <button className="btn-primary text-xs py-1 px-3" onClick={() => setShowForm(true)}>
              + Agregar abono
            </button>
          )}
        </div>

        {order.payments?.length === 0 && !showForm && (
          <p className="text-zinc-500 text-sm">Sin abonos registrados.</p>
        )}

        {order.payments?.map((p) => (
          <div key={p.id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2 mb-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-zinc-400 text-sm">Abono #{p.payment_number} · {p.method}</span>
              {p.bank && <span className="text-zinc-500 text-xs">{p.bank}</span>}
              {p.receipt_url && (
                <button
                  className="text-brand-green text-xs hover:underline text-left"
                  onClick={() => {
                    const url = fileUrl(p.receipt_url);
                    const isPdf = p.receipt_url.toLowerCase().endsWith(".pdf") || p.receipt_url.includes("/raw/");
                    isPdf ? onPreviewPdf(url) : onPreviewImage(url);
                  }}>
                  Ver comprobante
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white font-medium">${Number(p.amount).toLocaleString()}</span>
              {order.status !== "delivered" && (
                <button onClick={() => handleDelete(p.id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors text-xs">✕</button>
              )}
            </div>
          </div>
        ))}

        {/* Formulario nuevo abono */}
        {showForm && (
          <form onSubmit={handleAddPayment} className="bg-zinc-800 rounded-lg p-4 space-y-3 mt-2">
            <p className="text-white text-sm font-medium">Abono #{nextNumber}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Monto</label>
                <input type="text" inputMode="numeric" className="input-field"
                  value={amountDisplay}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setAmount(digits);
                    setAmountDisplay(digits ? Number(digits).toLocaleString("es-CO") : "");
                  }}
                  placeholder="$0" autoFocus />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Fecha de pago</label>
                <input type="date" className="input-field"
                  value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Método</label>
                <select className="input-field" value={method}
                  onChange={(e) => { setMethod(e.target.value); setBank(""); }}>
                  {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              {method === "transferencia" && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Banco</label>
                  <select className="input-field" value={bank} onChange={(e) => setBank(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Comprobante (opcional · JPG, PNG o PDF)</label>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="input-field text-sm"
                onChange={(e) => setReceipt(e.target.files[0] || null)} />
              {receipt && <p className="text-xs text-zinc-400 mt-1">{receipt.name}</p>}
            </div>
            {error && (
              <div className="bg-red-950 border border-red-800 text-red-300 text-xs px-3 py-2 rounded-lg">{error}</div>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary text-xs py-1 px-3"
                onClick={() => { setShowForm(false); setError(""); setReceipt(null); }}>Cancelar</button>
              <button type="submit" className="btn-primary text-xs py-1 px-3" disabled={saving}>
                {saving ? "Guardando..." : "Registrar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function HistoryTab({ orderId }) {
  const { data, isLoading } = useQuery({
    queryKey: ["order-history", orderId],
    queryFn:  () => api.get(`/orders/${orderId}/history`).then((r) => r.data.data),
  });

  if (isLoading) return <p className="text-zinc-500 text-sm">Cargando historial...</p>;

  return (
    <div className="space-y-2">
      {data?.map((h) => (
        <div key={h.id} className="flex items-start gap-3 text-sm">
          <span className="text-zinc-500 shrink-0">{new Date(h.created_at).toLocaleString("es-CO")}</span>
          <span className="text-zinc-400">{h.user_name}:</span>
          <span className="text-white">{h.action}</span>
        </div>
      ))}
    </div>
  );
}
