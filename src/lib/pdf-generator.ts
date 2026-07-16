import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase, uploadFile } from './supabaseClient'
import type { Ticket, Asistencia, VisitaReporte, Profile } from '../types'

// ============================================================
// ICON Support — Generador de PDF de Reporte Técnico
// Usa jsPDF + jspdf-autotable
// ============================================================

interface PdfReporteData {
  ticket: Ticket
  asistencia?: Asistencia
  reporte: Partial<VisitaReporte>
  tecnico: Profile
  cliente: Profile
  firmaDataUrl?: string  // base64 PNG de la firma del cliente
}

// Colores de la marca
const BRAND = {
  primary:  [79, 70, 229] as [number, number, number],  // #4f46e5
  dark:     [15, 23, 42]  as [number, number, number],  // #0f172a
  gray:     [100, 116, 139] as [number, number, number], // slate-500
  lightBg:  [241, 245, 249] as [number, number, number], // slate-100
  white:    [255, 255, 255] as [number, number, number],
  success:  [34, 197, 94] as [number, number, number],
  warning:  [234, 179, 8] as [number, number, number],
  danger:   [239, 68, 68] as [number, number, number],
}

// Colores por prioridad
const PRIORIDAD_COLOR: Record<string, [number, number, number]> = {
  alta:   BRAND.danger,
  media:  BRAND.warning,
  baja:   BRAND.success,
}

// Colores por estado
const ESTADO_COLOR: Record<string, [number, number, number]> = {
  abierto:    BRAND.danger,
  en_proceso: BRAND.warning,
  cerrado:    BRAND.success,
}

/**
 * Genera el PDF de reporte técnico y lo sube a Supabase Storage.
 * @returns URL pública del PDF subido
 */
