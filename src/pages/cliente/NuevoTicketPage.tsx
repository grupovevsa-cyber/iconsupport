import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send, ChevronDown, AlertCircle, CheckCircle2, Loader2,
  Tag, MessageSquare, BarChart2, Zap
} from 'lucide-react'
import { useTickets } from '../../hooks/useTickets'
import { QRTicket } from '../../components/QRTicket'
import type { NuevoTicketForm, Ticket, Profile } from '../../types'
import { supabase } from '../../lib/supabaseClient'

// ============================================================
// Página: Nuevo Ticket (Universal)
// ============================================================

interface NuevoTicketPageProps {
  clienteId?: string
}

export function NuevoTicketPage({ clienteId }: NuevoTicketPageProps) {
  const navigate = useNavigate()
  const { crearTicket } = useTickets()

  const [form, setForm] = useState<NuevoTicketForm>({
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    categoria: 'general',
  })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticketCreado, setTicketCreado] = useState<Ticket | null>(null)

  // ── Para Admins/Técnicos ──
  const [clientes, setClientes] = useState<Profile[]>([])
  const [selectedCliente, setSelectedCliente] = useState<string>(clienteId || '')

  React.useEffect(() => {
    if (!clienteId) {
      supabase.from('profiles').select('*').eq('rol', 'cliente')
        .then(({ data }) => setClientes(data || []))
    }
  }, [clienteId])

  const set = (k: keyof NuevoTicketForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo.trim() || !form.descripcion.trim()) {
      setError('El título y la descripción son obligatorios.')
      return
    }
    if (!clienteId && !selectedCliente) {
      setError('Debes seleccionar un cliente.')
      return
    }

    setCargando(true)
    setError(null)
    try {
      const ticket = await crearTicket(form, clienteId || selectedCliente)
      setTicketCreado(ticket)
    } catch (err: any) {
      setError(err.message || 'Error al crear el ticket.')
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
      <div className="max-w-md mx-auto py-8 px-4 animate-fade-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">¡Ticket Creado!</h2>
          <p className="text-brand-400 mt-2 font-mono text-lg tracking-wider">
            ID: TCK-{String(ticketCreado.numero_ticket || 0).padStart(5, '0')}
          </p>
          <p className="text-slate-400 mt-1 text-sm">
            La solicitud ha sido registrada exitosamente.
          </p>
        </div>

        <div className="bg-surface-900 rounded-2xl border border-slate-700 p-6 mb-4">
          <QRTicket
            ticketId={ticketCreado.id}
            qrData={ticketCreado.qr_code_data}
            titulo={ticketCreado.titulo}
          />
        </div>

        <div className="flex gap-3">
          <button
            id="btn-ver-mis-tickets"
            onClick={() => navigate('/cliente/tickets')}
            className="flex-1 py-3 bg-surface-800 hover:bg-surface-700 text-slate-300 font-medium rounded-xl border border-slate-700 text-sm transition-all"
          >
            Ver mis tickets
          </button>
          <button
            id="btn-nuevo-ticket"
            onClick={() => { setTicketCreado(null); setForm({ titulo: '', descripcion: '', prioridad: 'media', categoria: 'general' }) }}
            className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-sm transition-all shadow-glow/30"
          >
            Nuevo ticket
          </button>
        </div>
      </div>
    )
  }

  // ── Formulario ─────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto py-6 px-4 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Nuevo Ticket de Soporte</h1>
        <p className="text-slate-400 text-sm mt-1">
          Describe el problema para abrir un nuevo caso.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Selección de cliente si es Admin/Tecnico */}
        {!clienteId && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5" htmlFor="ticket-cliente">
              <Tag size={13} className="text-brand-400" />
              Cliente asociado <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                id="ticket-cliente"
                required
                value={selectedCliente}
                onChange={(e) => setSelectedCliente(e.target.value)}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all appearance-none pr-9"
              >
                <option value="" disabled>-- Selecciona un cliente --</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} ({c.email})</option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5" htmlFor="ticket-titulo">
            <Tag size={13} className="text-brand-400" />
            Título del problema <span className="text-red-400">*</span>
          </label>
          <input
            id="ticket-titulo"
            type="text"
            required
            value={form.titulo}
            onChange={set('titulo')}
            placeholder="Ej: Impresora no imprime documentos"
            maxLength={120}
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5" htmlFor="ticket-descripcion">
            <MessageSquare size={13} className="text-brand-400" />
            Descripción detallada <span className="text-red-400">*</span>
          </label>
          <textarea
            id="ticket-descripcion"
            required
            value={form.descripcion}
            onChange={set('descripcion')}
            placeholder="Describe el problema con el mayor detalle posible: ¿cuándo ocurrió? ¿qué mensaje de error aparece? ¿ya lo reiniciaste?"
            rows={5}
            className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 resize-none transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="ticket-categoria">
              Categoría
            </label>
            <div className="relative">
              <select
                id="ticket-categoria"
                value={form.categoria}
                onChange={set('categoria')}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all appearance-none pr-9"
              >
                {CATEGORIAS.map(c => (
                  <option key={c} value={c} className="capitalize">
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="ticket-prioridad">
              Prioridad
            </label>
            <div className="relative">
              <select
                id="ticket-prioridad"
                value={form.prioridad}
                onChange={set('prioridad')}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all appearance-none pr-9"
              >
                {PRIORIDADES.map(p => (
                  <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Info de prioridad */}
        {form.prioridad === 'alta' && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs animate-slide-up">
            <AlertCircle size={13} />
            Un técnico será asignado lo antes posible para atender tu urgencia.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm animate-slide-up">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          id="btn-crear-ticket"
          type="submit"
          disabled={cargando}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-glow/50 hover:shadow-glow"
        >
          {cargando ? (
            <><Loader2 size={18} className="animate-spin" /> Creando ticket...</>
          ) : (
            <><Send size={18} /> Enviar Solicitud de Soporte</>
          )}
        </button>
      </form>
    </div>
  )
}
