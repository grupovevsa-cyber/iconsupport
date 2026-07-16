import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Camera, Upload, Trash2, CheckCircle2, Loader2, Plus, X,
  Building2, MapPin, User, Wrench, FileText, ChevronDown,
  ImageIcon, ArrowLeft, AlertCircle, Download, Send, Mail
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import { useTickets } from '../../hooks/useTickets'
import { useEmpresas } from '../../hooks/useEmpresas'
import { useSucursales } from '../../hooks/useSucursales'
import { useEquipos } from '../../hooks/useEquipos'
import { useImagenesReporte } from '../../hooks/useImagenesReporte'
import { generarReportePDF } from '../../lib/pdf-generator'
import { SignaturePad } from '../../components/SignaturePad'
import type { Ticket, Empresa, Sucursal, Equipo, Asistencia } from '../../types'

// ============================================================
// Página: FormularioReportePage
// Formulario completo del técnico con fotos, catálogos, firma y PDF
// Accesible desde: /tecnico/reporte/:ticketId  o  /tecnico/reporte/:ticketId/:asistenciaId
// ============================================================

interface FotoLocal {
  file: File
  preview: string
  descripcion: string
}

// ── Sub-componente Section wrapper ─────────────────────────
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
        {icon} {title}
      </h2>
      {children}
    </div>
  )
}

