import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../config/api.js";
import { fileUrl } from "../../utils/fileUrl.js";

/* ── Icons ─────────────────────────────────────────────────────────── */
const IconEdit    = () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>;
const IconTrash   = () => <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IconImage   = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;
const IconUpload  = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const IconClose   = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IconLayers  = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>;
const IconTag     = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>;
const IconBox     = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
const IconGrip    = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/></svg>;

/* ── Helpers ────────────────────────────────────────────────────────── */
function formatCO(val) {
  if (val == null || val === "") return "—";
  return `$${Number(val).toLocaleString("es-CO")}`;
}


const SPORT_COLORS = [
  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "bg-green-500/20 text-green-300 border-green-500/30",
  "bg-orange-500/20 text-orange-300 border-orange-500/30",
];

function sportColor(idx) {
  return SPORT_COLORS[idx % SPORT_COLORS.length];
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function CatalogPage() {
  const qc = useQueryClient();
  const [tab,         setTab]        = useState("sports");
  const [form,        setForm]       = useState(null);
  const [search,      setSearch]     = useState("");
  const [sportOrder,  setSportOrder] = useState([]); // ids ordenados manualmente
  const dragItem  = useRef(null);
  const dragOver  = useRef(null);

  const sports   = useQuery({ queryKey: ["sports"],   queryFn: () => api.get("/catalog/sports").then(r => r.data.data) });
  const lines    = useQuery({ queryKey: ["lines"],    queryFn: () => api.get("/catalog/lines").then(r => r.data.data) });
  const products = useQuery({ queryKey: ["products"], queryFn: () => api.get("/catalog/products").then(r => r.data.data) });

  const saveSport   = useMutation({ mutationFn: (d) => d.id ? api.put(`/catalog/sports/${d.id}`, d)   : api.post("/catalog/sports", d),   onSuccess: () => { qc.invalidateQueries({ queryKey: ["sports"] });   setForm(null); } });
  const saveLine    = useMutation({ mutationFn: (d) => d.id ? api.put(`/catalog/lines/${d.id}`, d)    : api.post("/catalog/lines", d),    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lines"] });    setForm(null); } });
  const saveProduct = useMutation({
    mutationFn: (d) => {
      const fd = new FormData();
      if (d.line_id)               fd.append("line_id",           d.line_id);
      if (d.name)                  fd.append("name",              d.name);
      if (d.display_order)         fd.append("display_order",     d.display_order);
      if (d.price_unit        != null) fd.append("price_unit",        d.price_unit);
      if (d.price_group       != null) fd.append("price_group",       d.price_group);
      if (d.price_distributor != null) fd.append("price_distributor", d.price_distributor);
      if (d.description !== undefined) fd.append("description",       d.description || "");
      if (d._imageFile)            fd.append("image", d._imageFile);
      if (d.image_url === null && !d._imageFile) fd.append("remove_image", "true");
      return d.id
        ? api.put(`/catalog/products/${d.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } })
        : api.post("/catalog/products", fd,        { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); setForm(null); },
  });

  const deleteSport   = useMutation({ mutationFn: (id) => api.delete(`/catalog/sports/${id}`),   onSuccess: () => qc.invalidateQueries({ queryKey: ["sports"] }) });
  const deleteLine    = useMutation({ mutationFn: (id) => api.delete(`/catalog/lines/${id}`),    onSuccess: () => qc.invalidateQueries({ queryKey: ["lines"] }) });
  const deleteProduct = useMutation({ mutationFn: (id) => api.delete(`/catalog/products/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }) });

  // Inicializar orden desde el server (display_order o posición en array)
  const orderedSports = useMemo(() => {
    const list = sports.data || [];
    if (!sportOrder.length) return list;
    const map = Object.fromEntries(list.map(s => [s.id, s]));
    const sorted = sportOrder.map(id => map[id]).filter(Boolean);
    // Agregar los que no están en sportOrder (nuevos)
    list.forEach(s => { if (!sportOrder.includes(s.id)) sorted.push(s); });
    return sorted;
  }, [sports.data, sportOrder]);

  // Poblar sportOrder cuando llegan los datos del server (solo la primera vez)
  useMemo(() => {
    if (sports.data?.length && !sportOrder.length) {
      setSportOrder(sports.data.map(s => s.id));
    }
  }, [sports.data]);

  // Drag & drop handlers
  function handleDragStart(id) { dragItem.current = id; }
  function handleDragEnter(id) { dragOver.current = id; }
  function handleDragEnd() {
    if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) return;
    const newOrder = [...sportOrder];
    const fromIdx  = newOrder.indexOf(dragItem.current);
    const toIdx    = newOrder.indexOf(dragOver.current);
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, dragItem.current);
    setSportOrder(newOrder);
    dragItem.current = null;
    dragOver.current = null;
    // Persistir display_order en el backend
    newOrder.forEach((id, idx) => {
      api.put(`/catalog/sports/${id}`, { display_order: idx + 1 }).catch(() => {});
    });
    qc.invalidateQueries({ queryKey: ["sports"] });
  }

  // Índice de color por deporte (basado en el orden actual)
  const sportColorMap = useMemo(() => {
    const map = {};
    orderedSports.forEach((s, i) => { map[s.name] = i; });
    return map;
  }, [orderedSports]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products.data || []).filter(p =>
      !q || p.name.toLowerCase().includes(q) ||
      p.sport_name?.toLowerCase().includes(q) ||
      p.line_name?.toLowerCase().includes(q)
    );
  }, [products.data, search]);

  const productsBySport = useMemo(() => {
    // Agrupar
    const groups = new Map();
    filteredProducts.forEach(p => {
      const sport = p.sport_name || "Sin deporte";
      if (!groups.has(sport)) groups.set(sport, []);
      groups.get(sport).push(p);
    });
    // Reordenar según orderedSports
    const ordered = new Map();
    orderedSports.forEach(s => { if (groups.has(s.name)) ordered.set(s.name, groups.get(s.name)); });
    groups.forEach((v, k) => { if (!ordered.has(k)) ordered.set(k, v); });
    return ordered;
  }, [filteredProducts, orderedSports]);

  const filteredSports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sports.data || []).filter(s => !q || s.name.toLowerCase().includes(q));
  }, [sports.data, search]);

  const filteredLines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (lines.data || []).filter(l =>
      !q || l.name.toLowerCase().includes(q) || l.sport_name?.toLowerCase().includes(q)
    );
  }, [lines.data, search]);

  function openAdd() {
    if (tab === "sports")   setForm({ type: "sport" });
    if (tab === "lines")    setForm({ type: "line" });
    if (tab === "products") setForm({ type: "product" });
  }

  const TABS = [["sports","Deportes",IconTag],["lines","Líneas",IconLayers],["products","Productos",IconBox]];

  return (
    <div className="space-y-4">
      <h1 className="text-white font-bold text-xl lg:hidden">Catálogo</h1>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <input
          className="input-field flex-1"
          placeholder={tab === "products" ? "Buscar producto, deporte o línea..." : tab === "lines" ? "Buscar línea o deporte..." : "Buscar deporte..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-primary shrink-0 whitespace-nowrap" onClick={openAdd}>
          + Agregar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl w-fit">
        {TABS.map(([key, label, Icon]) => (
          <button key={key} onClick={() => { setTab(key); setSearch(""); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
              ${tab === key ? "bg-brand-green text-black" : "text-zinc-400 hover:text-white"}`}>
            <Icon />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Deportes ── */}
      {tab === "sports" && (
        <div>
          {orderedSports.length === 0 && !sports.isLoading && (
            <div className="card text-center py-10"><p className="text-zinc-500">No hay deportes.</p></div>
          )}
          <div className="space-y-3 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-4 md:space-y-0">
            {orderedSports.filter(s => {
              const q = search.trim().toLowerCase();
              return !q || s.name.toLowerCase().includes(q);
            }).map((s, i) => {
              const lineCount    = (lines.data || []).filter(l => l.sport_id === s.id).length;
              const productCount = (products.data || []).filter(p => p.sport_id === s.id || p.sport_name === s.name).length;
              return (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => handleDragStart(s.id)}
                  onDragEnter={() => handleDragEnter(s.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="card border border-zinc-800 hover:border-zinc-600 transition-colors space-y-3 cursor-default"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${sportColor(i)}`}>
                        <IconTag />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{s.name}</p>
                        <span className="text-zinc-500 text-xs">{s.slug}</span>
                      </div>
                    </div>
                    {/* Handle de arrastre */}
                    <div
                      draggable
                      onDragStart={() => handleDragStart(s.id)}
                      title="Arrastrar para reordenar"
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 cursor-grab active:cursor-grabbing transition-colors shrink-0"
                    >
                      <IconGrip />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1 border-t border-zinc-800">
                    <div className="flex-1 text-center">
                      <p className="text-white font-bold text-lg">{lineCount}</p>
                      <p className="text-zinc-500 text-[10px]">Líneas</p>
                    </div>
                    <div className="w-px bg-zinc-800" />
                    <div className="flex-1 text-center">
                      <p className="text-white font-bold text-lg">{productCount}</p>
                      <p className="text-zinc-500 text-[10px]">Productos</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setForm({ type: "sport", ...s })}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg py-1.5 transition-colors">
                      <IconEdit /> Editar
                    </button>
                    <button onClick={() => { if (window.confirm(`¿Eliminar "${s.name}"?`)) deleteSport.mutate(s.id); }}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/50 rounded-lg py-1.5 transition-colors">
                      <IconTrash /> Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Líneas ── */}
      {tab === "lines" && (
        <div>
          {filteredLines.length === 0 && !lines.isLoading && (
            <div className="card text-center py-10"><p className="text-zinc-500">No hay líneas.</p></div>
          )}
          <div className="space-y-3 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-4 md:space-y-0">
            {filteredLines.map((l) => {
              const productCount = (products.data || []).filter(p => p.line_id === l.id || p.line_name === l.name).length;
              const sportIdx = (sports.data || []).findIndex(s => s.id === l.sport_id || s.name === l.sport_name);
              return (
                <div key={l.id} className="card border border-zinc-800 hover:border-zinc-600 transition-colors space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-white font-semibold text-sm">{l.name}</p>
                      {l.sport_name && (
                        <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sportColor(sportIdx >= 0 ? sportIdx : 0)}`}>
                          {l.sport_name}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white font-bold text-lg">{productCount}</p>
                      <p className="text-zinc-500 text-[10px]">Productos</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-zinc-800">
                    <button onClick={() => setForm({ type: "line", ...l })}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg py-1.5 transition-colors">
                      <IconEdit /> Editar
                    </button>
                    <button onClick={() => { if (window.confirm(`¿Eliminar línea "${l.name}"?`)) deleteLine.mutate(l.id); }}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/50 rounded-lg py-1.5 transition-colors">
                      <IconTrash /> Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Productos ── */}
      {tab === "products" && (
        <div className="space-y-6">
          {productsBySport.size === 0 && !products.isLoading && (
            <div className="card text-center py-10"><p className="text-zinc-500">No se encontraron productos.</p></div>
          )}
          {[...productsBySport.entries()].map(([sport, prods]) => {
            const sportIdx = sportColorMap[sport] ?? 0;
            return (
              <div key={sport}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${sportColor(sportIdx)}`}>{sport}</span>
                  <span className="text-zinc-600 text-xs">{prods.length} producto{prods.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-3 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-4 md:space-y-0">
                  {prods.map((p) => (
                    <div key={p.id} className="card border border-zinc-800 hover:border-zinc-600 transition-colors flex gap-3">
                      {/* Imagen */}
                      <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
                        {p.image_url
                          ? <img src={fileUrl(p.image_url)} alt={p.name} className="w-full h-full object-cover" />
                          : <span className="text-zinc-600"><IconImage /></span>
                        }
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-white font-medium text-sm truncate">{p.name}</p>
                        {p.line_name && (
                          <span className="inline-block text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">{p.line_name}</span>
                        )}
                        {/* Precios */}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5">
                          <span className="text-[10px] text-zinc-500">Unit. <span className="text-zinc-300">{formatCO(p.price_unit)}</span></span>
                          <span className="text-[10px] text-zinc-500">Grupo <span className="text-zinc-300">{formatCO(p.price_group)}</span></span>
                          <span className="text-[10px] text-zinc-500">Dist. <span className="text-zinc-300">{formatCO(p.price_distributor)}</span></span>
                        </div>
                        {/* Acciones */}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setForm({ type: "product", ...p })}
                            className="flex-1 flex items-center justify-center gap-1 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg py-1 transition-colors">
                            <IconEdit /> Editar
                          </button>
                          <button onClick={() => { if (window.confirm(`¿Eliminar "${p.name}"?`)) deleteProduct.mutate(p.id); }}
                            className="flex-1 flex items-center justify-center gap-1 text-xs text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/50 rounded-lg py-1 transition-colors">
                            <IconTrash /> Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modales */}
      {form?.type === "sport"   && <SportModal   form={form} onSave={(d) => saveSport.mutate(d)}   onClose={() => setForm(null)} saving={saveSport.isLoading} />}
      {form?.type === "line"    && <LineModal     form={form} onSave={(d) => saveLine.mutate(d)}    onClose={() => setForm(null)} saving={saveLine.isLoading}  sports={sports.data} />}
      {form?.type === "product" && <ProductModal  form={form} onSave={(d) => saveProduct.mutate(d)} onClose={() => setForm(null)} saving={saveProduct.isLoading} lines={lines.data} />}
    </div>
  );
}

/* ── Modal Deporte ──────────────────────────────────────────────────── */
function SportModal({ form, onSave, onClose, saving }) {
  const [data, setData] = useState({ ...form });
  const set = (k, v) => setData(p => ({ ...p, [k]: v }));
  const initials = data.name?.trim().slice(0, 2).toUpperCase() || (data.id ? "?" : "+");

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 px-5 pt-4 pb-5 relative rounded-t-2xl overflow-hidden">
          <button onClick={onClose} className="absolute top-3 right-4 text-zinc-500 hover:text-white transition-colors"><IconClose /></button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-green/20 border border-brand-green/30 flex items-center justify-center shrink-0">
              <span className="text-brand-green font-black text-lg">{initials}</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-base">{data.id ? "Editar deporte" : "Nuevo deporte"}</h2>
              {data.name && <p className="text-zinc-400 text-xs mt-0.5">{data.name}</p>}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nombre <span className="text-red-400">*</span></label>
            <input className="input-field" placeholder="Ej: Fútbol" value={data.name || ""} onChange={(e) => set("name", e.target.value)} />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button className="flex-1 btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="flex-1 btn-primary" onClick={() => onSave(data)} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal Línea ────────────────────────────────────────────────────── */
function LineModal({ form, onSave, onClose, saving, sports }) {
  const [data, setData] = useState({ ...form });
  const set = (k, v) => setData(p => ({ ...p, [k]: v }));
  const initials = data.name?.trim().slice(0, 2).toUpperCase() || (data.id ? "?" : "+");

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 px-5 pt-4 pb-5 relative rounded-t-2xl overflow-hidden">
          <button onClick={onClose} className="absolute top-3 right-4 text-zinc-500 hover:text-white transition-colors"><IconClose /></button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-green/20 border border-brand-green/30 flex items-center justify-center shrink-0">
              <span className="text-brand-green font-black text-lg">{initials}</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-base">{data.id ? "Editar línea" : "Nueva línea"}</h2>
              {data.name && <p className="text-zinc-400 text-xs mt-0.5">{data.name}</p>}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Deporte <span className="text-red-400">*</span></label>
            <select className="input-field" value={data.sport_id || ""} onChange={(e) => set("sport_id", e.target.value)}>
              <option value="">Seleccionar deporte</option>
              {sports?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nombre <span className="text-red-400">*</span></label>
            <input className="input-field" placeholder="Ej: Línea Premium" value={data.name || ""} onChange={(e) => set("name", e.target.value)} />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button className="flex-1 btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="flex-1 btn-primary" onClick={() => onSave(data)} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal Producto ─────────────────────────────────────────────────── */
function PriceField({ label, desc, fieldKey, data, setData }) {
  const [display, setDisplay] = useState(
    data[fieldKey] != null ? Number(data[fieldKey]).toLocaleString("es-CO") : ""
  );
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">
        {label} {desc && <span className="text-zinc-600">{desc}</span>}
      </label>
      <input type="text" inputMode="numeric" className="input-field" placeholder="$0"
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          setDisplay(digits ? Number(digits).toLocaleString("es-CO") : "");
          setData(prev => ({ ...prev, [fieldKey]: digits ? Number(digits) : null }));
        }} />
    </div>
  );
}

function ProductModal({ form, onSave, onClose, saving, lines }) {
  const [data,    setData]   = useState({ ...form });
  const [preview, setPreview] = useState(form.image_url ? fileUrl(form.image_url) : null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const set = (k, v) => setData(p => ({ ...p, [k]: v }));

  function applyFile(file) {
    if (!file) return;
    setData(p => ({ ...p, _imageFile: file }));
    setPreview(URL.createObjectURL(file));
  }

  const initials = data.name?.trim().slice(0, 2).toUpperCase() || (data.id ? "?" : "+");

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md md:max-w-2xl shadow-2xl">

        {/* Header */}
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 px-5 pt-4 pb-5 relative rounded-t-2xl overflow-hidden">
          <button onClick={onClose} className="absolute top-3 right-4 text-zinc-500 hover:text-white transition-colors"><IconClose /></button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-green/20 border border-brand-green/30 flex items-center justify-center shrink-0 overflow-hidden">
              {preview
                ? <img src={preview} alt="" className="w-full h-full object-cover" />
                : <span className="text-brand-green font-black text-lg">{initials}</span>
              }
            </div>
            <div>
              <h2 className="text-white font-bold text-base">{data.id ? "Editar producto" : "Nuevo producto"}</h2>
              {data.name && <p className="text-zinc-400 text-xs mt-0.5">{data.name}</p>}
            </div>
          </div>
        </div>

        {/* Body — 2 col en desktop */}
        <div className="px-5 py-4 md:grid md:grid-cols-2 md:gap-4 space-y-3 md:space-y-0">

          {/* Col izquierda: Info + Precios */}
          <div className="space-y-3">

            {/* Info */}
            <div className="bg-zinc-800/50 rounded-xl p-3 space-y-2.5">
              <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Información</p>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Línea <span className="text-red-400">*</span></label>
                <select className="input-field" value={data.line_id || ""} onChange={(e) => set("line_id", e.target.value)}>
                  <option value="">Seleccionar línea</option>
                  {lines?.map(l => <option key={l.id} value={l.id}>{l.name} — {l.sport_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Nombre <span className="text-red-400">*</span></label>
                <input className="input-field" placeholder="Nombre del producto" value={data.name || ""} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Descripción</label>
                <textarea className="input-field resize-none" rows={2} placeholder="Descripción opcional"
                  value={data.description || ""} onChange={(e) => set("description", e.target.value)} />
              </div>
            </div>

            {/* Precios */}
            <div className="bg-zinc-800/50 rounded-xl p-3 space-y-2.5">
              <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Precios</p>
              <PriceField label="Unitario"     desc=""          fieldKey="price_unit"        data={data} setData={setData} />
              <PriceField label="Grupo"        desc="(+6 uds)"  fieldKey="price_group"       data={data} setData={setData} />
              <PriceField label="Distribuidor" desc="(+15 uds)" fieldKey="price_distributor" data={data} setData={setData} />
            </div>
          </div>

          {/* Col derecha: Imagen */}
          <div>
            <div className="bg-zinc-800/50 rounded-xl p-3 space-y-3 h-full flex flex-col">
              <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Imagen</p>

              {/* Zona de imagen */}
              <div
                className={`flex-1 min-h-[160px] rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer
                  ${dragOver ? "border-brand-green bg-brand-green/5" : "border-zinc-700 hover:border-zinc-500"}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); applyFile(e.dataTransfer.files[0]); }}
              >
                {preview ? (
                  <img src={preview} alt="preview" className="w-full h-full object-contain rounded-lg max-h-48" />
                ) : (
                  <>
                    <span className="text-zinc-600"><IconImage /></span>
                    <p className="text-zinc-500 text-xs text-center">Arrastra una imagen<br/>o haz clic para subir</p>
                  </>
                )}
              </div>

              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => applyFile(e.target.files[0])} />

              <div className="flex gap-2">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg py-1.5 transition-colors">
                  <IconUpload /> Subir imagen
                </button>
                {preview && (
                  <button type="button" onClick={() => { setPreview(null); setData(p => ({ ...p, _imageFile: null, image_url: null })); }}
                    className="flex items-center justify-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-800/50 hover:border-red-500/50 rounded-lg px-3 py-1.5 transition-colors">
                    <IconTrash /> Quitar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button className="flex-1 btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="flex-1 btn-primary" onClick={() => onSave(data)} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
