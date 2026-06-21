import { useEffect, useRef, useCallback } from 'react'
import * as fabric from 'fabric'
import { usePatternStore } from '../../store/patternStore'
import { useFabricCanvas } from '../../hooks/useFabricCanvas'
import { buildPathOptions, buildSeamAllowanceOptions } from './canvasUtils'
import { CM_TO_PX } from '../../utils/constants'

function fitCanvasToPieces(canvas, boundingBox) {
  if (!canvas || !boundingBox) return
  const w = canvas.getWidth()
  const h = canvas.getHeight()
  if (!w || !h) return

  const minXpx = boundingBox.min_x * CM_TO_PX
  const maxXpx = boundingBox.max_x * CM_TO_PX
  const minYpx = -boundingBox.max_y * CM_TO_PX
  const maxYpx = -boundingBox.min_y * CM_TO_PX

  const contentW = maxXpx - minXpx
  const contentH = maxYpx - minYpx
  if (contentW <= 0 || contentH <= 0) return

  const padding = 40
  const zoom = Math.min((w - padding * 2) / contentW, (h - padding * 2) / contentH)
  const centerX = (minXpx + maxXpx) / 2
  const centerY = (minYpx + maxYpx) / 2
  const panX = w / 2 - centerX * zoom
  const panY = h / 2 - centerY * zoom

  canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY])
  canvas.requestRenderAll()
}

export default function CanvasArea() {
  const canvasElementRef = useRef(null)
  const fabricCanvasRef = useFabricCanvas(canvasElementRef)

  const pieces = usePatternStore((state) => state.pieces)
  const boundingBox = usePatternStore((state) => state.boundingBox)
  const measurementLines = usePatternStore((state) => state.measurementLines)
  const isLoading = usePatternStore((state) => state.isLoading)
  const error = usePatternStore((state) => state.error)
  const updateManualOffset = usePatternStore((state) => state.updateManualOffset)
  const manualOffsets = usePatternStore((state) => state.manualOffsets)

  const handleFitToScreen = useCallback(() => {
    fitCanvasToPieces(fabricCanvasRef.current, boundingBox)
  }, [fabricCanvasRef, boundingBox])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !pieces || pieces.length === 0) return

    canvas.clear()
    canvas.backgroundColor = '#f8f9fa'

    const allOffsetsX = pieces.map((p) => p.offset_x)
    const minOffsetX = Math.min(...allOffsetsX)
    const maxOffsetX = Math.max(...allOffsetsX) + 60

    measurementLines.forEach((yCm) => {
      const yPx = -yCm * CM_TO_PX
      canvas.add(new fabric.Line(
        [(minOffsetX - 10) * CM_TO_PX, yPx, (maxOffsetX + 10) * CM_TO_PX, yPx],
        { stroke: '#cbd3da', strokeWidth: 1, strokeDashArray: [4, 4], selectable: false, evented: false }
      ))
    })

    pieces.forEach((piece) => {
      const shapes = []
      if (piece.seam_allowance_path?.length > 0) {
        const { points, options } = buildSeamAllowanceOptions(piece.seam_allowance_path, piece.offset_x, piece.offset_y ?? 0, CM_TO_PX)
        shapes.push(new fabric.Polyline(points, options))
      }
      piece.paths.forEach((path) => {
        const { points, options } = buildPathOptions(path, piece.offset_x, piece.offset_y ?? 0, CM_TO_PX)
        shapes.push(new fabric.Polyline(points, options))
      })
      const firstPoint = piece.paths[0]?.points[0]
      if (firstPoint) {
        shapes.push(new fabric.Text(
          `قطعة ${piece.piece_index + 1}${piece.is_flipped ? ' (معكوسة)' : ''}`,
          { left: (firstPoint.x + piece.offset_x) * CM_TO_PX, top: -(firstPoint.y + 3) * CM_TO_PX, fontSize: 14, fill: '#2f3542', fontFamily: 'Cairo, sans-serif', selectable: false, evented: false }
        ))
      }
      const group = new fabric.Group(shapes, {
        hasControls: false, hasBorders: true, lockScalingX: true, lockScalingY: true, lockRotation: true, hoverCursor: 'move',
        left: (manualOffsets[piece.piece_id]?.dx ?? 0) * CM_TO_PX,
        top: (manualOffsets[piece.piece_id]?.dy ?? 0) * CM_TO_PX,
      })
      group.pieceId = piece.piece_id
      group.on('moving', () => { updateManualOffset(piece.piece_id, group.left / CM_TO_PX, group.top / CM_TO_PX) })
      canvas.add(group)
    })

    canvas.requestRenderAll()

    // ملائمة بعد 200ms عشان الكانفاس يكون جاهز فعلاً
    setTimeout(() => fitCanvasToPieces(canvas, boundingBox), 200)

  }, [pieces, measurementLines, boundingBox])

  return (
    <div className="relative flex-1 h-full bg-gray-50 canvas-container-ltr">
      <canvas ref={canvasElementRef} />
      {pieces.length > 0 && (
        <button onClick={handleFitToScreen}
          className="absolute bottom-4 left-4 bg-white shadow-lg border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 transition-colors z-10">
          ⊡ ملائمة الشاشة
        </button>
      )}
      {isLoading && (
        <div className="absolute top-4 left-4 bg-white shadow-md rounded-lg px-3 py-2 text-sm text-gray-600 flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          جاري التحديث...
        </div>
      )}
      {error && (
        <div className="absolute top-4 left-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
      )}
      {pieces.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm text-center px-4">
          غيّر أي مقاس من القائمة لعرض الباترون
        </div>
      )}
    </div>
  )
}
