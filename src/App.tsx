import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { PublicTicketPage } from './pages/public/PublicTicketPage'
import { Loader2, Zap } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { Layout } from './components/ui/Layout'
import { LoginPage } from './pages/auth/LoginPage'
import { NuevoTicketPage } from './pages/cliente/NuevoTicketPage'
import { SeguimientoPage } from './pages/cliente/SeguimientoPage'
import { DashboardTecnicoPage } from './pages/tecnico/DashboardTecnicoPage'
import { AsistenciaPage } from './pages/tecnico/AsistenciaPage'
import { FormularioReportePage } from './pages/tecnico/FormularioReportePage'
import { UsuariosPage } from './pages/admin/UsuariosPage'
import { ChatBotPage } from './pages/admin/ChatBotPage'
import { ConfiguracionPage } from './pages/admin/ConfiguracionPage'
import { InformesPage } from './pages/shared/InformesPage'
import { NuevaTareaPage } from './pages/admin/NuevaTareaPage'
import { EjecucionTareaPage } from './pages/tecnico/EjecucionTareaPage'
import { ManualesPage } from './pages/shared/ManualesPage'

// ============================================================
// ICON Support — App principal con routing
// ============================================================

/** Redirige al dashboard correcto según el rol del usuario */
function RoleRedirect({ rol }: { rol: string }) {
  switch (rol) {
    case 'admin':   return <Navigate to="/admin/dashboard" replace />
    case 'tecnico': return <Navigate to="/tecnico/dashboard" replace />
    case 'cliente': return <Navigate to="/cliente/nuevo-ticket" replace />
    default:        return <Navigate to="/login" replace />
  }
}

/** Guard: redirige a login si no hay sesión */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Pantalla de carga inicial */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-glow animate-pulse-slow">
          <Zap size={24} className="text-white" />
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 size={16} className="animate-spin text-brand-400" />
          <span className="text-sm">Cargando ICON Support...</span>
        </div>
      </div>
    </div>
  )
}

/** Páginas protegidas envueltas en Layout */
function AppWithLayout() {
  const { user, loading, signOut } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user?.profile) return <Navigate to="/login" replace />

  const profile = user.profile

  return (
    <Layout currentUser={profile} onSignOut={signOut}>
      <Routes>
        {/* Redirección raíz */}
        <Route path="/dashboard" element={<RoleRedirect rol={profile.rol} />} />

        {/* Rutas de cliente */}
        <Route
          path="/cliente/nuevo-ticket"
          element={<NuevoTicketPage clienteId={user.id} />}
        />
        <Route
          path="/cliente/tickets"
          element={
            <DashboardTecnicoPage currentUser={profile} />
          }
        />
        <Route
          path="/cliente/informes"
          element={<InformesPage currentUser={profile} />}
        />
        <Route
          path="/cliente/manuales"
          element={<ManualesPage />}
        />

        {/* Rutas de técnico */}
        <Route
          path="/tecnico/nuevo-ticket"
          element={<NuevoTicketPage />}
        />
        <Route
          path="/tecnico/nueva-tarea"
          element={<NuevaTareaPage />}
        />
        <Route
          path="/tecnico/dashboard"
          element={<DashboardTecnicoPage currentUser={profile} />}
        />
        <Route
          path="/tecnico/informes"
          element={<InformesPage currentUser={profile} />}
        />
        <Route
          path="/tecnico/asistencia"
          element={<AsistenciaPage tecnico={profile} />}
        />
        <Route
          path="/tecnico/manuales"
          element={<ManualesPage />}
        />
        {/* Formulario de reporte: desde ticket o desde asistencia */}
        <Route
          path="/tecnico/reporte/:ticketId"
          element={<FormularioReportePage />}
        />
        <Route
          path="/tecnico/reporte/:ticketId/:asistenciaId"
          element={<FormularioReportePage />}
        />
        
        {/* Ejecución de Tarea */}
        <Route
          path="/tecnico/tarea/:id"
          element={<EjecucionTareaPage />}
        />

        {/* Rutas de admin */}
        <Route
          path="/admin/nuevo-ticket"
          element={<NuevoTicketPage />}
        />
        <Route
          path="/admin/dashboard"
          element={<DashboardTecnicoPage currentUser={profile} />}
        />
        <Route
          path="/admin/informes"
          element={<InformesPage currentUser={profile} />}
        />
        <Route
          path="/admin/nueva-tarea"
          element={<NuevaTareaPage />}
        />
        <Route
          path="/admin/usuarios"
          element={<UsuariosPage />}
        />
        <Route
          path="/admin/chatbot"
          element={<ChatBotPage />}
        />
        <Route
          path="/admin/configuracion"
          element={<ConfiguracionPage />}
        />
        <Route
          path="/admin/manuales"
          element={<ManualesPage />}
        />

        {/* Catch-all: redirigir al dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Toaster para notificaciones */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#4ade80', secondary: '#1e293b' },
          },
          error: {
            iconTheme: { primary: '#f87171', secondary: '#1e293b' },
          },
        }}
      />

      <Routes>
        {/* Ruta pública: login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Ruta pública: formulario libre */}
        <Route path="/solicitar-soporte" element={<PublicTicketPage />} />

        {/* Ruta pública: seguimiento de ticket vía QR */}
        <Route path="/ticket/seguimiento/:id" element={<SeguimientoPage />} />

        {/* Rutas protegidas */}
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AppWithLayout />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
