/**
 * CanvasArea.jsx
 * --------------
 * المكوّن المسؤول عن العرض التفاعلي الكامل لقطع الباترون. مسؤولياته:
 *
 * 1) استخدام useFabricCanvas لتهيئة الكانفاس مرة واحدة (Pan/Zoom جاهزين).
 * 2) كل مرة تتغيّر بيانات `pieces` في الـ store (بعد استجابة API جديدة)،
 *    يمسح الكانفاس ويعيد رسم كل القطع من الصفر كـ fabric.Group لكل قطعة.
 * 3) كل fabric.Group قابل للسحب (draggable) بشكل مستقل، ويُحدِّث
 *    `manualOffsets` في الـ store عند انتهاء السحب — هذا هو أساس
 *    "Manual Nesting" المطلوب في المواصفات.
 * 4) عند أول تحميل بيانات، يستخدم calculateFitToScreen لضبط الكاميرا
 *    تلقائياً حتى يرى المستخدم الباترون كاملاً دون الحاجة للتكبير يدوياً.
 *
 * ملاحظة معمارية: لماذا fabric.Group لكل قطعة بدل fabric.Polyline منفرد؟
 * لأن القطعة الواحدة تحتوي على عدة مسارات (خصر، جانب، داخلية، قُب،
 * سماح خياطة، خط قماش، بنس) ويجب أن تتحرك كلها معاً كوحدة واحدة عند
 * السحب. تجميعها في Group يحقق ذلك مباشرة عبر آلية Fabric.js المدمجة.
 */

import { useEffect, useRef } from 'react'
import * as fabric from 'fabric'
import { usePatternStore } from '../../store/patternStore'
import { useFabricCanvas } from '../../hooks/useFabricCanvas'
import {
  buildPathOptions,
  buildSeamAllowanceOptions,
  boundingBoxToPx,
  calculateFitToScreen,
} from './canvasUtils'
import { CM_TO_PX } from '../../utils/constants'

