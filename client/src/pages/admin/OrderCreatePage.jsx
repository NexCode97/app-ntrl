import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../config/api.js";
import CascadeFilter from "../../components/orders/CascadeFilter.jsx";
import SizeQuantityGrid from "../../components/orders/SizeQuantityGrid.jsx";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function PdfThumbnail({ url, width = 40 }) {
  const [error, setError] = useState(false);
  return (
    <div style={{ width, height: width }} className="overflow-hidden bg-white flex items-center justify-center">
      {!error ? (
        <Document file={url} onLoadError={() => setError(true)} loading={null}>
          <Page pageNumber={1} width={width} renderAnnotationLayer={false} renderTextLayer={false} />
        </Document>
      ) : (
        <span className="text-base">📄</span>
      )}
    </div>
  );
}

const GENDERS = [
  { value: "nino",    label: "Niño" },
  { value: "hombre",  label: "Hombre" },
  { value: "mujer",   label: "Mujer" },
  { value: "unisex",  label: "Unisex" },
];

function emptyItem(product) {
  return { product_id: product.id, product_name: product.name, gender: "hombre", sizes: {}, unit_price: 0, unit_price_display: "", design_file_index: null };
}

function formatPriceCO(raw) {
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("es-CO");
}

export default function OrderCreatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [customerId,    setCustomerId]    = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customers,     setCustomers]     = useState([]);
  const [deliveryDate,  setDeliveryDate]  = useState("");
  const [description,   setDescription]  = useState("");
  const [designFiles,   setDesignFiles]   = useState([]);
  const [designPreviews, setDesignPreviews] = useState([]);
  const [items,         setItems]         = useState([]);
  const [filterKey,     setFilterKey]     = useState(0);
  const [error,         setError]         = useState("");
  const [saving,        setSaving]        = useState(false);

  async function searchCustomers(q) {
    setCustomerQuery(q);
    if (q.length < 2) { setCustomers([]); return; }
    const { data } = await api.get(`/customers?search=${encodeURIComponent(q)}&limit=10`);
    setCustomers(data.data);
  }

  function addItem(product) {
    if (!product) return;
    setItems((prev) => [...prev, emptyItem(product)]);
    setFilterKey((k) => k + 1);
  }

  function updateItem(index, field, value) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!customerId)    return setError("Selecciona un cliente.");
    if (!items.length)  return setError("Agrega al menos un producto.");
    setError("");
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("customer_id", customerId);
      if (deliveryDate) formData.append("delivery_date", deliveryDate);
      if (description)  formData.append("description",   description);
      formData.append("items", JSON.stringify(items.map(({ product_id, gender, sizes, unit_price, design_file_index }) => ({
        product_id, gender, sizes, unit_price: parseFloat(unit_price) || 0, design_file_index: design_file_index ?? null,
      }))));
      designFiles.forEach((f) => formData.append("design", f));

      const { data } = await api.post("/orders", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["production-overview"] });
      qc.invalidateQueries({ queryKey: ["upcoming-deliveries"] });
      navigate(`/orders/${data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Error al crear el pedido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Cliente */}
        <div className="card">
          <h2 className="text-white font-semibold mb-4">Datos del cliente</h2>
          <div className="relative">
            <input
              className="input-field"
              placeholder="Buscar por nombre o documento..."
              value={customerQuery}
              onChange={(e) => searchCustomers(e.target.value)}
            />
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

        {/* Info del pedido */}
        <div className="card">
          <h2 className="text-white font-semibold mb-4">Información del pedido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Fecha de entrega</label>
              <input type="date" className="input-field" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Diseños — máx. 5 (JPG/PNG/PDF)</label>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" multiple className="input-field text-sm"
                onChange={(e) => {
                  const picked = Array.from(e.target.files);
                  e.target.value = "";
                  setDesignFiles(prev => {
                    const combined = [...prev, ...picked].slice(0, 5);
                    setDesignPreviews(combined.map(f => f.type.startsWith("image/") ? URL.createObjectURL(f) : null));
                    return combined;
                  });
                }} />
              {designFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {designFiles.map((f, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                      {f.name}
                      <button type="button" className="text-zinc-500 hover:text-red-400 ml-1"
                        onClick={() => setDesignFiles(prev => {
                          const next = prev.filter((_, idx) => idx !== i);
                          setDesignPreviews(next.map(f2 => f2.type.startsWith("image/") ? URL.createObjectURL(f2) : null));
                          return next;
                        })}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs text-zinc-400 mb-1">Observaciones</label>
            <textarea className="input-field resize-none" rows={6} value={description}
              onChange={(e) => setDescription(e.target.value)} placeholder="Notas adicionales..." />
          </div>
        </div>

        {/* Productos */}
        <div className="card space-y-4">
          <h2 className="text-white font-semibold">Productos</h2>
          <CascadeFilter key={filterKey} onProductSelect={addItem} />

          {items.map((item, i) => (
            <div key={i} className="bg-zinc-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.design_file_index != null ? (
                    designPreviews[item.design_file_index] ? (
                      <img src={designPreviews[item.design_file_index]} alt="diseño"
                        className="w-8 h-8 rounded object-cover border border-zinc-600 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded border border-zinc-600 overflow-hidden shrink-0">
                        <PdfThumbnail url={URL.createObjectURL(designFiles[item.design_file_index])} width={32} />
                      </div>
                    )
                  ) : null}
                  <span className="text-white font-medium text-sm">{item.product_name}</span>
                </div>
                <button type="button" onClick={() => removeItem(i)} className="text-zinc-500 hover:text-red-400 transition-colors">✕</button>
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
                      updateItem(i, "unit_price_display", formatPriceCO(digits));
                    }}
                    placeholder="$0" />
                </div>
              </div>

              {designFiles.length > 0 && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Diseño relacionado</label>
                  <div className="flex gap-2 flex-wrap">
                    {designFiles.map((f, fi) => (
                      <button key={fi} type="button"
                        onClick={() => updateItem(i, "design_file_index", item.design_file_index === fi ? null : fi)}
                        className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-colors flex items-center justify-center shrink-0
                          ${item.design_file_index === fi ? "border-brand-green" : "border-zinc-600 hover:border-zinc-400"}`}>
                        {designPreviews[fi] ? (
                          <img src={designPreviews[fi]} alt={f.name} className="w-full h-full object-cover" />
                        ) : (
                          <PdfThumbnail url={URL.createObjectURL(f)} width={40} />
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
          ))}

          {items.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-4">Selecciona un producto en el filtro para agregarlo.</p>
          )}

          {items.length > 0 && (() => {
            const totalUnits = items.reduce((sum, item) =>
              sum + Object.values(item.sizes || {}).reduce((s, q) => s + (Number(q) || 0), 0), 0);
            return (
              <div className="flex justify-end pt-2 border-t border-zinc-700">
                <span className="text-zinc-400 text-sm">Total unidades: <span className="text-white font-semibold">{totalUnits}</span></span>
              </div>
            );
          })()}
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => navigate("/orders")}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Guardando..." : "Crear Pedido"}
          </button>
        </div>
      </form>
    </div>
  );
}
