import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "../../config/api.js";
import { fileUrl } from "../../utils/fileUrl.js";

function formatPriceCO(raw) {
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("es-CO");
}

const PRICE_TIERS = [
  { key: "price_unit",        label: "Unitario",     desc: "" },
  { key: "price_group",       label: "Grupo",        desc: ">6 uds" },
  { key: "price_distributor", label: "Distribuidor", desc: ">15 uds" },
];

export default function CatalogPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("sports");

  const sports   = useQuery({ queryKey: ["sports"],   queryFn: () => api.get("/catalog/sports").then(r => r.data.data) });
  const lines    = useQuery({ queryKey: ["lines"],    queryFn: () => api.get("/catalog/lines").then(r => r.data.data) });
  const products = useQuery({ queryKey: ["products"], queryFn: () => api.get("/catalog/products").then(r => r.data.data) });

  const [form,      setForm]      = useState(null);
  const [search,    setSearch]    = useState("");
  const [priceTier, setPriceTier] = useState("price_unit");

  const saveSport = useMutation({
    mutationFn: (d) => d.id ? api.put(`/catalog/sports/${d.id}`, d) : api.post("/catalog/sports", d),
    onSuccess: () => { qc.invalidateQueries(["sports"]); setForm(null); },
  });
  const saveLine = useMutation({
    mutationFn: (d) => d.id ? api.put(`/catalog/lines/${d.id}`, d) : api.post("/catalog/lines", d),
    onSuccess: () => { qc.invalidateQueries(["lines"]); setForm(null); },
  });
  const saveProduct = useMutation({
    mutationFn: (d) => {
      const fd = new FormData();
      if (d.line_id)           fd.append("line_id",           d.line_id);
      if (d.name)              fd.append("name",              d.name);
      if (d.display_order)     fd.append("display_order",     d.display_order);
      if (d.price_unit    != null) fd.append("price_unit",    d.price_unit);
      if (d.price_group   != null) fd.append("price_group",   d.price_group);
      if (d.price_distributor != null) fd.append("price_distributor", d.price_distributor);
      if (d.description)       fd.append("description",       d.description);
      if (d._imageFile)        fd.append("image",             d._imageFile);
      return d.id
        ? api.put(`/catalog/products/${d.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } })
        : api.post("/catalog/products", fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => { qc.invalidateQueries(["products"]); setForm(null); },
  });

  const deleteSport = useMutation({
    mutationFn: (id) => api.delete(`/catalog/sports/${id}`),
    onSuccess: () => qc.invalidateQueries(["sports"]),
  });
  const deleteLine = useMutation({
    mutationFn: (id) => api.delete(`/catalog/lines/${id}`),
    onSuccess: () => qc.invalidateQueries(["lines"]),
  });
  const deleteProduct = useMutation({
    mutationFn: (id) => api.delete(`/catalog/products/${id}`),
    onSuccess: () => qc.invalidateQueries(["products"]),
  });

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products.data || []).filter(p =>
      !q || p.name.toLowerCase().includes(q) || p.sport_name?.toLowerCase().includes(q) || p.line_name?.toLowerCase().includes(q)
    );
  }, [products.data, search]);

  const productsBySport = useMemo(() => {
    // Keep insertion order from server (already sorted by s.display_order)
    const groups = new Map();
    filteredProducts.forEach(p => {
      const sport = p.sport_name || "Sin deporte";
      if (!groups.has(sport)) groups.set(sport, []);
      groups.get(sport).push(p);
    });
    return groups;
  }, [filteredProducts]);

  const activeTier = PRICE_TIERS.find(t => t.key === priceTier) || PRICE_TIERS[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <button className="btn-primary whitespace-nowrap self-start order-first sm:order-last" onClick={() => {
          if (tab === "sports")   setForm({ type: "sport" });
          if (tab === "lines")    setForm({ type: "line" });
          if (tab === "products") setForm({ type: "product" });
        }}>+ Agregar</button>
        <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg overflow-x-auto w-fit order-last sm:order-first">
          {[["sports","Deportes"],["lines","Líneas"],["products","Productos"]].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setSearch(""); }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap
                ${tab === key ? "bg-brand-green text-black" : "text-zinc-400 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "sports" && (
        <CatalogTable
          data={sports.data}
          columns={[["name","Nombre"],["slug","Slug"]]}
          onEdit={(row) => setForm({ type: "sport", ...row })}
          onDelete={(row) => { if (window.confirm(`¿Eliminar deporte "${row.name}"?`)) deleteSport.mutate(row.id); }}
        />
      )}
      {tab === "lines" && (
        <CatalogTable
          data={lines.data}
          columns={[["name","Nombre"],["sport_name","Deporte"],["slug","Slug"]]}
          onEdit={(row) => setForm({ type: "line", ...row })}
          onDelete={(row) => { if (window.confirm(`¿Eliminar línea "${row.name}"?`)) deleteLine.mutate(row.id); }}
        />
      )}
      {tab === "products" && (
        <div className="space-y-4">
          {/* Toolbar: búsqueda + selector de tarifa */}
          <div className="flex gap-2 flex-col sm:flex-row">
            <input
              type="text"
              className="input-field flex-1"
              placeholder="Buscar producto, deporte o línea..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg shrink-0">
              {PRICE_TIERS.map((t) => (
                <button key={t.key} onClick={() => setPriceTier(t.key)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap
                    ${priceTier === t.key ? "bg-brand-green text-black" : "text-zinc-400 hover:text-white"}`}>
                  {t.label}{t.desc && <span className="ml-1 opacity-70">{t.desc}</span>}
                </button>
              ))}
            </div>
          </div>

          {productsBySport.size === 0 && (
            <p className="text-zinc-500 text-sm text-center py-8">No se encontraron productos.</p>
          )}
          {[...productsBySport.entries()].map(([sport, prods]) => (
            <div key={sport}>
              <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-2 px-1">{sport}</h3>
              <div className="card overflow-hidden p-0 overflow-x-auto">
                <table className="w-full text-sm min-w-[360px] table-fixed">
                  <colgroup>
                    <col className="w-[40%]" />
                    <col className="w-[20%]" />
                    <col className="w-[20%]" />
                    <col className="w-[20%]" />
                  </colgroup>
                  <thead className="bg-zinc-800 text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 text-left align-middle">Nombre</th>
                      <th className="px-4 py-3 text-left align-middle">Línea</th>
                      <th className="px-4 py-3 text-center align-middle">
                        Precio {activeTier.label}
                        {activeTier.desc && <span className="ml-1 text-zinc-500 text-xs">({activeTier.desc})</span>}
                      </th>
                      <th className="px-4 py-3 align-middle" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {prods.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors">
                        <td className="px-4 py-3 text-zinc-300 align-middle truncate">{row.name}</td>
                        <td className="px-4 py-3 text-left text-zinc-400 align-middle truncate">{row.line_name}</td>
                        <td className="px-4 py-3 text-center text-zinc-300 align-middle">
                          {row[priceTier]
                            ? `$${Number(row[priceTier]).toLocaleString("es-CO")}`
                            : <span className="text-zinc-600">—</span>}
                        </td>
                        <td className="px-4 py-3 w-16 flex gap-3">
                          <button className="text-zinc-500 hover:text-brand-green text-xs" onClick={() => setForm({ type: "product", ...row })}>Editar</button>
                          <button className="text-zinc-500 hover:text-red-400 text-xs" onClick={() => { if (window.confirm(`¿Eliminar producto "${row.name}"?`)) deleteProduct.mutate(row.id); }}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {form?.type === "sport"   && <CatalogModal form={form} fields={[["name","Nombre"]]} onSave={(d) => saveSport.mutate(d)} onClose={() => setForm(null)} sports={sports.data} />}
      {form?.type === "line"    && <CatalogModal form={form} fields={[["name","Nombre"],["sport_id","Deporte"]]} onSave={(d) => saveLine.mutate(d)} onClose={() => setForm(null)} sports={sports.data} />}
      {form?.type === "product" && <ProductModal form={form} onSave={(d) => saveProduct.mutate(d)} onClose={() => setForm(null)} lines={lines.data} />}
    </div>
  );
}

function ProductModal({ form, onSave, onClose, lines }) {
  const [data, setData]       = useState({ ...form });
  const [preview, setPreview] = useState(form.image_url ? fileUrl(form.image_url) : null);
  const set = (k, v) => setData((p) => ({ ...p, [k]: v }));

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    setData((p) => ({ ...p, _imageFile: file }));
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md space-y-4 overflow-y-auto max-h-[90vh]">
        <h2 className="text-white font-semibold">{data.id ? "Editar producto" : "Nuevo producto"}</h2>

        <select className="input-field" value={data.line_id || ""} onChange={(e) => set("line_id", e.target.value)}>
          <option value="">Seleccionar línea</option>
          {lines?.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.sport_name})</option>)}
        </select>

        <input className="input-field" placeholder="Nombre" value={data.name || ""} onChange={(e) => set("name", e.target.value)} />

        <textarea className="input-field resize-none" rows={3} placeholder="Descripción (opcional)"
          value={data.description || ""} onChange={(e) => set("description", e.target.value)} />

        <PriceField label="Precio Unitario"            fieldKey="price_unit"        data={data} setData={setData} />
        <PriceField label="Precio Grupo (>6 uds)"      fieldKey="price_group"       data={data} setData={setData} />
        <PriceField label="Precio Distribuidor (>15)"  fieldKey="price_distributor" data={data} setData={setData} />

        <div>
          <label className="block text-xs text-zinc-400 mb-2">Imagen del producto (opcional)</label>
          {preview && <img src={preview} alt="preview" className="w-24 h-24 object-cover rounded-lg mb-2 border border-zinc-700" />}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="text-sm text-zinc-400" onChange={handleImage} />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(data)}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

