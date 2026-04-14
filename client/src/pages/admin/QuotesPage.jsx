import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, API_BASE } from "../../config/api.js";
import { useAuthStore } from "../../stores/authStore.js";
import CascadeFilter      from "../../components/orders/CascadeFilter.jsx";
import SizeQuantityGrid   from "../../components/orders/SizeQuantityGrid.jsx";

const GENDERS = [
  { value: "nino",   label: "Niño"         },
  { value: "hombre", label: "Hombre"       },
  { value: "mujer",  label: "Mujer"        },
  { value: "unisex", label: "Unisex"       },
  { value: "unica",  label: "Talla Única"  },
];

const STATUS_LABEL = {
  draft:    { label: "Borrador",  cls: "bg-zinc-700 text-zinc-300" },
  sent:     { label: "Enviada",   cls: "bg-blue-900 text-blue-300" },
  approved: { label: "Aprobada",  cls: "bg-green-900 text-green-300" },
  rejected: { label: "Rechazada", cls: "bg-red-900 text-red-300" },
};

function fmt(n) {
  return `$${Number(n || 0).toLocaleString("es-CO")}`;
}
function formatPriceCO(raw) {
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("es-CO");
}
function emptyItem(product) {
  return { product_id: product.id, product_name: product.name, gender: "hombre", sizes: {}, unit_price: 0, unit_price_display: "" };
}

