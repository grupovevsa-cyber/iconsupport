import React, { useEffect, useState } from 'react'
import {
  Users, Plus, Search, Edit2, Phone, Mail,
  UserCheck, Loader2, X, Shield, MessageSquare
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import type { Profile, UserRole } from '../../types'

// ============================================================
// Página: Gestión de Usuarios (Admin)
// ============================================================

const ROL_BADGES: Record<UserRole, string> = {
  admin:   'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  tecnico: 'bg-brand-500/15 text-brand-400 border border-brand-500/20',
  cliente: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
}

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear')
  const [usuarioEditar, setUsuarioEditar] = useState<Profile | null>(null)

  // Formulario
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    telefono: '',
    rol: 'cliente' as UserRole,
  })
  const [guardando, setGuardando] = useState(false)

  const fetchUsuarios = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('creado_en', { ascending: false })

      if (error) throw error
      setUsuarios((data as Profile[]) || [])
    } catch (err: any) {
      toast.error('Error al cargar usuarios: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsuarios()
  }, [])

  const handleOpenCrear = () => {
    setModoModal('crear')
    setForm({ nombre: '', email: '', password: '', telefono: '', rol: 'cliente' })
    setModalAbierto(true)
  }

  const handleOpenEditar = (user: Profile) => {
    setModoModal('editar')
    setUsuarioEditar(user)
    setForm({
      nombre: user.nombre,
      email: user.email,
      password: '', // no editable directamente
      telefono: user.telefono || '',
      rol: user.rol,
    })
    setModalAbierto(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)

    try {
      const cleanTelefono = form.telefono?.trim() || null

      if (modoModal === 'crear') {
        // Validaciones básicas
        if (!form.email || !form.password || !form.nombre) {
          throw new Error('Todos los campos obligatorios deben ser completados.')
        }

        // Llamar a la función RPC que crearemos en Supabase
        const { data, error } = await supabase.rpc('crear_usuario_admin', {
          new_email: form.email,
          new_password: form.password,
          new_nombre: form.nombre,
          new_rol: form.rol,
          new_telefono: cleanTelefono,
        })

        if (error) throw error
        toast.success('Usuario creado correctamente.')
      } else {
        // Editar usuario existente
        if (!usuarioEditar) return

        const { error } = await supabase
          .from('profiles')
          .update({
            nombre: form.nombre,
            telefono: cleanTelefono,
            rol: form.rol,
          })
          .eq('id', usuarioEditar.id)

        if (error) throw error
        toast.success('Usuario actualizado correctamente.')
      }

      setModalAbierto(false)
      fetchUsuarios()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar usuario.')
    } finally {
      setForm({ nombre: '', email: '', password: '', telefono: '', rol: 'cliente' })
      setGuardando(false)
    }
  }

  // Filtrado
  const usuariosFiltrados = usuarios.filter(u => {
    const matchBusqueda = !busqueda ||
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      (u.telefono && u.telefono.includes(busqueda))
    return matchBusqueda
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-brand-400" />
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Administra clientes, técnicos y sus roles del sistema
          </p>
        </div>

        <button
          id="btn-crear-usuario"
          onClick={handleOpenCrear}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Nuevo Usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          id="busqueda-usuarios"
          type="text"
          placeholder="Buscar por nombre, correo o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-surface-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
        />
      </div>

      {/* Lista de usuarios */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-brand-400" />
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-surface-900 border border-slate-800 rounded-2xl">
          <Users size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No se encontraron usuarios</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {usuariosFiltrados.map(user => (
            <div
              key={user.id}
              className="bg-surface-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center font-bold text-brand-400">
                      {user.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm leading-snug">
                        {user.nombre}
                      </h3>
                      <span className={`inline-block px-2.5 py-0.5 mt-1 rounded-full text-[10px] font-semibold capitalize ${ROL_BADGES[user.rol]}`}>
                        {user.rol}
                      </span>
                    </div>
                  </div>

                  <button
                    id={`btn-editar-user-${user.id.substring(0, 8)}`}
                    onClick={() => handleOpenEditar(user)}
                    className="p-2 text-slate-500 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-xl transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Mail size={12} className="text-slate-600 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-slate-600 shrink-0" />
                      <span>{user.telefono || 'Sin teléfono'}</span>
                    </div>
                    
                    {user.telefono && (
                      <a
                        href={`https://wa.me/${user.telefono.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                      >
                        <MessageSquare size={11} />
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear / Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="bg-surface-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-base">
                {modoModal === 'crear' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="p-1.5 text-slate-500 hover:text-white hover:bg-surface-800 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5" htmlFor="form-nombre">
                  Nombre Completo
                </label>
                <input
                  id="form-nombre"
                  type="text"
                  required
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="input-base"
                />
              </div>

              {/* Email (Solo Crear) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5" htmlFor="form-email">
                  Correo Electrónico
                </label>
                <input
                  id="form-email"
                  type="email"
                  required
                  disabled={modoModal === 'editar'}
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="Ej. juan.perez@empresa.com"
                  className="input-base disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Password (Solo Crear) */}
              {modoModal === 'crear' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5" htmlFor="form-password">
                    Contraseña
                  </label>
                  <input
                    id="form-password"
                    type="password"
                    required
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="input-base"
                  />
                </div>
              )}

              {/* Teléfono */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5" htmlFor="form-telefono">
                  Teléfono (con código de país, ej: +584120000000)
                </label>
                <input
                  id="form-telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                  placeholder="Ej. +584125555555"
                  className="input-base"
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5" htmlFor="form-rol">
                  Rol del Usuario
                </label>
                <div className="relative">
                  <select
                    id="form-rol"
                    value={form.rol}
                    onChange={e => setForm({ ...form, rol: e.target.value as UserRole })}
                    className="input-base appearance-none"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="tecnico">Técnico</option>
                    <option value="admin">Administrador</option>
                  </select>
                  <Shield size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-3">
                <button
                  id="btn-cancelar-modal"
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="flex-1 py-3 bg-surface-800 hover:bg-surface-700 text-slate-300 font-medium rounded-xl border border-slate-700 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  id="btn-guardar-usuario"
                  type="submit"
                  disabled={guardando}
                  className="flex-1 btn-primary"
                >
                  {guardando ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : modoModal === 'crear' ? (
                    'Crear Usuario'
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
