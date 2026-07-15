# Control de Gastos - Panel Administrativo

Aplicacion web para administrar finanzas personales con frontend en React y backend propio en Express. El proyecto ya cubre autenticacion, transacciones, categorias, dashboard, resumenes, proyeccion, modulo de tarjetas y prestamos, integracion con Telegram y asistente de voz.

## Estado actual

Hoy la app permite:

- registrar usuarios, iniciar sesion, cerrar sesion y mantener sesion con JWT
- recuperar acceso con contrasena temporal por email
- editar perfil, email y contrasena desde configuracion
- registrar ingresos, gastos e inversiones
- usar medios de pago y estado de reembolso en transacciones
- filtrar, ordenar, paginar y editar en lote transacciones
- administrar categorias por usuario
- ver dashboard con liquidez, balance operativo, deudas, reembolsos e inversiones
- consultar resumen semanal y mensual con graficos de dona
- proyectar gastos e ingresos futuros y convertirlos en transacciones reales
- llevar control de tarjetas, prestamos por pagar y prestamos por cobrar
- registrar movimientos desde Telegram, incluso en carga masiva por multiples lineas
- consultar metricas por voz desde el navegador
- alternar entre tema claro y oscuro
- usar una UI responsive, mobile first y con sistema de iconos centralizado

## Stack

### Frontend

- React 19
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Context API
- Fetch services

### Backend

- Node.js
- Express 5
- TypeScript
- Prisma ORM
- SQLite
- JWT
- bcryptjs
- CORS
- Nodemailer

### Base de datos

- SQLite local
- Prisma configurado con `prisma.config.ts`
- adapter `@prisma/adapter-better-sqlite3`
- cliente generado en `server/generated/prisma`

## Arquitectura y decisiones actuales

- frontend y backend viven en el mismo repo, pero se ejecutan por separado
- el token JWT se guarda en `localStorage`
- la base local se encuentra en `server/dev.db`
- el backend usa autenticacion propia, no Supabase
- `Transaction.category` sigue siendo un `string`; todavia no existe `categoryId`
- la carpeta `server/.env` debe permanecer fuera de Git
- el frontend hoy consume el backend desde `http://localhost:4000/api` mediante constantes en `src/services`

## Modulos implementados

### 1. Autenticacion y cuenta

- registro y login
- logout
- ruta protegida `GET /api/auth/me`
- actualizacion de perfil desde `PUT /api/auth/profile`
- cambio de contrasena desde configuracion
- recuperacion de contrasena con `POST /api/auth/forgot-password`
- recuperacion por contrasena temporal
- si SMTP no esta configurado, la contrasena temporal se imprime en consola del backend

### 2. Dashboard

- liquidez disponible
- balance operativo
- ingresos
- gastos personales
- consumo financiado
- pagos de deuda
- cobros de deuda
- por cobrar
- reembolsables cobrados
- inversiones
- panorama general de uso de la app
- resumen del estado de tarjetas, prestamos y proyeccion del proximo mes

### 3. Asistente de voz

Componente en `src/components/ui/VoiceAssistant.tsx`.

Puede responder preguntas como:

- "cuanto me queda para gastar"
- "cual es mi balance operativo"
- "cuanto gaste"
- "cuanto ingrese"
- "cuanto tengo financiado"
- "cuanto me deben"

Notas:

- usa `SpeechRecognition` o `webkitSpeechRecognition`
- responde por pantalla y por voz
- depende del soporte del navegador

### 4. Transacciones

Incluye:

- alta, listado, edicion y eliminacion
- tipos: `income`, `expense`, `investments`
- medio de pago
- estado de reembolso
- proteccion por usuario autenticado
- validacion de categoria segun tipo
- vinculacion opcional con Tarjetas y Prestamos al crear una transaccion
- bloqueo de edicion directa para movimientos vinculados a deudas o cuotas

UX actual:

- paginacion
- filtros por categoria, tipo, medio de pago y reembolso
- ordenamiento por columnas
- seleccion multiple con checkbox
- acciones masivas
- edicion masiva
- eliminacion masiva
- soporte mobile con scroll horizontal y truncado visual

### 5. Categorias

- CRUD de categorias por usuario
- color por categoria
- validacion de duplicados por `userId + name + type`
- al renombrar una categoria, se actualizan tambien las transacciones del usuario que usaban ese nombre y tipo

### 6. Resumen semanal y mensual

Vistas:

- `src/pages/ResumenSemanalPage.tsx`
- `src/pages/ResumenMensualPage.tsx`

Capacidades:

