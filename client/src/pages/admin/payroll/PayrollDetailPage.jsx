import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../config/api.js";
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";

const fmt = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v ?? 0);

const EARNING_TIPOS  = ["BONIFICACION","COMISION","HORAS_EXTRAS","AUXILIO","OTROS"];
const DEDUCTION_TIPOS = ["AFP","EPS","RENTA","PRESTAMO","VOLUNTARIA","OTROS"];

const ESTADO_BADGE = {
  borrador: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  generado: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  aprobado: "bg-brand-green/10 text-green-400 border-brand-green/20",
  pagado:   "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
};
const ESTADO_LABEL = { borrador:"Borrador", generado:"Generado", aprobado:"Aprobado", pagado:"Pagado" };

export default function PayrollDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState({});
  const [modal, setModal] = useState(null); // { txId, type: 'earning'|'deduction' }
  const [form, setForm] = useState({ tipo: "", concepto: "", valor: "", porcentaje: "" });
  const [formError, setFormError] = useState("");

  // ── Período ──────────────────────────────────────────────────
  const { data: period } = useQuery({
    queryKey: ["payroll-period", id],
    queryFn: async () => {
      const { data } = await api.get(`/payroll/${id}`);
      return data.data;
    },
  });

  // ── Transacciones ────────────────────────────────────────────
  const { data: txs, isLoading } = useQuery({
    queryKey: ["payroll-transactions", id],
    queryFn: async () => {
      const { data } = await api.get(`/payroll/${id}/transactions`);
      return data.data;
    },
  });

  // ── Mutations ────────────────────────────────────────────────
  const addEarningMut = useMutation({
    mutationFn: ({ txId, body }) => api.post(`/payroll/${id}/transactions/${txId}/earnings`, body),
    onSuccess: () => { qc.invalidateQueries(["payroll-transactions", id]); closeModal(); },
    onError: (e) => setFormError(e.response?.data?.message ?? "Error al guardar."),
  });

  const delEarningMut = useMutation({
    mutationFn: ({ txId, earningId }) => api.delete(`/payroll/${id}/transactions/${txId}/earnings/${earningId}`),
    onSuccess: () => qc.invalidateQueries(["payroll-transactions", id]),
  });

  const addDeductionMut = useMutation({
    mutationFn: ({ txId, body }) => api.post(`/payroll/${id}/transactions/${txId}/deductions`, body),
    onSuccess: () => { qc.invalidateQueries(["payroll-transactions", id]); closeModal(); },
    onError: (e) => setFormError(e.response?.data?.message ?? "Error al guardar."),
  });

  const delDeductionMut = useMutation({
    mutationFn: ({ txId, deductionId }) => api.delete(`/payroll/${id}/transactions/${txId}/deductions/${deductionId}`),
    onSuccess: () => qc.invalidateQueries(["payroll-transactions", id]),
  });

  // ── Helpers ──────────────────────────────────────────────────
  function toggle(txId) { setExpanded((p) => ({ ...p, [txId]: !p[txId] })); }

  function openModal(txId, type) {
    setModal({ txId, type });
    setForm({ tipo: type === "earning" ? "BONIFICACION" : "AFP", concepto: "", valor: "", porcentaje: "" });
    setFormError("");
  }
  function closeModal() { setModal(null); setForm({ tipo: "", concepto: "", valor: "", porcentaje: "" }); setFormError(""); }

  function handleSubmit(e) {
    e.preventDefault();
    const body = {
      tipo: form.tipo,
      concepto: form.concepto || undefined,
      valor: Number(form.valor),
      ...(modal.type === "deduction" && form.porcentaje ? { porcentaje: Number(form.porcentaje) } : {}),
    };
    if (modal.type === "earning") addEarningMut.mutate({ txId: modal.txId, body });
    else addDeductionMut.mutate({ txId: modal.txId, body });
  }

  async function handleExportTxt() {
    try {
      const res = await api.get(`/payroll/${id}/export/txt`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = `nomina_${id}.txt`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Error al exportar."); }
  }

  const canEdit = period && ["generado"].includes(period.estado);
  const totalNomina = (txs ?? []).reduce((sum, t) => sum + Number(t.neto_pagable ?? 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate("/payroll")} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
          <ArrowLeftIcon className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-white font-bold text-xl truncate">{period?.nombre ?? "Cargando..."}</h1>
            {period && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${ESTADO_BADGE[period.estado]}`}>
                {ESTADO_LABEL[period.estado]}
              </span>
            )}
          </div>
          {period && (
            <p className="text-zinc-500 text-sm">
              {new Date(period.fecha_inicio).toLocaleDateString("es-CO")} – {new Date(period.fecha_fin).toLocaleDateString("es-CO")}
            </p>
          )}
        </div>
        <button
          onClick={handleExportTxt}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Exportar TXT</span>
        </button>
      </div>

      {/* Totales */}
      {txs && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-xs mb-1">Empleados</p>
            <p className="text-white font-bold text-2xl">{txs.length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-xs mb-1">Total ingresos</p>
            <p className="text-white font-bold text-lg">
              {fmt(txs.reduce((s, t) => s + Number(t.salario_base) + Number(t.ingresos_adicionales), 0))}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-brand-green/5 border border-brand-green/20 rounded-xl p-4">
            <p className="text-zinc-400 text-xs mb-1">Total neto a pagar</p>
            <p className="text-brand-green font-bold text-lg">{fmt(totalNomina)}</p>
          </div>
        </div>
      )}

      {/* Transacciones */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-brand-green animate-pulse">Cargando...</div>
      ) : !txs?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <p className="text-sm">No hay transacciones en este período</p>
        </div>
      ) : (
        <div className="space-y-3">
          {txs.map((tx) => (
            <div key={tx.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {/* Fila principal */}
              <button
                onClick={() => toggle(tx.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex-1 text-left min-w-0">
                  <p className="text-white font-medium truncate">{tx.empleado_nombre}</p>
                  <p className="text-zinc-500 text-xs">{tx.empleado_cargo}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-zinc-500 text-xs">Base</p>
                    <p className="text-zinc-300 text-sm font-mono">{fmt(tx.salario_base)}</p>
                  </div>
                  {Number(tx.ingresos_adicionales) > 0 && (
                    <div className="text-right hidden sm:block">
                      <p className="text-zinc-500 text-xs">+ Adicional</p>
                      <p className="text-green-400 text-sm font-mono">+{fmt(tx.ingresos_adicionales)}</p>
                    </div>
                  )}
                  {Number(tx.total_deducciones) > 0 && (
                    <div className="text-right hidden sm:block">
                      <p className="text-zinc-500 text-xs">- Descuento</p>
                      <p className="text-red-400 text-sm font-mono">-{fmt(tx.total_deducciones)}</p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-zinc-500 text-xs">Neto</p>
                    <p className="text-brand-green font-bold text-sm font-mono">{fmt(tx.neto_pagable)}</p>
                  </div>
                  {expanded[tx.id]
                    ? <ChevronUpIcon className="w-4 h-4 text-zinc-500" />
                    : <ChevronDownIcon className="w-4 h-4 text-zinc-500" />
                  }
                </div>
              </button>

              {/* Detalle expandido */}
              {expanded[tx.id] && (
                <div className="border-t border-zinc-800 p-4 space-y-4">
                  {/* Info bancaria */}
                  {tx.empleado_cuenta && (
                    <div className="flex gap-4 text-xs text-zinc-400">
                      <span>{tx.empleado_banco}</span>
                      <span className="font-mono">{tx.empleado_cuenta}</span>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Ingresos adicionales */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Ingresos adicionales</p>
                        {canEdit && (
                          <button onClick={() => openModal(tx.id, "earning")}
                            className="flex items-center gap-1 text-xs text-brand-green hover:underline">
                            <PlusIcon className="w-3 h-3" /> Agregar
                          </button>
                        )}
                      </div>
                      {tx.earnings.length === 0 ? (
                        <p className="text-zinc-600 text-xs">Sin ingresos adicionales</p>
                      ) : (
                        <div className="space-y-1">
                          {tx.earnings.map((e) => (
                            <div key={e.id} className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                              <div>
                                <span className="text-xs text-zinc-300">{e.concepto || e.tipo}</span>
                                <span className="text-xs text-zinc-500 ml-1">({e.tipo})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-green-400 font-mono">+{fmt(e.valor)}</span>
                                {canEdit && (
                                  <button onClick={() => delEarningMut.mutate({ txId: tx.id, earningId: e.id })}
                                    className="text-zinc-600 hover:text-red-400 transition-colors">
                                    <XMarkIcon className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Deducciones */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Deducciones</p>
                        {canEdit && (
                          <button onClick={() => openModal(tx.id, "deduction")}
                            className="flex items-center gap-1 text-xs text-red-400 hover:underline">
                            <PlusIcon className="w-3 h-3" /> Agregar
                          </button>
                        )}
                      </div>
                      {tx.deductions.length === 0 ? (
                        <p className="text-zinc-600 text-xs">Sin deducciones</p>
                      ) : (
                        <div className="space-y-1">
                          {tx.deductions.map((d) => (
                            <div key={d.id} className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                              <div>
                                <span className="text-xs text-zinc-300">{d.concepto || d.tipo}</span>
                                <span className="text-xs text-zinc-500 ml-1">({d.tipo})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-red-400 font-mono">-{fmt(d.valor)}</span>
                                {canEdit && (
                                  <button onClick={() => delDeductionMut.mutate({ txId: tx.id, deductionId: d.id })}
                                    className="text-zinc-600 hover:text-red-400 transition-colors">
                                    <XMarkIcon className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resumen fila */}
                  <div className="flex justify-end gap-6 pt-2 border-t border-zinc-800 text-xs">
                    <span className="text-zinc-500">Base: <span className="text-zinc-300">{fmt(tx.salario_base)}</span></span>
                    <span className="text-zinc-500">+ <span className="text-green-400">{fmt(tx.ingresos_adicionales)}</span></span>
                    <span className="text-zinc-500">- <span className="text-red-400">{fmt(tx.total_deducciones)}</span></span>
                    <span className="font-bold text-brand-green">= {fmt(tx.neto_pagable)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal agregar ingreso/deducción */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-white font-bold text-base">
                {modal.type === "earning" ? "Agregar ingreso" : "Agregar deducción"}
              </h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-zinc-400 text-xs mb-1">Tipo *</label>
                <select required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green">
                  {(modal.type === "earning" ? EARNING_TIPOS : DEDUCTION_TIPOS).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-zinc-400 text-xs mb-1">Concepto</label>
                <input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                  placeholder="Descripción opcional"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
              </div>
              <div>
                <label className="block text-zinc-400 text-xs mb-1">Valor (COP) *</label>
                <input required type="number" min="1" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
              </div>
              {modal.type === "deduction" && (
                <div>
                  <label className="block text-zinc-400 text-xs mb-1">Porcentaje (opcional)</label>
                  <input type="number" min="0" max="100" step="0.01" value={form.porcentaje}
                    onChange={(e) => setForm({ ...form, porcentaje: e.target.value })}
                    placeholder="Ej: 4.00"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-green" />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-zinc-400 hover:text-white text-sm">Cancelar</button>
                <button type="submit" disabled={addEarningMut.isPending || addDeductionMut.isPending}
                  className="px-5 py-2 bg-brand-green text-black font-semibold rounded-lg hover:bg-brand-green/90 transition-colors text-sm disabled:opacity-50">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
