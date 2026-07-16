import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  TicketIcon, MapPin, Plus, Users,
  LogOut, Zap, Menu, X, ChevronRight
} from 'lucide-react'
import type { Profile, UserRole } from '../../types'

// ============================================================
// Layout: Sidebar + contenido principal
// ============================================================

interface LayoutProps {
  children: React.ReactNode
  currentUser: Profile
  onSignOut: () => void
}

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
}

const NAV_LINKS: Record<UserRole, NavItem[]> = {
  cliente: [
    { to: '/cliente/nuevo-ticket', icon: Plus,      label: 'Solicitar Soporte' },
    { to: '/cliente/tickets',      icon: TicketIcon, label: 'Mis Tickets' },
  ],
  tecnico: [
    { to: '/tecnico/dashboard',  icon: TicketIcon, label: 'Tickets Asignados' },
    { to: '/tecnico/asistencia', icon: MapPin,     label: 'Control de Asistencia' },
  ],
  admin: [
    { to: '/admin/dashboard',    icon: TicketIcon, label: 'Todos los Tickets' },
    { to: '/tecnico/asistencia', icon: MapPin,     label: 'Asistencias' },
    { to: '/admin/usuarios',     icon: Users,      label: 'Usuarios' },
  ],
}

const ROL_COLORS: Record<UserRole, string> = {
  admin:   'bg-purple-500/20 text-purple-300',
  tecnico: 'bg-brand-500/20 text-brand-300',
  cliente: 'bg-emerald-500/20 text-emerald-300',
}

export function Layout({ children, currentUser, onSignOut }: LayoutProps) {
  const [menuAbierto, setMenuAbierto] = useState(false)

  const links = NAV_LINKS[currentUser.rol] ?? []

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-glow/50">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">ICON Support</h1>
            <p className="text-xs text-slate-500">Soporte Técnico</p>
          </div>
        </div>
      </div>

      {/* Perfil de usuario */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center">
            <span className="text-sm font-bold text-brand-400">
              {currentUser.nombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{currentUser.nombre}</p>
            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${ROL_COLORS[currentUser.rol]}`}>
              {currentUser.rol}
            </span>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, icon: Icon, label }: NavItem) => (
          <NavLink
            key={to}
            to={to}
            id={`nav-${to.replace(/\//g, '-')}`}
            onClick={() => setMenuAbierto(false)}
            className={({ isActive }: { isActive: boolean }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brand-500/15 text-brand-300 border border-brand-500/20 shadow-glow/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800'
              }`
            }
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <Icon size={16} className={isActive ? 'text-brand-400' : ''} />
                {label}
                {isActive && <ChevronRight size={13} className="ml-auto text-brand-500/60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer sidebar */}
      <div className="p-3 border-t border-slate-800">
        <button
          id="btn-cerrar-sesion"
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-surface-950 overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="w-64 hidden lg:flex flex-col bg-surface-900 border-r border-slate-800 h-full shrink-0">
        <SidebarContent />
      </aside>

      {/* Drawer móvil */}
      {menuAbierto && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMenuAbierto(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 bg-surface-900 border-r border-slate-800 flex flex-col animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar móvil */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-surface-900/90 backdrop-blur-md">
          <button
            id="btn-menu-hamburguesa"
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            {menuAbierto ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm">ICON Support</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Área de contenido con scroll */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
