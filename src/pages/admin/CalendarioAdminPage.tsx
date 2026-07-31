import React from 'react'
import { Calendar } from 'lucide-react'
import type { Profile } from '../../types'
import { CalendarioVisitas } from '../tecnico/components/CalendarioVisitas'

interface CalendarioAdminPageProps {
  currentUser: Profile
}

export function CalendarioAdminPage({ currentUser }: CalendarioAdminPageProps) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="text-brand-400" size={28} />
          Calendario de Visitas
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Programa y gestiona las visitas técnicas de todo el equipo
        </p>
      </div>

      <div className="bg-surface-900 border border-slate-800 rounded-2xl p-5">
        <CalendarioVisitas currentUser={currentUser} />
      </div>
    </div>
  )
}
