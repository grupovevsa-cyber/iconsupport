import React, { useEffect, useState } from 'react'
import { X, Download, FileText, Loader2 } from 'lucide-react'
import { jsPDF } from 'jspdf'

interface ReportPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  pdfDoc: jsPDF | null
  filename?: string
}

export const ReportPreviewModal = ({ 
  isOpen, 
  onClose, 
  pdfDoc,
  filename = 'reporte.pdf'
}: ReportPreviewModalProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && pdfDoc) {
      try {
        // Generar blob URL para la vista previa
        const blob = pdfDoc.output('blob')
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
      } catch (error) {
        console.error("Error generando vista previa PDF:", error)
      }
    }

    return () => {
      // Limpiar URL al desmontar o cerrar
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [isOpen, pdfDoc])

  if (!isOpen) return null

  const handleDownload = () => {
    if (pdfDoc) {
      pdfDoc.save(filename)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-surface-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 rounded-lg">
              <FileText className="text-brand-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Vista Previa de Informe</h2>
              <p className="text-sm text-slate-400">{filename}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl transition-colors shadow-glow/20"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Descargar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-surface-700 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenido (Visor de PDF) */}
        <div className="flex-1 bg-surface-950 relative">
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0`}
              className="w-full h-full border-none"
              title="Visor PDF"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <Loader2 size={32} className="animate-spin mb-4 text-brand-500" />
              <p>Generando vista previa...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
