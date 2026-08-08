import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { MonitorPlay, ArrowLeft, Loader2, Maximize, AlertCircle } from 'lucide-react'

// ============================================================
// Página: Visor Remoto Web (RustDesk / Guacamole Iframe)
// ============================================================

export function VisorRemotoPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const host = searchParams.get('host')
  const pwd = searchParams.get('pwd')

  const [loading, setLoading] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)

  // Aquí configuramos la URL del servidor de RustDesk Web Client
  // En producción, esto debería apuntar a tu servidor real.
  const RUSTDESK_WEB_URL = import.meta.env.VITE_RUSTDESK_WEB_URL || 'http://localhost:2119' // URL por defecto de RustDesk Web

  // Construir URL con parámetros
  // Nota: La forma exacta de pasar host y pwd depende de cómo esté configurado tu RustDesk Web o Guacamole.
  const iframeUrl = `${RUSTDESK_WEB_URL}/?password=${encodeURIComponent(pwd || '')}&id=${encodeURIComponent(host || '')}`

  useEffect(() => {
    // Simulamos carga inicial
    const t = setTimeout(() => setLoading(false), 1500)
    return () => clearTimeout(t)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (!host) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error de Conexión</h2>
        <p className="text-slate-400 mb-6">No se proporcionó un ID de conexión (Host).</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg">Volver</button>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col overflow-hidden">
      {/* Topbar */}
      {!fullscreen && (
        <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Volver"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                <MonitorPlay size={16} className="text-brand-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">ICON Remote Helpdesk</h1>
                <p className="text-xs text-slate-500">Sesión: {host} (Ticket {id})</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Pantalla Completa"
            >
              <Maximize size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Visor Iframe */}
      <div className="flex-1 relative bg-black">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <Loader2 size={40} className="text-brand-500 animate-spin mb-4" />
            <p className="text-slate-300 font-medium animate-pulse">Conectando con el servidor remoto...</p>
            <p className="text-xs text-slate-500 mt-2">Estableciendo túnel seguro WebRTC</p>
          </div>
        )}
        
        <iframe
          src={iframeUrl}
          className="w-full h-full border-0"
          title="Remote Support Viewer"
          allow="clipboard-read; clipboard-write; display-capture; fullscreen"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  )
}
