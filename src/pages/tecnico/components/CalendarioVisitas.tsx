import React, { useState, useMemo, useEffect } from 'react'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth,
  isSameDay, isToday, addWeeks, subWeeks, parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Plus, FileText } from 'lucide-react'
import type { VisitaProgramada, Profile } from '../../../types'
import { useVisitasProgramadas } from '../../../hooks/useVisitasProgramadas'
import { ProgramarVisitaModal } from './ProgramarVisitaModal'

interface CalendarioVisitasProps {
  currentUser: Profile
}

export function CalendarioVisitas({ currentUser }: CalendarioVisitasProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')
  
  const { visitas, loading, fetchVisitas } = useVisitasProgramadas()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedVisita, setSelectedVisita] = useState<VisitaProgramada | null>(null)

  useEffect(() => {
    // Si es admin ve todas. Si es tecnico ve las asignadas a el y creadas por el.
    // Como las politicas de la DB ya filtran esto, simplemente llamamos fetchVisitas sin filtros
    // y la base de datos devolvera lo que le corresponde ver a cada quien (gracias al RLS).
    
    // Rango de fechas a buscar para optimizar (mes anterior a mes siguiente aprox)
    const desde = startOfMonth(subMonths(currentDate, 1)).toISOString()
    const hasta = endOfMonth(addMonths(currentDate, 1)).toISOString()
    
    fetchVisitas({ desde, hasta })
  }, [currentDate, fetchVisitas])

  // Navegación
  const next = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1))
    else setCurrentDate(addWeeks(currentDate, 1))
  }
  
  const prev = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1))
    else setCurrentDate(subWeeks(currentDate, 1))
  }
  
  const goToday = () => setCurrentDate(new Date())

  // Días a renderizar en el grid
  const days = useMemo(() => {
    const start = view === 'month' ? startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }) : startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = view === 'month' ? endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }) : endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [currentDate, view])

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
    setSelectedVisita(null) // Nuevo
    setIsModalOpen(true)
  }

  const handleVisitaClick = (e: React.MouseEvent, visita: VisitaProgramada) => {
    e.stopPropagation()
    setSelectedVisita(visita)
    setIsModalOpen(true)
  }

  // Agrupar visitas por día para fácil acceso en render
  const visitasPorDia = useMemo(() => {
    const map = new Map<string, VisitaProgramada[]>()
    visitas.forEach((v: VisitaProgramada) => {
      const fecha = format(parseISO(v.fecha_inicio), 'yyyy-MM-dd')
      if (!map.has(fecha)) map.set(fecha, [])
      map.get(fecha)!.push(v)
    })
    return map
  }, [visitas])

  const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] bg-surface-900 border border-slate-700 rounded-2xl overflow-hidden animate-fade-in">
      
      {/* Header (Controles del Calendario) */}
      <div className="p-4 border-b border-slate-700 bg-surface-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white capitalize w-48">
            {format(currentDate, view === 'month' ? 'MMMM yyyy' : "'Semana de' d MMM", { locale: es })}
          </h2>
          <div className="flex bg-surface-900 rounded-lg p-1 border border-slate-700">
            <button onClick={prev} className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-700 transition-colors"><ChevronLeft size={18}/></button>
            <button onClick={goToday} className="px-3 py-1 text-sm text-slate-300 hover:text-white font-medium hover:bg-slate-700 rounded-md transition-colors">Hoy</button>
            <button onClick={next} className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-700 transition-colors"><ChevronRight size={18}/></button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-900 rounded-lg p-1 border border-slate-700">
            <button 
              onClick={() => setView('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'month' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Mes
            </button>
            <button 
              onClick={() => setView('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'week' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Semana
            </button>
          </div>
          
          <button 
            onClick={() => handleDayClick(new Date())}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-glow/20"
          >
            <Plus size={16} />
            Nueva Cita
          </button>
        </div>
      </div>

      {/* Grid del Calendario */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Cabecera de días de la semana */}
        <div className="grid grid-cols-7 border-b border-slate-700 bg-surface-800">
          {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Celdas de días */}
        <div className={`flex-1 grid grid-cols-7 grid-rows-${view === 'month' ? (days.length / 7) : 1} overflow-y-auto`}>
          {days.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayVisitas = visitasPorDia.get(dateStr) || []
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isDayToday = isToday(day)

            return (
              <div 
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`
                  min-h-[100px] border-b border-r border-slate-800/50 p-1 flex flex-col gap-1 transition-colors cursor-pointer hover:bg-surface-800/50
                  ${!isCurrentMonth && view === 'month' ? 'bg-surface-950/50 opacity-50' : 'bg-surface-900'}
                  ${idx % 7 === 6 ? 'border-r-0' : ''}
                `}
              >
                <div className="flex justify-between items-center px-1 pt-1 mb-1">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                    ${isDayToday ? 'bg-brand-600 text-white shadow-glow/30' : 'text-slate-300'}
                  `}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                {/* Eventos */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 px-1 pb-1 custom-scrollbar">
                  {dayVisitas.map(visita => {
                    const isOwner = visita.tecnico_id === currentUser.id
                    
                    let bgColor = ''
                    if (visita.estado === 'completada') {
                      bgColor = 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-300'
                    } else if (visita.estado === 'cancelada') {
                      bgColor = 'bg-red-500/15 hover:bg-red-500/25 border-red-500/30 text-red-300 line-through opacity-70'
                    } else if (isOwner) {
                      bgColor = 'bg-brand-500/20 hover:bg-brand-500/30 border-brand-500/30 text-brand-300' // Mi visita
                    } else {
                      bgColor = 'bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/30 text-purple-300' // Otro técnico
                    }
                    
                    return (
                      <div 
                        key={visita.id}
                        onClick={(e) => handleVisitaClick(e, visita)}
                        className={`text-xs px-2 py-1 rounded border truncate transition-colors ${bgColor}`}
                        title={`${visita.titulo} - ${format(parseISO(visita.fecha_inicio), 'HH:mm')}`}
                      >
                        <span className="font-semibold">{format(parseISO(visita.fecha_inicio), 'HH:mm')}</span> {visita.titulo}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {isModalOpen && (
        <ProgramarVisitaModal
          visitaExistente={selectedVisita}
          fechaInicial={selectedDate}
          onClose={() => setIsModalOpen(false)}
          onGuardado={() => {
            setIsModalOpen(false)
            fetchVisitas()
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}
