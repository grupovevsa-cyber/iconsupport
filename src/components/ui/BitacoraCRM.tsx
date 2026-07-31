import React, { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Send, Paperclip, FileText, Image as ImageIcon, X, Loader2, Download, MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import type { BitacoraMensaje, Profile } from '../../types'

interface BitacoraCRMProps {
  ticketId?: string
  tareaId?: string
  visitaId?: string
  mensajes: BitacoraMensaje[]
  currentUser?: Profile | null
  onMensajeEnviado?: () => void
}

export function BitacoraCRM({
  ticketId,
  tareaId,
  visitaId,
  mensajes,
  currentUser,
  onMensajeEnviado
}: BitacoraCRMProps) {
  const [nuevoMensaje, setNuevoMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [esInterno, setEsInterno] = useState(false)
  const [archivos, setArchivos] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mensajesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const seleccionados = Array.from(e.target.files)
      // Filtrar tamaño (max 10MB)
      const validos = seleccionados.filter(f => f.size <= 10 * 1024 * 1024)
      if (validos.length < seleccionados.length) {
        alert('Algunos archivos superan el límite de 10MB')
      }
      setArchivos(prev => [...prev, ...validos])
    }
  }

  const removerArchivo = (index: number) => {
    setArchivos(prev => prev.filter((_, i) => i !== index))
  }

  const subirArchivos = async () => {
    const adjuntos = []
    for (const archivo of archivos) {
      const ext = archivo.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
      const filePath = `${currentUser!.id}/${fileName}`

      const { error } = await supabase.storage
        .from('adjuntos')
        .upload(filePath, archivo)

      if (error) {
        console.error('Error subiendo archivo:', error)
        // Intentar continuar de todas formas si falla un archivo
      }

      const { data: publicData } = supabase.storage
        .from('adjuntos')
        .getPublicUrl(filePath)

      adjuntos.push({
        url: publicData.publicUrl,
        nombre: archivo.name,
        tipo: archivo.type.includes('image') ? 'imagen' : 'documento',
        size: archivo.size
      })
    }
    return adjuntos
  }

  const enviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!nuevoMensaje.trim() && archivos.length === 0) || !currentUser) return

    try {
      setEnviando(true)
      const adjuntosSubidos = await subirArchivos()

      const { error } = await supabase
        .from('bitacora')
        .insert({
          ticket_id: ticketId || null,
          tarea_id: tareaId || null,
          visita_id: visitaId || null,
          autor_id: currentUser?.id,
          mensaje: nuevoMensaje.trim(),
          es_interno: esInterno,
          adjuntos: adjuntosSubidos
        })

      if (error) throw error

      setNuevoMensaje('')
      setArchivos([])
      setEsInterno(false)
      if (onMensajeEnviado) onMensajeEnviado()
    } catch (error: any) {
      console.error('Error al enviar mensaje:', error)
      alert('Error al enviar el mensaje')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface-900 border border-slate-800 rounded-xl overflow-hidden min-h-[400px] max-h-[600px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-surface-800/50 flex justify-between items-center">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <FileText size={18} className="text-brand-400" />
          Bitácora / Comunicaciones
        </h3>
        <span className="text-xs text-slate-400 bg-surface-950 px-2 py-1 rounded-full border border-slate-800">
          {mensajes.length} mensajes
        </span>
      </div>

      {/* Lista de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mensajes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <MessageCircle size={48} className="mb-4 opacity-20" />
            <p>No hay mensajes aún.</p>
            <p className="text-sm">Sé el primero en escribir.</p>
          </div>
        ) : (
          mensajes.map((msg) => {
            const esMio = currentUser ? msg.autor_id === currentUser.id : false
            const esStaff = msg.autor?.rol === 'admin' || msg.autor?.rol === 'tecnico'
            
            return (
              <div key={msg.id} className={`flex gap-3 ${esMio ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm
                  ${esStaff ? 'bg-brand-500/20 text-brand-400' : 'bg-emerald-500/20 text-emerald-400'}`}
                >
                  {msg.autor?.nombre?.charAt(0).toUpperCase() || '?'}
                </div>

                {/* Burbuja */}
                <div className={`flex flex-col max-w-[80%] ${esMio ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${esMio ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-xs font-medium text-slate-300">
                      {msg.autor?.nombre}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {format(new Date(msg.creado_en), "d MMM, HH:mm", { locale: es })}
                    </span>
                    {msg.es_interno && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-medium">
                        Interno
                      </span>
                    )}
                  </div>

                  <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm
                    ${msg.es_interno 
                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-100 rounded-tl-sm' 
                      : esMio 
                        ? 'bg-brand-600 text-white rounded-tr-sm' 
                        : 'bg-surface-800 text-slate-200 border border-slate-700 rounded-tl-sm'}`}
                  >
                    {msg.mensaje && <p className="whitespace-pre-wrap">{msg.mensaje}</p>}

                    {/* Adjuntos */}
                    {msg.adjuntos && msg.adjuntos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.adjuntos.map((adj, idx) => (
                          <a 
                            key={idx}
                            href={adj.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className={`flex items-center gap-2 p-2 rounded-lg transition-colors border ${
                              esMio ? 'bg-black/20 hover:bg-black/40 border-white/10' : 'bg-surface-900 hover:bg-surface-700 border-slate-700'
                            }`}
                          >
                            {adj.tipo === 'imagen' ? (
                              <ImageIcon size={16} className={esMio ? 'text-white/80' : 'text-brand-300'} />
                            ) : (
                              <FileText size={16} className="text-red-400" />
                            )}
                            <span className="text-xs max-w-[120px] truncate" title={adj.nombre}>
                              {adj.nombre}
                            </span>
                            <Download size={14} className="opacity-50" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={mensajesEndRef} />
      </div>

      {/* Input de Mensaje (sólo si hay usuario) */}
      {currentUser && (
        <div className="p-4 border-t border-slate-800 bg-surface-900">
          {/* Archivos previsualizados antes de enviar */}
          {archivos.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {archivos.map((file, i) => (
                <div key={i} className="flex items-center gap-2 bg-surface-800 border border-slate-700 rounded-lg px-2 py-1">
                  {file.type.includes('image') ? <ImageIcon size={14} className="text-brand-400"/> : <FileText size={14} className="text-slate-400"/>}
                  <span className="text-xs text-slate-300 max-w-[100px] truncate">{file.name}</span>
                  <button type="button" onClick={() => removerArchivo(i)} className="text-slate-500 hover:text-red-400">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={enviarMensaje} className="flex flex-col gap-2">
            {currentUser.rol !== 'cliente' && (
              <div className="flex items-center gap-2 px-2 mb-1">
                <input
                  type="checkbox"
                  id="interno"
                  checked={esInterno}
                  onChange={e => setEsInterno(e.target.checked)}
                  className="rounded border-slate-600 bg-surface-800 text-amber-500 focus:ring-amber-500/20"
                />
                <label htmlFor="interno" className="text-xs font-medium text-amber-400 cursor-pointer">
                  Nota Interna (Solo Staff)
                </label>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 shrink-0 rounded-xl bg-surface-800 text-slate-400 hover:text-brand-400 hover:bg-surface-700 transition-colors border border-slate-700"
                title="Adjuntar archivo"
              >
                <Paperclip size={20} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*,.pdf"
                className="hidden"
              />
              
              <input
                type="text"
                value={nuevoMensaje}
                onChange={e => setNuevoMensaje(e.target.value)}
                placeholder="Escribe un mensaje o nota..."
                className="flex-1 bg-surface-800 border border-slate-700 rounded-xl px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />

              <button
                type="submit"
                disabled={enviando || (!nuevoMensaje.trim() && archivos.length === 0)}
                className="p-3 shrink-0 rounded-xl bg-brand-600 text-white hover:bg-brand-500 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {enviando ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
