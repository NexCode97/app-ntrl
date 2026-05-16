import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../config/api.js";
import {
  ArrowLeftIcon, ArrowDownTrayIcon, CheckCircleIcon,
  BanknotesIcon, PencilSquareIcon, XMarkIcon,
} from "@heroicons/react/24/outline";

// ── Helpers ───────────────────────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(v ?? 0));

const fmtShort = (v) => {
  const n = Math.round(Number(v ?? 0));
  if (n === 0) return <span className="text-zinc-700">—</span>;
  return <span>{`$${n.toLocaleString("es-CO")}`}</span>;
};

const ESTADO_BADGE = {
  borrador: "bg-zinc-700/40 text-zinc-400 border-zinc-600/30",
  aprobado: "bg-brand-green/10 text-green-400 border-brand-green/20",
  pagado:   "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
};
const ESTADO_LABEL = { borrador: "Borrador", aprobado: "Aprobado", pagado: "Pagado" };

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`rounded-xl border p-4 ${accent
      ? "bg-brand-green/5 border-brand-green/20"
      : "bg-zinc-900 border-zinc-800"}`}>
      <p className="text-zinc-500 text-xs mb-1">{label}</p>
      <p className={`font-bold text-lg font-mono ${accent ? "text-brand-green" : "text-white"}`}>{value}</p>
      {sub && <p className="text-zinc-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Edit modal — formulario por empleado ──────────────────────
function EditModal({ tx, periodId, onClose, onSaved }) {
  const [form, setForm] = useState({
    dias_laborados:        tx.dias_laborados        ?? 15,
    anticipo_prestaciones: tx.anticipo_prestaciones ?? 0,
    horas_extras:          tx.horas_extras          ?? 0,
    otros_ingresos:        tx.otros_ingresos        ?? 0,
    anticipo_adelanto:     tx.anticipo_adelanto      ?? 0,
    funeral:               tx.funeral               ?? 0,
    otros_descuentos:      tx.otros_descuentos      ?? 0,
    observaciones:         tx.observaciones         ?? "",
  });
  const [error, setError] = useState("");

  const esLaboral = tx.tipo_contrato_snap === "laboral";

  // Preview calculado en tiempo real (mismo algoritmo que backend)
  const basico   = Math.round(Number(tx.salario_base_snap) * Number(form.dias_laborados) / 30);
  const auxT     = esLaboral ? Math.round(249095 * Number(form.dias_laborados) / 30) : 0;
  const antPrest = esLaboral ? 0 : Number(form.anticipo_prestaciones);
  const hExt     = Number(form.horas_extras);
  const otros_i  = Number(form.otros_ingresos);
  const deveng   = basico + auxT + antPrest + hExt + otros_i;
  const salud    = esLaboral ? Math.round(basico * 0.04) : 0;
  const pension  = esLaboral ? Math.round(basico * 0.04) : 0;
  const antAdel  = Number(form.anticipo_adelanto);
  const funeral  = Number(form.funeral);
  const otrosD   = Number(form.otros_descuentos);
  const deducido = salud + pension + antAdel + funeral + otrosD;
  const neto     = deveng - deducido;

  const saveMut = useMutation({
    mutationFn: (body) => api.patch(`/payroll/${periodId}/transactions/${tx.id}`, body),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e) => setError(e.response?.data?.message ?? "Error al guardar."),
  });

  function set(k) { return (e) => setForm((p) => ({ ...p, [k]: e.target.value })); }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4 bg-black/75">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h2 className="text-white font-bold text-base">{tx.empleado_nombre}</h2>
            <p className="text-zinc-500 text-xs">{tx.empleado_cargo} ·{" "}
              <span className={esLaboral ? "text-blue-400" : "text-purple-400"}>
                {esLaboral ? "Contrato laboral" : "Prestación de servicios"}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <p className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</p>
          )}

          {/* Días laborados */}
          <div>
            <label className="block text-zinc-400 text-xs mb-1">Días laborados</label>
            <input type="number" min="0.5" max="30" step="0.5" className="input-field w-32"
              value={form.dias_laborados} onChange={set("dias_laborados")} />
            <p className="text-zinc-600 text-xs mt-1">Básico resultante: <span className="text-zinc-400">{fmt(basico)}</span></p>
          </div>

          {/* Devengados variables */}
          <div>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-2">Devengados adicionales</p>
            <div className="grid grid-cols-2 gap-3">
              {!esLaboral && (
                <div>
                  <label className="block text-zinc-500 text-xs mb-1">Anticipo prestaciones</label>
                  <input type="number" min="0" className="input-field" value={form.anticipo_prestaciones}
                    onChange={set("anticipo_prestaciones")} />
                </div>
              )}
              <div>
                <label className="block text-zinc-500 text-xs mb-1">Horas extras ($)</label>
                <input type="number" min="0" className="input-field" value={form.horas_extras}
                  onChange={set("horas_extras")} />
              </div>
              <div>
                <label className="block text-zinc-500 text-xs mb-1">Otros ingresos ($)</label>
                <input type="number" min="0" className="input-field" value={form.otros_ingresos}
                  onChange={set("otros_ingresos")} />
              </div>
            </div>
          </div>

          {/* Deducciones variables */}
          <div>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-2">Descuentos adicionales</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-500 text-xs mb-1">Anticipo/adelanto ($)</label>
                <input type="number" min="0" className="input-field" value={form.anticipo_adelanto}
                  onChange={set("anticipo_adelanto")} />
              </div>
              <div>
                <label className="block text-zinc-500 text-xs mb-1">Fondo funeral ($)</label>
                <input type="number" min="0" className="input-field" value={form.funeral}
                  onChange={set("funeral")} />
              </div>
              <div className="col-span-2">
                <label className="block text-zinc-500 text-xs mb-1">Otros descuentos ($)</label>
                <input type="number" min="0" className="input-field" value={form.otros_descuentos}
                  onChange={set("otros_descuentos")} />
              </div>
            </div>
          </div>

          {/* Preview calculado en tiempo real */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2 text-sm">
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-2">Resumen calculado</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Básico ({form.dias_laborados} días)</span><span className="font-mono">{fmt(basico)}</span>
              </div>
              {esLaboral && auxT > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Aux. transporte</span><span className="font-mono">{fmt(auxT)}</span>
                </div>
              )}
              {!esLaboral && antPrest > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Anticipo prestaciones</span><span className="font-mono">{fmt(antPrest)}</span>
                </div>
              )}
              {hExt > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Horas extras</span><span className="font-mono">{fmt(hExt)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-semibold border-t border-zinc-800 pt-1 mt-1">
                <span>Total devengado</span><span className="font-mono">{fmt(deveng)}</span>
              </div>
              {esLaboral && (
                <>
                  <div className="flex justify-between text-red-400 text-xs mt-1">
                    <span>Salud (4%)</span><span className="font-mono">−{fmt(salud)}</span>
                  </div>
                  <div className="flex justify-between text-red-400 text-xs">
                    <span>Pensión (4%)</span><span className="font-mono">−{fmt(pension)}</span>
                  </div>
                </>
              )}
              {antAdel > 0 && (
                <div className="flex justify-between text-red-400 text-xs">
                  <span>Anticipo</span><span className="font-mono">−{fmt(antAdel)}</span>
                </div>
              )}
              {funeral > 0 && (
                <div className="flex justify-between text-red-400 text-xs">
                  <span>Funeral</span><span className="font-mono">−{fmt(funeral)}</span>
                </div>
              )}
              {otrosD > 0 && (
                <div className="flex justify-between text-red-400 text-xs">
                  <span>Otros descuentos</span><span className="font-mono">−{fmt(otrosD)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-zinc-700 pt-2 mt-1">
                <span className="text-brand-green font-bold text-sm">NETO A PAGAR</span>
                <span className="text-brand-green font-black text-sm font-mono">{fmt(neto)}</span>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-zinc-400 text-xs mb-1">Observaciones</label>
            <textarea className="input-field resize-none text-sm" rows={2}
              value={form.observaciones} onChange={set("observaciones")}
              placeholder="Novedades, ausencias, etc." />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary px-4">Cancelar</button>
            <button
              onClick={() => { setError(""); saveMut.mutate(form); }}
              disabled={saveMut.isPending}
              className="btn-primary px-5">
              {saveMut.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function PayrollDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editingTx, setEditingTx] = useState(null);
  const [actionError, setActionError] = useState("");

  // ── Queries ────────────────────────────────────────────────
  const { data: period, isLoading: loadingPeriod } = useQuery({
    queryKey: ["payroll-period", id],
    queryFn:  () => api.get(`/payroll/${id}`).then((r) => r.data.data),
  });

  const { data: txs = [], isLoading: loadingTxs } = useQuery({
    queryKey: ["payroll-transactions", id],
    queryFn:  () => api.get(`/payroll/${id}/transactions`).then((r) => r.data.data),
  });

  // ── Mutations ─────────────────────────────────────────────
  const approveMut = useMutation({
    mutationFn: () => api.post(`/payroll/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-period", id] });
      qc.invalidateQueries({ queryKey: ["payroll-periods"] });
      setActionError("");
    },
    onError: (e) => setActionError(e.response?.data?.message ?? "Error al aprobar."),
  });

  const paidMut = useMutation({
    mutationFn: () => api.post(`/payroll/${id}/mark-paid`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-period", id] });
      qc.invalidateQueries({ queryKey: ["payroll-periods"] });
    },
    onError: (e) => setActionError(e.response?.data?.message ?? "Error."),
  });

  // ── Exports ───────────────────────────────────────────────
  async function downloadBanco() {
    try {
      const res = await api.get(`/payroll/${id}/export/banco`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `banco_${period?.nombre?.replace(/\s+/g, "_") ?? id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { setActionError("Error al generar archivo banco."); }
  }

  async function downloadComprobante(txId, nombre) {
    try {
      const res = await api.get(`/payroll/${id}/export/comprobante/${txId}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `comprobante_${nombre?.replace(/\s+/g, "_") ?? txId}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { setActionError("Error al generar comprobante."); }
  }

  function onTxSaved() {
    qc.invalidateQueries({ queryKey: ["payroll-transactions", id] });
    qc.invalidateQueries({ queryKey: ["payroll-period", id] });
  }

  // ── Derived ───────────────────────────────────────────────
  const estado         = period?.estado ?? "borrador";
  const canEdit        = estado === "borrador";
  const canApprove     = estado === "borrador" && txs.length > 0;
  const canExport      = ["aprobado","pagado"].includes(estado);
  const canMarkPaid    = estado === "aprobado";
  const totalDevengado = txs.reduce((s, t) => s + Number(t.total_devengado ?? 0), 0);
  const totalDeducido  = txs.reduce((s, t) => s + Number(t.total_deducido ?? 0), 0);
  const totalNeto      = txs.reduce((s, t) => s + Number(t.neto_pagable ?? 0), 0);

  // ── Loading ───────────────────────────────────────────────
  if (loadingPeriod) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500 text-sm">Cargando período...</div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate("/payroll")}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors mt-0.5">
          <ArrowLeftIcon className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-white font-bold text-xl truncate">{period?.nombre ?? "—"}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ESTADO_BADGE[estado]}`}>
              {ESTADO_LABEL[estado]}
            </span>
          </div>
          <p className="text-zinc-500 text-sm mt-0.5">
            {period?.fecha_inicio
              ? `${new Date(period.fecha_inicio + "T12:00:00").toLocaleDateString("es-CO")} — ${new Date(period.fecha_fin + "T12:00:00").toLocaleDateString("es-CO")}`
              : ""}
            {period?.paid_at ? ` · Pagado ${new Date(period.paid_at).toLocaleDateString("es-CO")}` : ""}
          </p>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Empleados"      value={txs.length} />
        <StatCard label="Total devengado" value={fmt(totalDevengado)} />
        <StatCard label="Total deducido" value={fmt(totalDeducido)} />
        <StatCard label="Neto a pagar"   value={fmt(totalNeto)} accent />
      </div>

      {/* ── Barra de acciones ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {canApprove && (
          <button onClick={() => { setActionError(""); approveMut.mutate(); }}
            disabled={approveMut.isPending}
            className="btn-primary flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4" />
            {approveMut.isPending ? "Aprobando..." : "Aprobar nómina"}
          </button>
        )}
        {canMarkPaid && (
          <button onClick={() => { if (confirm("¿Confirmar que la nómina ya fue pagada?")) paidMut.mutate(); }}
            disabled={paidMut.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-colors">
            <BanknotesIcon className="w-4 h-4" />
            {paidMut.isPending ? "Procesando..." : "Marcar como pagado"}
          </button>
        )}
        {canExport && (
          <button onClick={downloadBanco}
            className="btn-secondary flex items-center gap-2">
            <ArrowDownTrayIcon className="w-4 h-4" />
            Archivo banco (CSV)
          </button>
        )}
        {actionError && (
          <p className="text-red-400 text-sm">{actionError}</p>
        )}
      </div>

      {/* ── Tabla desktop ─────────────────────────────────── */}
      {loadingTxs ? (
        <div className="py-12 text-center text-zinc-500 text-sm">Cargando empleados...</div>
      ) : (
        <>
          {/* Desktop — tabla horizontal completa */}
          <div className="hidden lg:block card overflow-hidden p-0 overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="bg-zinc-800 text-zinc-400 text-left">
                  <th className="px-4 py-3 font-medium">Empleado</th>
                  <th className="px-3 py-3 font-medium text-right">Básico</th>
                  <th className="px-3 py-3 font-medium text-right">Aux.T / A.Prest</th>
                  <th className="px-3 py-3 font-medium text-right">H.Extra</th>
                  <th className="px-3 py-3 font-medium text-right">Total Dev.</th>
                  <th className="px-3 py-3 font-medium text-right text-red-400/80">Salud</th>
                  <th className="px-3 py-3 font-medium text-right text-red-400/80">Pensión</th>
                  <th className="px-3 py-3 font-medium text-right text-red-400/80">Anticipo</th>
                  <th className="px-3 py-3 font-medium text-right text-red-400/80">Otros−</th>
                  <th className="px-3 py-3 font-medium text-right text-brand-green">Neto</th>
                  <th className="px-3 py-3 font-medium text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {txs.map((tx) => {
                  const esLaboral = tx.tipo_contrato_snap === "laboral";
                  const otrosDesc = Number(tx.funeral ?? 0) + Number(tx.otros_descuentos ?? 0);
                  return (
                    <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{tx.empleado_nombre}</p>
                        <p className="text-zinc-500 text-[10px]">{tx.empleado_cargo}</p>
                        <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          esLaboral ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                        }`}>
                          {esLaboral ? "LAB" : "P.S."}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-zinc-300 font-mono">{fmtShort(tx.basico)}</td>
                      <td className="px-3 py-3 text-right font-mono">
                        {esLaboral
                          ? <span className="text-blue-400">{fmtShort(tx.aux_transporte)}</span>
                          : <span className="text-purple-400">{fmtShort(tx.anticipo_prestaciones)}</span>
                        }
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-400">{fmtShort(tx.horas_extras)}</td>
                      <td className="px-3 py-3 text-right font-mono text-white font-semibold">{fmtShort(tx.total_devengado)}</td>
                      <td className="px-3 py-3 text-right font-mono text-red-400">{fmtShort(tx.salud)}</td>
                      <td className="px-3 py-3 text-right font-mono text-red-400">{fmtShort(tx.pension)}</td>
                      <td className="px-3 py-3 text-right font-mono text-red-400">{fmtShort(tx.anticipo_adelanto)}</td>
                      <td className="px-3 py-3 text-right font-mono text-red-400">{fmtShort(otrosDesc)}</td>
                      <td className="px-3 py-3 text-right font-mono text-brand-green font-bold">{fmtShort(tx.neto_pagable)}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && (
                            <button onClick={() => setEditingTx(tx)}
                              className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                              title="Editar">
                              <PencilSquareIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canExport && (
                            <button onClick={() => downloadComprobante(tx.id, tx.empleado_nombre)}
                              className="p-1.5 text-zinc-500 hover:text-brand-green hover:bg-brand-green/10 rounded transition-colors"
                              title="Comprobante">
                              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-800/60 border-t border-zinc-700 font-semibold text-sm">
                  <td className="px-4 py-3 text-zinc-300">TOTALES</td>
                  <td colSpan={3} />
                  <td className="px-3 py-3 text-right font-mono text-white">{fmt(totalDevengado)}</td>
                  <td colSpan={4} />
                  <td className="px-3 py-3 text-right font-mono text-brand-green font-bold">{fmt(totalNeto)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile / Tablet — Cards por empleado */}
          <div className="lg:hidden space-y-3">
            {txs.map((tx) => {
              const esLaboral = tx.tipo_contrato_snap === "laboral";
              return (
                <div key={tx.id} className="card border border-zinc-800 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-white font-semibold text-sm">{tx.empleado_nombre}</p>
                      <p className="text-zinc-500 text-xs">{tx.empleado_cargo}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                      esLaboral ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                    }`}>
                      {esLaboral ? "Laboral" : "Prest. Serv."}
                    </span>
                  </div>

                  {/* Devengados */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex justify-between col-span-2 border-b border-zinc-800 pb-1 mb-1">
                      <span className="text-zinc-500">DEVENGADOS</span>
                      <span className="text-white font-semibold">{fmt(tx.total_devengado)}</span>
                    </div>
                    <div className="flex justify-between"><span className="text-zinc-500">Básico</span><span className="text-zinc-300 font-mono">{fmt(tx.basico)}</span></div>
                    {esLaboral && Number(tx.aux_transporte) > 0 && (
                      <div className="flex justify-between"><span className="text-zinc-500">Aux. transp.</span><span className="text-blue-400 font-mono">{fmt(tx.aux_transporte)}</span></div>
                    )}
                    {!esLaboral && Number(tx.anticipo_prestaciones) > 0 && (
                      <div className="flex justify-between"><span className="text-zinc-500">A. prestaciones</span><span className="text-purple-400 font-mono">{fmt(tx.anticipo_prestaciones)}</span></div>
                    )}
                    {Number(tx.horas_extras) > 0 && (
                      <div className="flex justify-between"><span className="text-zinc-500">H. extras</span><span className="text-zinc-300 font-mono">{fmt(tx.horas_extras)}</span></div>
                    )}
                  </div>

                  {/* Deducidos */}
                  {Number(tx.total_deducido) > 0 && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="flex justify-between col-span-2 border-b border-zinc-800 pb-1 mb-1">
                        <span className="text-zinc-500">DEDUCIDOS</span>
                        <span className="text-red-400 font-semibold">−{fmt(tx.total_deducido)}</span>
                      </div>
                      {Number(tx.salud) > 0 && <div className="flex justify-between"><span className="text-zinc-500">Salud</span><span className="text-red-400 font-mono">−{fmt(tx.salud)}</span></div>}
                      {Number(tx.pension) > 0 && <div className="flex justify-between"><span className="text-zinc-500">Pensión</span><span className="text-red-400 font-mono">−{fmt(tx.pension)}</span></div>}
                      {Number(tx.anticipo_adelanto) > 0 && <div className="flex justify-between"><span className="text-zinc-500">Anticipo</span><span className="text-red-400 font-mono">−{fmt(tx.anticipo_adelanto)}</span></div>}
                    </div>
                  )}

                  {/* Neto + acciones */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <div>
                      <p className="text-zinc-500 text-xs">Neto a pagar</p>
                      <p className="text-brand-green font-black text-base font-mono">{fmt(tx.neto_pagable)}</p>
                    </div>
                    <div className="flex gap-2">
                      {canEdit && (
                        <button onClick={() => setEditingTx(tx)} className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3">
                          <PencilSquareIcon className="w-3.5 h-3.5" /> Editar
                        </button>
                      )}
                      {canExport && (
                        <button onClick={() => downloadComprobante(tx.id, tx.empleado_nombre)}
                          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3">
                          <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Comprobante
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Datos bancarios */}
                  {tx.empleado_numero_cuenta && (
                    <p className="text-zinc-600 text-xs font-mono">
                      {tx.empleado_tipo_cuenta?.toUpperCase()} · {tx.empleado_numero_cuenta}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal edición */}
      {editingTx && (
        <EditModal
          tx={editingTx}
          periodId={id}
          onClose={() => setEditingTx(null)}
          onSaved={onTxSaved}
        />
      )}
    </div>
  );
}
