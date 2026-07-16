import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import QRCode from 'qrcode'
import { supabase, uploadFile } from './supabaseClient'
import type { Tarea, Profile } from '../types'

interface PdfTareaData {
  tarea: Tarea
  tecnico: Profile
  firmaSupervisorUrl?: string // DataUrl
  fotos?: { url: string; descripcion?: string }[]
}

const BRAND = {
  primary:  [79, 70, 229] as [number, number, number],
  dark:     [15, 23, 42]  as [number, number, number],
  gray:     [100, 116, 139] as [number, number, number],
  white:    [255, 255, 255] as [number, number, number],
}

/**
 * Genera PDF de la Tarea con Código QR
 */
export async function generarTareaPDF(data: PdfTareaData): Promise<string> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 20
  let y = margin

  // 1. Encabezado
  doc.setFillColor(...BRAND.primary)
  doc.rect(0, 0, pageW, 40, 'F')

  doc.setTextColor(...BRAND.white)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(import.meta.env.VITE_EMPRESA_NOMBRE || 'ICON SUPPORT', margin, 18)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('CERTIFICADO DE CULMINACIÓN DE TAREA', margin, 26)

  const tareaId = data.tarea.id.split('-')[0].toUpperCase()
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`TAREA #${tareaId}`, pageW - margin, 18, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Fecha: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageW - margin, 26, { align: 'right' })

  y = 50

  // 2. Información General
  doc.setTextColor(...BRAND.dark)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Detalles de la Tarea', margin, y)
  y += 8

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2, textColor: BRAND.dark },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40, textColor: BRAND.gray },
      1: { cellWidth: 'auto' }
    },
    body: [
      ['Título', data.tarea.titulo],
      ['Prioridad', data.tarea.prioridad.toUpperCase()],
      ['Técnico', data.tecnico.nombre],
      ['Estado', 'COMPLETADA'],
    ]
  })
  y = (doc as any).lastAutoTable.finalY + 10

  if (data.tarea.descripcion) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Descripción / Instrucciones:', margin, y)
    y += 6
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const splitDesc = doc.splitTextToSize(data.tarea.descripcion, pageW - margin * 2)
    doc.text(splitDesc, margin, y)
    y += (splitDesc.length * 5) + 10
  }

  // 3. Firma del Supervisor
  if (data.firmaSupervisorUrl) {
    if (y > pageH - 80) { doc.addPage(); y = margin }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Validación del Supervisor', margin, y)
    y += 10
    try {
      doc.addImage(data.firmaSupervisorUrl, 'PNG', margin, y, 60, 30)
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y + 32, margin + 60, y + 32)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Firma Digital (Supervisor)', margin, y + 36)
    } catch(e) { console.error('Error add firma', e) }
    y += 50
  }

  // 4. Fotos y Evidencia
  if (data.fotos && data.fotos.length > 0) {
    doc.addPage()
    y = margin
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Evidencia Fotográfica', margin, y)
    y += 10

    let col = 0
    let rowH = 70 // Altura por fila de imágenes
    const imgW = 80
    const imgH = 50

    for (const foto of data.fotos) {
      if (y + rowH > pageH - margin) { doc.addPage(); y = margin; col = 0 }
      const x = col === 0 ? margin : margin + imgW + 10

      try {
        doc.addImage(foto.url, 'JPEG', x, y, imgW, imgH)
        doc.setDrawColor(200)
        doc.rect(x, y, imgW, imgH) // Marco

        if (foto.descripcion) {
          doc.setFontSize(9)
          doc.setFont('helvetica', 'italic')
          const splitText = doc.splitTextToSize(foto.descripcion, imgW)
          doc.text(splitText, x, y + imgH + 5)
        }
      } catch (e) {
        doc.text('[Error cargando imagen]', x, y + 10)
      }

      col++
      if (col > 1) { col = 0; y += rowH }
    }
  }

  // Subir el PDF a Storage y generar QR
  const tempFileName = `tarea_${data.tarea.id}_temp.pdf`
  const path = `tareas/${data.tarea.id}/certificado.pdf`
  
  let publicUrl = ""
  try {
    const tempBlob = doc.output('blob')
    publicUrl = await uploadFile('reportes', path, tempBlob, 'application/pdf')
  } catch(e) {
    publicUrl = "https://soporte.iconsupport.com"
  }

  // Generamos QR Data URL
  const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 80 })
  
  // Añadimos el QR en la 1ra página
  doc.setPage(1)
  doc.addImage(qrDataUrl, 'PNG', pageW - margin - 30, 45, 30, 30)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.text('Escanear para verificar', pageW - margin - 15, 78, { align: 'center' })

  // Finalizamos y subimos de nuevo
  const finalBlob = doc.output('blob')
  const finalUrl = await uploadFile('reportes', path, finalBlob, 'application/pdf')
  
  return finalUrl
}
