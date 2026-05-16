/**
 * TabBar — Componente unificado de tabs y filtros
 * Solo visible en tablet y escritorio (md+)
 * En móvil usar <select> directamente en el módulo
 *
 * Props:
 *   tabs     — Array de { value, label, Icon?, count? }
 *   value    — Valor activo
 *   onChange — Función(value) al cambiar
 *
 * Uso:
 *   // Tab de navegación (sin badges)
 *   <TabBar
 *     tabs={[{ value: "periods", label: "Períodos", Icon: BanknotesIcon }, ...]}
 *     value={tab}
 *     onChange={setTab}
 *   />
 *
 *   // Filtro de estado (con badges)
 *   <TabBar
 *     tabs={[{ value: "all", label: "Todos" }, { value: "pending", label: "Pendiente", count: 3 }]}
 *     value={filter}
 *     onChange={setFilter}
 *   />
 */
export default function TabBar({ tabs = [], value, onChange }) {
  return (
    <div className="hidden md:flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl gap-1 w-fit">
      {tabs.map(({ value: v, label, Icon, count }) => {
        const isActive = v === value;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap
              ${isActive
                ? "bg-brand-green text-black"
                : "text-zinc-400 hover:text-white"
              }`}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" />}
            {label}
            {count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold leading-none
                ${isActive
                  ? "bg-black/20 text-black"
                  : "bg-zinc-700 text-zinc-300"
                }`}>
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
