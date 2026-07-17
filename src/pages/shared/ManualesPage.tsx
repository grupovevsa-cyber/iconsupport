import React from 'react'
import {
  BookOpen, Download, ExternalLink,
  Shield, User, MessageCircle, Zap, ClipboardList, Info, Play, Video
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

// ============================================================
// Página: Manuales y Centro de Ayuda
// ============================================================

export function ManualesPage() {
  const { user } = useAuth()
  const rol = user?.profile?.rol || 'cliente'

  const manuales = [
    {
      id: 'cliente',
      title: 'Manual de Usuario (Cliente / Invitado)',
      subtitle: 'Para usuarios que reportan incidentes y solicitan asistencia técnica.',
      desc: 'Aprende a crear tickets con y sin inicio de sesión, realizar el seguimiento de tu caso escaneando el código QR exclusivo y consultar informes de servicio.',
      urlHtml: '/manuals/manual_cliente.html',
      urlPdf: '/manuals/manual_cliente.pdf',
      roles: ['cliente', 'tecnico', 'admin'],
      color: 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5',
      textColor: 'text-emerald-400',
      badgeColor: 'bg-emerald-500/15 text-emerald-400',
      icon: <User size={20} className="text-emerald-400" />
    },
    {
      id: 'tecnico',
      title: 'Manual Técnico Operativo',
      subtitle: 'Para personal técnico encargado de la resolución y reportes.',
      desc: 'Guía detallada sobre el control de asistencia con GPS, visualización de tareas asignadas, subida de fotos de evidencia y captura de firmas en la hoja de servicio digital.',
      urlHtml: '/manuals/manual_tecnico.html',
      urlPdf: '/manuals/manual_tecnico.pdf',
      roles: ['tecnico', 'admin'],
      color: 'border-brand-500/20 hover:border-brand-500/40 bg-brand-500/5',
      textColor: 'text-brand-400',
      badgeColor: 'bg-brand-500/15 text-brand-400',
      icon: <ClipboardList size={20} className="text-brand-400" />
    },
    {
      id: 'admin',
      title: 'Manual de Administrador del Sistema',
      subtitle: 'Gestión total de la infraestructura, personal y chatbot de IA.',
      desc: 'Instrucciones avanzadas para gestionar usuarios y roles, asignar clientes a tickets de invitados, configurar credenciales API (WhatsApp, Gemini, Resend) y entrenar el Bot inteligente.',
      urlHtml: '/manuals/manual_administrador.html',
      urlPdf: '/manuals/manual_administrador.pdf',
      roles: ['admin'],
      color: 'border-purple-500/20 hover:border-purple-500/40 bg-purple-500/5',
      textColor: 'text-purple-400',
      badgeColor: 'bg-purple-500/15 text-purple-400',
      icon: <Shield size={20} className="text-purple-400" />
    }
  ]

  // Filtrar según el rol del usuario
  const manualesVisibles = manuales.filter(m => m.roles.includes(rol))

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <BookOpen size={20} className="text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Manuales y Documentación</h1>
            <p className="text-sm text-slate-400 mt-1">Guías detalladas de uso del sistema según tu nivel de acceso</p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-surface-900 border border-slate-800 rounded-2xl p-4 flex gap-3 items-start">
        <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          Puedes consultar los manuales interactivos en línea directamente desde tu navegador en formato responsive, o descargarlos en formato PDF de alta calidad para guardarlos o imprimirlos.
        </p>
      </div>

      {/* Video Instructivo */}
      <div className="bg-surface-900 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all duration-300">
        <div className="flex items-center gap-2 mb-4">
          <Video size={18} className="text-brand-400" />
          <h2 className="text-base font-bold text-white">Video Tutorial para Clientes</h2>
        </div>
        
        <div className="grid lg:grid-cols-5 gap-6 items-center">
          {/* Player */}
          <div className="lg:col-span-3 aspect-video bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800 group shadow-lg">
            <video
              className="w-full h-full object-cover relative z-10"
              controls
              poster="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80"
            >
              <source src="/manuals/video_cliente.mp4" type="video/mp4" />
              Tu navegador no soporta reproductor de video.
            </video>
            <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center z-0 pointer-events-none group-hover:bg-slate-950/20 transition-all duration-300">
              <div className="w-14 h-14 rounded-full bg-brand-500/90 text-white flex items-center justify-center shadow-glow transition-all duration-300 group-hover:scale-110">
                <Play size={20} className="fill-white translate-x-0.5" />
              </div>
            </div>
          </div>

          {/* Guía Rápida */}
          <div className="lg:col-span-2 space-y-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Guía Rápida de Reporte</span>
            <div className="space-y-3">
              {[
                { step: '1', title: 'Escanea el Código QR', desc: 'Abre la cámara de tu celular y escanea el código QR de soporte técnico pegado en tu equipo o haz clic en el enlace público.' },
                { step: '2', title: 'Llénalo en Segundos', desc: 'Si entras como invitado, ingresa tu información de contacto e indica detalladamente la falla física o de software.' },
                { step: '3', title: 'Obtén tu QR de Seguimiento', desc: 'Al finalizar la carga, guarda el código QR único generado. Te servirá para consultar el avance del soporte en tiempo real.' },
                { step: '4', title: 'Firma de Conformidad', desc: 'Al concluir la visita del técnico, firma en su pantalla para cerrar el ticket y recibir tu reporte de servicio en tu correo.' }
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{step}</div>
                  <div>
                    <h4 className="text-xs font-semibold text-white leading-tight">{title}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Manuales */}
      <div className="grid md:grid-cols-2 gap-6">
        {manualesVisibles.map(manual => (
          <div
            key={manual.id}
            className={`border rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-card ${manual.color}`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-surface-800 flex items-center justify-center">
                  {manual.icon}
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${manual.badgeColor}`}>
                  {manual.id}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white leading-tight mb-1">{manual.title}</h3>
              <p className="text-xs text-slate-400 font-medium mb-3 leading-snug">{manual.subtitle}</p>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">{manual.desc}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800/40">
              <a
                href={manual.urlHtml}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-surface-800 hover:bg-surface-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              >
                <ExternalLink size={13} />
                Ver en Línea
              </a>
              <a
                href={manual.urlPdf}
                download
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-glow/10"
              >
                <Download size={13} />
                Descargar PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
