import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Ticket, Profile } from '../types'

// Add typings for jspdf-autotable to prevent TS errors
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const PRIMARY_COLOR = [99, 102, 241]; // #6366f1 (Indigo/Brand)

/**
 * Genera un reporte general de un listado de tickets
 */
export const generateTicketsListPDF = (
  tickets: Ticket[],
  titulo: string = 'Reporte de Tickets',
  filtroAplicado: string = ''
) => {
  const doc = new jsPDF()

  // Cabecera
  doc.setFontSize(20)
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2])
  doc.text('ICON Support', 14, 22)
  
  doc.setFontSize(14)
  doc.setTextColor(40, 40, 40)
  doc.text(titulo, 14, 32)
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generado el: ${format(new Date(), "dd 'de' MMMM, yyyy HH:mm", { locale: es })}`, 14, 40)
  
  if (filtroAplicado) {
    doc.text(`Filtro: ${filtroAplicado}`, 14, 46)
  }

  // Columnas de la tabla
  const tableColumn = ["ID", "Fecha", "Cliente", "Asunto", "Técnico", "Prioridad", "Estado"]
  
  // Filas de la tabla
  const tableRows = tickets.map(ticket => [
    `TCK-${String(ticket.numero_ticket || 0).padStart(5, '0')}`,
    format(new Date(ticket.creado_en), "dd/MM/yyyy", { locale: es }),
    ticket.cliente?.nombre || 'Desconocido',
    ticket.titulo,
    ticket.tecnico_asignado?.nombre || 'Sin asignar',
    ticket.prioridad.toUpperCase(),
    ticket.estado.replace('_', ' ').toUpperCase()
  ])

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 55,
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR as [number, number, number] },
    styles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] }
  })

  return doc
}

/**
 * Genera un reporte detallado de un solo ticket
 */
export const generateTicketDetailPDF = (ticket: Ticket) => {
  const doc = new jsPDF()

  // Cabecera
  doc.setFontSize(20)
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2])
  doc.text('ICON Support', 14, 22)
  
  doc.setFontSize(14)
  doc.setTextColor(40, 40, 40)
  doc.text(`Reporte de Ticket TCK-${String(ticket.numero_ticket || 0).padStart(5, '0')}`, 14, 32)
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generado el: ${format(new Date(), "dd 'de' MMMM, yyyy HH:mm", { locale: es })}`, 14, 40)

  // Información General
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text('Información General', 14, 55)

  const generalInfo = [
    ['Fecha de Creación:', format(new Date(ticket.creado_en), "dd/MM/yyyy HH:mm", { locale: es })],
    ['Cliente:', ticket.cliente?.nombre || 'Desconocido'],
    ['Técnico Asignado:', ticket.tecnico_asignado?.nombre || 'Sin asignar'],
    ['Estado:', ticket.estado.replace('_', ' ').toUpperCase()],
    ['Prioridad:', ticket.prioridad.toUpperCase()],
  ]

  doc.autoTable({
    body: generalInfo,
    startY: 60,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 140 }
    }
  })

  const currentY = (doc as any).lastAutoTable.finalY + 10

  // Detalles del ticket
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Asunto:', 14, currentY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(ticket.titulo, 14, currentY + 6)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Descripción:', 14, currentY + 16)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  
  const splitDescription = doc.splitTextToSize(ticket.descripcion || 'Sin descripción', 180)
  doc.text(splitDescription, 14, currentY + 22)

  let nextY = currentY + 22 + (splitDescription.length * 5) + 10

  // Notas Internas (Opcional, depende de si se quiere mostrar en el PDF del cliente o no)
  // Generalmente en un reporte se pueden incluir si el que genera es admin/tecnico
  if (ticket.notas_internas) {
    if (nextY > 250) {
      doc.addPage()
      nextY = 20
    }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Bitácora / Notas Internas:', 14, nextY)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const splitNotas = doc.splitTextToSize(ticket.notas_internas, 180)
    doc.text(splitNotas, 14, nextY + 6)
    nextY = nextY + 6 + (splitNotas.length * 5) + 10
  }

  // Tareas asociadas
  if (ticket.tareas && ticket.tareas.length > 0) {
    if (nextY > 230) {
      doc.addPage()
      nextY = 20
    }
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Tareas Asociadas', 14, nextY)
    
    const taskRows = ticket.tareas.map(t => [
      t.titulo,
      t.estado.toUpperCase(),
      t.tecnico?.nombre || 'Sin asignar',
      format(new Date(t.creado_en), "dd/MM/yyyy", { locale: es })
    ])

    doc.autoTable({
      head: [['Tarea', 'Estado', 'Técnico', 'Fecha']],
      body: taskRows,
      startY: nextY + 5,
      theme: 'grid',
      headStyles: { fillColor: PRIMARY_COLOR as [number, number, number] },
      styles: { fontSize: 9 }
    })
  }

  return doc
}
