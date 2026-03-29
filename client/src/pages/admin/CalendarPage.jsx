import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../config/api.js";

const STATUS_COLORS = {
  pending:     "bg-yellow-500",
  in_progress: "bg-blue-500",
  completed:   "bg-brand-green",
  delivered:   "bg-zinc-500",
};

const STATUS_LABELS = {
  pending:     "Pendiente",
  in_progress: "En proceso",
  completed:   "Completado",
  delivered:   "Entregado",
};

const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DAY_NAMES = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

function padDate(y, m, d) {
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

// Algoritmo de Meeus/Jones/Butcher para calcular la Semana Santa
function easterDate(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19*a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2*e + 2*i - h - k) % 7;
  const m = Math.floor((a + 11*h + 22*l) / 451);
  const month = Math.floor((h + l - 7*m + 114) / 31) - 1;
  const day   = ((h + l - 7*m + 114) % 31) + 1;
  return new Date(year, month, day);
}

// Siguiente lunes a partir de una fecha (si ya es lunes, mantiene)
function nextMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  if (day === 1) return d;
  d.setDate(d.getDate() + (day === 0 ? 1 : 8 - day));
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function getColombianHolidays(year) {
  const easter = easterDate(year);
  const holidays = {};
  const add = (date, name) => { holidays[dateStr(date)] = name; };

  // Fijos
  add(new Date(year, 0,  1),  "Año Nuevo");
  add(new Date(year, 4,  1),  "Día del Trabajo");
  add(new Date(year, 6, 20),  "Independencia");
  add(new Date(year, 7,  7),  "Batalla de Boyacá");
  add(new Date(year, 11, 8),  "Inmaculada Concepción");
  add(new Date(year, 11, 25), "Navidad");

  // Semana Santa
  add(addDays(easter, -3), "Jueves Santo");
  add(addDays(easter, -2), "Viernes Santo");

  // "Siguiente lunes" (traslado)
  add(nextMonday(new Date(year, 0,  6)),  "Reyes Magos");
  add(nextMonday(new Date(year, 2, 19)),  "San José");
  add(nextMonday(addDays(easter, 40)),    "Ascensión");
  add(nextMonday(addDays(easter, 60)),    "Corpus Christi");
  add(nextMonday(addDays(easter, 71)),    "Sagrado Corazón");
  add(nextMonday(new Date(year, 5, 29)),  "San Pedro y San Pablo");
  add(nextMonday(new Date(year, 7, 15)),  "Asunción de la Virgen");
  add(nextMonday(new Date(year, 9, 12)),  "Día de la Raza");
  add(nextMonday(new Date(year, 10, 1)), "Todos los Santos");
  add(nextMonday(new Date(year, 10, 11)),"Independencia de Cartagena");

  return holidays;
}

function toLocalStr(date) {
  return padDate(date.getFullYear(), date.getMonth(), date.getDate());
}

