import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../config/api.js";
import { useAuthStore } from "../stores/authStore.js";

import { fileUrl } from "../utils/fileUrl.js";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp"];
function isImage(fileName) {
  if (!fileName) return false;
  return IMAGE_EXTS.includes(fileName.split(".").pop().toLowerCase());
}

const AREA_LABELS = { corte: "Corte", diseno: "Diseño", sublimacion: "Sublimación", ensamble: "Ensamble", terminados: "Terminados" };

// Emojis para el picker
const EMOJI_GROUPS = [
  { label: "Frecuentes", emojis: ["😀","😂","😍","🥰","😎","🤩","😢","😡","👍","👎","❤️","🔥","🎉","✅","💯","🙏"] },
  { label: "Caras", emojis: ["😊","😇","🥳","😏","🤔","😴","🤯","🥺","😬","🤗","😑","🙄","😤","😭","😱","🤭"] },
  { label: "Gestos", emojis: ["👋","✌️","🤙","💪","🫶","🤝","👏","🙌","🫂","🤜","🤛","👌","🤞","🫡","💅","🖐️"] },
  { label: "Objetos", emojis: ["⭐","🌟","💥","✨","🎯","🏆","💎","🚀","💡","📌","📎","📷","🎵","🎶","❗","❓"] },
];

const QUICK_REACTIONS = ["❤️","😂","👍","😮","😢","🔥"];

