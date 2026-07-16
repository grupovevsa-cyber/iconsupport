import React, { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Pen, Trash2, Check, Loader2, AlertCircle } from 'lucide-react'
import { uploadFile } from '../lib/supabaseClient'

// ============================================================
// Componente: SignaturePad
// Lienzo de firma digital con guardado en Supabase Storage
// ============================================================

interface SignaturePadProps {
  ticketId: string
  tecnicoId: string
  onFirmada?: (firmaUrl: string, firmaDataUrl: string) => void
  className?: string
}

export function SignaturePad({ ticketId, tecnicoId, onFirmada, className = '' }: SignaturePadProps) {
  const canvasRef = useRef<SignatureCanvas>(null)
  const [vacio, setVacio] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firmaUrl, setFirmaUrl] = useState<string | null>(null)

  const handleBegin = () => setVacio(false)

  const limpiar = () => {
    canvasRef.current?.clear()
    setVacio(true)
    setGuardado(false)
    setError(null)
    setFirmaUrl(null)
  }

  const guardarFirma = async () => {
    if (!canvasRef.current || vacio) return

    setGuardando(true)
    setError(null)

    try {
      // Obtener firma como data URL (base64 PNG)
      const dataUrl = canvasRef.current.toDataURL('image/png')

      // Convertir data URL a Blob
      const resp = await fetch(dataUrl)
      const blob = await resp.blob()

      // Subir a Supabase Storage
      const fileName = `firma_${ticketId}_${tecnicoId}_${Date.now()}.png`
      const path = `tickets/${ticketId}/${fileName}`
      const publicUrl = await uploadFile('firmas', path, blob, 'image/png')

      setFirmaUrl(publicUrl)
      setGuardado(true)
      onFirmada?.(publicUrl, dataUrl)
    } catch (err: any) {
      setError(`Error al guardar firma: ${err.message}`)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Pen size={16} className="text-brand-400" />
        <span className="text-sm font-semibold text-slate-300">Firma del Cliente</span>
        {guardado && (
          <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <Check size={11} />
            Guardada
          </span>
        )}
      </div>

      {/* Instrucción */}
      <p className="text-xs text-slate-500">
        Por favor, firme en el recuadro de abajo con su dedo o stylus para confirmar la recepción del servicio.
      </p>

      {/* Canvas de firma */}
      <div
        className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
          guardado
            ? 'border-emerald-500/40 bg-white'
            : 'border-dashed border-slate-600 hover:border-brand-500/60 bg-white'
        }`}
        style={{ touchAction: 'none' }}  // Evita scroll al firmar en móvil
      >
        <SignatureCanvas
          ref={canvasRef}
          penColor="#1e1b4b"
          canvasProps={{
            id: 'signature-canvas',
            width: 500,
            height: 200,
            style: { width: '100%', height: '180px', display: 'block', cursor: 'crosshair' },
          }}
          onBegin={handleBegin}
        />

        {/* Placeholder cuando está vacío */}
        {vacio && !guardado && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <Pen size={24} className="text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">Firme aquí</p>
          </div>
        )}

        {/* Overlay de guardado */}
        {guardando && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-brand-600 font-medium">
              <Loader2 size={20} className="animate-spin" />
              Guardando firma...
            </div>
          </div>
        )}

        {/* Borde inferior decorativo */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-500/30 to-transparent pointer-events-none" />
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button
          id="btn-limpiar-firma"
          onClick={limpiar}
          disabled={guardando || (vacio && !guardado)}
          className="flex items-center gap-2 px-4 py-2.5 bg-surface-800 hover:bg-surface-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-sm font-medium rounded-xl border border-slate-700 hover:border-slate-600 transition-all duration-200"
        >
          <Trash2 size={15} />
          Limpiar
        </button>

        <button
          id="btn-guardar-firma"
          onClick={guardarFirma}
          disabled={guardando || vacio || guardado}
          className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-glow/30 hover:shadow-glow"
        >
          {guardando ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Guardando...
            </>
          ) : guardado ? (
            <>
              <Check size={15} className="text-emerald-300" />
              <span className="text-emerald-300">Firma registrada</span>
            </>
          ) : (
            <>
              <Check size={15} />
              Aceptar Firma
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* URL de la firma guardada */}
      {firmaUrl && (
        <div className="text-xs text-slate-600 font-mono bg-surface-900/50 rounded-lg px-2 py-1.5 truncate">
          ✅ {firmaUrl.substring(0, 60)}...
        </div>
      )}
    </div>
  )
}

export default SignaturePad