function CatalogTable({ data, columns, onEdit, onDelete }) {
  return (
    <div className="card overflow-hidden p-0 overflow-x-auto">
      <table className="w-full text-sm min-w-[360px]">
        <thead className="bg-zinc-800 text-zinc-400">
          <tr>{columns.map(([,label]) => <th key={label} className="px-4 py-3 text-left">{label}</th>)}<th className="px-4 py-3" /></tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {data?.map((row) => (
            <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors">
              {columns.map(([key]) => <td key={key} className="px-4 py-3 text-zinc-300">{row[key]}</td>)}
              <td className="px-4 py-3">
                <div className="flex gap-3">
                  <button className="text-zinc-500 hover:text-brand-green text-xs" onClick={() => onEdit(row)}>Editar</button>
                  {onDelete && <button className="text-zinc-500 hover:text-red-400 text-xs" onClick={() => onDelete(row)}>Eliminar</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriceField({ label, fieldKey, data, setData }) {
  const [display, setDisplay] = useState(
    data[fieldKey] ? Number(data[fieldKey]).toLocaleString("es-CO") : ""
  );
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label} (opcional)</label>
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

function CatalogModal({ form, fields, onSave, onClose, sports, lines }) {
  const [data, setData] = useState({ ...form });
  const set = (k, v) => setData((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-sm space-y-4">
        <h2 className="text-white font-semibold">{data.id ? "Editar" : "Nuevo"}</h2>
        <div className="space-y-3">
          {fields.map(([key, label]) => {
            if (key === "sport_id") return (
              <select key={key} className="input-field" value={data.sport_id || ""} onChange={(e) => set("sport_id", e.target.value)}>
                <option value="">Seleccionar deporte</option>
                {sports?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            );
            if (key === "line_id") return (
              <select key={key} className="input-field" value={data.line_id || ""} onChange={(e) => set("line_id", e.target.value)}>
                <option value="">Seleccionar línea</option>
                {lines?.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.sport_name})</option>)}
              </select>
            );
            if (["price_unit","price_group","price_distributor"].includes(key)) return (
              <PriceField key={key} label={label} fieldKey={key} data={data} setData={setData} />
            );
            return <input key={key} className="input-field" placeholder={label} value={data[key] || ""} onChange={(e) => set(key, e.target.value)} />;
          })}
        </div>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(data)}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
