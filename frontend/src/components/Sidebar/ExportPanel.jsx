/**
 * ExportPanel.jsx
 * ---------------
 * لوحة أزرار التصدير. كل زر يستدعي exportPattern() من patternApi.js
 * بصيغة مختلفة، ثم يستخدم downloadBlob() لتنزيل الملف فوراً في المتصفح.
 *
 * نستخدم getPiecesForExport() من الـ store (وليس pieces مباشرة) لضمان
 * أن الملف المُصدَّر يتضمن أي تحريك يدوي قام به المستخدم بالسحب على
 * الكانفاس، فيتطابق تماماً مع ما يراه على الشاشة.
 */

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { usePatternStore } from '../../store/patternStore'
import { exportPattern, downloadBlob } from '../../api/patternApi'
import { EXPORT_FORMATS } from '../../utils/constants'

export default function ExportPanel() {
  const getPiecesForExport = usePatternStore((state) => state.getPiecesForExport)
  const pieces = usePatternStore((state) => state.pieces)
  const [exportingKey, setExportingKey] = useState(null)
  const [exportError, setExportError] = useState(null)

  async function handleExport(formatKey) {
    if (pieces.length === 0) return

    setExportingKey(formatKey)
    setExportError(null)

    try {
      const exportPieces = getPiecesForExport()
      let blob, filename

      if (formatKey === 'svg') {
        blob = await exportPattern('svg', exportPieces)
        filename = 'trousers_pattern.svg'
      } else if (formatKey === 'pdf_a4') {
        blob = await exportPattern('pdf', exportPieces, { pageSize: 'A4' })
        filename = 'trousers_pattern_a4.pdf'
      } else if (formatKey === 'pdf_plotter') {
        blob = await exportPattern('pdf', exportPieces, { pageSize: 'WIDE_PLOTTER' })
        filename = 'trousers_pattern_plotter.pdf'
      } else if (formatKey === 'dxf') {
        blob = await exportPattern('dxf', exportPieces)
        filename = 'trousers_pattern.dxf'
      }

      downloadBlob(blob, filename)
    } catch (err) {
      setExportError('فشل التصدير. حاول مرة أخرى.')
      console.error('فشل التصدير:', err)
    } finally {
      setExportingKey(null)
    }
  }

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">تصدير الباترون</h3>

      <div className="grid grid-cols-1 gap-2">
        {EXPORT_FORMATS.map((format) => (
          <button
            key={format.key}
            onClick={() => handleExport(format.key)}
            disabled={pieces.length === 0 || exportingKey !== null}
            className="flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg
                       border border-gray-200 bg-white hover:bg-blue-50 hover:border-pattern-blue
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>{format.label}</span>
            {exportingKey === format.key ? (
              <Loader2 size={16} className="animate-spin text-pattern-blue" />
            ) : (
              <Download size={16} className="text-gray-400" />
            )}
          </button>
        ))}
      </div>

      {exportError && <p className="text-xs text-red-600 mt-2">{exportError}</p>}
    </div>
  )
}