// ── Formulario de nueva cotización ────────────────────────────────
function QuoteForm({ onClose, onSaved, initial }) {
  const [customerId,       setCustomerId]       = useState(initial?.customer_id       || null);
  const [customerQuery,    setCustomerQuery]    = useState(initial?.customer_name     || "");
  const [customerName,     setCustomerName]     = useState(initial?.customer_name     || "");
  const [customerEmail,    setCustomerEmail]    = useState(initial?.customer_email    || "");
  const [customerPhone,    setCustomerPhone]    = useState(initial?.customer_phone    || "");
  const [customerDocument, setCustomerDocument] = useState(initial?.customer_document || "");
  const [customerAddress,  setCustomerAddress]  = useState(initial?.customer_address  || "");
  const [customers,        setCustomers]        = useState([]);
  const [notes,         setNotes]         = useState(initial?.notes          || "");
  const [validDays,     setValidDays]     = useState(initial?.valid_days     || 15);
  const [items,         setItems]         = useState(
    initial?.items
      ? (Array.isArray(initial.items) ? initial.items : JSON.parse(initial.items)).map((i) => ({
          ...i, unit_price_display: i.unit_price ? Number(i.unit_price).toLocaleString("es-CO") : "",
        }))
      : []
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function searchCustomers(q) {
    setCustomerQuery(q);
    setCustomerId(null);
    setCustomerName(q);
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerDocument("");
    setCustomerAddress("");
    if (q.length < 2) { setCustomers([]); return; }
    const { data } = await api.get(`/customers?search=${encodeURIComponent(q)}&limit=10`);
    setCustomers(data.data);
  }

  function selectCustomer(c) {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerQuery(c.name);
    setCustomerEmail(c.email || "");
    setCustomerPhone(c.phone || "");
    setCustomerDocument(c.document_number || "");
    setCustomerAddress(c.address || "");
    setCustomers([]);
  }

  function addItem(product) {
    setItems((prev) => [...prev, emptyItem(product)]);
  }
  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateItem(i, key, val) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  }

  const total = items.reduce((s, item) => {
    const qty = Object.values(item.sizes || {}).reduce((a, q) => a + (Number(q) || 0), 0);
    return s + qty * (Number(item.unit_price) || 0);
  }, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!customerName.trim()) { setError("El nombre del cliente es requerido."); return; }
    if (items.length === 0)   { setError("Agrega al menos un producto.");         return; }

    const payload = {
      customer_name:     customerName.trim(),
      customer_email:    customerEmail.trim()    || null,
      customer_phone:    customerPhone.trim()    || null,
      customer_document: customerDocument.trim() || null,
      customer_address:  customerAddress.trim()  || null,
      notes:             notes.trim() || null,
      valid_days:     Number(validDays) || 15,
      items: items.map((item) => {
        const qty      = Object.values(item.sizes || {}).reduce((a, q) => a + (Number(q) || 0), 0);
        const subtotal = qty * (Number(item.unit_price) || 0);
        return {
          product_id:   item.product_id,
          product_name: item.product_name,
          gender:       item.gender,
          sizes:        item.sizes,
          unit_price:   Number(item.unit_price) || 0,
          quantity:     qty,
          subtotal,
        };
      }),
    };

    setSaving(true);
    try {
      if (initial?.id) {
        await api.put(`/quotes/${initial.id}`, payload);
      } else {
        await api.post("/quotes", payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar.");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-3xl border border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-lg">{initial ? "Editar cotización" : "Nueva cotización"}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Datos del cliente */}
          <div className="card">
            <h3 className="text-zinc-300 font-semibold text-sm mb-3">Cliente</h3>
            <div className="relative mb-3">
              <label className="text-zinc-400 text-xs mb-1 block">Buscar cliente *</label>
              <input
                className="input-field"
                placeholder="Buscar por nombre o documento..."
                value={customerQuery}
                onChange={(e) => searchCustomers(e.target.value)}
                autoComplete="off"
              />
              {customers.length > 0 && (
                <ul className="absolute z-10 w-full bg-zinc-800 border border-zinc-700 rounded-lg mt-1 shadow-xl max-h-48 overflow-y-auto">
                  {customers.map((c) => (
                    <li key={c.id}>
                      <button type="button"
                        className="w-full text-left px-4 py-2 hover:bg-zinc-700 transition-colors"
                        onClick={() => selectCustomer(c)}>
                        <p className="text-white text-sm font-medium">{c.name}</p>
                        <p className="text-zinc-400 text-xs">{c.document_number} · {c.phone}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {customerId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Correo</label>
                  <input className="input-field" value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)} placeholder="correo@ejemplo.com" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Teléfono</label>
                  <input className="input-field" value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)} placeholder="300 000 0000" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Documento</label>
                  <input className="input-field" value={customerDocument}
                    onChange={(e) => setCustomerDocument(e.target.value)} placeholder="NIT / CC" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">Dirección</label>
                  <input className="input-field" value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Dirección" />
                </div>
              </div>
            )}
          </div>

          {/* Productos */}
          <div className="card">
            <h3 className="text-zinc-300 font-semibold text-sm mb-3">Productos</h3>
            <CascadeFilter onProductSelect={addItem} key={items.length === 0 ? "empty" : undefined} />

            {items.length > 0 && (
              <div className="mt-4 space-y-4">
                {items.map((item, i) => (
                  <div key={i} className="border border-zinc-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-semibold text-sm">{item.product_name}</span>
                      <button type="button" onClick={() => removeItem(i)}
                        className="text-red-400 hover:text-red-300 text-xs">Quitar</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-zinc-400 text-xs mb-1 block">Género</label>
                        <select className="input-field" value={item.gender}
                          onChange={(e) => setItems((prev) => prev.map((item, idx) =>
                            idx === i ? { ...item, gender: e.target.value, sizes: {} } : item
                          ))}>
                          {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-zinc-400 text-xs mb-1 block">Precio unitario</label>
                        <input className="input-field" value={item.unit_price_display}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            updateItem(i, "unit_price", Number(digits) || 0);
                            updateItem(i, "unit_price_display", formatPriceCO(digits));
                          }}
                          placeholder="0" />
                      </div>
                    </div>
                    <SizeQuantityGrid gender={item.gender} sizes={item.sizes} onChange={(sizes) => updateItem(i, "sizes", sizes)} />
                    <div className="text-right mt-2 text-xs text-zinc-400">
                      Subtotal: <span className="text-brand-green font-bold">
                        {fmt(Object.values(item.sizes || {}).reduce((a,q)=>a+(Number(q)||0),0) * (item.unit_price||0))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observaciones y vigencia */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-zinc-400 text-xs mb-1 block">Observaciones</label>
              <textarea className="input-field resize-none" rows={3} value={notes}
                onChange={(e) => setNotes(e.target.value)} placeholder="Condiciones, aclaraciones..." />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">Vigencia (días)</label>
              <input className="input-field" type="number" min={1} value={validDays}
                onChange={(e) => setValidDays(e.target.value)} />
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="bg-zinc-800 rounded-xl px-5 py-3 text-right">
              <p className="text-zinc-400 text-xs">Total cotización</p>
              <p className="text-brand-green font-black text-2xl">{fmt(total)}</p>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary px-5">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary px-6">
              {saving ? "Guardando..." : "Guardar cotización"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal de detalle de cotización ────────────────────────────────
function QuoteDetail({ quote, onClose, onRefresh, onConvert }) {
  const [sending,  setSending]  = useState(false);
  const [sendMsg,  setSendMsg]  = useState("");
  const [editing,  setEditing]  = useState(false);
  const { accessToken } = useAuthStore();

  const items = Array.isArray(quote.items)
    ? quote.items
    : (() => { try { return JSON.parse(quote.items); } catch { return []; } })();

  async function handleSendEmail() {
    setSending(true); setSendMsg("");
    try {
      await api.post(`/quotes/${quote.id}/send`);
      setSendMsg("✓ Cotización enviada al correo del cliente.");
      onRefresh();
    } catch (err) {
      setSendMsg(err.response?.data?.message || "Error al enviar.");
    } finally { setSending(false); }
  }

  async function handleStatus(status) {
    try {
      await api.put(`/quotes/${quote.id}`, { status });
      onRefresh();
    } catch { /* ignorar */ }
  }

  async function handleDownload() {
    try {
      const res = await api.get(`/quotes/${quote.id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `cotizacion-${String(quote.quote_number).padStart(4,"0")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignorar */ }
  }

  if (editing) {
    return (
      <QuoteForm
        initial={quote}
        onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); onRefresh(); }}
      />
    );
  }

  const st = STATUS_LABEL[quote.status] || STATUS_LABEL.draft;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-2xl border border-zinc-800 p-6">
        {/* Cabecera */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-zinc-500 text-xs mb-1">Cotización</p>
            <h2 className="text-white font-black text-xl">
              N° {String(quote.quote_number).padStart(4,"0")}
            </h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${st.cls}`}>
              {st.label}
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Cliente */}
        <div className="card mb-4">
          <p className="text-zinc-400 text-xs mb-2">CLIENTE</p>
          <p className="text-white font-semibold">{quote.customer_name}</p>
          {quote.customer_email && <p className="text-zinc-400 text-sm">✉ {quote.customer_email}</p>}
          {quote.customer_phone && <p className="text-zinc-400 text-sm">📞 {quote.customer_phone}</p>}
          <p className="text-zinc-500 text-xs mt-2">
            Vigencia: {quote.valid_days} días ·
            Creada: {new Date(quote.created_at).toLocaleDateString("es-CO")} ·
            Por: {quote.created_by_name}
          </p>
        </div>

        {/* Items */}
        <div className="card mb-4">
          <p className="text-zinc-400 text-xs mb-3">PRODUCTOS</p>
          <div className="space-y-3">
            {items.map((item, i) => {
              const qty = item.quantity || Object.values(item.sizes||{}).reduce((a,q)=>a+(Number(q)||0),0);
              return (
                <div key={i} className="flex items-start justify-between border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-white font-medium text-sm">{item.product_name}</p>
                    <p className="text-zinc-500 text-xs">{item.gender} · {qty} uds</p>
                    <p className="text-zinc-600 text-xs">
                      {Object.entries(item.sizes||{}).filter(([,q])=>q>0).map(([s,q])=>`${s}:${q}`).join(" · ")}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-zinc-400 text-xs">{fmt(item.unit_price)} c/u</p>
                    <p className="text-brand-green font-bold text-sm">{fmt(item.subtotal)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-zinc-700">
            <span className="text-zinc-400 text-sm font-medium">Total</span>
            <span className="text-brand-green font-black text-xl">{fmt(quote.total)}</span>
          </div>
        </div>

        {quote.notes && (
          <div className="card mb-4">
            <p className="text-zinc-400 text-xs mb-1">OBSERVACIONES</p>
            <p className="text-zinc-300 text-sm">{quote.notes}</p>
          </div>
        )}

        {sendMsg && (
          <p className={`text-sm mb-3 ${sendMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{sendMsg}</p>
        )}

        {/* Acciones de estado */}
        {quote.status !== "approved" && quote.status !== "rejected" && (
          <div className="flex gap-2 mb-3 flex-wrap">
            <button onClick={() => handleStatus("approved")}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-900 text-green-300 hover:bg-green-800 transition-colors">
              ✓ Marcar aprobada
            </button>
            <button onClick={() => handleStatus("rejected")}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-900 text-red-300 hover:bg-red-800 transition-colors">
              ✗ Marcar rechazada
            </button>
          </div>
        )}

        {/* Botones principales */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleDownload}
            className="btn-secondary text-sm px-4 flex items-center gap-2">
            ⬇ Descargar PDF
          </button>
          {quote.customer_email && (
            <button onClick={handleSendEmail} disabled={sending}
              className="btn-secondary text-sm px-4 flex items-center gap-2">
              {sending ? "Enviando..." : "✉ Enviar por correo"}
            </button>
          )}
          {quote.status === "approved" && (
            <button onClick={() => onConvert(quote)}
              className="btn-primary text-sm px-4 flex items-center gap-2">
              📋 Convertir en pedido
            </button>
          )}
          <button onClick={() => setEditing(true)}
            className="btn-secondary text-sm px-4 ml-auto">
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function QuotesPage() {
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const [showForm,   setShowForm]   = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn:  () => api.get("/quotes").then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/quotes/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["quotes"] });
    setSelected(null);
  }

  function handleConvert(quote) {
    const items = Array.isArray(quote.items)
      ? quote.items
      : (() => { try { return JSON.parse(quote.items); } catch { return []; } })();

    // Encode as search params and navigate to new order page
    const state = {
      fromQuote: true,
      quoteId:   quote.id,
      items,
    };
    navigate("/orders/new", { state });
  }

  const filtered = statusFilter === "all"
    ? quotes
    : quotes.filter((q) => q.status === statusFilter);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-black text-2xl">Cotizaciones</h1>
          <p className="text-zinc-500 text-sm">{quotes.length} cotizaciones en total</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Nueva cotización
        </button>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 flex-wrap">
        {[["all","Todas"], ["draft","Borrador"], ["sent","Enviadas"], ["approved","Aprobadas"], ["rejected","Rechazadas"]].map(([val, label]) => (
          <button key={val} onClick={() => setStatusFilter(val)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors
              ${statusFilter === val
                ? "bg-brand-green text-black border-brand-green font-semibold"
                : "text-zinc-400 border-zinc-700 hover:border-zinc-500"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <p className="text-zinc-500 text-sm">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-zinc-500">No hay cotizaciones.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const st = STATUS_LABEL[q.status] || STATUS_LABEL.draft;
            const items = Array.isArray(q.items)
              ? q.items
              : (() => { try { return JSON.parse(q.items); } catch { return []; } })();
            return (
              <div key={q.id}
                className="card hover:border-zinc-600 cursor-pointer transition-colors flex items-center justify-between gap-4"
                onClick={() => setSelected(q)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-white font-bold">
                      N° {String(q.quote_number).padStart(4,"0")}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  <p className="text-zinc-300 text-sm font-medium truncate">{q.customer_name}</p>
                  {q.customer_email && <p className="text-zinc-500 text-xs truncate">{q.customer_email}</p>}
                  <p className="text-zinc-600 text-xs mt-0.5">
                    {items.length} producto{items.length !== 1 ? "s" : ""} ·
                    Por {q.created_by_name} ·
                    {new Date(q.created_at).toLocaleDateString("es-CO")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-brand-green font-black text-lg">{fmt(q.total)}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm("¿Eliminar cotización?")) deleteMutation.mutate(q.id); }}
                    className="text-zinc-600 hover:text-red-400 text-xs mt-1 transition-colors">
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <QuoteForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["quotes"] }); }}
        />
      )}

      {selected && (
        <QuoteDetail
          quote={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => { qc.invalidateQueries({ queryKey: ["quotes"] }); setSelected(null); }}
          onConvert={handleConvert}
        />
      )}
    </div>
  );
}
