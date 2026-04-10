# HISTORIAL DE DESARROLLO — APP NTRL

> Este archivo documenta el estado actual, decisiones tomadas y contexto del proyecto para mantener continuidad entre conversaciones.
> **Actualizar este archivo cada vez que se haga un cambio significativo.**

---

## ¿Qué es esta aplicación?

**APP NTRL** es un sistema ERP interno para **Natural Ropa Deportiva**, una empresa colombiana de ropa deportiva personalizada. La app gestiona el ciclo completo de pedidos: desde la creación del pedido hasta la entrega al cliente, pasando por producción, pagos y comunicación interna.

**Formato:** PWA (Progressive Web App) — instalable en tablets y computadores, funciona en red WiFi local.

**Usuarios objetivo:**
- **Administradores:** Gestionan pedidos, clientes, catálogo, finanzas, reportes.
- **Trabajadores de producción:** Ven y actualizan sus tareas de producción, solicitan insumos.

---

## Stack Tecnológico

### Frontend
- React 18.3 + Vite 5.3
- React Router 6.26 (rutas protegidas por rol)
- TanStack React Query 5.51 (estado del servidor)
- Zustand 4.5 (estado de autenticación)
- Tailwind CSS 3.4
- Axios 1.7
- Recharts 2.12 (gráficas)
- vite-plugin-pwa (service worker + offline)
- IndexedDB / idb 8.0 (almacenamiento local para sincronización offline)

### Backend
- Node.js con ES modules
- Express 4.21
- PostgreSQL 15 (base de datos principal)
- Redis 7 (sesiones, caché, pub/sub)
- JWT (access token corto + refresh token en cookie httpOnly)
- Passport.js 0.7 (OAuth2 Google — configurado, no es el flujo principal)
- Multer 1.4 (subida de archivos)
- Sharp 0.33 (procesamiento de imágenes)
- PDFKit 0.15 + ExcelJS 4.4 (reportes)
- Joi 17.13 (validación)
- bcryptjs 2.4 (hash de contraseñas)
- Pino 9.3 (logging estructurado)
- Helmet 7.1 + CORS 2.8 + express-rate-limit

### DevOps
- Docker + Docker Compose (4 contenedores: PostgreSQL, Redis, Express, Nginx)
- Nginx 1.27-Alpine (proxy inverso, SSL/TLS, rate limiting)
- Vercel (frontend — tiene vercel.json)
- Migraciones SQL ejecutadas automáticamente al iniciar

---

## Estructura de Carpetas

```
app-ntrl/
├── client/                     # Frontend React
│   └── src/
│       ├── components/         # Componentes reutilizables
│       │   ├── layout/         # AppLayout, Header, Sidebar, OfflineBanner
│       │   ├── notifications/  # NotificationBell
│       │   └── orders/         # CascadeFilter, SizeQuantityGrid
│       ├── pages/
│       │   ├── admin/          # 11 páginas de administrador
│       │   └── worker/         # 3 páginas de trabajador
│       ├── router/             # AppRouter con guards por rol
│       ├── stores/             # Zustand auth store
│       ├── config/             # Configuración de API
│       └── utils/              # fileUrl helper
├── server/                     # Backend Express
│   └── src/
│       ├── controllers/        # 12 controladores
│       ├── routes/             # Rutas API
│       ├── services/           # Lógica de negocio
│       ├── middleware/         # Auth, validación, upload, seguridad
│       ├── config/             # DB, Redis, config general
│       └── utils/              # AppError, fileStorage, sseManager
├── migrations/                 # 9 migraciones SQL
├── seeds/                      # Datos iniciales del catálogo
├── nginx/                      # Configuración de Nginx
├── docker-compose.yml
├── docker-compose.dev.yml
└── .env.example
```

---

