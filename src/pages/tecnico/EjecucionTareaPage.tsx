import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Upload, Trash2, CheckCircle2, ChevronDown, AlertCircle, Loader2, FileText, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase, uploadFile } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'
import { SignaturePad } from '../../components/SignaturePad'
import { generarTareaPDF } from '../../lib/pdf-tarea-generator'
import type { Tarea, Profile } from '../../types'

export function EjecucionTareaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [tarea, setTarea] = useState<Tarea | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // Fotos
  const [fotos, setFotos] = useState<Array<{ file: File; preview: string; descripcion: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const camaraInputRef = useRef<HTMLInputElement>(null)

  // Firma
  const [mostrarFirma, setMostrarFirma] = useState(false)
  const [firmaUrl, setFirmaUrl] = useState<string | null>(null)
  const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(null)

  useEffect(() => {
    cargarTarea()
  }, [id])

  const cargarTarea = async () => {
    try {
      const { data, error } = await supabase
        .from('tareas')
        .select(`
          *,
          tecnico:tecnico_id (*)
        `)
        .eq('id', id)
        .single()
        
      if (error) throw error
      setTarea(data)
    } catch (error) {
      console.error('Error al cargar tarea:', error)
      toast.error('No se pudo cargar la tarea.')
      navigate(-1)
    } finally {
      setCargando(false)
    }
  }

  const agregarFotos = (files: FileList | null) => {
    if (!files) return
    const nuevas = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      descripcion: ''
    }))
    setFotos(prev => [...prev, ...nuevas].slice(0, 10)) // Max 10
  }

  const eliminarFoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleFinalizarTarea = async () => {
    if (!tarea || !user?.profile || !firmaDataUrl) return
    setGuardando(true)

    try {
      // 1. Subir firma (es un blob/base64 de canvas, ya se subió temporalmente o podemos subirlo de nuevo)
      // Como SignaturePad ya devolvió firmaUrl, usamos eso si está en storage. Pero pdf-generator usa DataURL para el pdf directamente.
      
      // 2. Subir Fotos
      const fotosSubidas = []
      let orden = 1
      for (const f of fotos) {
        const ext = f.file.name.split('.').pop()
        const path = `tareas/${tarea.id}/foto_${Date.now()}.${ext}`
        const url = await uploadFile('reportes_fotos', path, f.file, f.file.type)
        fotosSubidas.push({ url, descripcion: f.descripcion })
        
        // Guardar en DB
        await supabase.from('imagenes_reporte').insert({
          tarea_id: tarea.id,
          url,
          descripcion: f.descripcion,
          orden: orden++
        })
      }

      // 3. Generar PDF con QR
      const pdfUrl = await generarTareaPDF({
        tarea,
        tecnico: user.profile,
        firmaSupervisorUrl: firmaDataUrl,
        fotos: fotosSubidas
      })

      // 4. Actualizar estado de Tarea
      const { error: updErr } = await supabase.from('tareas').update({
        estado: 'completada',
        pdf_url: pdfUrl,
        firma_supervisor: firmaUrl
      }).eq('id', tarea.id)

      if (updErr) throw updErr

      toast.success('Tarea completada y certificado PDF generado exitosamente.')
      navigate('/tecnico')

    } catch (err: any) {
      console.error('Error al finalizar:', err)
      toast.error('Hubo un problema al finalizar la tarea: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <div className="p-8 text-center text-slate-400">Cargando...</div>
  if (!tarea) return null

  return (
    <div className="min-h-screen bg-surface-950 pb-24">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-surface-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-surface-800 text-slate-400 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs text-slate-500">Culminación de Tarea</p>
            <p className="text-sm font-bold text-white truncate">{tarea.titulo}</p>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Info de Tarea */}
        <div className="bg-surface-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">{tarea.titulo}</h2>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase
              ${tarea.prioridad === 'alta' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                tarea.prioridad === 'media' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
              {tarea.prioridad}
            </span>
          </div>
          {tarea.descripcion && (
            <p className="text-sm text-slate-400 bg-surface-800 p-3 rounded-xl">{tarea.descripcion}</p>
          )}
        </div>

        {/* Fotos */}
        <section className="bg-surface-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-brand-400 mb-4 flex items-center gap-2">
            <Camera size={16} /> Evidencia Fotográfica ({fotos.length}/10)
          </h3>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button type="button" onClick={() => camaraInputRef.current?.click()} disabled={fotos.length >= 10}
              className="flex items-center justify-center gap-2 bg-surface-800 hover:bg-surface-700 border border-slate-700 hover:border-brand-500/40 text-slate-300 py-3 rounded-xl text-sm transition-all disabled:opacity-40">
              <Camera size={15} className="text-brand-400" /> Usar Cámara
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={fotos.length >= 10}
              className="flex items-center justify-center gap-2 bg-surface-800 hover:bg-surface-700 border border-slate-700 hover:border-brand-500/40 text-slate-300 py-3 rounded-xl text-sm transition-all disabled:opacity-40">
              <Upload size={15} className="text-brand-400" /> Adjuntar
            </button>
          </div>
          
          <input ref={camaraInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={e => agregarFotos(e.target.files)} />
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => agregarFotos(e.target.files)} />

          {fotos.length === 0 ? (
            <div className="border-2 border-dashed border-slate-800 rounded-xl py-6 text-center">
              <ImageIcon size={26} className="text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Añade fotos para respaldar el trabajo</p>
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
        </section>

        {/* Firma */}
        <section className="bg-surface-900 border border-slate-800 rounded-2xl p-4">
           <h3 className="text-sm font-bold text-brand-400 mb-2 flex items-center gap-2">
            <CheckCircle2 size={16} /> Firma de Conformidad
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            El supervisor debe firmar para cerrar la tarea. Esta firma irá en el certificado PDF.
          </p>

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
                {firmaUrl ? '✓ Firma registrada' : 'Pendiente — Toca para firmar'}
              </span>
            </div>
            <ChevronDown size={14} className={`transition-transform ${mostrarFirma ? 'rotate-180' : ''}`} />
          </button>

          {mostrarFirma && (
            <div className="mt-3 bg-surface-800/60 border border-slate-700 rounded-2xl p-4 animate-fade-in">
              <SignaturePad
                ticketId={tarea.id}
                tecnicoId={user?.profile?.id ?? ''}
                onFirmada={(url: string, dataUrl: string) => {
                  setFirmaUrl(url)
                  setFirmaDataUrl(dataUrl)
                  setMostrarFirma(false)
                  toast.success('Firma registrada')
                }}
              />
            </div>
          )}
          {firmaUrl && !mostrarFirma && (
            <div className="mt-3 bg-white/5 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
              <img src={firmaUrl} alt="Firma del cliente" className="h-12 w-auto object-contain bg-white rounded-lg p-1" />
            </div>
          )}
        </section>

        {/* Acciones */}
        <div className="pt-4">
          {!firmaUrl && (
            <div className="flex items-center gap-2 mb-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-amber-400 shrink-0" />
              <p className="text-xs text-amber-400">Se requiere la firma del supervisor para completar la tarea.</p>
            </div>
          )}

          <button
            onClick={handleFinalizarTarea}
            disabled={guardando || !firmaUrl}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all text-sm shadow-glow/40 hover:shadow-glow"
          >
            {guardando ? (
              <><Loader2 size={18} className="animate-spin" /> Finalizando Tarea...</>
            ) : (
              <><FileText size={18} /> Finalizar Tarea y Generar Certificado</>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
