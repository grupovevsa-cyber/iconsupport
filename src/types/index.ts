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
  numero_ticket?: number;
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
  tareas?: Tarea[];
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

// ── Empresa / Cliente ─────────────────────────────────────
export interface Empresa {
  id: string;
  nombre: string;
  rfc?: string;
  direccion?: string;
  telefono?: string;
  creado_en: string;
  actualizado_en: string;
}

// ── Sucursal / Local ──────────────────────────────────────
export interface Sucursal {
  id: string;
  empresa_id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  creado_en: string;
  actualizado_en: string;
  // Relación
  empresa?: Empresa;
}

// ── Equipo ────────────────────────────────────────────────
export interface Equipo {
  id: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  descripcion?: string;
  creado_en: string;
  actualizado_en: string;
}

// ── Imagen de reporte ─────────────────────────────────────
export interface ImagenReporte {
  id: string;
  reporte_id: string;
  url: string;
  descripcion?: string;
  orden: number;
  creado_en: string;
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
  // Campos extendidos
  empresa_id?: string;
  sucursal_id?: string;
  equipos_ids?: string[];
  supervisor_cliente?: string;
  creado_en: string;
  // Relaciones
  ticket?: Ticket;
  tecnico?: Profile;
  empresa?: Empresa;
  sucursal?: Sucursal;
  imagenes?: ImagenReporte[];
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

// ── Tareas de ticket ──────────────────────────────────────
export type TareaEstado = 'abierta' | 'completada' | 'cerrada';

export interface Tarea {
  id: string;
  ticket_id: string;
  tecnico_id?: string;
  titulo: string;
  descripcion?: string;
  estado: TareaEstado;
  creado_en: string;
  actualizado_en: string;
  // Relaciones
  tecnico?: Profile;
}
