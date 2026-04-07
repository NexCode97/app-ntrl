import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../config/api.js";

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
    mutationFn: (d) => d.id ? api.put(`/catalog/products/${d.id}`, d) : api.post("/catalog/products", d),
    onSuccess: () => { qc.invalidateQueries(["products"]); setForm(null); },
  });

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products.data || []).filter(p =>
      !q || p.name.toLowerCase().includes(q) || p.sport_name?.toLowerCase().includes(q) || p.line_name?.toLowerCase().includes(q)
    );
  }, [products.data, search]);

  const productsBySport = useMemo(() => {
    const groups = {};
    filteredProducts.forEach(p => {
      const sport = p.sport_name || "Sin deporte";
      if (!groups[sport]) groups[sport] = [];
      groups[sport].push(p);
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
        />
      )}
      {tab === "lines" && (
        <CatalogTable
          data={lines.data}
          columns={[["name","Nombre"],["sport_name","Deporte"],["slug","Slug"]]}
          onEdit={(row) => setForm({ type: "line", ...row })}
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

          {Object.keys(productsBySport).length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-8">No se encontraron productos.</p>
          )}
          {Object.entries(productsBySport).map(([sport, prods]) => (
            <div key={sport}>
              <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-2 px-1">{sport}</h3>
              <div className="card overflow-hidden p-0 overflow-x-auto">
                <table className="w-full text-sm min-w-[360px]">
                  <thead className="bg-zinc-800 text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 text-left">Nombre</th>
                      <th className="px-4 py-3 text-left">Línea</th>
                      <th className="px-4 py-3 text-center">
                        Precio {activeTier.label}
                        {activeTier.desc && <span className="ml-1 text-zinc-500 text-xs">({activeTier.desc})</span>}
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {prods.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors">
                        <td className="px-4 py-3 text-zinc-300">{row.name}</td>
                        <td className="px-4 py-3 text-zinc-400">{row.line_name}</td>
                        <td className="px-4 py-3 text-center text-zinc-300">
                          {row[priceTier]
                            ? `$${Number(row[priceTier]).toLocaleString("es-CO")}`
                            : <span className="text-zinc-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button className="text-zinc-500 hover:text-brand-green text-xs" onClick={() => setForm({ type: "product", ...row })}>Editar</button>
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
      {form?.type === "product" && <CatalogModal form={form} fields={[["name","Nombre"],["line_id","Línea"],["price_unit","Precio Unitario"],["price_group","Precio Grupo (>6)"],["price_distributor","Precio Distribuidor (>15)"]]} onSave={(d) => saveProduct.mutate(d)} onClose={() => setForm(null)} sports={sports.data} lines={lines.data} />}
    </div>
  );
}

function CatalogTable({ data, columns, onEdit }) {
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
                <button className="text-zinc-500 hover:text-brand-green text-xs" onClick={() => onEdit(row)}>Editar</button>
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
