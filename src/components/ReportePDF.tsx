import React, { useState } from 'react'
import { FileText, Loader2, Download, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { SignaturePad } from './SignaturePad'
import { generarReportePDF } from '../lib/pdf-generator'
import { supabase } from '../lib/supabaseClient'
import type { Ticket, Asistencia, Profile } from '../types'

// ============================================================
// Componente: ReportePDF
// Formulario de cierre + firma + generación de PDF
// ============================================================

interface ReportePDFProps {
  ticket: Ticket
  tecnico: Profile
  cliente: Profile
  asistencia?: Asistencia
  onReporteCreado?: (pdfUrl: string) => void
}

export function ReportePDF({ ticket, tecnico, cliente, asistencia, onReporteCreado }: ReportePDFProps) {
  const [resumen, setResumen] = useState('')
  const [materiales, setMateriales] = useState('')
  const [horasTrabajadas, setHorasTrabajadas] = useState('')
  const [firmaUrl, setFirmaUrl] = useState<string | null>(null)
  const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mostrarFirma, setMostrarFirma] = useState(false)

  const handleFirmada = (url: string, dataUrl: string) => {
    setFirmaUrl(url)
    setFirmaDataUrl(dataUrl)
    setMostrarFirma(false)
  }

  const handleGenerarPDF = async () => {
    if (!resumen.trim()) {
      setError('Por favor escribe el resumen del trabajo realizado.')
      return
    }
    if (!firmaUrl || !firmaDataUrl) {
      setError('Se requiere la firma del cliente para generar el reporte.')
      return
    }

    setGenerando(true)
    setError(null)

    try {
      // 1. Generar PDF y subir a Supabase Storage
      const url = await generarReportePDF({
        ticket,
        tecnico,
        cliente,
        asistencia,
        firmaDataUrl,
        reporte: {
          resumen_trabajo: resumen,
          materiales_usados: materiales || undefined,
          horas_trabajadas: horasTrabajadas ? parseFloat(horasTrabajadas) : undefined,
          firma_cliente_url: firmaUrl,
        },
      })

      // 2. Guardar reporte en la BD
      const { error: dbErr } = await supabase
        .from('visitas_reportes')
        .insert({
          ticket_id: ticket.id,
          asistencia_id: asistencia?.id || null,
          tecnico_id: tecnico.id,
          resumen_trabajo: resumen,
          materiales_usados: materiales || null,
          horas_trabajadas: horasTrabajadas ? parseFloat(horasTrabajadas) : null,
          firma_cliente_url: firmaUrl,
          pdf_reporte_url: url,
        })

      if (dbErr) throw new Error(dbErr.message)

      // 3. Cerrar el ticket automáticamente
      await supabase
        .from('tickets')
        .update({ estado: 'cerrado' })
        .eq('id', ticket.id)

      setPdfUrl(url)
      onReporteCreado?.(url)
    } catch (err: any) {
      setError(`Error al generar el reporte: ${err.message}`)
    } finally {
      setGenerando(false)
    }
  }

  if (pdfUrl) {
    return (
      <div className="flex flex-col items-center gap-5 py-6 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-white">¡Reporte Generado!</h3>
          <p className="text-sm text-slate-400 mt-1">
            El ticket ha sido cerrado y el PDF está listo.
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="btn-descargar-pdf"
            className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-glow/50 hover:shadow-glow text-sm"
          >
            <Download size={16} />
            Descargar PDF
          </a>
        </div>
        <p className="text-xs text-slate-600 text-center font-mono max-w-full truncate px-2">
          {pdfUrl}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-brand-400" />
        <h3 className="font-bold text-white">Reporte de Cierre de Servicio</h3>
      </div>

      {/* Info del ticket */}
      <div className="bg-surface-800/60 rounded-xl p-3 border border-slate-700 text-sm">
        <p className="text-slate-300 font-medium">{ticket.titulo}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Cliente: {cliente.nombre} · Técnico: {tecnico.nombre}
        </p>
      </div>

      {/* Resumen del trabajo */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="resumen-trabajo">
          Resumen del trabajo realizado <span className="text-red-400">*</span>
        </label>
        <textarea
          id="resumen-trabajo"
          value={resumen}
          onChange={(e) => setResumen(e.target.value)}
          placeholder="Describe detalladamente el trabajo realizado: diagnóstico, reparaciones, configuraciones..."
          rows={5}
          className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 resize-none transition-all"
        />
      </div>

      {/* Materiales usados */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="materiales-usados">
          Materiales / Repuestos utilizados
        </label>
        <textarea
          id="materiales-usados"
          value={materiales}
          onChange={(e) => setMateriales(e.target.value)}
          placeholder="Ej: 1x Disco SSD 512GB, 2x RAM DDR4 8GB, pasta térmica..."
          rows={2}
          className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 resize-none transition-all"
        />
      </div>

      {/* Horas trabajadas */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="horas-trabajadas">
          Horas trabajadas
        </label>
        <input
          id="horas-trabajadas"
          type="number"
          min="0.5"
          max="24"
          step="0.5"
          value={horasTrabajadas}
          onChange={(e) => setHorasTrabajadas(e.target.value)}
          placeholder="Ej: 2.5"
          className="w-full bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
        />
      </div>

      {/* Sección de firma */}
      <div className="border border-slate-700 rounded-2xl overflow-hidden">
        <button
          id="btn-toggle-firma"
          onClick={() => setMostrarFirma(!mostrarFirma)}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface-800 hover:bg-surface-700 transition-colors text-sm"
        >
          <div className="flex items-center gap-2">
            {firmaUrl ? (
              <CheckCircle2 size={16} className="text-emerald-400" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
            )}
            <span className={firmaUrl ? 'text-emerald-400 font-medium' : 'text-slate-300'}>
              {firmaUrl ? 'Firma del cliente registrada ✓' : 'Firma del cliente (requerida)'}
            </span>
          </div>
          {mostrarFirma ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {mostrarFirma && (
          <div className="p-4 bg-surface-900/50 border-t border-slate-700">
            <SignaturePad
              ticketId={ticket.id}
              tecnicoId={tecnico.id}
              onFirmada={handleFirmada}
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm animate-slide-up">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Botón generar PDF */}
      <button
        id="btn-generar-pdf"
        onClick={handleGenerarPDF}
        disabled={generando || !resumen.trim() || !firmaUrl}
        className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-glow/50 hover:shadow-glow text-sm"
      >
        {generando ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Generando reporte PDF...
          </>
        ) : (
          <>
            <FileText size={18} />
            Generar y Guardar Reporte PDF
          </>
        )}
      </button>

      {!firmaUrl && (
        <p className="text-xs text-center text-amber-500/70">
          ⚠️ Necesitas obtener la firma del cliente antes de generar el reporte.
        </p>
      )}
    </div>
  )
}

export default ReportePDF
