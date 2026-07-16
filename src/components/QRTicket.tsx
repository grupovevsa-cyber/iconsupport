import React, { useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { Download, QrCode, Copy, Check, ExternalLink } from 'lucide-react'

// ============================================================
// Componente: QRTicket
// Genera y muestra el código QR de un ticket
// ============================================================

interface QRTicketProps {
  ticketId: string
  qrData?: string    // URL completa, si ya existe en la BD
  titulo?: string
  className?: string
  size?: number
}

export function QRTicket({ ticketId, qrData, titulo, className = '', size = 200 }: QRTicketProps) {
  const qrRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
  const url = qrData || `${appUrl}/ticket/seguimiento/${ticketId}`

  /** Descarga el QR como imagen PNG */
  const descargarQR = () => {
    const svgEl = qrRef.current?.querySelector('svg')
    if (!svgEl) return

    const svgData = new XMLSerializer().serializeToString(svgEl)
    const canvas = document.createElement('canvas')
    const padding = 24
    canvas.width = size + padding * 2
    canvas.height = size + padding * 2

    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, padding, padding, size, size)
      const a = document.createElement('a')
      a.download = `qr-ticket-${ticketId.substring(0, 8)}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  /** Copia la URL al portapapeles */
  const copiarUrl = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {
      // Fallback para navegadores sin clipboard API
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 text-brand-400">
        <QrCode size={18} />
        <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Código QR del Ticket
        </span>
      </div>

      {/* QR Code */}
      <div
        ref={qrRef}
        className="bg-white p-4 rounded-2xl shadow-glow ring-2 ring-brand-500/30 transition-all duration-300 hover:shadow-glow-lg hover:ring-brand-400/50"
      >
        <QRCode
          value={url}
          size={size}
          level="H"
          fgColor="#0f172a"
          bgColor="#ffffff"
        />
      </div>

      {/* Título del ticket */}
      {titulo && (
        <p className="text-center text-sm font-medium text-slate-300 max-w-[220px] truncate">
          {titulo}
        </p>
      )}

      {/* ID del ticket */}
      <div className="bg-surface-800/50 rounded-lg px-3 py-1.5 border border-slate-700">
        <span className="text-xs font-mono text-slate-400">
          #{ticketId.substring(0, 12).toUpperCase()}
        </span>
      </div>

      {/* URL del QR (truncada) */}
      <div className="w-full bg-surface-900 rounded-lg px-3 py-2 border border-slate-700 text-xs text-slate-500 font-mono truncate text-center">
        {url}
      </div>

      {/* Acciones */}
      <div className="flex gap-2 w-full">
        <button
          id={`btn-copiar-qr-${ticketId.substring(0, 8)}`}
          onClick={copiarUrl}
          className="flex-1 flex items-center justify-center gap-2 bg-surface-800 hover:bg-surface-700 text-slate-300 text-sm font-medium py-2.5 px-4 rounded-xl border border-slate-700 hover:border-brand-500/50 transition-all duration-200 group"
        >
          {copied ? (
            <>
              <Check size={15} className="text-green-400" />
              <span className="text-green-400">¡Copiado!</span>
            </>
          ) : (
            <>
              <Copy size={15} className="group-hover:text-brand-400 transition-colors" />
              Copiar URL
            </>
          )}
        </button>

        <button
          id={`btn-descargar-qr-${ticketId.substring(0, 8)}`}
          onClick={descargarQR}
          className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-all duration-200 shadow-glow/50 hover:shadow-glow"
        >
          <Download size={15} />
          Descargar QR
        </button>
      </div>

      {/* Enlace de seguimiento */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
      >
        <ExternalLink size={12} />
        Ver página de seguimiento
      </a>
    </div>
  )
}

export default QRTicket