- graficos de dona
- navegacion a semanas o meses anteriores
- selector de mes en resumen mensual
- distribucion general
- distribucion de gastos personales por categoria
- distribucion por medio de pago
- historial del periodo
- alerta cuando el gasto personal esta por debajo del 30% del ingreso del periodo

### 7. Proyeccion

Vista: `src/pages/ProyeccionPage.tsx`

Permite:

- crear, editar y eliminar movimientos proyectados
- registrar ingresos y gastos del mes siguiente o meses futuros
- marcar como pagado o cobrado
- volver a marcar como pendiente cuando corresponde
- convertir un movimiento proyectado en transaccion real con un click
- marcar movimientos como recurrentes
- duplicar recurrentes del mes anterior al mes seleccionado
- navegar entre meses

### 8. Tarjetas y Prestamos

Vista: `src/pages/TarjetasPrestamosPage.tsx`

Tipos de cuenta soportados:

- `credit_card`
- `loan_payable`
- `loan_receivable`

Capacidades:

- crear, editar y eliminar cuentas
- crear, editar y eliminar obligaciones dentro de cada cuenta
- crear, editar y eliminar pagos o cobros asociados
- auto generar cuotas al crear una cuenta con monto total, cantidad de cuotas y primera fecha
- almacenar fecha de primera cuota y permitir editar vencimientos despues
- generar transacciones reales automaticamente al registrar pagos o cobros
- mantener sincronizadas las transacciones vinculadas con las cuentas y obligaciones
- acordeon por cuenta para mostrar u ocultar detalle

Logica importante:

- si una transaccion se registra financiada, puede crear una cuenta vinculada automaticamente
- los pagos de deuda generan transacciones de tipo gasto
- los cobros de deuda generan transacciones de tipo ingreso
- los movimientos vinculados no deben editarse manualmente desde Transacciones

### 9. Telegram

Integracion implementada por polling desde `server/src/lib/telegram.ts`.

Capacidades:

- vinculacion de cuenta por codigo generado en configuracion
- desvinculacion desde configuracion
- registro de transacciones desde chat privado del bot
- soporte para fecha opcional
- si no se envia fecha, usa la fecha actual
- soporte para carga masiva enviando multiples lineas
- soporte para medios de pago, reembolso, cuotas y primera fecha
- soporte para generar deudas vinculadas desde Telegram cuando corresponde

Ejemplos de mensajes soportados:

```txt
gasto 2500 comida - Supermercado pago:efectivo
gasto 264000 auto - GNC 3ra Cuota 11-06-2026 pago:tarjeta reembolso:pendiente
gasto 150000 hogar - Heladera fecha:2026-07-10 pago:prestamo cuotas:12 primera:2026-08-10
ingreso 500000 prestamos - Prestamo personal cuotas:10 primera:2026-08-10
ingreso 120000 sueldo - Salario julio fecha:30-06-2026
inversion 30000 cedears - Compra mensual
gasto 2500 categoria:comida descripcion:supermercado fecha:2026-06-30 pago:cuenta
```

Tambien se pueden pegar varias lineas en un solo mensaje para carga masiva.

### 10. Configuracion y tema

Vista: `src/pages/ConfiguracionPage.tsx`

Incluye:

- cambio de nombre y email
- cambio de contrasena
- generacion de codigo de vinculacion con Telegram
- desvinculacion de Telegram
- selector de tema claro y oscuro

El tema se persiste en `localStorage` con `ThemeProvider`.

### 11. Design system y UI

- layout privado con sidebar y header responsive
- sidebar fija en desktop
- sidebar overlay en mobile y tablet
- dark mode y light mode
- iconos centralizados en `src/assets/icons/index.tsx`
- tablas responsive con scroll horizontal
- modales reutilizables
- botones de accion con iconografia consistente

## Rutas del frontend

Principales vistas:

- `/login`
- `/registro`
- `/`
- `/transacciones`
- `/categorias`
- `/resumen-semanal`
- `/resumen-mensual`
- `/tarjetas-prestamos`
- `/proyeccion`
- `/configuracion`

## API disponible

### Salud

- `GET /`
- `GET /api/health`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `PUT /api/auth/profile`
- `POST /api/auth/telegram/link-code`
- `DELETE /api/auth/telegram/link`

### Transactions

- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`

### Categories

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

### Obligation accounts

- `GET /api/obligation-accounts`
- `POST /api/obligation-accounts`
- `PUT /api/obligation-accounts/:accountId`
- `DELETE /api/obligation-accounts/:accountId`
- `POST /api/obligation-accounts/:accountId/obligations`
- `PUT /api/obligation-accounts/obligations/:obligationId`
- `DELETE /api/obligation-accounts/obligations/:obligationId`
- `POST /api/obligation-accounts/obligations/:obligationId/payments`
- `DELETE /api/obligation-accounts/payments/:paymentId`

### Planned movements

- `GET /api/planned-movements`
- `POST /api/planned-movements`
- `PUT /api/planned-movements/:id`
- `PATCH /api/planned-movements/:id/status`
- `POST /api/planned-movements/:id/convert`
- `POST /api/planned-movements/duplicate-recurring`
- `DELETE /api/planned-movements/:id`

## Modelos actuales de Prisma

Definidos en `server/prisma/schema.prisma`.

- `User`
- `Transaction`
- `Category`
- `PlannedMovement`
- `ObligationAccount`
- `Obligation`
- `ObligationPayment`

Notas:

- `Transaction.category` sigue siendo texto
- existen campos de vinculacion entre transacciones y cuentas/pagos de obligaciones
- `User` guarda datos de vinculacion con Telegram

## Estructura del proyecto

```txt
control-gastos/
  src/
    assets/
      icons/
        index.tsx
    components/
      auth/
      layout/
      ui/
    context/
    hooks/
    pages/
    router/
    services/
    types/
    utils/

  server/
    generated/
      prisma/
    prisma/
      migrations/
      schema.prisma
    src/
      lib/
      middlewares/
      routes/
      index.ts
    .env
    dev.db
    prisma.config.ts
    package.json
```

## Scripts

### Frontend

Desde la raiz del proyecto:

```bash
npm install
npm run dev
npm run build
npm run preview
```

### Backend

Desde `server/`:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Configuracion local

### 1. Instalar dependencias

Instala dependencias en ambos paquetes:

```bash
npm install
cd server
npm install
```

### 2. Crear `server/.env`

Ejemplo orientativo:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="cambia-esto-por-un-secreto-seguro"
JWT_EXPIRES_IN="7d"

SMTP_HOST=""
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""

TELEGRAM_BOT_TOKEN=""
TELEGRAM_BOT_USERNAME=""
```

Notas:

- si no completas SMTP, la recuperacion de contrasena funciona en modo consola
- si no completas Telegram, la app igual funciona pero sin bot
- no subas `server/.env` al repositorio

### 3. Preparar Prisma

```bash
cd server
npm run prisma:generate
npm run prisma:migrate
```

### 4. Ejecutar backend

```bash
cd server
npm run dev
```

Backend por defecto:

```txt
http://localhost:4000
```

### 5. Ejecutar frontend

En otra terminal:

```bash
npm run dev
```

Frontend por defecto:

```txt
http://localhost:5173
```

## Sincronizacion de datos

El frontend:

- carga transacciones, proyecciones y cuentas al iniciar sesion
- refresca datos cada 10 segundos
- vuelve a sincronizar al recuperar foco o visibilidad

Esto ayuda a reflejar rapidamente los movimientos creados desde Telegram.

## Limitaciones conocidas

- el frontend tiene la URL del backend hardcodeada en `src/services`
- `Transaction.category` aun no referencia `Category` por id
- no hay suite de tests automatizados todavia
- la app esta pensada para entorno local o de aprendizaje, no para produccion directa
- GitHub Pages solo serviria el frontend estatico; para que la app funcione completa necesitas desplegar tambien el backend y actualizar las URLs de los servicios

## Archivos clave

- `src/App.tsx`
- `src/router/AppRouter.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/TransaccionesPage.tsx`
- `src/pages/CategoriasPage.tsx`
- `src/pages/ResumenSemanalPage.tsx`
- `src/pages/ResumenMensualPage.tsx`
- `src/pages/TarjetasPrestamosPage.tsx`
- `src/pages/ProyeccionPage.tsx`
- `src/pages/ConfiguracionPage.tsx`
- `src/components/ui/PeriodSummary.tsx`
- `src/components/ui/VoiceAssistant.tsx`
- `src/assets/icons/index.tsx`
- `server/src/index.ts`
- `server/src/routes/auth.routes.ts`
- `server/src/routes/transaction.routes.ts`
- `server/src/routes/category.routes.ts`
- `server/src/routes/obligation-account.routes.ts`
- `server/src/routes/planned-movement.routes.ts`
- `server/src/lib/telegram.ts`
- `server/src/lib/mailer.ts`
- `server/prisma/schema.prisma`

## Build verificado

Documentacion actualizada tomando como referencia el estado real del proyecto y build local correcto con:

```bash
npm run build
```
