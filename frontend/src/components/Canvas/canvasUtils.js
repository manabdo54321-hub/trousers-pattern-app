/**
 * canvasUtils.js
 * --------------
 * دوال خالصة (pure functions) لا تعتمد على React، مسؤولة عن:
 * 1) تحويل نقاط الباترون (بالسنتيمتر) إلى نقاط Fabric.js (بالبكسل).
 * 2) بناء أشكال Fabric.js (Polyline) من بيانات PatternPath.
 * 3) حسابات الزووم/Pan بدون تشويه (preserving aspect ratio).
 *
 * فصلها عن CanvasArea.jsx يسهّل اختبارها بمفردها، ويقلل تعقيد المكوّن
 * الرئيسي الذي يركّز فقط على دورة حياة React (refs, effects).
 */

import { CM_TO_PX } from '../../utils/constants'

/**
 * يحوّل نقطة باترون واحدة {x, y} بالسنتيمتر إلى نقطة Fabric.js بالبكسل.
 * نعكس المحور y لأن النظام الرياضي للباترون "للأعلى = y أكبر"،
 * بينما Fabric.js (كأي canvas) "للأسفل = y أكبر".
 */
export function cmPointToPx(point, scale = CM_TO_PX) {
  return {
    x: point.x * scale,
    y: -point.y * scale,
  }
}

/**
 * يحوّل مصفوفة نقاط باترون كاملة (مسار) إلى مصفوفة نقاط Fabric.js،
 * مع تطبيق إزاحة القطعة (offset_x/offset_y) قبل التحويل.
 */
export function pathToFabricPoints(path, offsetX = 0, offsetY = 0, scale = CM_TO_PX) {
  return path.points.map((pt) =>
    cmPointToPx({ x: pt.x + offsetX, y: pt.y + offsetY }, scale)
  )
}

/**
 * يحوّل نمط الخط من تسمية الباك إند (solid/dashed/dashdot) إلى
 * خاصية strokeDashArray التي يفهمها Fabric.js.
 */
export function styleToDashArray(style) {
  switch (style) {
    case 'dashed':
      return [8, 4]
    case 'dashdot':
      return [10, 3, 3, 3]
    default:
      return null
  }
}

/**
 * يبني خصائص (options) جاهزة لإنشاء fabric.Polyline لمسار واحد من
 * مسارات الباترون. لا يُنشئ الشكل نفسه هنا (لأن إنشاء fabric.Polyline
 * يتطلب استدعاء fabric مباشرة من المكوّن الذي استورد المكتبة)، بل
 * يرجع فقط البيانات الجاهزة للاستخدام.
 */
export function buildPathOptions(path, offsetX, offsetY, scale) {
  return {
    points: pathToFabricPoints(path, offsetX, offsetY, scale),
    options: {
      stroke: path.color,
      strokeWidth: path.name === 'grainline' || path.name === 'dart' ? 1.5 : 2,
      strokeDashArray: styleToDashArray(path.style),
      fill: '',
      selectable: false, // خطوط الباترون الفردية لا تُسحب، فقط القطعة ككل (group)
      evented: false,
      objectCaching: false,
      hoverCursor: 'default',
    },
  }
}

/**
 * يبني خصائص جاهزة لمسار سماح الخياطة (محيط مغلق، خط أحمر متقطع).
 */
export function buildSeamAllowanceOptions(seamAllowancePoints, offsetX, offsetY, scale) {
  const points = seamAllowancePoints.map((pt) =>
    cmPointToPx({ x: pt.x + offsetX, y: pt.y + offsetY }, scale)
  )
  return {
    points,
    options: {
      stroke: '#eb2f06',
      strokeWidth: 1.5,
      strokeDashArray: [6, 4],
      fill: '',
      selectable: false,
      evented: false,
      objectCaching: false,
    },
  }
}

/**
 * يحسب أبعاد bounding box بالبكسل من bounding_box القادم من الباك إند
 * (بالسنتيمتر)، مفيد لضبط الكاميرا تلقائياً (fit-to-view) عند أول تحميل
 * أو بعد تغيير كبير في المقاسات.
 */
export function boundingBoxToPx(boundingBox, scale = CM_TO_PX) {
  if (!boundingBox) return null
  return {
    minX: boundingBox.min_x * scale,
    maxX: boundingBox.max_x * scale,
    minY: -boundingBox.max_y * scale, // معكوسة بسبب عكس y
    maxY: -boundingBox.min_y * scale,
  }
}

/**
 * يحسب مستوى الزووم والإزاحة (pan) المناسبين لعرض كل الباترون بالكامل
 * ومتمركزاً داخل منطقة canvas المرئية، يُستخدم لزر "ملائمة الشاشة" (Fit to Screen).
 */
export function calculateFitToScreen(boundingBoxPx, canvasWidth, canvasHeight, padding = 40) {
  if (!boundingBoxPx) return { zoom: 1, panX: 0, panY: 0 }

  const contentWidth = boundingBoxPx.maxX - boundingBoxPx.minX
  const contentHeight = boundingBoxPx.maxY - boundingBoxPx.minY

  const availableWidth = canvasWidth - padding * 2
  const availableHeight = canvasHeight - padding * 2

  // نختار أصغر نسبة بين العرض والارتفاع لضمان احتواء كل المحتوى
  // بدون تشويه (نفس معامل التكبير في الاتجاهين كلاهما)
  const scaleX = availableWidth / contentWidth
  const scaleY = availableHeight / contentHeight
  const zoom = Math.min(scaleX, scaleY, 4) // حد أقصى منطقي لمنع تكبير غريب لقطع صغيرة جداً

  const contentCenterX = (boundingBoxPx.minX + boundingBoxPx.maxX) / 2
  const contentCenterY = (boundingBoxPx.minY + boundingBoxPx.maxY) / 2

  const panX = canvasWidth / 2 - contentCenterX * zoom
  const panY = canvasHeight / 2 - contentCenterY * zoom

  return { zoom, panX, panY }
}