function Avatar({ user, size = "sm" }) {
  const dim = size === "sm" ? "w-9 h-9 text-sm" : "w-10 h-10 text-sm";
  if (user?.avatar || user?.other_avatar) {
    const src = fileUrl(user.avatar ?? user.other_avatar);
    return <img src={src} alt="" className={`${dim} rounded-full object-cover shrink-0`} />;
  }
  const name = user?.name ?? user?.other_name ?? "?";
  return (
    <div className={`${dim} rounded-full bg-zinc-700 flex items-center justify-center font-bold text-white shrink-0`}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

// Picker de emojis
function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-14 left-0 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl w-72 p-2">
      <div className="flex gap-1 mb-2 border-b border-zinc-700 pb-1">
        {EMOJI_GROUPS.map((g, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${tab === i ? "bg-brand-green text-black font-medium" : "text-zinc-400 hover:text-white"}`}>
            {g.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-0.5 max-h-40 overflow-y-auto">
        {EMOJI_GROUPS[tab].emojis.map((em) => (
          <button key={em} onClick={() => onSelect(em)}
            className="text-xl p-1 rounded hover:bg-zinc-700 transition-colors leading-none">
            {em}
          </button>
        ))}
      </div>
    </div>
  );
}

// Burbuja de mensaje con reacciones
function MessageBubble({ msg, mine, onReact }) {
  const [showReactions, setShowReactions] = useState(false);
  const reactions = msg.reactions ?? [];

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} group`}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}>
      <div className="relative max-w-[70%] min-w-[80px]">
        {/* Barra de reacciones rápidas (hover) */}
        {showReactions && (
          <div className={`absolute ${mine ? "right-0" : "left-0"} -top-9 flex gap-1 bg-zinc-800 border border-zinc-700 rounded-full px-2 py-1 shadow-lg z-10`}>
            {QUICK_REACTIONS.map((em) => {
              const r = reactions.find((x) => x.emoji === em);
              return (
                <button key={em} onClick={() => onReact(msg.id, em)}
                  className={`text-base leading-none hover:scale-125 transition-transform ${r?.reacted_by_me ? "opacity-100" : "opacity-70 hover:opacity-100"}`}>
                  {em}
                </button>
              );
            })}
          </div>
        )}

        {/* Burbuja */}
        <div className={`rounded-2xl px-4 py-2 ${mine ? "bg-brand-green text-black rounded-br-sm" : "bg-zinc-800 text-white rounded-bl-sm"}`}>
          {msg.file_url && isImage(msg.file_name) && (
            <a href={fileUrl(msg.file_url)} target="_blank" rel="noreferrer">
              <img src={fileUrl(msg.file_url)} alt={msg.file_name} className="max-w-[220px] rounded-lg mb-1 cursor-pointer hover:opacity-90" />
            </a>
          )}
          {msg.file_url && !isImage(msg.file_name) && (
            <a href={fileUrl(msg.file_url)} target="_blank" rel="noreferrer"
              className={`flex items-center gap-2 text-xs underline mb-1 ${mine ? "text-black/80" : "text-brand-green"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span className="truncate max-w-[180px]">{msg.file_name}</span>
            </a>
          )}
          {msg.content && <p className="text-sm leading-relaxed break-words">{msg.content}</p>}
          <p className={`text-[10px] mt-1 ${mine ? "text-black/60 text-right" : "text-zinc-500"}`}>{formatTime(msg.created_at)}</p>
        </div>

        {/* Reacciones existentes */}
        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
            {reactions.map((r) => (
              <button key={r.emoji} onClick={() => onReact(msg.id, r.emoji)}
                className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-colors
                  ${r.reacted_by_me ? "bg-brand-green/20 border-brand-green/50 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"}`}>
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user, accessToken } = useAuthStore();

  // Eliminar padding y scroll del main mientras el chat está activo
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const prev = { overflow: main.style.overflow, padding: main.style.padding };
    main.style.overflow = "hidden";
    main.style.padding  = "0";
    return () => {
      main.style.overflow = prev.overflow;
      main.style.padding  = prev.padding;
    };
  }, []);

  const [contacts,    setContacts]    = useState([]);
  const [activeId,    setActiveId]    = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [text,        setText]        = useState("");
  const [file,        setFile]        = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  // Crear/revocar el blob URL solo cuando cambia el archivo
  useEffect(() => {
    if (!file) { setFilePreview(null); return; }
    const url = isImage(file.name) ? URL.createObjectURL(file) : null;
    setFilePreview(url);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [file]);
  const [sending,     setSending]     = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showEmoji,   setShowEmoji]   = useState(false);
  const bottomRef = useRef(null);
  const fileRef   = useRef(null);

  useEffect(() => {
    api.get("/chat/contacts")
      .then(({ data }) => setContacts(data.data))
      .catch(() => {});
  }, []);

  const loadMessages = useCallback(async (userId) => {
    setLoadingMsgs(true);
    try {
      const { data } = await api.get(`/chat/${userId}`);
      setMessages(data.data);
      setContacts((prev) => prev.map((c) => {
        const id = c.id ?? c.other_user;
        return id === userId ? { ...c, unread: "0" } : c;
      }));
    } catch { /* ignorar */ } finally { setLoadingMsgs(false); }
  }, []);

  useEffect(() => { if (activeId) loadMessages(activeId); }, [activeId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // SSE
  useEffect(() => {
    if (!accessToken) return;
    const es = new EventSource(`/api/notifications/stream?token=${accessToken}`);
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "new_message") {
          const incoming = msg.message;
          if (incoming.from_user_id === activeId) {
            setMessages((prev) => [...prev, { ...incoming, from_name: msg.fromName, reactions: [] }]);
          } else {
            // Actualizar unread y last_message directamente en estado — sin fetch
            setContacts((prev) => prev.map((c) => {
              const id = c.id ?? c.other_user;
              return id === incoming.from_user_id
                ? { ...c, unread: String(parseInt(c.unread ?? "0") + 1), last_message: incoming.content }
                : c;
            }));
          }
        }
        if (msg.type === "message_reaction") {
          setMessages((prev) => prev.map((m) =>
            m.id === msg.messageId ? { ...m, reactions: msg.reactions } : m
          ));
        }
      } catch { /* ignorar */ }
    };
    return () => es.close();
  }, [accessToken, activeId]);

  async function handleSend(e) {
    e.preventDefault();
    if ((!text.trim() && !file) || !activeId || sending) return;
    setSending(true);
    try {
      let res;
      if (file) {
        const fd = new FormData();
        if (text.trim()) fd.append("content", text.trim());
        fd.append("file", file);
        res = await api.post(`/chat/${activeId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        res = await api.post(`/chat/${activeId}`, { content: text.trim() });
      }
      setMessages((prev) => [...prev, { ...res.data.data, reactions: [] }]);
      setText("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch { /* ignorar */ } finally { setSending(false); }
  }

  async function handleReact(messageId, emoji) {
    try {
      const { data } = await api.post(`/chat/messages/${messageId}/react`, { emoji });
      setMessages((prev) => prev.map((m) =>
        m.id === messageId ? { ...m, reactions: data.data } : m
      ));
    } catch { /* ignorar */ }
  }

  const activeContact = contacts.find((c) => (c.id ?? c.other_user) === activeId);

  return (
    <div className="flex h-full overflow-hidden">

      {/* Lista de contactos */}
      <div className={`${showSidebar ? "flex" : "hidden"} md:flex w-full md:w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 flex-col`}>
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-white font-semibold text-sm">Contactos</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-8">Sin conversaciones</p>
          )}
          {contacts.map((c) => {
            const id       = c.id ?? c.other_user;
            const name     = c.name ?? c.other_name;
            const area     = c.area ?? c.other_area;
            const subtitle = c.position
              ? c.position
              : area
              ? (AREA_LABELS[area] ?? area)
              : c.role === "admin" ? "Administrador" : null;
            const unread   = parseInt(c.unread ?? "0");
            return (
              <button key={id} onClick={() => setActiveId(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-900 ${id === activeId ? "bg-zinc-800" : ""}`}>
                <Avatar user={c} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${id === activeId ? "text-white" : "text-zinc-300"}`}>{name}</p>
                  {subtitle && <p className="text-xs text-zinc-500 truncate">{subtitle}</p>}
                  {c.last_message && <p className="text-xs text-zinc-600 truncate">{c.last_message}</p>}
                </div>
                {unread > 0 && (
                  <span className="min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">{unread}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 flex flex-col bg-zinc-900 min-w-0">
        {!activeId ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-zinc-600 text-sm">Selecciona un contacto para chatear</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3 bg-zinc-950 shrink-0">
              <Avatar user={activeContact} />
              <div>
                <p className="text-white font-medium text-sm">{activeContact?.name ?? activeContact?.other_name}</p>
                {(activeContact?.position ?? activeContact?.area ?? activeContact?.other_area) && (
                  <p className="text-zinc-500 text-xs">
                    {activeContact?.position ?? AREA_LABELS[activeContact?.area ?? activeContact?.other_area] ?? (activeContact?.area ?? activeContact?.other_area)}
                  </p>
                )}
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingMsgs && <p className="text-zinc-600 text-center text-sm">Cargando...</p>}
              {messages.map((msg, i) => {
                const mine = msg.from_user_id === user.id;
                const showDate = i === 0 || formatDate(messages[i - 1].created_at) !== formatDate(msg.created_at);
                return (
                  <div key={msg.id}>
                    {showDate && <p className="text-center text-xs text-zinc-600 my-2">{formatDate(msg.created_at)}</p>}
                    <MessageBubble msg={msg} mine={mine} onReact={handleReact} />
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Preview archivo */}
            {file && (
              <div className="px-4 pt-2 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2">
                {filePreview
                  ? <img src={filePreview} alt="" className="h-14 w-14 object-cover rounded-lg shrink-0" />
                  : <span className="text-zinc-400 text-xs">📎 {file.name}</span>
                }
                <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="ml-auto text-zinc-500 hover:text-red-400 text-xs">Quitar</button>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSend} className="px-4 py-3 border-t border-zinc-800 flex items-center gap-2 bg-zinc-950 shrink-0 relative">
              <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
                onChange={(e) => setFile(e.target.files[0] ?? null)} />

              {/* Adjuntar */}
              <button type="button" onClick={() => fileRef.current?.click()}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors shrink-0" title="Adjuntar archivo">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>

              {/* Emoji picker */}
              <div className="relative shrink-0">
                <button type="button" onClick={() => setShowEmoji((v) => !v)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" title="Emojis">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </button>
                {showEmoji && (
                  <EmojiPicker
                    onSelect={(em) => { setText((t) => t + em); setShowEmoji(false); }}
                    onClose={() => setShowEmoji(false)}
                  />
                )}
              </div>

              <input className="input-field flex-1" placeholder="Escribe un mensaje..."
                value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />

              <button type="submit" disabled={(!text.trim() && !file) || sending} className="btn-primary px-4 shrink-0">
                Enviar
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