export default function CanvasArea() {
  const canvasElementRef = useRef(null)
  const fabricCanvasRef = useFabricCanvas(canvasElementRef)

  // نتتبّع هل سبق ضبط "ملائمة الشاشة" تلقائياً، حتى لا نعيد ضبط الكاميرا
  // في كل مرة يتغيّر فيها مقاس بسيط (وهذا كان سيُفسد تجربة المستخدم،
  // لأنه لو كان قد كبّر/حرّك الكاميرا بنفسه، لا نريد إعادة تصفيرها)
  const hasAutoFitRef = useRef(false)

  const pieces = usePatternStore((state) => state.pieces)
  const boundingBox = usePatternStore((state) => state.boundingBox)
  const measurementLines = usePatternStore((state) => state.measurementLines)
  const isLoading = usePatternStore((state) => state.isLoading)
  const error = usePatternStore((state) => state.error)
  const updateManualOffset = usePatternStore((state) => state.updateManualOffset)
  const manualOffsets = usePatternStore((state) => state.manualOffsets)

  // ---------------------------------------------------------------
  // إعادة رسم كل القطع كل مرة تتغيّر بيانات الباترون
  // ---------------------------------------------------------------
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !pieces || pieces.length === 0) return

    // مسح كل الأشكال القديمة فقط (دون التأثير على إعدادات الزووم/الكاميرا
    // الحالية، لأن clear() في Fabric.js يمسح الأشكال لكن viewportTransform
    // يبقى كما هو)
    canvas.clear()
    canvas.backgroundColor = '#f8f9fa'

    // رسم خطوط القياس الأفقية أولاً (في الخلف) كمرجع بصري خافت
    const allOffsetsX = pieces.map((p) => p.offset_x)
    const minOffsetX = Math.min(...allOffsetsX)
    const maxOffsetX = Math.max(...allOffsetsX) + 60 // تقدير عرض القطعة الأخيرة تقريبياً لمد الخط

    measurementLines.forEach((yCm) => {
      const yPx = -yCm * CM_TO_PX
      const line = new fabric.Line(
        [(minOffsetX - 10) * CM_TO_PX, yPx, (maxOffsetX + 10) * CM_TO_PX, yPx],
        {
          stroke: '#cbd3da',
          strokeWidth: 1,
          strokeDashArray: [4, 4],
          selectable: false,
          evented: false,
        }
      )
      canvas.add(line)
    })

    // رسم كل قطعة كـ Group مستقل وقابل للسحب
    pieces.forEach((piece) => {
      const shapes = []

      // مسار سماح الخياطة أولاً (في الخلف داخل المجموعة)
      if (piece.seam_allowance_path && piece.seam_allowance_path.length > 0) {
        const { points, options } = buildSeamAllowanceOptions(
          piece.seam_allowance_path,
          piece.offset_x,
          piece.offset_y ?? 0,
          CM_TO_PX
        )
        shapes.push(new fabric.Polyline(points, options))
      }

      // كل المسارات الأساسية للقطعة
      piece.paths.forEach((path) => {
        const { points, options } = buildPathOptions(
          path,
          piece.offset_x,
          piece.offset_y ?? 0,
          CM_TO_PX
        )
        shapes.push(new fabric.Polyline(points, options))
      })

      // تسمية القطعة (نص توضيحي يظهر فوقها)
      const firstPoint = piece.paths[0]?.points[0]
      if (firstPoint) {
        const labelText = `قطعة ${piece.piece_index + 1}${piece.is_flipped ? ' (معكوسة)' : ''}`
        const label = new fabric.Text(labelText, {
          left: (firstPoint.x + piece.offset_x) * CM_TO_PX,
          top: -(firstPoint.y + 3) * CM_TO_PX,
          fontSize: 14,
          fill: '#2f3542',
          fontFamily: 'Cairo, sans-serif',
          selectable: false,
          evented: false,
        })
        shapes.push(label)
      }

      // تجميع كل أشكال القطعة في Group واحد قابل للسحب ككل
      const group = new fabric.Group(shapes, {
        hasControls: false, // لا نسمح بتدوير/تحجيم القطعة، فقط نقلها (Move)
        hasBorders: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
        hoverCursor: 'move',
        // نطبّق أي إزاحة يدوية سابقة محفوظة لهذه القطعة بالتحديد، حتى
        // لو أعيد رسم الكانفاس (مثلاً بعد تغيير مقاس مختلف)، تبقى
        // القطعة في موضعها الذي حرّكه المستخدم إليه يدوياً من قبل
        left: (manualOffsets[piece.piece_id]?.dx ?? 0) * CM_TO_PX,
        top: (manualOffsets[piece.piece_id]?.dy ?? 0) * CM_TO_PX,
      })
      group.pieceId = piece.piece_id // نخزّن معرّف القطعة على الشكل نفسه للرجوع له بعد السحب

      // عند انتهاء السحب: نحوّل الإزاحة بالبكسل مرة أخرى للسنتيمتر
      // ونحفظها في الـ store المركزي
      group.on('moving', () => {
        const dxCm = group.left / CM_TO_PX
        const dyCm = group.top / CM_TO_PX
        updateManualOffset(piece.piece_id, dxCm, dyCm)
      })

      canvas.add(group)
    })

    canvas.requestRenderAll()

    // ---------------------------------------------------------------
    // ملائمة الشاشة تلقائياً عند أول تحميل بيانات فقط
    // ---------------------------------------------------------------
    if (!hasAutoFitRef.current && boundingBox) {
      const bboxPx = boundingBoxToPx(boundingBox, CM_TO_PX)
      const { zoom, panX, panY } = calculateFitToScreen(
        bboxPx,
        canvas.getWidth(),
        canvas.getHeight()
      )
      canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY])
      hasAutoFitRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces, measurementLines])

  return (
    <div className="relative flex-1 h-full bg-gray-50 canvas-container-ltr">
      <canvas ref={canvasElementRef} />

      {/* مؤشر تحميل خفيف يظهر أثناء انتظار استجابة الباك إند */}
      {isLoading && (
        <div className="absolute top-4 left-4 bg-white shadow-md rounded-lg px-4 py-2 text-sm text-gray-600 flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-pattern-blue border-t-transparent rounded-full animate-spin" />
          جاري تحديث الباترون...
        </div>
      )}

      {/* رسالة خطأ واضحة لو فشل الاتصال بالباك إند */}
      {error && (
        <div className="absolute top-4 left-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {/* تلميح بسيط لطريقة الاستخدام، يظهر فقط لو لم تُحمَّل أي قطع بعد */}
      {pieces.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
          عجلة الماوس للتكبير، السحب على الخلفية للتحريك، السحب على القطعة لتحريكها
        </div>
      )}
    </div>
  )
}
