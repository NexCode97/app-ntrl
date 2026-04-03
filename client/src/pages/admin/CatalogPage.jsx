import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../config/api.js";

export default function CatalogPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("sports");

  const sports  = useQuery({ queryKey: ["sports"],  queryFn: () => api.get("/catalog/sports").then(r => r.data.data) });
  const lines   = useQuery({ queryKey: ["lines"],   queryFn: () => api.get("/catalog/lines").then(r => r.data.data) });
  const products = useQuery({ queryKey: ["products"], queryFn: () => api.get("/catalog/products").then(r => r.data.data) });

  const [form, setForm] = useState(null);

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
            <button key={key} onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap
                ${tab === key ? "bg-brand-green text-black" : "text-zinc-400 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "sports" && (
        <CatalogTable
          title="Deportes"
          data={sports.data}
          columns={[["name","Nombre"],["slug","Slug"]]}
          onEdit={(row) => setForm({ type: "sport", ...row })}
        />
      )}
      {tab === "lines" && (
        <CatalogTable
          title="Líneas"
          data={lines.data}
          columns={[["name","Nombre"],["sport_name","Deporte"],["slug","Slug"]]}
          onEdit={(row) => setForm({ type: "line", ...row })}
        />
      )}
      {tab === "products" && (
        <CatalogTable
          title="Productos"
          data={products.data}
          columns={[["name","Nombre"],["line_name","Línea"],["sport_name","Deporte"]]}
          onEdit={(row) => setForm({ type: "product", ...row })}
        />
      )}

      {form?.type === "sport"   && <CatalogModal form={form} fields={[["name","Nombre"]]} onSave={(d) => saveSport.mutate(d)} onClose={() => setForm(null)} sports={sports.data} />}
      {form?.type === "line"    && <CatalogModal form={form} fields={[["name","Nombre"],["sport_id","Deporte"]]} onSave={(d) => saveLine.mutate(d)} onClose={() => setForm(null)} sports={sports.data} />}
      {form?.type === "product" && <CatalogModal form={form} fields={[["name","Nombre"],["line_id","Línea"]]} onSave={(d) => saveProduct.mutate(d)} onClose={() => setForm(null)} sports={sports.data} lines={lines.data} />}
    </div>
  );
}

function CatalogTable({ title, data, columns, onEdit }) {
  return (
    <div className="space-y-3">
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
