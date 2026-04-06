import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../config/api.js";
import CascadeFilter from "../../components/orders/CascadeFilter.jsx";
import SizeQuantityGrid from "../../components/orders/SizeQuantityGrid.jsx";

const GENDERS = [
  { value: "nino",    label: "Niño" },
  { value: "hombre",  label: "Hombre" },
  { value: "mujer",   label: "Mujer" },
  { value: "unisex",  label: "Unisex" },
];

function emptyItem(product) {
  return { product_id: product.id, product_name: product.name, gender: "hombre", sizes: {}, unit_price: 0, design_file_index: null };
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
                  const files = Array.from(e.target.files).slice(0, 5);
                  setDesignFiles(files);
                  setDesignPreviews(files.map(f => f.type.startsWith("image/") ? URL.createObjectURL(f) : null));
                }} />
              {designFiles.length > 0 && (
                <p className="text-xs text-brand-green mt-1">{designFiles.length} archivo(s) seleccionado(s)</p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs text-zinc-400 mb-1">Observaciones</label>
            <textarea className="input-field resize-none" rows={3} value={description}
              onChange={(e) => setDescription(e.target.value)} placeholder="Notas adicionales..." />
          </div>
        </div>

        {/* Productos */}
        <div className="card space-y-4">
          <h2 className="text-white font-semibold">Productos</h2>
          <CascadeFilter onProductSelect={addItem} />

          {items.map((item, i) => (
            <div key={i} className="bg-zinc-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.design_file_index !== null && designPreviews[item.design_file_index] ? (
                    <img src={designPreviews[item.design_file_index]} alt="diseño"
                      className="w-8 h-8 rounded object-cover border border-zinc-600 shrink-0" />
                  ) : item.design_file_index !== null ? (
                    <span className="text-xl shrink-0">📄</span>
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
                  <input type="number" min="0" step="100" className="input-field w-32"
                    value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", e.target.value)}
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
                          <span className="text-lg">📄</span>
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
