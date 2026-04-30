# 💸 Control de Gastos - Panel Administrativo

Aplicación web para el control de ingresos y gastos personales, construida como proyecto de aprendizaje desde cero.

El proyecto incluye un **frontend en React** y un **backend propio con Express**, con autenticación, rutas protegidas y persistencia de datos en una base SQLite usando Prisma.

---

## 🚀 Tecnologías utilizadas

### Frontend

- ⚛️ React
- ⚡ Vite
- 🟦 TypeScript
- 🎨 TailwindCSS
- 🔀 React Router

### Backend

- 🟩 Node.js
- 🚂 Express
- 🟦 TypeScript
- 🗃️ SQLite
- 🔺 Prisma ORM
- 🔐 JWT
- 🔑 bcryptjs

---

## 🎯 Objetivo del proyecto

Construir una aplicación completa que permita:

- registrar usuarios
- iniciar sesión
- cerrar sesión
- proteger rutas privadas
- registrar ingresos y gastos
- visualizar transacciones por usuario
- calcular balance total
- ver ingresos, gastos y ahorro
- persistir datos en base de datos SQL
- aprender estructura real frontend/backend
- preparar la app para futuros reportes, gráficos e importación/exportación Excel

---

## 📊 Funcionalidades actuales

### Autenticación

- Registro de usuarios desde el frontend
- Login con email y contraseña
- Logout
- Hash de contraseña con `bcryptjs`
- Generación de token JWT
- Ruta protegida `/api/auth/me`
- Persistencia de sesión con token en `localStorage`
- Protección de rutas privadas en React

---

### Transacciones

- Crear transacciones
- Listar transacciones
- Eliminar transacciones
- Confirmación de eliminación con modal reutilizable
- Empty state cuando no hay transacciones
- Persistencia en base de datos
- Cada usuario ve únicamente sus propias transacciones

---

### Dashboard

- Balance total
- Total de ingresos
- Total de gastos
- Ahorro
- Tabla de últimas transacciones
- Cálculos dinámicos desde las transacciones reales del usuario

---

### UI / Layout

- Panel administrativo inspirado en AdminLTE
- Sidebar
- Header
- Layout privado
- Cards de métricas
- Tabla responsive
- Modal reutilizable
- Estilos con TailwindCSS

---

## 🧠 Qué se está aprendiendo en este proyecto

### React

- Componentes
- Props
- Hooks
- `useState`
- `useEffect`
- Context API
- Custom hooks
- Formularios controlados
- Renderizado condicional
- Rutas protegidas
- Manejo de sesión en frontend

---

### TypeScript

- Tipado de props
- Interfaces
- Tipos reutilizables
- Tipado de eventos
- Tipado de respuestas de API
- Tipado de estado global

---

### TailwindCSS

- Layout con `flex` y `grid`
- Responsive design
- Estados visuales
- Cards
- Tablas
- Formularios
- Modales

---

### Backend

- Crear servidor con Express
- Crear rutas REST
- Separar rutas por responsabilidad
- Middlewares
- Validación básica de datos
- Manejo de errores
- Uso de variables de entorno
- Conexión con base de datos

---

### Base de datos / Prisma

- Configurar Prisma con SQLite
- Crear modelos
- Crear migraciones
- Relación uno a muchos entre usuarios y transacciones
- Consultas con Prisma Client
- Crear registros
- Buscar registros
- Eliminar registros
- Filtrar datos por usuario autenticado

---

### Seguridad básica

- No guardar contraseñas en texto plano
- Hashear passwords con `bcryptjs`
- Comparar passwords con `bcrypt.compare`
- Generar JWT al iniciar sesión
- Validar JWT con middleware
- Proteger endpoints privados
- Evitar devolver passwords en respuestas del backend

---

## 📁 Estructura general del proyecto

```txt
control-gastos/
  src/
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
    data/

  server/
    prisma/
      schema.prisma
      migrations/
    src/
      lib/
      middlewares/
      routes/
      index.ts
    .env
    prisma.config.ts
    package.json
    tsconfig.json