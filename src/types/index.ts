// ============================================================
// ICON Support — Tipos TypeScript globales
// ============================================================

export type UserRole = 'admin' | 'tecnico' | 'cliente';
export type TicketEstado = 'abierto' | 'en_proceso' | 'cerrado';
export type TicketPrioridad = 'baja' | 'media' | 'alta';

// ── Perfil de usuario ─────────────────────────────────────
export interface Profile {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  avatar_url?: string;
  telefono?: string;
  creado_en: string;
  actualizado_en: string;
}

// ── Ticket ────────────────────────────────────────────────
export interface Ticket {
  id: string;
  titulo: string;
  descripcion?: string;
  estado: TicketEstado;
  prioridad: TicketPrioridad;
  categoria?: string;
  cliente_id: string;
  tecnico_asignado_id?: string;
  qr_code_data?: string;
  notas_internas?: string;
  creado_en: string;
  actualizado_en: string;
  // Relaciones (joins)
  cliente?: Profile;
  tecnico_asignado?: Profile;
  comentarios?: ComentarioTicket[];
}

// ── Formulario de creación de ticket ─────────────────────
export interface NuevoTicketForm {
  titulo: string;
  descripcion: string;
  prioridad: TicketPrioridad;
  categoria: string;
}

// ── Asistencia (Check-in / Check-out) ────────────────────
export interface Asistencia {
  id: string;
  tecnico_id: string;
  ticket_id?: string;
  // Check-in
  hora_entrada: string;
  latitud_entrada?: number;
  longitud_entrada?: number;
  direccion_entrada?: string;
  // Check-out
  hora_salida?: string;
  latitud_salida?: number;
  longitud_salida?: number;
  direccion_salida?: string;
  // Metadata
  notas?: string;
  duracion_minutos?: number;
  creado_en: string;
  // Relaciones
  tecnico?: Profile;
  ticket?: Ticket;
}

// ── Reporte de visita ─────────────────────────────────────
export interface VisitaReporte {
  id: string;
  ticket_id: string;
  asistencia_id?: string;
  tecnico_id: string;
  resumen_trabajo: string;
  materiales_usados?: string;
  horas_trabajadas?: number;
  firma_cliente_url?: string;
  pdf_reporte_url?: string;
  enviado_email: boolean;
  creado_en: string;
  // Relaciones
  ticket?: Ticket;
  tecnico?: Profile;
}

// ── Comentario de ticket ──────────────────────────────────
export interface ComentarioTicket {
  id: string;
  ticket_id: string;
  autor_id: string;
  mensaje: string;
  es_interno: boolean;
  creado_en: string;
  autor?: Profile;
}

// ── Coordenadas GPS ───────────────────────────────────────
export interface Coordenadas {
  latitud: number;
  longitud: number;
  precision?: number;
}

// ── Estadísticas del dashboard ────────────────────────────
export interface TicketStats {
  total: number;
  abiertos: number;
  en_proceso: number;
  cerrados: number;
}

// ── Auth ──────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
}