## Base de Datos — 15 Tablas

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios del sistema (admins y trabajadores) |
| `sessions` | Sesiones activas (máx. 3 por usuario) |
| `sports` | Deportes del catálogo (Ciclismo, Fútbol, etc.) |
| `lines` | Líneas por deporte (Camisetas, Pantalones, etc.) |
| `products` | Productos por línea |
| `customers` | Clientes (NIT o cédula, empresa o persona) |
| `orders` | Pedidos (número auto-incremental, estado, total, balance) |
| `order_items` | Ítems del pedido (JSONB de tallas: `{"TM": 5, "TL": 3}`) |
| `order_payments` | Pagos (máx. 3 cuotas, método, banco) |
| `order_history` | Auditoría de cambios en pedidos |
| `production_tasks` | Tareas de producción (6 por pedido, una por área) |
| `notifications` | Notificaciones en tiempo real |
| `sync_operations` | Cola de sincronización offline |
| `supply_requests` | Solicitudes de insumos de trabajadores |
| `messages` | Mensajes directos entre usuarios |
| `message_reactions` | Reacciones emoji en mensajes |

### Triggers (8 en total)
1. Auto-calcular subtotal de ítem (tallas × precio)
2. Recalcular total del pedido al cambiar ítems
3. Recalcular `amount_paid` al cambiar pagos
4. Auto-actualizar estado del pedido según tareas de producción
5. Auto-crear 6 tareas de producción al crear un pedido
6. Auto-actualizar `updated_at`
7. Límite de 3 sesiones por usuario
8. Protección de estado de pedido (no revertir desde "entregado")

---

## Áreas de Producción (6 etapas)

1. `corte` — Corte de telas
2. `diseno_disenar` — Diseño
3. `diseno_imprimir` — Impresión
4. `sublimacion` — Sublimación
5. `ensamble` — Ensamble
6. `terminados` — Terminados y control de calidad

---

## Autenticación y Seguridad

- Login con email + contraseña
- JWT: access token (vida corta) + refresh token (httpOnly cookie, rotación)
- Roles: `admin` y `worker`
- Máximo 3 sesiones simultáneas por usuario
- Rate limiting: 5 intentos de login por IP cada 15 minutos
- OAuth2 Google (configurado en Passport, no es el flujo principal)
- Archivos subidos: validación por magic bytes + re-encoding con Sharp
- SQL injection prevenido con queries parametrizadas
- Nginx restringe acceso a IPs de red local (RFC1918)

---

## Características Implementadas

- [x] Sistema de autenticación completo (JWT + refresh + roles)
- [x] Gestión de pedidos (crear, editar, cambiar estado)
- [x] Flujo de producción con 6 etapas
- [x] Sistema financiero (3 cuotas de pago, balance automático)
- [x] Chat interno con reacciones emoji y archivos
- [x] Notificaciones en tiempo real (SSE + Redis pub/sub)
- [x] Gestión de insumos (solicitudes de trabajadores)
- [x] Dashboard con analíticas (caché Redis 5 min)
- [x] Catálogo jerárquico (deporte → línea → producto)
- [x] Gestión de clientes
- [x] Gestión de usuarios
- [x] Reportes exportables (PDF + Excel)
- [x] PWA offline-first con sync automático
- [x] Calendario de fechas de entrega
- [x] Auditoría de cambios en pedidos
- [x] Docker Compose con 4 servicios
- [x] Nginx con SSL/TLS y rate limiting

---

## Estado del Proyecto

> **Última actualización:** 2026-04-08

El proyecto tiene una arquitectura completa y funcional. El código cubre frontend y backend end-to-end. Se han ejecutado 9 migraciones de base de datos.

---

## Decisiones Técnicas Importantes

| Decisión | Razón |
|----------|-------|
| PWA en lugar de app nativa | Instalable sin app store, funciona en cualquier dispositivo de la empresa |
| PostgreSQL + triggers para cálculos | Garantiza consistencia de datos sin depender de la lógica del servidor |
| Redis para sesiones | Permite invalidar sesiones fácilmente y escalar horizontalmente |
| SSE en lugar de WebSockets | Más simple, suficiente para notificaciones unidireccionales |
| Nginx como proxy | SSL/TLS centralizado, rate limiting, restricción de red local |
| Docker Compose | Reproducibilidad en despliegue, ambiente idéntico en dev y prod |
| IndexedDB para offline | Permite que los trabajadores sigan operando sin conexión |
| fileStorage.js abstracto | Preparado para migrar a S3/Cloudinary sin cambiar la lógica |

