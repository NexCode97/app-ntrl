import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../config/api.js";
import { COLOMBIA, DEPARTAMENTOS } from "../../data/colombia.js";
const IconEye = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;

const DOC_LABELS = { cedula: "C.C.", nit: "NIT", ce: "C.E.", pp: "PP" };

function DialCodePicker({ value, onChange }) {
  const [open, setOpen]   = useState(false);
  const [q,    setQ]      = useState("");
  const ref               = useRef(null);
  const selected          = COUNTRIES.find((c) => c.dial === value) ?? COUNTRIES[0];
  const filtered          = q
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.dial.includes(q))
    : COUNTRIES;

  useEffect(() => {
    function click(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  const FlagImg = ({ code, size = 20 }) => (
    <img
      src={`https://flagcdn.com/w${size}/${code.toLowerCase()}.png`}
      width={size}
      alt=""
      className="rounded-sm shrink-0 object-cover"
      style={{ height: size * 0.667 }}
      onError={(e) => { e.target.style.display = "none"; }}
    />
  );

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setQ(""); }}
        className="input-field flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        style={{ borderRadius: "8px" }}
      >
        <FlagImg code={selected.code} size={20} />
        <span className="text-sm text-white">{selected.dial}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 ml-0.5"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2">
            <input
              autoFocus
              className="w-full bg-zinc-700 text-white rounded-lg px-3 py-1.5 outline-none placeholder-zinc-500"
              style={{ fontSize: "16px" }}
              placeholder="Buscar país..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => { onChange(c.dial); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-zinc-700 transition-colors text-left
                    ${c.dial === value ? "bg-zinc-700 text-white" : "text-zinc-300"}`}
                >
                  <FlagImg code={c.code} size={20} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-zinc-500 text-xs">{c.dial}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-zinc-500 text-sm text-center">Sin resultados</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

const COUNTRIES = [
  { code: "CO", flag: "🇨🇴", dial: "+57",    name: "Colombia" },
  { code: "AF", flag: "🇦🇫", dial: "+93",    name: "Afganistán" },
  { code: "AL", flag: "🇦🇱", dial: "+355",   name: "Albania" },
  { code: "DE", flag: "🇩🇪", dial: "+49",    name: "Alemania" },
  { code: "AD", flag: "🇦🇩", dial: "+376",   name: "Andorra" },
  { code: "AO", flag: "🇦🇴", dial: "+244",   name: "Angola" },
  { code: "AG", flag: "🇦🇬", dial: "+1268",  name: "Antigua y Barbuda" },
  { code: "SA", flag: "🇸🇦", dial: "+966",   name: "Arabia Saudita" },
  { code: "DZ", flag: "🇩🇿", dial: "+213",   name: "Argelia" },
  { code: "AR", flag: "🇦🇷", dial: "+54",    name: "Argentina" },
  { code: "AM", flag: "🇦🇲", dial: "+374",   name: "Armenia" },
  { code: "AU", flag: "🇦🇺", dial: "+61",    name: "Australia" },
  { code: "AT", flag: "🇦🇹", dial: "+43",    name: "Austria" },
  { code: "AZ", flag: "🇦🇿", dial: "+994",   name: "Azerbaiyán" },
  { code: "BS", flag: "🇧🇸", dial: "+1242",  name: "Bahamas" },
  { code: "BH", flag: "🇧🇭", dial: "+973",   name: "Baréin" },
  { code: "BD", flag: "🇧🇩", dial: "+880",   name: "Bangladesh" },
  { code: "BB", flag: "🇧🇧", dial: "+1246",  name: "Barbados" },
  { code: "BE", flag: "🇧🇪", dial: "+32",    name: "Bélgica" },
  { code: "BZ", flag: "🇧🇿", dial: "+501",   name: "Belice" },
  { code: "BJ", flag: "🇧🇯", dial: "+229",   name: "Benín" },
  { code: "BY", flag: "🇧🇾", dial: "+375",   name: "Bielorrusia" },
  { code: "MM", flag: "🇲🇲", dial: "+95",    name: "Birmania" },
  { code: "BO", flag: "🇧🇴", dial: "+591",   name: "Bolivia" },
  { code: "BA", flag: "🇧🇦", dial: "+387",   name: "Bosnia y Herzegovina" },
  { code: "BW", flag: "🇧🇼", dial: "+267",   name: "Botsuana" },
  { code: "BR", flag: "🇧🇷", dial: "+55",    name: "Brasil" },
  { code: "BN", flag: "🇧🇳", dial: "+673",   name: "Brunéi" },
  { code: "BG", flag: "🇧🇬", dial: "+359",   name: "Bulgaria" },
  { code: "BF", flag: "🇧🇫", dial: "+226",   name: "Burkina Faso" },
  { code: "BI", flag: "🇧🇮", dial: "+257",   name: "Burundi" },
  { code: "BT", flag: "🇧🇹", dial: "+975",   name: "Bután" },
  { code: "CV", flag: "🇨🇻", dial: "+238",   name: "Cabo Verde" },
  { code: "KH", flag: "🇰🇭", dial: "+855",   name: "Camboya" },
  { code: "CM", flag: "🇨🇲", dial: "+237",   name: "Camerún" },
  { code: "CA", flag: "🇨🇦", dial: "+1",     name: "Canadá" },
  { code: "QA", flag: "🇶🇦", dial: "+974",   name: "Catar" },
  { code: "TD", flag: "🇹🇩", dial: "+235",   name: "Chad" },
  { code: "CL", flag: "🇨🇱", dial: "+56",    name: "Chile" },
  { code: "CN", flag: "🇨🇳", dial: "+86",    name: "China" },
  { code: "CY", flag: "🇨🇾", dial: "+357",   name: "Chipre" },
  { code: "VA", flag: "🇻🇦", dial: "+379",   name: "Ciudad del Vaticano" },
  { code: "KM", flag: "🇰🇲", dial: "+269",   name: "Comoras" },
  { code: "CG", flag: "🇨🇬", dial: "+242",   name: "Congo" },
  { code: "CD", flag: "🇨🇩", dial: "+243",   name: "Congo (RDC)" },
  { code: "KP", flag: "🇰🇵", dial: "+850",   name: "Corea del Norte" },
  { code: "KR", flag: "🇰🇷", dial: "+82",    name: "Corea del Sur" },
  { code: "CI", flag: "🇨🇮", dial: "+225",   name: "Costa de Marfil" },
  { code: "CR", flag: "🇨🇷", dial: "+506",   name: "Costa Rica" },
  { code: "HR", flag: "🇭🇷", dial: "+385",   name: "Croacia" },
  { code: "CU", flag: "🇨🇺", dial: "+53",    name: "Cuba" },
  { code: "DK", flag: "🇩🇰", dial: "+45",    name: "Dinamarca" },
  { code: "DJ", flag: "🇩🇯", dial: "+253",   name: "Yibuti" },
  { code: "DM", flag: "🇩🇲", dial: "+1767",  name: "Dominica" },
  { code: "EC", flag: "🇪🇨", dial: "+593",   name: "Ecuador" },
  { code: "EG", flag: "🇪🇬", dial: "+20",    name: "Egipto" },
  { code: "SV", flag: "🇸🇻", dial: "+503",   name: "El Salvador" },
  { code: "AE", flag: "🇦🇪", dial: "+971",   name: "Emiratos Árabes Unidos" },
  { code: "ER", flag: "🇪🇷", dial: "+291",   name: "Eritrea" },
  { code: "SK", flag: "🇸🇰", dial: "+421",   name: "Eslovaquia" },
  { code: "SI", flag: "🇸🇮", dial: "+386",   name: "Eslovenia" },
  { code: "ES", flag: "🇪🇸", dial: "+34",    name: "España" },
  { code: "US", flag: "🇺🇸", dial: "+1",     name: "Estados Unidos" },
  { code: "EE", flag: "🇪🇪", dial: "+372",   name: "Estonia" },
  { code: "SZ", flag: "🇸🇿", dial: "+268",   name: "Esuatini" },
  { code: "ET", flag: "🇪🇹", dial: "+251",   name: "Etiopía" },
  { code: "PH", flag: "🇵🇭", dial: "+63",    name: "Filipinas" },
  { code: "FI", flag: "🇫🇮", dial: "+358",   name: "Finlandia" },
  { code: "FJ", flag: "🇫🇯", dial: "+679",   name: "Fiyi" },
  { code: "FR", flag: "🇫🇷", dial: "+33",    name: "Francia" },
  { code: "GA", flag: "🇬🇦", dial: "+241",   name: "Gabón" },
  { code: "GM", flag: "🇬🇲", dial: "+220",   name: "Gambia" },
  { code: "GE", flag: "🇬🇪", dial: "+995",   name: "Georgia" },
  { code: "GH", flag: "🇬🇭", dial: "+233",   name: "Ghana" },
  { code: "GD", flag: "🇬🇩", dial: "+1473",  name: "Granada" },
  { code: "GR", flag: "🇬🇷", dial: "+30",    name: "Grecia" },
  { code: "GT", flag: "🇬🇹", dial: "+502",   name: "Guatemala" },
  { code: "GN", flag: "🇬🇳", dial: "+224",   name: "Guinea" },
  { code: "GQ", flag: "🇬🇶", dial: "+240",   name: "Guinea Ecuatorial" },
  { code: "GW", flag: "🇬🇼", dial: "+245",   name: "Guinea-Bisáu" },
  { code: "GY", flag: "🇬🇾", dial: "+592",   name: "Guyana" },
  { code: "HT", flag: "🇭🇹", dial: "+509",   name: "Haití" },
  { code: "HN", flag: "🇭🇳", dial: "+504",   name: "Honduras" },
  { code: "HU", flag: "🇭🇺", dial: "+36",    name: "Hungría" },
  { code: "IN", flag: "🇮🇳", dial: "+91",    name: "India" },
  { code: "ID", flag: "🇮🇩", dial: "+62",    name: "Indonesia" },
  { code: "IQ", flag: "🇮🇶", dial: "+964",   name: "Irak" },
  { code: "IR", flag: "🇮🇷", dial: "+98",    name: "Irán" },
  { code: "IE", flag: "🇮🇪", dial: "+353",   name: "Irlanda" },
  { code: "IS", flag: "🇮🇸", dial: "+354",   name: "Islandia" },
  { code: "IL", flag: "🇮🇱", dial: "+972",   name: "Israel" },
  { code: "IT", flag: "🇮🇹", dial: "+39",    name: "Italia" },
  { code: "JM", flag: "🇯🇲", dial: "+1876",  name: "Jamaica" },
  { code: "JP", flag: "🇯🇵", dial: "+81",    name: "Japón" },
  { code: "JO", flag: "🇯🇴", dial: "+962",   name: "Jordania" },
  { code: "KZ", flag: "🇰🇿", dial: "+7",     name: "Kazajistán" },
  { code: "KE", flag: "🇰🇪", dial: "+254",   name: "Kenia" },
  { code: "KG", flag: "🇰🇬", dial: "+996",   name: "Kirguistán" },
  { code: "KI", flag: "🇰🇮", dial: "+686",   name: "Kiribati" },
  { code: "KW", flag: "🇰🇼", dial: "+965",   name: "Kuwait" },
  { code: "LA", flag: "🇱🇦", dial: "+856",   name: "Laos" },
  { code: "LS", flag: "🇱🇸", dial: "+266",   name: "Lesoto" },
  { code: "LV", flag: "🇱🇻", dial: "+371",   name: "Letonia" },
  { code: "LB", flag: "🇱🇧", dial: "+961",   name: "Líbano" },
  { code: "LR", flag: "🇱🇷", dial: "+231",   name: "Liberia" },
  { code: "LY", flag: "🇱🇾", dial: "+218",   name: "Libia" },
  { code: "LI", flag: "🇱🇮", dial: "+423",   name: "Liechtenstein" },
  { code: "LT", flag: "🇱🇹", dial: "+370",   name: "Lituania" },
  { code: "LU", flag: "🇱🇺", dial: "+352",   name: "Luxemburgo" },
  { code: "MK", flag: "🇲🇰", dial: "+389",   name: "Macedonia del Norte" },
  { code: "MG", flag: "🇲🇬", dial: "+261",   name: "Madagascar" },
  { code: "MY", flag: "🇲🇾", dial: "+60",    name: "Malasia" },
  { code: "MW", flag: "🇲🇼", dial: "+265",   name: "Malaui" },
  { code: "MV", flag: "🇲🇻", dial: "+960",   name: "Maldivas" },
  { code: "ML", flag: "🇲🇱", dial: "+223",   name: "Malí" },
  { code: "MT", flag: "🇲🇹", dial: "+356",   name: "Malta" },
  { code: "MA", flag: "🇲🇦", dial: "+212",   name: "Marruecos" },
  { code: "MH", flag: "🇲🇭", dial: "+692",   name: "Islas Marshall" },
  { code: "MR", flag: "🇲🇷", dial: "+222",   name: "Mauritania" },
  { code: "MU", flag: "🇲🇺", dial: "+230",   name: "Mauricio" },
  { code: "MX", flag: "🇲🇽", dial: "+52",    name: "México" },
  { code: "FM", flag: "🇫🇲", dial: "+691",   name: "Micronesia" },
  { code: "MD", flag: "🇲🇩", dial: "+373",   name: "Moldavia" },
  { code: "MC", flag: "🇲🇨", dial: "+377",   name: "Mónaco" },
  { code: "MN", flag: "🇲🇳", dial: "+976",   name: "Mongolia" },
  { code: "ME", flag: "🇲🇪", dial: "+382",   name: "Montenegro" },
  { code: "MZ", flag: "🇲🇿", dial: "+258",   name: "Mozambique" },
  { code: "NA", flag: "🇳🇦", dial: "+264",   name: "Namibia" },
  { code: "NR", flag: "🇳🇷", dial: "+674",   name: "Nauru" },
  { code: "NP", flag: "🇳🇵", dial: "+977",   name: "Nepal" },
  { code: "NI", flag: "🇳🇮", dial: "+505",   name: "Nicaragua" },
  { code: "NE", flag: "🇳🇪", dial: "+227",   name: "Níger" },
  { code: "NG", flag: "🇳🇬", dial: "+234",   name: "Nigeria" },
  { code: "NO", flag: "🇳🇴", dial: "+47",    name: "Noruega" },
  { code: "NZ", flag: "🇳🇿", dial: "+64",    name: "Nueva Zelanda" },
  { code: "OM", flag: "🇴🇲", dial: "+968",   name: "Omán" },
  { code: "NL", flag: "🇳🇱", dial: "+31",    name: "Países Bajos" },
  { code: "PK", flag: "🇵🇰", dial: "+92",    name: "Pakistán" },
  { code: "PW", flag: "🇵🇼", dial: "+680",   name: "Palaos" },
  { code: "PA", flag: "🇵🇦", dial: "+507",   name: "Panamá" },
  { code: "PG", flag: "🇵🇬", dial: "+675",   name: "Papúa Nueva Guinea" },
  { code: "PY", flag: "🇵🇾", dial: "+595",   name: "Paraguay" },
  { code: "PE", flag: "🇵🇪", dial: "+51",    name: "Perú" },
  { code: "PL", flag: "🇵🇱", dial: "+48",    name: "Polonia" },
  { code: "PT", flag: "🇵🇹", dial: "+351",   name: "Portugal" },
  { code: "GB", flag: "🇬🇧", dial: "+44",    name: "Reino Unido" },
  { code: "CF", flag: "🇨🇫", dial: "+236",   name: "Rep. Centroafricana" },
  { code: "CZ", flag: "🇨🇿", dial: "+420",   name: "Rep. Checa" },
  { code: "DO", flag: "🇩🇴", dial: "+1809",  name: "Rep. Dominicana" },
  { code: "RO", flag: "🇷🇴", dial: "+40",    name: "Rumanía" },
  { code: "RW", flag: "🇷🇼", dial: "+250",   name: "Ruanda" },
  { code: "RU", flag: "🇷🇺", dial: "+7",     name: "Rusia" },
  { code: "WS", flag: "🇼🇸", dial: "+685",   name: "Samoa" },
  { code: "KN", flag: "🇰🇳", dial: "+1869",  name: "San Cristóbal y Nieves" },
  { code: "SM", flag: "🇸🇲", dial: "+378",   name: "San Marino" },
  { code: "VC", flag: "🇻🇨", dial: "+1784",  name: "San Vicente y las Granadinas" },
  { code: "LC", flag: "🇱🇨", dial: "+1758",  name: "Santa Lucía" },
  { code: "ST", flag: "🇸🇹", dial: "+239",   name: "Santo Tomé y Príncipe" },
  { code: "SN", flag: "🇸🇳", dial: "+221",   name: "Senegal" },
  { code: "RS", flag: "🇷🇸", dial: "+381",   name: "Serbia" },
  { code: "SC", flag: "🇸🇨", dial: "+248",   name: "Seychelles" },
  { code: "SL", flag: "🇸🇱", dial: "+232",   name: "Sierra Leona" },
  { code: "SG", flag: "🇸🇬", dial: "+65",    name: "Singapur" },
  { code: "SY", flag: "🇸🇾", dial: "+963",   name: "Siria" },
  { code: "SO", flag: "🇸🇴", dial: "+252",   name: "Somalia" },
  { code: "LK", flag: "🇱🇰", dial: "+94",    name: "Sri Lanka" },
  { code: "ZA", flag: "🇿🇦", dial: "+27",    name: "Sudáfrica" },
  { code: "SD", flag: "🇸🇩", dial: "+249",   name: "Sudán" },
  { code: "SS", flag: "🇸🇸", dial: "+211",   name: "Sudán del Sur" },
  { code: "SE", flag: "🇸🇪", dial: "+46",    name: "Suecia" },
  { code: "CH", flag: "🇨🇭", dial: "+41",    name: "Suiza" },
  { code: "SR", flag: "🇸🇷", dial: "+597",   name: "Surinam" },
  { code: "TH", flag: "🇹🇭", dial: "+66",    name: "Tailandia" },
  { code: "TZ", flag: "🇹🇿", dial: "+255",   name: "Tanzania" },
  { code: "TJ", flag: "🇹🇯", dial: "+992",   name: "Tayikistán" },
  { code: "TL", flag: "🇹🇱", dial: "+670",   name: "Timor Oriental" },
  { code: "TG", flag: "🇹🇬", dial: "+228",   name: "Togo" },
  { code: "TO", flag: "🇹🇴", dial: "+676",   name: "Tonga" },
  { code: "TT", flag: "🇹🇹", dial: "+1868",  name: "Trinidad y Tobago" },
  { code: "TN", flag: "🇹🇳", dial: "+216",   name: "Túnez" },
  { code: "TM", flag: "🇹🇲", dial: "+993",   name: "Turkmenistán" },
  { code: "TR", flag: "🇹🇷", dial: "+90",    name: "Turquía" },
  { code: "TV", flag: "🇹🇻", dial: "+688",   name: "Tuvalu" },
  { code: "UA", flag: "🇺🇦", dial: "+380",   name: "Ucrania" },
  { code: "UG", flag: "🇺🇬", dial: "+256",   name: "Uganda" },
  { code: "UY", flag: "🇺🇾", dial: "+598",   name: "Uruguay" },
  { code: "UZ", flag: "🇺🇿", dial: "+998",   name: "Uzbekistán" },
  { code: "VU", flag: "🇻🇺", dial: "+678",   name: "Vanuatu" },
  { code: "VE", flag: "🇻🇪", dial: "+58",    name: "Venezuela" },
  { code: "VN", flag: "🇻🇳", dial: "+84",    name: "Vietnam" },
  { code: "YE", flag: "🇾🇪", dial: "+967",   name: "Yemen" },
  { code: "ZM", flag: "🇿🇲", dial: "+260",   name: "Zambia" },
  { code: "ZW", flag: "🇿🇼", dial: "+263",   name: "Zimbabue" },
];

function DocBadge({ type, number }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-[10px] font-bold bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">
        {DOC_LABELS[type] ?? type?.toUpperCase()}
      </span>
      <span className="text-zinc-300">{number}</span>
    </span>
  );
}

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [form,   setForm]   = useState(null); // null | {} (new) | {...} (edit)
  const [viewing, setViewing] = useState(null); // null | {...} (view)

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search],
    queryFn:  () => api.get(`/customers?search=${search}&limit=50`).then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (d) => d.id ? api.put(`/customers/${d.id}`, d) : api.post("/customers", d),
    onSuccess:  () => { qc.invalidateQueries(["customers"]); setForm(null); },
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/customers/${id}`),
    onSuccess:  () => qc.invalidateQueries(["customers"]),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-white font-bold text-xl lg:hidden">Clientes</h1>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <input
          className="input-field flex-1"
          placeholder="Buscar por nombre o documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-primary shrink-0 whitespace-nowrap" onClick={() => setForm({})}>
          + Nuevo cliente
        </button>
      </div>

      {/* Cards */}
      {isLoading ? (
        <p className="text-zinc-500 text-sm text-center py-8">Cargando...</p>
      ) : !data?.data?.length ? (
        <div className="card text-center py-10">
          <p className="text-zinc-500">No hay clientes.</p>
        </div>
      ) : (
        <div className="space-y-3 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-4 md:space-y-0">
          {data.data.map((c) => (
            <div key={c.id} className="card border border-zinc-800 hover:border-zinc-600 transition-colors space-y-2">
              {/* Nombre + tipo */}
              <div className="flex items-start justify-between gap-2">
                <p className="text-white font-medium text-sm leading-snug">{c.name}</p>
                {c.is_company && (
                  <span className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded shrink-0">Empresa</span>
                )}
              </div>

              {/* Documento */}
              <DocBadge type={c.document_type} number={c.document_number} />

              {/* Contacto */}
              <div className="pt-1 border-t border-zinc-800 space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span className="text-zinc-400">{c.phone || "—"}</span></span>
                  <span className="truncate ml-2 text-zinc-400">{c.email || "—"}</span>
                </div>
                {(c.city || c.department) && (
                  <p className="text-xs text-zinc-600">{[c.city, c.department].filter(Boolean).join(", ")}</p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => setViewing(c)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-brand-green border border-zinc-700 hover:border-brand-green/50 rounded-lg py-1.5 transition-colors">
                  <IconEye /> Ver
                </button>
                <button onClick={() => setForm(c)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg py-1.5 transition-colors">
                  <IconEdit /> Editar
                </button>
                <button onClick={() => { if (confirm(`¿Eliminar a ${c.name}?`)) remove.mutate(c.id); }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/50 rounded-lg py-1.5 transition-colors">
                  <IconTrash /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form !== null && <CustomerModal form={form} onSave={(d) => save.mutate(d)} onClose={() => setForm(null)} saving={save.isLoading} />}
      {viewing && <CustomerView customer={viewing} onEdit={() => { setForm(viewing); setViewing(null); }} onClose={() => setViewing(null)} />}
    </div>
  );
}

function CustomerView({ customer: c, onEdit, onClose }) {
  const initials = c.name?.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  // Detectar indicativo en el teléfono guardado (ej: "+57 300...")
  const phoneCountry = c.phone
    ? (COUNTRIES.find((co) => c.phone.startsWith(co.dial)) ?? COUNTRIES.find((co) => co.code === "CO"))
    : null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">

        {/* Header con gradiente */}
        <div className="relative bg-gradient-to-br from-zinc-800 to-zinc-900 px-6 pt-6 pb-8">
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-green/20 border border-brand-green/30 flex items-center justify-center shrink-0">
              <span className="text-brand-green font-black text-xl">{initials}</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">{c.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <DocBadge type={c.document_type} number={c.document_number} />
                {c.is_company && <span className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">Empresa</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="px-6 py-4 space-y-3 -mt-2">

          {/* Contacto */}
          <div className="bg-zinc-800/50 rounded-xl p-3 space-y-2.5">
            <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Contacto</p>
            {c.phone && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0">
                  {phoneCountry
                    ? <span className="text-base leading-none">{phoneCountry.flag}</span>
                    : <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  }
                </div>
                <span className="text-zinc-200 text-sm">{c.phone}</span>
              </div>
            )}
            {c.email && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <span className="text-zinc-200 text-sm break-all">{c.email}</span>
              </div>
            )}
          </div>

          {/* Ubicación */}
          {(c.city || c.department || c.address) && (
            <div className="bg-zinc-800/50 rounded-xl p-3 space-y-2.5">
              <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Ubicación</p>
              {(c.city || c.department) && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <span className="text-zinc-200 text-sm">{[c.city, c.department].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {c.address && (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <span className="text-zinc-200 text-sm leading-snug">{c.address}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="px-6 pb-5 flex gap-2">
          <button className="flex-1 btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="flex-1 btn-primary" onClick={onEdit}>Editar</button>
        </div>
      </div>
    </div>
  );
}

function CustomerModal({ form, onSave, onClose, saving }) {
  const [data, setData] = useState({ document_type: "cedula", is_company: false, dial_code: "+57", ...form });
  const [error, setError] = useState("");
  const set = (k, v) => setData((p) => ({ ...p, [k]: v }));

  const cities = data.department ? (COLOMBIA[data.department] || []) : [];

  function handleSave() {
    if (!data.name?.trim())            return setError("El nombre es obligatorio.");
    if (!data.document_number?.trim()) return setError("El número de documento es obligatorio.");
    if (!data.phone?.trim())           return setError("El teléfono es obligatorio.");
    if (!data.email?.trim())           return setError("El correo es obligatorio.");
    if (!data.department)              return setError("El departamento es obligatorio.");
    if (!data.city)                    return setError("La ciudad es obligatoria.");
    setError("");
    const dial = data.dial_code || "+57";
    const phoneRaw = data.phone.trim();
    // Combinar indicativo + número solo si el número no empieza ya con "+"
    const fullPhone = phoneRaw.startsWith("+") ? phoneRaw : `${dial} ${phoneRaw}`;
    onSave({ ...data, phone: fullPhone });
  }

  const initials = data.name?.trim()
    ? data.name.trim().split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()
    : (data.id ? "?" : "+");

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl my-auto">

        {/* Header */}
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 px-6 pt-6 pb-7 relative rounded-t-2xl overflow-hidden">
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-green/20 border border-brand-green/30 flex items-center justify-center shrink-0">
              <span className="text-brand-green font-black text-xl">{initials}</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">{data.id ? "Editar cliente" : "Nuevo cliente"}</h2>
              {data.name && <p className="text-zinc-400 text-sm mt-0.5">{data.name}</p>}
            </div>
          </div>
        </div>

        {/* Campos */}
        <div className="px-6 py-4 space-y-4">

          {/* Identidad */}
          <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
            <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Identidad</p>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nombre <span className="text-red-400">*</span></label>
              <input className="input-field" value={data.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="Nombre completo o razón social" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Tipo doc. <span className="text-red-400">*</span></label>
                <select className="input-field" value={data.document_type} onChange={(e) => set("document_type", e.target.value)}>
                  <option value="cedula">C.C.</option>
                  <option value="nit">NIT</option>
                  <option value="ce">C.E.</option>
                  <option value="pp">Pasaporte</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Número doc. <span className="text-red-400">*</span></label>
                <input className="input-field" value={data.document_number || ""} onChange={(e) => set("document_number", e.target.value)} placeholder="123456789" />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
            <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Contacto</p>

            {/* Teléfono con indicativo */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Teléfono <span className="text-red-400">*</span></label>
              <div className="flex items-center gap-2">
                <DialCodePicker
                  value={data.dial_code || "+57"}
                  onChange={(v) => set("dial_code", v)}
                />
                <input
                  className="input-field flex-1 min-w-0"
                  value={data.phone || ""}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="300 123 4567"
                  type="tel"
                />
              </div>
              {/* País seleccionado */}
              <p className="text-zinc-600 text-[10px] mt-1">
                {COUNTRIES.find((c) => c.dial === (data.dial_code || "+57"))?.name ?? "Colombia"}
              </p>
            </div>

            {/* Correo */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Correo <span className="text-red-400">*</span></label>
              <input className="input-field" type="email" value={data.email || ""} onChange={(e) => set("email", e.target.value)} placeholder="correo@mail.com" />
            </div>
          </div>

          {/* Ubicación */}
          <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
            <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Ubicación</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Departamento <span className="text-red-400">*</span></label>
                <select className="input-field" value={data.department || ""}
                  onChange={(e) => { set("department", e.target.value); set("city", ""); }}>
                  <option value="">Seleccionar...</option>
                  {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Ciudad / Municipio <span className="text-red-400">*</span></label>
                <select className="input-field" value={data.city || ""} onChange={(e) => set("city", e.target.value)} disabled={!data.department}>
                  <option value="">Seleccionar...</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Dirección</label>
              <input className="input-field" value={data.address || ""} onChange={(e) => set("address", e.target.value)} placeholder="Calle 123 # 45 - 67" />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs bg-red-950/50 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        {/* Acciones */}
        <div className="px-6 pb-6 flex gap-2">
          <button className="flex-1 btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="flex-1 btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
