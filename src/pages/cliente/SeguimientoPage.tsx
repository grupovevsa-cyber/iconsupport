import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Clock, User, Tag, AlertCircle, CheckCircle2,
  Loader2, MessageSquare, Zap, Timer
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useTickets } from '../../hooks/useTickets'
import { QRTicket } from '../../components/QRTicket'
import type { Ticket } from '../../types'

// ============================================================
// Página: Seguimiento de Ticket (pública o autenticada)
// Accesible via QR code
// ============================================================

const ESTADO_CONFIG = {
  abierto:    { label: 'Abierto',     color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: AlertCircle },
  en_proceso: { label: 'En Proceso',  color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  icon: Timer },
  cerrado:    { label: 'Cerrado',     color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
}

const PRIORIDAD_CONFIG = {
  alta:   { label: 'Alta',   color: 'text-red-400',   dot: 'bg-red-400' },
  media:  { label: 'Media',  color: 'text-amber-400', dot: 'bg-amber-400' },
  baja:   { label: 'Baja',   color: 'text-emerald-400', dot: 'bg-emerald-400' },
}

export function SeguimientoPage() {
  const { id } = useParams<{ id: string }>()
  const { getTicket } = useTickets()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!id) return
    getTicket(id).then(t => {
      setTicket(t)
      setCargando(false)
    })
  }, [id])

  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 size={24} className="animate-spin text-brand-400" />
          <span>Cargando información del ticket...</span>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Ticket no encontrado</h2>
          <p className="text-slate-400 text-sm">El ticket que buscas no existe o no tienes acceso.</p>
        </div>
      </div>
    )
  }

  const estadoCfg = ESTADO_CONFIG[ticket.estado]
  const prioridadCfg = PRIORIDAD_CONFIG[ticket.prioridad]
  const EstadoIcon = estadoCfg.icon

  return (
    <div className="min-h-screen bg-surface-950 hero-pattern">
      {/* Navbar simple */}
      <nav className="border-b border-slate-800 bg-surface-900/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm">ICON Support</span>
          <span className="text-slate-600 text-sm">— Seguimiento de Ticket</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
        {/* Estado principal */}
        <div className={`rounded-2xl p-5 border ${estadoCfg.bg} ${estadoCfg.border}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${estadoCfg.bg} border ${estadoCfg.border}`}>
                <EstadoIcon size={20} className={estadoCfg.color} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Estado actual</p>
                <p className={`text-lg font-bold ${estadoCfg.color}`}>{estadoCfg.label}</p>
              </div>
            </div>
            {/* Prioridad */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${prioridadCfg.dot}`} />
              <span className={`text-xs font-semibold ${prioridadCfg.color}`}>
                Prioridad {prioridadCfg.label}
              </span>
            </div>
          </div>
        </div>

        {/* Título y descripción */}
        <div className="bg-surface-900 rounded-2xl border border-slate-800 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center shrink-0">
              <Tag size={15} className="text-brand-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">{ticket.titulo}</h1>
              <p className="text-xs text-slate-500 mt-1 capitalize">
                Categoría: {ticket.categoria || 'General'}
              </p>
            </div>
          </div>
          {ticket.descripcion && (
            <p className="text-sm text-slate-300 leading-relaxed bg-surface-800/50 rounded-xl p-3 border border-slate-800">
              {ticket.descripcion}
            </p>
          )}
        </div>

        {/* Información de la visita */}
        <div className="bg-surface-900 rounded-2xl border border-slate-800 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Información</h2>

          <div className="grid grid-cols-1 gap-3">
            {/* Cliente */}
            {ticket.cliente && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center">
                  <User size={14} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-600">Cliente</p>
                  <p className="text-sm text-white font-medium">{ticket.cliente.nombre}</p>
                </div>
              </div>
            )}

            {/* Técnico asignado */}
            {ticket.tecnico_asignado && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                  <Zap size={14} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-600">Técnico asignado</p>
                  <p className="text-sm text-white font-medium">{ticket.tecnico_asignado.nombre}</p>
                </div>
              </div>
            )}

            {/* Fecha de creación */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center">
                <Clock size={14} className="text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-600">Creado</p>
                <p className="text-sm text-white font-medium">
                  {format(new Date(ticket.creado_en), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Comentarios */}
        {ticket.comentarios && ticket.comentarios.filter(c => !c.es_interno).length > 0 && (
          <div className="bg-surface-900 rounded-2xl border border-slate-800 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare size={14} />
              Actualizaciones
            </h2>
            <div className="space-y-3">
              {ticket.comentarios
                .filter(c => !c.es_interno)
                .map(comentario => (
                  <div key={comentario.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-brand-400">
                        {comentario.autor?.nombre.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 bg-surface-800/60 rounded-xl p-3 border border-slate-800">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-300">
                          {comentario.autor?.nombre || 'Sistema'}
                        </span>
                        <span className="text-xs text-slate-600">
                          {format(new Date(comentario.creado_en), "dd/MM HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{comentario.mensaje}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* QR del ticket */}
        <div className="bg-surface-900 rounded-2xl border border-slate-800 p-5">
          <QRTicket
            ticketId={ticket.id}
            qrData={ticket.qr_code_data}
            titulo={ticket.titulo}
            size={160}
          />
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-700 pb-4">
          {import.meta.env.VITE_EMPRESA_NOMBRE || 'ICON Support'} — Sistema de Soporte Técnico
        </div>
      </div>
    </div>
  )
}