---

## Pendientes / Próximas Tareas

> Actualizar esta sección con cada nueva tarea discutida.

- [ ] *(Agregar tareas aquí)*

---

## Registro de Cambios

### 2026-04-08
- Creación del archivo HISTORIAL.md para mantener contexto entre conversaciones.
- Estado documentado: aplicación con arquitectura completa (frontend + backend + Docker).
- 9 migraciones SQL ejecutadas hasta la fecha.
- **Fix:** Rol `vendedor` no podía crear/editar/eliminar en catálogo — se actualizó `requireAdmin()` en `catalog.controller.js` para permitir también el rol `vendedor`.
- **Feature:** Se agregaron botones Eliminar (con confirmación) para deportes, líneas y productos en `CatalogPage.jsx`. Solo visible para quienes tienen acceso al catálogo.
- **Fix:** Al agregar un segundo producto en la creación de pedido, el `CascadeFilter` no se reseteaba y mostraba las líneas del deporte anterior. Se corrigió usando `key={filterKey}` en `OrderCreatePage.jsx` para forzar remonte del componente tras cada selección.

### 2026-04-09
- **Feature:** Comprobante de pago en abonos — campo de archivo (JPG/PNG/PDF) en el formulario, guardado en Cloudinary con columna `receipt_url` (migración 010). Se abre en lightbox interno al hacer clic en "Ver comprobante".
- **Fix:** Título "Dashboard" duplicado en desktop — se ocultó con `lg:hidden` el h1 del contenido, dejando solo el del header.
- **Feature:** Workers pueden marcar suministros como recibidos — botón "Recibido" en suministros pendientes/en proceso. Al marcarlo desaparece de la lista del worker y queda como "Entregado" en el panel del admin.
- **Feature:** Botón ↻ Actualizar agregado en `TasksPage` y `SuppliesWorkerPage` de workers.
- **Fix:** Botón Actualizar ahora limpia caché del service worker y recarga la página completa (equivalente a Ctrl+Shift+R) usando `hardRefresh.js`.
- **Feature:** Íconos maskable para Android — generados con Python/Pillow con safe zone del 80%, configurados en el manifest. El ícono normal (cuadrado) no se toca.
- **Fix:** Ícono del botón Actualizar reemplazado por SVG nítido en todos los perfiles (admin, vendedor, workers).

### 2026-04-09 (continuación)
- **Fix:** Columnas Estado, Pedido, Unidad, Cantidad y Fecha en tabla de suministros — centradas y con `whitespace-nowrap` para móvil.
- **Feature:** Columna **Unidad** agregada en tabla de suministros del admin (separada de Cantidad).
- **Feature:** Unidad **"resma"** agregada en admin y workers.
- **Feature:** Campos **Departamento** y **Ciudad** agregados al formulario de proveedores usando datos de Colombia. Se muestran en la tarjeta junto a la dirección en un solo renglón. Migración 011 ejecutada.
- **Feature:** Botón **Editar** en cada fila de suministros del admin — permite editar insumo, cantidad, unidad, pedido y notas. Nuevo endpoint `PATCH /supplies/:id`.
- **Fix:** Cantidades sin decimales innecesarios — `3` en vez de `3.00`, en tabla y modal de gestión.
- **Fix:** Gráficas del dashboard — `revenue` traducido a `Ingresos`, valores del eje Y abreviados (`$36M`), tooltip muestra valor completo en pesos colombianos, mes en formato `abr. 2026`.

---

*Archivo mantenido manualmente. Actualizar al final de cada sesión de trabajo significativa.*