// ── Componente Principal ───────────────────────────────────
export function FormularioReportePage() {
  const navigate = useNavigate()
  const { ticketId, asistenciaId } = useParams<{ ticketId: string; asistenciaId?: string }>()
  const { user } = useAuth()
  const { getTicket } = useTickets()
  const { empresas, fetchEmpresas, crearEmpresa } = useEmpresas()
  const { sucursales, fetchSucursales, crearSucursal } = useSucursales()
  const { equipos, fetchEquipos, crearEquipo } = useEquipos()
  const { subirImagen } = useImagenesReporte()

  // ── Datos ──────────────────────────────────────────────
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [asistencia, setAsistencia] = useState<Asistencia | null>(null)
  const [cargando, setCargando] = useState(true)

  // ── Empresa ────────────────────────────────────────────
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<Empresa | null>(null)
  const [busquedaEmpresa, setBusquedaEmpresa] = useState('')
  const [dropEmpresa, setDropEmpresa] = useState(false)
  const [formEmpresa, setFormEmpresa] = useState(false)
  const [nuevaEmpresaNombre, setNuevaEmpresaNombre] = useState('')
  const [nuevaEmpresaRFC, setNuevaEmpresaRFC] = useState('')
  const [guardandoEmpresa, setGuardandoEmpresa] = useState(false)

  // ── Sucursal ───────────────────────────────────────────
  const [sucursalId, setSucursalId] = useState('')
  const [formSucursal, setFormSucursal] = useState(false)
  const [nuevaSucursalNombre, setNuevaSucursalNombre] = useState('')
  const [nuevaSucursalDir, setNuevaSucursalDir] = useState('')
  const [guardandoSucursal, setGuardandoSucursal] = useState(false)

  // ── Supervisor ─────────────────────────────────────────
  const [supervisorCliente, setSupervisorCliente] = useState('')

  // ── Trabajo ────────────────────────────────────────────
  const [resumen, setResumen] = useState('')
  const [materiales, setMateriales] = useState('')
  const [horasTrabajadas, setHorasTrabajadas] = useState('')

  // ── Equipos ────────────────────────────────────────────
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<Equipo[]>([])
  const [busquedaEquipo, setBusquedaEquipo] = useState('')
  const [dropEquipo, setDropEquipo] = useState(false)
  const [formEquipo, setFormEquipo] = useState(false)
  const [nuevoEquipoNombre, setNuevoEquipoNombre] = useState('')
  const [nuevoEquipoMarca, setNuevoEquipoMarca] = useState('')
  const [nuevoEquipoModelo, setNuevoEquipoModelo] = useState('')
  const [guardandoEquipo, setGuardandoEquipo] = useState(false)

  // ── Fotos ──────────────────────────────────────────────
  const [fotos, setFotos] = useState<FotoLocal[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const camaraInputRef = useRef<HTMLInputElement>(null)

  // ── Firma ──────────────────────────────────────────────
  const [firmaUrl, setFirmaUrl] = useState<string | null>(null)
  const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(null)
  const [mostrarFirma, setMostrarFirma] = useState(false)

  // ── Estado final ───────────────────────────────────────
  const [guardando, setGuardando] = useState(false)
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [reporteId, setReporteId] = useState<string | null>(null)

  // ── Carga inicial ──────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      if (!ticketId) return
      const [t] = await Promise.all([getTicket(ticketId), fetchEmpresas(), fetchEquipos()])
      setTicket(t)
      if (asistenciaId) {
        const { data } = await supabase.from('asistencias').select('*').eq('id', asistenciaId).single()
        if (data) setAsistencia(data as Asistencia)
      }
      setCargando(false)
    }
    init()
  }, [ticketId, asistenciaId])

  useEffect(() => {
    if (empresaSeleccionada?.id) fetchSucursales(empresaSeleccionada.id)
  }, [empresaSeleccionada])

  // ── Empresa handlers ───────────────────────────────────
  const empresasFiltradas = empresas.filter(e =>
    e.nombre.toLowerCase().includes(busquedaEmpresa.toLowerCase())
  )

  const seleccionarEmpresa = (e: Empresa) => {
    setEmpresaSeleccionada(e)
    setBusquedaEmpresa(e.nombre)
    setSucursalId('')
    setDropEmpresa(false)
  }

  const handleCrearEmpresa = async () => {
    if (!nuevaEmpresaNombre.trim()) return
    setGuardandoEmpresa(true)
    try {
      const e = await crearEmpresa(nuevaEmpresaNombre.trim(), nuevaEmpresaRFC.trim() || undefined)
      seleccionarEmpresa(e)
      setFormEmpresa(false)
      setNuevaEmpresaNombre('')
      setNuevaEmpresaRFC('')
      toast.success(`Empresa "${e.nombre}" creada.`)
    } catch (err: any) { toast.error(err.message) }
    finally { setGuardandoEmpresa(false) }
  }

  // ── Sucursal handlers ──────────────────────────────────
  const handleCrearSucursal = async () => {
    if (!nuevaSucursalNombre.trim() || !empresaSeleccionada) return
    setGuardandoSucursal(true)
    try {
      const s = await crearSucursal(empresaSeleccionada.id, nuevaSucursalNombre.trim(), nuevaSucursalDir.trim() || undefined)
      setSucursalId(s.id)
      setFormSucursal(false)
      setNuevaSucursalNombre('')
      setNuevaSucursalDir('')
      toast.success(`Sucursal "${s.nombre}" creada.`)
    } catch (err: any) { toast.error(err.message) }
    finally { setGuardandoSucursal(false) }
  }

  // ── Equipos handlers ───────────────────────────────────
  const equiposFiltrados = equipos.filter(e =>
    e.nombre.toLowerCase().includes(busquedaEquipo.toLowerCase()) &&
    !equiposSeleccionados.find(sel => sel.id === e.id)
  )

  const toggleEquipo = (eq: Equipo) => {
    setEquiposSeleccionados(prev =>
      prev.find(e => e.id === eq.id) ? prev.filter(e => e.id !== eq.id) : [...prev, eq]
    )
    setBusquedaEquipo('')
    setDropEquipo(false)
  }

  const handleCrearEquipo = async () => {
    if (!nuevoEquipoNombre.trim()) return
    setGuardandoEquipo(true)
    try {
      const eq = await crearEquipo(nuevoEquipoNombre.trim(), nuevoEquipoMarca.trim() || undefined, nuevoEquipoModelo.trim() || undefined)
      setEquiposSeleccionados(prev => [...prev, eq])
      setFormEquipo(false)
      setNuevoEquipoNombre('')
      setNuevoEquipoMarca('')
      setNuevoEquipoModelo('')
      toast.success(`Equipo "${eq.nombre}" creado y agregado.`)
    } catch (err: any) { toast.error(err.message) }
    finally { setGuardandoEquipo(false) }
  }

  // ── Fotos handlers ─────────────────────────────────────
  const agregarFotos = (files: FileList | null) => {
    if (!files) return
    const nuevas: FotoLocal[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, 10 - fotos.length)
      .map(file => ({ file, preview: URL.createObjectURL(file), descripcion: '' }))
    setFotos(prev => [...prev, ...nuevas])
  }

  const eliminarFoto = (idx: number) => {
    setFotos(prev => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx) })
  }

  // ── Guardar Reporte ────────────────────────────────────
  const handleGuardarReporte = async () => {
    if (!resumen.trim()) { toast.error('Escribe el resumen del trabajo.'); return }
    if (!firmaUrl || !firmaDataUrl) { toast.error('Obtén la firma del cliente antes de continuar.'); return }
    if (!ticket || !user?.profile) return

    setGuardando(true)
    try {
      const sucursalSel = sucursales.find(s => s.id === sucursalId)

      // 1. Generar PDF con todos los datos
      const pdfGenerado = await generarReportePDF({
        ticket,
        tecnico: user.profile,
        cliente: ticket.cliente!,
        asistencia: asistencia ?? undefined,
        firmaDataUrl,
        reporte: {
          resumen_trabajo: resumen,
          materiales_usados: materiales || undefined,
          horas_trabajadas: horasTrabajadas ? parseFloat(horasTrabajadas) : undefined,
          firma_cliente_url: firmaUrl,
        },
        empresa: empresaSeleccionada ?? undefined,
        sucursal: sucursalSel,
        supervisorCliente: supervisorCliente || undefined,
        equipos: equiposSeleccionados.length > 0 ? equiposSeleccionados : undefined,
        fotos: fotos.map(f => ({ url: f.preview, descripcion: f.descripcion })),
      })

      // 2. Guardar reporte en BD
      const { data: reporteDB, error: dbErr } = await supabase
        .from('visitas_reportes')
        .insert({
          ticket_id: ticket.id,
          asistencia_id: asistencia?.id ?? null,
          tecnico_id: user.profile.id,
          resumen_trabajo: resumen,
          materiales_usados: materiales || null,
          horas_trabajadas: horasTrabajadas ? parseFloat(horasTrabajadas) : null,
          firma_cliente_url: firmaUrl,
          pdf_reporte_url: pdfGenerado,
          empresa_id: empresaSeleccionada?.id ?? null,
          sucursal_id: sucursalId || null,
          supervisor_cliente: supervisorCliente || null,
          equipos_ids: equiposSeleccionados.map(e => e.id),
        })
        .select()
        .single()

      if (dbErr) throw new Error(dbErr.message)
      const rId = (reporteDB as any).id as string
      setReporteId(rId)

      // 3. Subir fotos al bucket y registrar URLs
      for (let i = 0; i < fotos.length; i++) {
        try {
          await subirImagen(fotos[i].file, rId, fotos[i].descripcion, i)
        } catch (_) { /* continuar aunque falle una foto */ }
      }

      // 4. Cerrar el ticket
      await supabase.from('tickets').update({ estado: 'cerrado' }).eq('id', ticket.id)

      setPdfUrl(pdfGenerado)
      toast.success('¡Reporte generado y ticket cerrado!')
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    } finally {
      setGuardando(false)
    }
  }

  // ── Enviar por Email ───────────────────────────────────
  const handleEnviarEmail = async () => {
    if (!pdfUrl || !ticket?.cliente?.email) {
      toast.error('No hay PDF generado o el cliente no tiene email registrado.')
      return
    }
    setEnviandoEmail(true)
    try {
      // Llamada a Supabase Edge Function (o función RPC) para enviar el email
      const { error } = await supabase.functions.invoke('enviar-reporte-email', {
        body: {
          to: ticket.cliente.email,
          cliente_nombre: ticket.cliente.nombre,
          tecnico_nombre: user?.profile?.nombre,
          ticket_titulo: ticket.titulo,
          ticket_id: ticket.id,
          pdf_url: pdfUrl,
          empresa_nombre: empresaSeleccionada?.nombre,
          supervisor: supervisorCliente,
        },
      })
      if (error) throw new Error(error.message)
      toast.success(`Reporte enviado a ${ticket.cliente.email}`)
    } catch (err: any) {
      // Si la función no existe aún, informamos al usuario con la URL para compartir
      toast.error('Función de email no configurada. Comparte el enlace del PDF directamente.')
    } finally {
      setEnviandoEmail(false)
    }
  }

  // ── Pantallas de estado ────────────────────────────────
  if (cargando) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-400" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-white font-bold">Ticket no encontrado</p>
        </div>
      </div>
    )
  }

  // Pantalla de éxito: PDF generado
  if (pdfUrl) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
        <div className="bg-surface-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-5 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">¡Reporte Completado!</h2>
            <p className="text-sm text-slate-400 mt-1">
              El ticket fue cerrado y el PDF está listo para descargar o enviar.
            </p>
          </div>

          {/* Email del cliente */}
          {ticket.cliente?.email && (
            <div className="bg-surface-800 border border-slate-700 rounded-xl p-3 text-left">
              <p className="text-xs text-slate-500 mb-0.5">Email del cliente</p>
              <p className="text-sm text-white font-medium">{ticket.cliente.email}</p>
            </div>
          )}

          <div className="space-y-3">
            {/* Descargar */}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-xl transition-all text-sm"
            >
              <Download size={16} /> Descargar PDF
            </a>

            {/* Enviar por email */}
            <button
              onClick={handleEnviarEmail}
              disabled={enviandoEmail || !ticket.cliente?.email}
              className="flex items-center justify-center gap-2 w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 font-semibold py-3 rounded-xl transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {enviandoEmail ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              {enviandoEmail ? 'Enviando...' : `Enviar al cliente por email`}
            </button>

            {/* Compartir enlace */}
            <button
              onClick={() => { navigator.clipboard.writeText(pdfUrl); toast.success('Enlace copiado al portapapeles.') }}
              className="flex items-center justify-center gap-2 w-full bg-surface-800 border border-slate-700 text-slate-300 py-2.5 rounded-xl text-sm hover:bg-surface-700 transition-colors"
            >
              <Send size={14} /> Copiar enlace del PDF
            </button>

            <button
              onClick={() => navigate(-1)}
              className="w-full py-2.5 text-slate-500 text-sm hover:text-slate-300 transition-colors"
            >
              Volver al panel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulario principal ───────────────────────────────
  return (
    <div className="min-h-screen bg-surface-950 pb-24">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-surface-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-surface-800 text-slate-400 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Formulario de Reporte Técnico</p>
            <p className="text-sm font-bold text-white truncate">{ticket.titulo}</p>
          </div>
          {asistencia && (
            <div className="ml-auto text-right shrink-0">
              <p className="text-[10px] text-slate-500">Entrada</p>
              <p className="text-xs font-semibold text-white">
                {format(new Date(asistencia.hora_entrada), 'HH:mm', { locale: es })}
              </p>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 animate-fade-in">

        {/* Resumen del ticket */}
        <div className="bg-brand-500/5 border border-brand-500/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/20 flex items-center justify-center shrink-0">
            <FileText size={16} className="text-brand-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">Ticket #{ticket.id.substring(0, 8).toUpperCase()}</p>
            <p className="text-sm font-semibold text-white truncate">{ticket.titulo}</p>
            {ticket.cliente && <p className="text-xs text-slate-400 mt-0.5">Cliente: {ticket.cliente.nombre}</p>}
          </div>
        </div>

        {/* ── 1. Identificación del Cliente ─────────────── */}
        <Section icon={<Building2 size={15} className="text-brand-400" />} title="Identificación del Cliente">

          {/* Empresa: autocomplete */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Empresa / Cliente</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar empresa por nombre..."
                value={busquedaEmpresa}
                onChange={e => { setBusquedaEmpresa(e.target.value); setDropEmpresa(true) }}
                onFocus={() => setDropEmpresa(true)}
                onBlur={() => setTimeout(() => setDropEmpresa(false), 150)}
                className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 pr-10"
              />
              {empresaSeleccionada && (
                <button
                  onClick={() => { setEmpresaSeleccionada(null); setBusquedaEmpresa(''); setSucursalId('') }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
              {dropEmpresa && busquedaEmpresa && (
                <div className="absolute z-20 w-full mt-1 bg-surface-800 border border-slate-700 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                  {empresasFiltradas.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-500">Sin resultados</div>
                  ) : empresasFiltradas.map(e => (
                    <button key={e.id} onMouseDown={() => seleccionarEmpresa(e)}
                      className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-surface-700 transition-colors">
                      {e.nombre}
                      {e.rfc && <span className="text-xs text-slate-500 ml-2">RFC: {e.rfc}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Botón nueva empresa */}
          {!formEmpresa ? (
            <button onClick={() => setFormEmpresa(true)}
              className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors">
              <Plus size={12} /> Crear nueva empresa
            </button>
          ) : (
            <div className="bg-surface-800/60 border border-brand-500/20 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-brand-400">Nueva Empresa</p>
              <input placeholder="Nombre *" value={nuevaEmpresaNombre} onChange={e => setNuevaEmpresaNombre(e.target.value)}
                className="field-input" />
              <input placeholder="RFC (opcional)" value={nuevaEmpresaRFC} onChange={e => setNuevaEmpresaRFC(e.target.value)}
                className="field-input" />
              <div className="flex gap-2">
                <button onClick={handleCrearEmpresa} disabled={guardandoEmpresa}
                  className="flex-1 btn-primary py-1.5 text-xs">
                  {guardandoEmpresa ? <Loader2 size={12} className="animate-spin" /> : 'Crear'}
                </button>
                <button onClick={() => setFormEmpresa(false)} className="px-3 py-1.5 text-xs text-slate-400 bg-surface-700 rounded-lg">Cancelar</button>
              </div>
            </div>
          )}

          {/* Sucursal */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              <MapPin size={11} className="inline mr-1" /> Sucursal / Local
            </label>
            <select value={sucursalId} onChange={e => setSucursalId(e.target.value)}
              disabled={!empresaSeleccionada}
              className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-40 appearance-none">
              <option value="">{empresaSeleccionada ? 'Seleccionar sucursal...' : 'Selecciona una empresa primero'}</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}{s.direccion ? ` — ${s.direccion}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Botón nueva sucursal */}
          {empresaSeleccionada && !formSucursal && (
            <button onClick={() => setFormSucursal(true)}
              className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors">
              <Plus size={12} /> Nueva sucursal
            </button>
          )}
          {formSucursal && (
            <div className="bg-surface-800/60 border border-brand-500/20 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-brand-400">Nueva Sucursal</p>
              <input placeholder="Nombre *" value={nuevaSucursalNombre} onChange={e => setNuevaSucursalNombre(e.target.value)}
                className="field-input" />
              <input placeholder="Dirección (opcional)" value={nuevaSucursalDir} onChange={e => setNuevaSucursalDir(e.target.value)}
                className="field-input" />
              <div className="flex gap-2">
                <button onClick={handleCrearSucursal} disabled={guardandoSucursal}
                  className="flex-1 btn-primary py-1.5 text-xs">
                  {guardandoSucursal ? <Loader2 size={12} className="animate-spin" /> : 'Crear'}
                </button>
                <button onClick={() => setFormSucursal(false)} className="px-3 py-1.5 text-xs text-slate-400 bg-surface-700 rounded-lg">Cancelar</button>
              </div>
            </div>
          )}

          {/* Supervisor */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              <User size={11} className="inline mr-1" /> Supervisor / Encargado del Cliente
            </label>
            <input type="text" placeholder="Nombre del supervisor o encargado..."
              value={supervisorCliente} onChange={e => setSupervisorCliente(e.target.value)}
              className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
        </Section>

        {/* ── 2. Descripción del Trabajo ─────────────────── */}
        <Section icon={<FileText size={15} className="text-brand-400" />} title="Descripción del Trabajo">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Resumen del trabajo realizado <span className="text-red-400">*</span></label>
            <textarea value={resumen} onChange={e => setResumen(e.target.value)} rows={5}
              placeholder="Describe detalladamente el trabajo realizado: diagnóstico, reparaciones, configuraciones..."
              className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Materiales / Repuestos utilizados</label>
            <textarea value={materiales} onChange={e => setMateriales(e.target.value)} rows={2}
              placeholder="Ej: 1x Disco SSD 512GB, 2x RAM DDR4 8GB..."
              className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Horas trabajadas</label>
            <input type="number" min="0.5" max="24" step="0.5" placeholder="Ej: 2.5"
              value={horasTrabajadas} onChange={e => setHorasTrabajadas(e.target.value)}
              className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
        </Section>

        {/* ── 3. Equipos Atendidos ───────────────────────── */}
        <Section icon={<Wrench size={15} className="text-brand-400" />} title="Equipos Atendidos">
          {equiposSeleccionados.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {equiposSeleccionados.map(eq => (
                <div key={eq.id} className="flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs px-2.5 py-1.5 rounded-full">
                  <Wrench size={9} />
                  <span>{eq.nombre}</span>
                  {eq.marca && <span className="text-brand-400/50">({eq.marca})</span>}
                  <button onClick={() => toggleEquipo(eq)} className="ml-0.5 hover:text-red-400 transition-colors"><X size={10} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="relative">
            <input type="text" placeholder="Buscar equipo para agregar..."
              value={busquedaEquipo}
              onChange={e => { setBusquedaEquipo(e.target.value); setDropEquipo(true) }}
              onFocus={() => setDropEquipo(true)}
              onBlur={() => setTimeout(() => setDropEquipo(false), 150)}
              className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            {dropEquipo && busquedaEquipo && (
              <div className="absolute z-20 w-full mt-1 bg-surface-800 border border-slate-700 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                {equiposFiltrados.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-slate-500">Sin resultados</div>
                ) : equiposFiltrados.map(eq => (
                  <button key={eq.id} onMouseDown={() => toggleEquipo(eq)}
                    className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-surface-700 transition-colors">
                    {eq.nombre}
                    {eq.marca && <span className="text-xs text-slate-500 ml-2">{eq.marca} {eq.modelo}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!formEquipo ? (
            <button onClick={() => setFormEquipo(true)}
              className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors">
              <Plus size={12} /> Nuevo equipo
            </button>
          ) : (
            <div className="bg-surface-800/60 border border-brand-500/20 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-brand-400">Nuevo Equipo</p>
              <input placeholder="Nombre del equipo *" value={nuevoEquipoNombre} onChange={e => setNuevoEquipoNombre(e.target.value)} className="field-input" />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Marca" value={nuevoEquipoMarca} onChange={e => setNuevoEquipoMarca(e.target.value)} className="field-input" />
                <input placeholder="Modelo" value={nuevoEquipoModelo} onChange={e => setNuevoEquipoModelo(e.target.value)} className="field-input" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCrearEquipo} disabled={guardandoEquipo}
                  className="flex-1 btn-primary py-1.5 text-xs">
                  {guardandoEquipo ? <Loader2 size={12} className="animate-spin" /> : 'Crear y Agregar'}
                </button>
                <button onClick={() => setFormEquipo(false)} className="px-3 py-1.5 text-xs text-slate-400 bg-surface-700 rounded-lg">Cancelar</button>
              </div>
            </div>
          )}
        </Section>

        {/* ── 4. Fotos y Evidencia ───────────────────────── */}
        <Section icon={<Camera size={15} className="text-brand-400" />} title={`Fotos y Evidencia (${fotos.length}/10)`}>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => camaraInputRef.current?.click()} disabled={fotos.length >= 10}
              className="flex items-center justify-center gap-2 bg-surface-800 hover:bg-surface-700 border border-slate-700 hover:border-brand-500/40 text-slate-300 py-3 rounded-xl text-sm transition-all disabled:opacity-40">
              <Camera size={15} className="text-brand-400" /> Usar Cámara
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={fotos.length >= 10}
              className="flex items-center justify-center gap-2 bg-surface-800 hover:bg-surface-700 border border-slate-700 hover:border-brand-500/40 text-slate-300 py-3 rounded-xl text-sm transition-all disabled:opacity-40">
              <Upload size={15} className="text-brand-400" /> Adjuntar
            </button>
          </div>
          {/* Inputs ocultos */}
          <input ref={camaraInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={e => agregarFotos(e.target.files)} />
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => agregarFotos(e.target.files)} />

          {fotos.length === 0 ? (
            <div className="border-2 border-dashed border-slate-800 rounded-xl py-8 text-center">
              <ImageIcon size={26} className="text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-600">Toma fotos desde la cámara o adjunta imágenes como evidencia del trabajo</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {fotos.map((foto, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-surface-800">
                  <img src={foto.preview} alt={`foto-${idx}`} className="w-full h-32 object-cover" />
                  <button onClick={() => eliminarFoto(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500/90 hover:bg-red-500 text-white rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={11} />
                  </button>
                  <div className="p-2 bg-surface-900/80">
                    <input type="text" placeholder="Describe esta foto..."
                      value={foto.descripcion}
                      onChange={e => setFotos(prev => prev.map((f, i) => i === idx ? { ...f, descripcion: e.target.value } : f))}
                      className="w-full bg-transparent text-xs text-slate-300 placeholder-slate-600 border-0 focus:outline-none" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── 5. Firma Digital del Cliente ──────────────── */}
        <Section icon={<User size={15} className="text-brand-400" />} title="Conformidad y Firma del Cliente">
          <p className="text-xs text-slate-500 leading-relaxed">
            El cliente o encargado debe firmar para validar el trabajo realizado. Esta firma aparecerá en el reporte PDF final.
          </p>

          {/* Estado de la firma */}
          <button
            onClick={() => setMostrarFirma(!mostrarFirma)}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${
              firmaUrl
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-surface-800 border-amber-500/30 text-amber-400'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {firmaUrl
                ? <CheckCircle2 size={16} className="text-emerald-400" />
                : <div className="w-4 h-4 rounded-full border-2 border-amber-500 animate-pulse" />
              }
              <span className="text-sm font-medium">
                {firmaUrl ? '✓ Firma del cliente registrada' : 'Pendiente — Toca para firmar'}
              </span>
            </div>
            <ChevronDown size={14} className={`transition-transform ${mostrarFirma ? 'rotate-180' : ''}`} />
          </button>

          {/* Pad de firma */}
          {mostrarFirma && ticket && (
            <div className="bg-surface-800/60 border border-slate-700 rounded-2xl p-4 animate-fade-in">
              <p className="text-xs text-slate-400 mb-3 text-center">
                Firma en el área de abajo — el cliente puede usar el dedo o el mouse
              </p>
              <SignaturePad
                ticketId={ticket.id}
                tecnicoId={user?.profile?.id ?? ''}
                onFirmada={(url, dataUrl) => {
                  setFirmaUrl(url)
                  setFirmaDataUrl(dataUrl)
                  setMostrarFirma(false)
                  toast.success('Firma registrada correctamente.')
                }}
              />
              {firmaUrl && (
                <button onClick={() => { setFirmaUrl(null); setFirmaDataUrl(null) }}
                  className="mt-2 w-full text-xs text-red-400/70 hover:text-red-400 transition-colors text-center py-1">
                  Borrar firma y volver a firmar
                </button>
              )}
            </div>
          )}

          {/* Preview de la firma */}
          {firmaUrl && !mostrarFirma && (
            <div className="bg-white/5 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
              <img src={firmaUrl} alt="Firma del cliente" className="h-12 w-auto object-contain bg-white rounded-lg p-1" />
              <div>
                <p className="text-xs font-medium text-emerald-400">Firma registrada</p>
                <button onClick={() => setMostrarFirma(true)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  Volver a firmar
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* ── Botón de generación ────────────────────────── */}
        <div className="space-y-3 pt-2">
          {!firmaUrl && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-amber-400 shrink-0" />
              <p className="text-xs text-amber-400">Se requiere la firma del cliente para generar el reporte.</p>
            </div>
          )}

          <button
            id="btn-generar-reporte"
            onClick={handleGuardarReporte}
            disabled={guardando || !resumen.trim() || !firmaUrl}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all text-sm shadow-glow/40 hover:shadow-glow"
          >
            {guardando ? (
              <><Loader2 size={18} className="animate-spin" /> Generando PDF y subiendo fotos...</>
            ) : (
              <><FileText size={18} /> Generar Reporte PDF y Cerrar Ticket</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