// ── Grilla de días compartida ──────────────────────────────────
function DayGrid({ days, ordersByDay, selectedDay, onSelect, today, holidays }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {DAY_NAMES.map((d) => (
        <div key={d} className="text-center text-xs text-zinc-500 font-medium py-1">{d}</div>
      ))}
      {days.map((cell, i) => {
        if (!cell) return <div key={`e-${i}`} />;
        const orders     = ordersByDay[cell.str] ?? [];
        const isToday    = cell.str === today;
        const isSelected = cell.str === selectedDay;
        const holiday    = holidays[cell.str];
        return (
          <button
            key={cell.str}
            onClick={() => onSelect(cell.str === selectedDay ? null : cell.str)}
            title={holiday ?? undefined}
            className={`
              relative flex flex-col items-center py-2 px-1 rounded-lg transition-colors text-sm min-h-[52px]
              ${isSelected ? "bg-brand-green text-black"
                : isToday  ? "bg-zinc-700 text-white"
                : holiday  ? "bg-red-950/40 hover:bg-red-950/60 text-red-300"
                : orders.length ? "hover:bg-zinc-800 text-white"
                : "hover:bg-zinc-800/50 text-zinc-500"}
            `}
          >
            <span className="font-medium leading-none">{cell.day}</span>
            {holiday && !isSelected && (
              <span className="w-1 h-1 rounded-full bg-red-400 mt-1" />
            )}
            {orders.length > 0 && (
              <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                {orders.slice(0, 3).map((o) => (
                  <span key={o.id} className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-black/60" : (STATUS_COLORS[o.status] ?? "bg-zinc-400")}`} />
                ))}
                {orders.length > 3 && <span className={`text-[9px] ${isSelected ? "text-black/60" : "text-zinc-500"}`}>+{orders.length-3}</span>}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Panel de pedidos del día seleccionado ──────────────────────
function DayPanel({ dateStr, orders, month }) {
  const navigate = useNavigate();
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  return (
    <div className="card space-y-3">
      <h3 className="text-white font-semibold text-sm">
        Pedidos para el {d.getDate()} de {MONTH_NAMES[d.getMonth()]}
      </h3>
      {orders.length === 0 ? (
        <p className="text-zinc-500 text-sm">Sin pedidos con entrega este día.</p>
      ) : orders.map((order) => (
        <button key={order.id} onClick={() => navigate(`/orders/${order.id}`)}
          className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-4 py-3 transition-colors text-left">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[order.status] ?? "bg-zinc-400"}`} />
          <div className="flex-1 min-w-0">
            <span className="text-brand-green font-mono font-bold text-sm">#{String(order.order_number).padStart(3,"0")}</span>
            <span className="text-white text-sm ml-2">{order.customer_name}</span>
          </div>
          <span className="text-xs text-zinc-500 shrink-0">{STATUS_LABELS[order.status]}</span>
        </button>
      ))}
    </div>
  );
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const today    = new Date();
  const todayStr = toLocalStr(today);

  const [view,       setView]       = useState("biweekly");  // "biweekly" | "monthly"
  const [year,       setYear]       = useState(today.getFullYear());
  const [month,      setMonth]      = useState(today.getMonth());
  // Para quincenal: 0 = primera quincena (1-15), 1 = segunda (16-fin)
  const [fortnight,  setFortnight]  = useState(today.getDate() <= 15 ? 0 : 1);
  const [selectedDay, setSelectedDay] = useState(null);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const holidays = useMemo(() => getColombianHolidays(year), [year]);

  const { data, isLoading } = useQuery({
    queryKey: ["calendar", monthStr],
    queryFn:  () => api.get(`/orders/calendar?month=${monthStr}`).then((r) => r.data.data),
  });

  const ordersByDay = useMemo(() => {
    const map = {};
    (data ?? []).forEach((o) => {
      const day = o.delivery_date?.slice(0, 10);
      if (!day) return;
      if (!map[day]) map[day] = [];
      map[day].push(o);
    });
    return map;
  }, [data]);

  // ── Navegación ──────────────────────────────────────────────
  function prevPeriod() {
    setSelectedDay(null);
    if (view === "monthly") {
      if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1);
    } else {
      if (fortnight === 1) { setFortnight(0); }
      else {
        setFortnight(1);
        if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1);
      }
    }
  }
  function nextPeriod() {
    setSelectedDay(null);
    if (view === "monthly") {
      if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1);
    } else {
      if (fortnight === 0) { setFortnight(1); }
      else {
        setFortnight(0);
        if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1);
      }
    }
  }

  // ── Generar celdas ──────────────────────────────────────────
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const days = useMemo(() => {
    if (view === "monthly") {
      const cells = Array.from({ length: firstWeekday }, () => null);
      for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, str: padDate(year, month, d) });
      }
      return cells;
    } else {
      // Quincenal
      const start = fortnight === 0 ? 1 : 16;
      const end   = fortnight === 0 ? 15 : daysInMonth;
      const firstWd = new Date(year, month, start).getDay();
      const cells = Array.from({ length: firstWd }, () => null);
      for (let d = start; d <= end; d++) {
        cells.push({ day: d, str: padDate(year, month, d) });
      }
      return cells;
    }
  }, [view, year, month, fortnight, firstWeekday, daysInMonth]);

  // Pedidos del período visible
  const periodOrders = useMemo(() => {
    if (!data) return [];
    if (view === "monthly") return data;
    const start = fortnight === 0 ? 1 : 16;
    const end   = fortnight === 0 ? 15 : daysInMonth;
    return data.filter((o) => {
      const d = parseInt(o.delivery_date?.slice(8, 10));
      return d >= start && d <= end;
    });
  }, [data, view, fortnight, daysInMonth]);

  const periodLabel = view === "monthly"
    ? `${MONTH_NAMES[month]} ${year}`
    : `${fortnight === 0 ? "1 – 15" : `16 – ${daysInMonth}`} de ${MONTH_NAMES[month]} ${year}`;

  const selectedOrders = selectedDay ? (ordersByDay[selectedDay] ?? []) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      <div className="card">
        {/* Selector de vista */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
            <button
              onClick={() => { setView("biweekly"); setFortnight(today.getDate() <= 15 ? 0 : 1); setSelectedDay(null); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "biweekly" ? "bg-brand-green text-black" : "text-zinc-400 hover:text-white"}`}
            >
              Quincenal
            </button>
            <button
              onClick={() => { setView("monthly"); setSelectedDay(null); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "monthly" ? "bg-brand-green text-black" : "text-zinc-400 hover:text-white"}`}
            >
              Mensual
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={prevPeriod} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-xl leading-none">‹</button>
            <span className="text-white font-semibold text-sm min-w-[180px] text-center">{periodLabel}</span>
            <button onClick={nextPeriod} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-xl leading-none">›</button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-zinc-500 text-center py-8 text-sm">Cargando...</div>
        ) : (
          <DayGrid
            days={days}
            ordersByDay={ordersByDay}
            selectedDay={selectedDay}
            onSelect={setSelectedDay}
            today={todayStr}
            holidays={holidays}
          />
        )}

        {/* Leyenda */}
        <div className="flex gap-4 mt-4 pt-3 border-t border-zinc-800 flex-wrap">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[key]}`} />
              <span className="text-xs text-zinc-500">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-xs text-zinc-500">Festivo</span>
          </div>
        </div>

        {/* Festivos del período visible */}
        {(() => {
          const periodHolidays = days
            .filter(Boolean)
            .map((c) => holidays[c.str] ? { str: c.str, name: holidays[c.str], day: c.day } : null)
            .filter(Boolean);
          if (!periodHolidays.length) return null;
          return (
            <div className="mt-3 flex flex-wrap gap-2">
              {periodHolidays.map((h) => (
                <span key={h.str} className="text-[11px] bg-red-950/40 text-red-300 border border-red-900/40 px-2 py-0.5 rounded-full">
                  {h.day} — {h.name}
                </span>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Panel del día seleccionado */}
      <DayPanel dateStr={selectedDay} orders={selectedOrders} />

      {/* Lista del período */}
      {!isLoading && periodOrders.length > 0 && (
        <div className="card">
          <h3 className="text-zinc-400 text-xs font-medium mb-3">
            {periodOrders.length} pedido{periodOrders.length !== 1 ? "s" : ""} con entrega en este período
          </h3>
          <div className="space-y-1">
            {periodOrders.map((order) => (
              <button key={order.id} onClick={() => navigate(`/orders/${order.id}`)}
                className="w-full flex items-center gap-3 hover:bg-zinc-800 rounded-lg px-3 py-2 transition-colors text-left">
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[order.status] ?? "bg-zinc-400"}`} />
                <span className="text-zinc-500 text-xs w-16 shrink-0">
                  {new Date(order.delivery_date + "T12:00:00").toLocaleDateString("es-CO", { day:"2-digit", month:"short" })}
                </span>
                <span className="text-brand-green font-mono text-xs">#{String(order.order_number).padStart(3,"0")}</span>
                <span className="text-zinc-300 text-xs truncate">{order.customer_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
