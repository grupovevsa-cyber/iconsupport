import React, { useState, useEffect } from 'react'
import {
  Send, ChevronDown, AlertCircle, CheckCircle2, Loader2,
  Tag, MessageSquare, Building, User, Mail, Phone, Zap
} from 'lucide-react'
import { useTickets } from '../../hooks/useTickets'
import { useAuth } from '../../hooks/useAuth'
import { QRTicket } from '../../components/QRTicket'
import type { Ticket } from '../../types'

export function PublicTicketPage() {
  const { crearTicket } = useTickets()
  const { user } = useAuth()

  const [form, setForm] = useState({
    contacto_nombre: '',
    contacto_empresa: '',
    contacto_email: '',
    contacto_telefono: '',
    titulo: '',
    descripcion: '',
    prioridad: 'media' as any,
    categoria: 'general' as any,
  })
  
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticketCreado, setTicketCreado] = useState<Ticket | null>(null)

  // Pre-llenar datos de contacto si hay sesión iniciada
  useEffect(() => {
    if (user?.profile) {
      setForm(f => ({
        ...f,
        contacto_nombre: f.contacto_nombre || user.profile?.nombre || '',
        contacto_email: f.contacto_email || user.email || '',
        contacto_telefono: f.contacto_telefono || user.profile?.telefono || '',
        contacto_empresa: f.contacto_empresa || (user.profile?.rol === 'cliente' ? 'Mi Empresa' : '')
      }))
    }
  }, [user])

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo.trim() || !form.descripcion.trim()) {
      setError('El título y la descripción son obligatorios.')
      return
    }
    if (!form.contacto_nombre.trim() || !form.contacto_email.trim()) {
      setError('Tu nombre y correo son obligatorios para poder contactarte.')
      return
    }

    setCargando(true)
    setError(null)
    try {
      // Pasamos user?.id para que se asocie correctamente si hay sesión
      const ticket = await crearTicket(form as any, user?.id)
      setTicketCreado(ticket)
    } catch (err: any) {
      setError(err.message || 'Error al solicitar el soporte.')
    } finally {
      setCargando(false)
    }
  }

  const CATEGORIAS = [
    'general', 'hardware', 'software', 'redes', 'impresoras', 'servidores', 'otros'
  ]
  const PRIORIDADES = [
    { value: 'baja', label: '🟢 Baja', desc: 'No urgente' },
    { value: 'media', label: '🟡 Media', desc: 'Normal' },
    { value: 'alta', label: '🔴 Alta', desc: 'Urgente' },
  ]

  // ── Vista de éxito con QR ──────────────────────────────────
  if (ticketCreado) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center pt-12 px-4 animate-fade-in">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">¡Solicitud Registrada!</h2>
            <p className="text-brand-400 mt-2 font-mono text-lg tracking-wider">
              ID: TCK-{String(ticketCreado.numero_ticket || 0).padStart(5, '0')}
            </p>
            <p className="text-slate-400 mt-1 text-sm">
              Tu solicitud de soporte ha sido recibida. Guarda este código QR o enlace para hacerle seguimiento.
            </p>
          </div>

          <div className="bg-surface-900 rounded-2xl border border-slate-700 p-6 mb-8 shadow-xl">
            <QRTicket
              ticketId={ticketCreado.id}
              qrData={ticketCreado.qr_code_data}
              titulo={ticketCreado.titulo}
            />
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-surface-800 hover:bg-surface-700 text-slate-300 font-medium rounded-xl border border-slate-700 transition-all"
          >
            Crear otra solicitud
          </button>
        </div>
      </div>
    )
  }

  // ── Formulario ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-xl animate-fade-in">
        
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-glow mb-4">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Solicitud de Soporte Técnico</h1>
          <p className="text-slate-400 text-sm mt-2">
            Por favor, completa la siguiente información para que uno de nuestros técnicos pueda ayudarte lo antes posible.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl space-y-6">
          
          {/* Datos de Contacto */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Datos de Contacto</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User size={13} className="text-brand-400" />
                  Nombre completo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.contacto_nombre}
                  onChange={set('contacto_nombre')}
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Building size={13} className="text-brand-400" />
                  Empresa / Negocio
                </label>
                <input
                  type="text"
                  value={form.contacto_empresa}
                  onChange={set('contacto_empresa')}
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mail size={13} className="text-brand-400" />
                  Correo electrónico <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.contacto_email}
                  onChange={set('contacto_email')}
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Phone size={13} className="text-brand-400" />
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={form.contacto_telefono}
                  onChange={set('contacto_telefono')}
                  className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Detalles del Problema */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Detalles del Problema</h2>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Tag size={13} className="text-brand-400" />
                Título del problema <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.titulo}
                onChange={set('titulo')}
                placeholder="Ej: Impresora no imprime documentos"
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MessageSquare size={13} className="text-brand-400" />
                Descripción detallada <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                value={form.descripcion}
                onChange={set('descripcion')}
                placeholder="Describe el problema con el mayor detalle posible..."
                rows={4}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Categoría</label>
                <div className="relative">
                  <select
                    value={form.categoria}
                    onChange={set('categoria')}
                    className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 appearance-none pr-9"
                  >
                    {CATEGORIAS.map(c => (
                      <option key={c} value={c} className="capitalize">{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Prioridad</label>
                <div className="relative">
                  <select
                    value={form.prioridad}
                    onChange={set('prioridad')}
                    className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 appearance-none pr-9"
                  >
                    {PRIORIDADES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Info de prioridad */}
          {form.prioridad === 'alta' && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs">
              <AlertCircle size={13} />
              Un técnico será asignado lo antes posible para atender tu urgencia.
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-sm transition-all shadow-glow flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {cargando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {cargando ? 'Enviando solicitud...' : 'Solicitar Soporte'}
          </button>
        </form>
      </div>
    </div>
  )
}
