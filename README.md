# 💸 Control de Gastos - Panel Administrativo

Aplicación web para el control de ingresos y gastos personales, construida con **React + Vite + TypeScript + TailwindCSS**.

El objetivo del proyecto es **aprender a desarrollar una aplicación completa desde cero**, incluyendo:

* UI tipo panel administrativo
* manejo de estado en React
* lógica de negocio (cálculos financieros)
* integración futura con base de datos SQL
* autenticación
* exportación/importación de datos

---

## 🚀 Tecnologías utilizadas

* ⚛️ React
* ⚡ Vite
* 🟦 TypeScript
* 🎨 TailwindCSS
* 🔀 React Router

---

## 🎯 Objetivo del proyecto

Construir una aplicación que permita:

* registrar ingresos y gastos
* visualizar transacciones
* calcular balance total
* ver resúmenes semanales y mensuales
* representar datos con gráficos (más adelante)
* exportar e importar datos en Excel (más adelante)
* implementar login y autenticación (más adelante)
* persistir datos en base de datos SQL (más adelante)

---

## 📊 Funcionalidades actuales

* Layout tipo panel administrativo (sidebar + header)
* Dashboard con:

  * balance total
  * ingresos
  * gastos
  * ahorro
* Listado de transacciones
* Formulario para agregar nuevas transacciones
* Manejo de estado con `useState`
* Render dinámico de datos (`map`, `filter`, `reduce`)

---

## 🧠 Qué se está aprendiendo en este proyecto

### React

* Componentes
* Props
* Hooks (`useState`)
* Renderizado dinámico
* Manejo de formularios
* Eventos (`onChange`, `onSubmit`)

### TypeScript

* Tipado de datos
* Interfaces
* Tipado de eventos

### TailwindCSS

* Layout con flex y grid
* Estilos utilitarios
* Responsive design

### Lógica de negocio

* Cálculo de ingresos y gastos
* Balance financiero
* Manipulación de arrays

---

## 📁 Estructura del proyecto

```
src/
  components/
    layout/        # Sidebar, Header, Layout
  pages/           # Vistas principales
  data/            # Datos mock
  types/           # Tipos TypeScript
  router/          # Configuración de rutas
```

---

## 🛠️ Instalación

1. Clonar el repositorio:

```bash
git clone TU_REPO_URL
cd control-gastos
```

2. Instalar dependencias:

```bash
npm install
```

3. Ejecutar el proyecto:

```bash
npm run dev
```

---

## 🧪 Uso de la aplicación

### ➤ Ver dashboard

Al iniciar la app, verás un resumen general con:

* balance total
* ingresos
* gastos

---

### ➤ Agregar una transacción

1. Ir a **Transacciones**
2. Hacer clic en **"Nueva transacción"**
3. Completar:

   * descripción
   * monto
   * tipo (ingreso o gasto)
   * categoría
   * fecha
4. Guardar

👉 La transacción aparecerá en la tabla inmediatamente.

---

### ➤ Ver transacciones

En la tabla puedes ver:

* descripción
* categoría
* tipo (con color)
* monto
* fecha

---

## ⚠️ Estado actual

* Los datos **no se guardan permanentemente**
* Se pierden al recargar la página
* Se utilizan datos mock en memoria

---

## 🔜 Próximos pasos

* Eliminar transacciones
* Compartir estado entre páginas
* Persistencia de datos (Supabase o backend propio)
* Sistema de autenticación
* Dashboard con gráficos
* Filtros por fecha
* Importación/exportación a Excel

---

## 👩‍💻 Autor

Proyecto creado como práctica de desarrollo frontend para mejorar habilidades en:

* React
* TypeScript
* Arquitectura de aplicaciones
* UI/UX tipo SaaS

---

## 📌 Notas

Este proyecto está pensado como aprendizaje progresivo, por lo que las funcionalidades se irán agregando en etapas.
