import { CM_TO_PX } from '../../utils/constants'

export function cmPointToPx(point, scale = CM_TO_PX) {
  return { x: point.x * scale, y: -point.y * scale }
}

export function pathToFabricPoints(path, offsetX = 0, offsetY = 0, scale = CM_TO_PX) {
  return path.points.map((pt) => cmPointToPx({ x: pt.x + offsetX, y: pt.y + offsetY }, scale))
}

export function styleToDashArray(style) {
  switch (style) {
    case 'dashed': return [8, 4]
    case 'dashdot': return [10, 3, 3, 3]
    default: return null
  }
}

export function buildPathOptions(path, offsetX, offsetY, scale) {
  return {
    points: pathToFabricPoints(path, offsetX, offsetY, scale),
    options: {
      stroke: path.color,
      strokeWidth: path.name === 'grainline' || path.name === 'dart' ? 1.5 : 2,
      strokeDashArray: styleToDashArray(path.style),
      fill: '', selectable: false, evented: false, objectCaching: false, hoverCursor: 'default',
    },
  }
}

export function buildSeamAllowanceOptions(seamAllowancePoints, offsetX, offsetY, scale) {
  const points = seamAllowancePoints.map((pt) =>
    cmPointToPx({ x: pt.x + offsetX, y: pt.y + offsetY }, scale)
  )
  return {
    points,
    options: {
      stroke: '#eb2f06', strokeWidth: 1.5, strokeDashArray: [6, 4],
      fill: '', selectable: false, evented: false, objectCaching: false,
    },
  }
}

export function boundingBoxToPx(boundingBox, scale = CM_TO_PX) {
  if (!boundingBox) return null
  return {
    minX: boundingBox.min_x * scale,
    maxX: boundingBox.max_x * scale,
    minY: -boundingBox.max_y * scale,
    maxY: -boundingBox.min_y * scale,
  }
}

export function calculateFitToScreen(boundingBoxPx, canvasWidth, canvasHeight, padding = 60) {
  if (!boundingBoxPx) return { zoom: 1, panX: 0, panY: 0 }
  const contentWidth = boundingBoxPx.maxX - boundingBoxPx.minX
  const contentHeight = boundingBoxPx.maxY - boundingBoxPx.minY
  if (contentWidth <= 0 || contentHeight <= 0) return { zoom: 1, panX: 0, panY: 0 }
  const availableWidth = canvasWidth - padding * 2
  const availableHeight = canvasHeight - padding * 2
  const scaleX = availableWidth / contentWidth
  const scaleY = availableHeight / contentHeight
  const zoom = Math.min(scaleX, scaleY)
  const contentCenterX = (boundingBoxPx.minX + boundingBoxPx.maxX) / 2
  const contentCenterY = (boundingBoxPx.minY + boundingBoxPx.maxY) / 2
  const panX = canvasWidth / 2 - contentCenterX * zoom
  const panY = canvasHeight / 2 - contentCenterY * zoom
  return { zoom, panX, panY }
}