export async function generarReportePDF(data: PdfReporteData): Promise<string> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 16
  let y = margin

  // ── Encabezado ─────────────────────────────────────────────
  // Fondo del encabezado
  doc.setFillColor(...BRAND.primary)
  doc.rect(0, 0, pageW, 42, 'F')

  // Nombre de la empresa
  doc.setTextColor(...BRAND.white)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(import.meta.env.VITE_EMPRESA_NOMBRE || 'ICON SUPPORT', margin, 18)

  // Subtítulo
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('REPORTE DE SERVICIO TÉCNICO', margin, 26)

  // Número de ticket (esquina derecha)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  const ticketLabel = `TICKET #${data.ticket.id.substring(0, 8).toUpperCase()}`
  doc.text(ticketLabel, pageW - margin, 18, { align: 'right' })

  // Fecha
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(
    `Fecha: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}`,
    pageW - margin, 26, { align: 'right' }
  )

  // Datos empresa (debajo del encabezado)
  doc.setFontSize(8)
  doc.setTextColor(...BRAND.gray)
  const empresaInfo = [
    import.meta.env.VITE_EMPRESA_TELEFONO,
    import.meta.env.VITE_EMPRESA_EMAIL,
    import.meta.env.VITE_EMPRESA_DIRECCION,
  ].filter(Boolean).join('  •  ')
  doc.text(empresaInfo, margin, 36)

  y = 52

  // ── Sección: Estado del Ticket ──────────────────────────────
  const estadoColor = ESTADO_COLOR[data.ticket.estado] || BRAND.gray
  const prioridadColor = PRIORIDAD_COLOR[data.ticket.prioridad] || BRAND.gray

  // Badges de estado y prioridad
  doc.setFillColor(...estadoColor)
  doc.roundedRect(margin, y, 38, 8, 2, 2, 'F')
  doc.setTextColor(...BRAND.white)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(data.ticket.estado.toUpperCase(), margin + 19, y + 5.5, { align: 'center' })

  doc.setFillColor(...prioridadColor)
  doc.roundedRect(margin + 42, y, 38, 8, 2, 2, 'F')
  doc.text(`PRIORIDAD ${data.ticket.prioridad.toUpperCase()}`, margin + 61, y + 5.5, { align: 'center' })

  y += 16

  // ── Tabla: Información del Ticket ──────────────────────────
  doc.setTextColor(...BRAND.dark)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Información del Ticket', margin, y)
  y += 4

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: BRAND.primary,
      textColor: BRAND.white,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: BRAND.dark },
    alternateRowStyles: { fillColor: BRAND.lightBg },
    head: [['Campo', 'Detalle']],
    body: [
      ['Título del Ticket', data.ticket.titulo],
      ['Descripción', data.ticket.descripcion || 'N/D'],
      ['Categoría', data.ticket.categoria || 'General'],
      ['Cliente', data.cliente.nombre],
      ['Email Cliente', data.cliente.email],
      ['Técnico Asignado', data.tecnico.nombre],
      ['Teléfono Técnico', data.tecnico.telefono || 'N/D'],
      ['Fecha de Creación', format(new Date(data.ticket.creado_en), "dd/MM/yyyy HH:mm", { locale: es })],
    ],
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // ── Tabla: Detalles de la Visita ───────────────────────────
  if (data.asistencia) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND.dark)
    doc.text('Detalles de la Visita', margin, y)
    y += 4

    const horaEntrada = data.asistencia.hora_entrada
      ? format(new Date(data.asistencia.hora_entrada), "dd/MM/yyyy HH:mm", { locale: es })
      : 'N/D'
    const horaSalida = data.asistencia.hora_salida
      ? format(new Date(data.asistencia.hora_salida), "dd/MM/yyyy HH:mm", { locale: es })
      : 'Pendiente'

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: BRAND.primary, textColor: BRAND.white, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: BRAND.dark },
      alternateRowStyles: { fillColor: BRAND.lightBg },
      head: [['Campo', 'Detalle']],
      body: [
        ['Hora de Entrada', horaEntrada],
        ['Hora de Salida', horaSalida],
        ['Duración', data.asistencia.duracion_minutos ? `${data.asistencia.duracion_minutos} minutos` : 'N/D'],
        ['Coordenadas Entrada', data.asistencia.latitud_entrada
          ? `${data.asistencia.latitud_entrada.toFixed(6)}, ${data.asistencia.longitud_entrada?.toFixed(6)}`
          : 'No disponible'],
        ['Dirección', data.asistencia.direccion_entrada || 'No disponible'],
        ['Notas de Visita', data.asistencia.notas || 'Ninguna'],
      ],
    })

    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ── Sección: Resumen del Trabajo ────────────────────────────
  // Verificar si hay espacio suficiente
  if (y + 60 > pageH - 30) {
    doc.addPage()
    y = margin
  }

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.dark)
  doc.text('Resumen del Trabajo Realizado', margin, y)
  y += 6

  doc.setFillColor(...BRAND.lightBg)
  doc.roundedRect(margin, y, pageW - margin * 2, 32, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BRAND.dark)

  const resumenLines = doc.splitTextToSize(
    data.reporte.resumen_trabajo || 'Sin descripción',
    pageW - margin * 2 - 8
  )
  doc.text(resumenLines, margin + 4, y + 7)
  y += 40

  if (data.reporte.materiales_usados) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Materiales / Repuestos Utilizados:', margin, y)
    y += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const matLines = doc.splitTextToSize(data.reporte.materiales_usados, pageW - margin * 2)
    doc.text(matLines, margin, y)
    y += matLines.length * 5 + 6
  }

  // ── Sección: Firma del Cliente ──────────────────────────────
  if (y + 55 > pageH - 30) {
    doc.addPage()
    y = margin
  }

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.dark)
  doc.text('Conformidad del Cliente', margin, y)
  y += 6

  const sigBoxW = (pageW - margin * 2 - 10) / 2
  const sigBoxH = 45

  // Caja firma cliente
  doc.setDrawColor(...BRAND.gray)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, y, sigBoxW, sigBoxH, 2, 2, 'D')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.gray)
  doc.text('FIRMA DEL CLIENTE', margin + sigBoxW / 2, y + 4, { align: 'center' })

  if (data.firmaDataUrl) {
    try {
      doc.addImage(data.firmaDataUrl, 'PNG', margin + 4, y + 6, sigBoxW - 8, sigBoxH - 12)
    } catch (_) {
      doc.setFontSize(8)
      doc.text('[Firma no disponible]', margin + sigBoxW / 2, y + sigBoxH / 2, { align: 'center' })
    }
  }

  // Línea de firma nombre
  doc.setDrawColor(...BRAND.dark)
  doc.setLineWidth(0.5)
  doc.line(margin + 2, y + sigBoxH - 8, margin + sigBoxW - 2, y + sigBoxH - 8)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(data.cliente.nombre, margin + sigBoxW / 2, y + sigBoxH - 3, { align: 'center' })

  // Caja técnico
  const techBoxX = margin + sigBoxW + 10
  doc.setDrawColor(...BRAND.gray)
  doc.setLineWidth(0.3)
  doc.roundedRect(techBoxX, y, sigBoxW, sigBoxH, 2, 2, 'D')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.gray)
  doc.text('TÉCNICO RESPONSABLE', techBoxX + sigBoxW / 2, y + 4, { align: 'center' })

  doc.setDrawColor(...BRAND.dark)
  doc.setLineWidth(0.5)
  doc.line(techBoxX + 2, y + sigBoxH - 8, techBoxX + sigBoxW - 2, y + sigBoxH - 8)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(data.tecnico.nombre, techBoxX + sigBoxW / 2, y + sigBoxH - 3, { align: 'center' })

  y += sigBoxH + 10

  // ── Pie de página en todas las páginas ─────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...BRAND.gray)
    doc.setLineWidth(0.2)
    doc.line(margin, pageH - 16, pageW - margin, pageH - 16)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BRAND.gray)
    doc.text(
      `${import.meta.env.VITE_EMPRESA_NOMBRE || 'ICON Support'} — Documento generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
      margin, pageH - 10
    )
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 10, { align: 'right' })
  }

  // ── Subir a Supabase Storage ────────────────────────────────
  const pdfBlob = doc.output('blob')
  const fileName = `reporte_${data.ticket.id}_${Date.now()}.pdf`
  const path = `tickets/${data.ticket.id}/${fileName}`

  const publicUrl = await uploadFile('reportes', path, pdfBlob, 'application/pdf')
  return publicUrl
}

/**
 * Descarga el PDF directamente en el navegador (sin subir a Supabase)
 */
export function descargarReportePDF(doc: jsPDF, ticketId: string): void {
  doc.save(`reporte_${ticketId.substring(0, 8)}_${Date.now()}.pdf`)
}
