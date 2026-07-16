# ICON SUPPORT — PWA de Gestión de Soporte Técnico

Sistema completo de tickets de soporte técnico con QR dinámico, geolocalización, firma digital y generación de PDF. Stack 100% gratuito.

## 🚀 Stack Tecnológico

| Capa | Tecnología | Plan |
|---|---|---|
| Frontend | React 18 + Vite 5 + TypeScript | — |
| Estilos | Tailwind CSS v3 | — |
| Backend / DB | Supabase (PostgreSQL) | Free |
| Auth | Supabase Auth | Free |
| Storage | Supabase Storage | Free |
| Hosting | Vercel | Free |
| Iconos | lucide-react | — |
| QR | react-qr-code | — |
| Mapas | Leaflet + OpenStreetMap | Free / sin API key |
| Firma | react-signature-canvas | — |
| PDF | jspdf + jspdf-autotable | — |
| PWA | vite-plugin-pwa | — |

---

## 📋 Prerrequisitos

- Node.js 18+ (instalado)
- Cuenta gratuita en [supabase.com](https://supabase.com)
- Cuenta gratuita en [vercel.com](https://vercel.com)

---

## ⚙️ Configuración Inicial

### 1. Clonar y configurar entorno

```bash
# Copiar el archivo de ejemplo de variables de entorno
cp .env.example .env
```

Edita `.env` con tus credenciales reales de Supabase:
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_APP_URL=http://localhost:3000
VITE_EMPRESA_NOMBRE=Tu Empresa
```

### 2. Configurar Supabase

1. Crea un nuevo proyecto en [app.supabase.com](https://app.supabase.com)
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`
3. (Opcional) Ejecuta `supabase/seed.sql` para datos de prueba
4. En **Authentication → Settings**, configura el dominio de tu app
5. Copia la **URL** y **Anon Key** de **Settings → API**

### 3. Instalar dependencias

```bash
npm install
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 📁 Estructura del Proyecto

```
icon-support/
├── public/
│   └── favicon.svg
├── supabase/
│   ├── schema.sql          ← DDL + RLS policies
│   └── seed.sql            ← Datos de prueba
├── src/
│   ├── lib/
│   │   ├── supabaseClient.ts   ← Cliente Supabase
│   │   └── pdf-generator.ts    ← Generador PDF (jsPDF)
│   ├── types/
│   │   └── index.ts            ← Tipos TypeScript globales
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTickets.ts
│   │   ├── useGeolocation.ts
│   │   └── useAsistencias.ts
│   ├── components/
│   │   ├── ui/Layout.tsx       ← Sidebar + layout responsivo
│   │   ├── QRTicket.tsx        ← Generador/visor QR
│   │   ├── CheckInOut.tsx      ← Asistencia + mapa Leaflet
│   │   ├── SignaturePad.tsx    ← Firma digital
│   │   └── ReportePDF.tsx      ← Formulario reporte + PDF
│   ├── pages/
│   │   ├── auth/LoginPage.tsx
│   │   ├── cliente/
│   │   │   ├── NuevoTicketPage.tsx
│   │   │   └── SeguimientoPage.tsx  ← Accessible via QR
│   │   └── tecnico/
│   │       ├── DashboardTecnicoPage.tsx
│   │       └── AsistenciaPage.tsx
│   ├── App.tsx                 ← Routing + guards
│   ├── main.tsx
│   └── index.css
├── .env.example
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## 👥 Roles de Usuario

| Rol | Acceso |
|---|---|
| **cliente** | Crear tickets, ver seguimiento vía QR |
| **tecnico** | Ver tickets asignados, check-in/out, generar reportes PDF |
| **admin** | Todo lo anterior + asignar técnicos, gestionar todos los tickets |

---

## 🔑 Funcionalidades Clave

### 📋 Tickets con QR
- Cada ticket genera un QR único apuntando a `/ticket/seguimiento/:id`
- Los clientes pueden escanear el QR para ver el estado en tiempo real
- Descarga del QR como imagen PNG

### 📍 Geolocalización (Check-in/Out)
- Usa `navigator.geolocation` (API del navegador, sin costo)
- Reverse geocoding con **Nominatim/OpenStreetMap** (gratuito, sin API key)
- Mapa Leaflet con marcador de posición y radio de precisión GPS

### ✍️ Firma Digital
- Canvas de firma táctil con `react-signature-canvas`
- Optimizado para pantallas de móvil (touch-action: none)
- Firma guardada como PNG en Supabase Storage

### 📄 Reporte PDF
- Generado 100% en el cliente con **jsPDF**
- Incluye: encabezado con datos de empresa, info del ticket, coordenadas GPS, resumen del trabajo y firma digitalizada del cliente
- Se sube automáticamente a Supabase Storage y el ticket se marca como cerrado

---

## 🚢 Despliegue en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel deploy

# Variables de entorno: configurarlas en el dashboard de Vercel
# Settings → Environment Variables
```

---

## 🔒 Seguridad (RLS)

Todas las tablas tienen Row Level Security activado:
- **Clientes**: solo ven sus propios tickets
- **Técnicos**: ven los tickets asignados a ellos
- **Admins**: acceso completo
- **Storage**: solo usuarios autenticados pueden subir archivos

---

## 📱 PWA

La app se puede instalar en dispositivos móviles como app nativa:
1. Abre la app en Chrome/Safari
2. Menú → "Añadir a pantalla de inicio"
3. Las tiles de OpenStreetMap se cachean para uso offline
