# APP NTRL — Contexto del Proyecto

ERP/PWA completo para Natural Ropa Deportiva (empresa colombiana de ropa deportiva personalizada).
Desarrollado por NexCode97. En producción. Pago único, sin mensualidades.

## Stack
- **Frontend:** `client/` — React 18 + Vite — Vercel
- **Backend:** `server/` — Node.js + Express — Railway
- **DB:** PostgreSQL 15 (Neon serverless)
- **Caché/Realtime:** Redis (Railway)
- **Auth:** JWT (access 15min + refresh 7d) + Google OAuth
- **Archivos:** Cloudinary
- **PWA:** Service worker + IndexedDB (soporte offline)
- **Infra local:** Docker Compose

## Roles
- **Admin:** acceso total — editar precios, ver/editar abonos, historial completo
- **Vendedor:** crear pedidos, registrar/eliminar abonos
- **Worker:** tareas de producción (marcar completas)

## Módulos
- **Pedidos:** 6 etapas (Corte → Diseño → Impresión → Sublimación → Ensamble → Terminados)
- **Pagos/Abonos:** hasta 3 cuotas, comprobantes adjuntos, editar/eliminar (SVG icons: ojo/lápiz/X)
- **Catálogo:** Deporte → Línea → Producto, precios unitarios por item
- **Dashboard:** KPIs mensuales + selector historial 24 meses (collected usa paid_at)
- **Chat:** mensajes con reacciones emoji, realtime SSE + Redis pub/sub
- **Notificaciones:** SSE + Redis + push web
- **Reportes:** exportación PDF/Excel
- **Calendario, Clientes, Usuarios, Suministros, Proveedores**

## Migraciones
30+ migraciones en `migrations/`. Se ejecutan automáticamente al iniciar el servidor (idempotentes, tabla `_migrations`).

## Auth
- Rate limiter: 10 intentos fallidos / 15 min
- Interceptor Axios excluye `/auth/` del auto-refresh en 401
- Google OAuth en producción

## Pendiente confirmado
- Verificar que iconos SVG en tab Abonos (ojo/lápiz/X) quedaron visibles en el último deploy de Vercel

## Convenciones
- Commit + push sin pedir confirmación al terminar cada tarea
- Actualizar `HISTORIAL.md` al finalizar sesión
