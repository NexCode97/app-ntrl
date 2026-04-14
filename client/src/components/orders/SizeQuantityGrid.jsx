const SIZES_NINO  = ["T2","T4","T6","T8","T10","T12","T14"];
const SIZES_ADULT = ["T16","TXS","TS","TM","TL","TXL","T2XL","T3XL"];
const SIZES_UNICA = ["TU"];

export default function SizeQuantityGrid({ gender, sizes, onChange }) {
  const sizeList = gender === "nino" ? SIZES_NINO
                 : gender === "unica" ? SIZES_UNICA
                 : SIZES_ADULT;

  function handleChange(size, value) {
    const qty = Math.max(0, parseInt(value) || 0);
    onChange({ ...sizes, [size]: qty });
  }

  const total = Object.values(sizes).reduce((s, v) => s + (parseInt(v) || 0), 0);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sizeList.map((size) => (
          <div key={size} className="flex flex-col items-center shrink-0">
            <span className="text-xs text-zinc-400 mb-1 font-medium">{size}</span>
            <input
              type="number"
              min="0"
              max="9999"
              value={sizes[size] || ""}
              onChange={(e) => handleChange(size, e.target.value)}
              className="w-14 bg-zinc-800 border border-zinc-700 text-white text-center rounded px-1 py-1 text-sm
                         focus:outline-none focus:border-brand-green"
              placeholder="0"
            />
          </div>
        ))}
      </div>
      {total > 0 && (
        <p className="text-xs text-brand-green mt-1">Total: {total} unidades</p>
      )}
    </div>
  );
}
