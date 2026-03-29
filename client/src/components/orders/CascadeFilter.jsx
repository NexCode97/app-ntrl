import { useState, useEffect } from "react";
import { api } from "../../config/api.js";

export default function CascadeFilter({ onProductSelect }) {
  const [sports,   setSports]   = useState([]);
  const [lines,    setLines]    = useState([]);
  const [products, setProducts] = useState([]);

  const [sportId,   setSportId]   = useState("");
  const [lineId,    setLineId]    = useState("");
  const [productId, setProductId] = useState("");

  useEffect(() => {
    api.get("/catalog/sports").then(({ data }) => setSports(data.data));
  }, []);

  useEffect(() => {
    if (!sportId) { setLines([]); setLineId(""); return; }
    api.get(`/catalog/lines?sport_id=${sportId}`).then(({ data }) => setLines(data.data));
    setLineId(""); setProductId("");
  }, [sportId]);

  useEffect(() => {
    if (!lineId) { setProducts([]); setProductId(""); return; }
    api.get(`/catalog/products?line_id=${lineId}`).then(({ data }) => setProducts(data.data));
    setProductId("");
  }, [lineId]);

  useEffect(() => {
    if (productId && onProductSelect) {
      onProductSelect(products.find((p) => p.id === productId));
    }
  }, [productId]);

  return (
    <div className="grid grid-cols-3 gap-3">
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Deporte</label>
        <select className="input-field" value={sportId} onChange={(e) => setSportId(e.target.value)}>
          <option value="">Seleccionar...</option>
          {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Línea</label>
        <select className="input-field" value={lineId} onChange={(e) => setLineId(e.target.value)} disabled={!sportId}>
          <option value="">Seleccionar...</option>
          {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Producto</label>
        <select className="input-field" value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!lineId}>
          <option value="">Seleccionar...</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
    </div>
  );
}
