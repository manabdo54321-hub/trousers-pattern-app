import { useEffect, useRef } from 'react'
import * as fabric from 'fabric'
import { usePatternStore } from '../store/patternStore'
import { ZOOM_MIN, ZOOM_MAX } from '../utils/constants'

export function useFabricCanvas(canvasElementRef) {
  const fabricCanvasRef = useRef(null)
  const setZoom = usePatternStore((state) => state.setZoom)
  const setPan = usePatternStore((state) => state.setPan)

  useEffect(() => {
    if (!canvasElementRef.current) return

    const canvas = new fabric.Canvas(canvasElementRef.current, {
      backgroundColor: '#f8f9fa',
      selection: false,
      preserveObjectStacking: true,
      allowTouchScrolling: false,
    })
    fabricCanvasRef.current = canvas

    function resizeCanvas() {
      const container = canvasElementRef.current?.parentElement
      if (!container) return
      canvas.setWidth(container.clientWidth)
      canvas.setHeight(container.clientHeight)
      canvas.renderAll()
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Zoom بعجلة الماوس
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY
      let zoom = canvas.getZoom()
      zoom *= 0.999 ** delta
      zoom = Math.min(Math.max(zoom, ZOOM_MIN), ZOOM_MAX)
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom)
      setZoom(zoom)
      const vpt = canvas.viewportTransform
      setPan(vpt[4], vpt[5])
      opt.e.preventDefault()
      opt.e.stopPropagation()
    })

    // Pan بالماوس (على الخلفية فقط)
    let isPanning = false
    let lastPosX = 0, lastPosY = 0

    canvas.on('mouse:down', (opt) => {
      if (!opt.target) {
        isPanning = true
        lastPosX = opt.e.clientX
        lastPosY = opt.e.clientY
        canvas.setCursor('grabbing')
      }
    })
    canvas.on('mouse:move', (opt) => {
      if (!isPanning) return
      const vpt = canvas.viewportTransform
      vpt[4] += opt.e.clientX - lastPosX
      vpt[5] += opt.e.clientY - lastPosY
      canvas.requestRenderAll()
      lastPosX = opt.e.clientX
      lastPosY = opt.e.clientY
    })
    canvas.on('mouse:up', () => {
      isPanning = false
      canvas.setCursor('default')
      const vpt = canvas.viewportTransform
      setPan(vpt[4], vpt[5])
    })

    // دعم اللمس (Touch) للموبايل
    let lastTouchDist = null
    let lastTouchX = null
    let lastTouchY = null
    let touchTarget = null

    const el = canvas.upperCanvasEl

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        const rect = el.getBoundingClientRect()
        const x = touch.clientX - rect.left
        const y = touch.clientY - rect.top
        touchTarget = canvas.findTarget({ clientX: touch.clientX, clientY: touch.clientY })
        lastTouchX = touch.clientX
        lastTouchY = touch.clientY
        lastTouchDist = null
      } else if (e.touches.length === 2) {
        touchTarget = null
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastTouchDist = Math.hypot(dx, dy)
        lastTouchX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        lastTouchY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      }
      e.preventDefault()
    }, { passive: false })

    el.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && !touchTarget) {
        // Pan باصبع واحد على الخلفية
        const touch = e.touches[0]
        const vpt = canvas.viewportTransform
        vpt[4] += touch.clientX - lastTouchX
        vpt[5] += touch.clientY - lastTouchY
        canvas.requestRenderAll()
        lastTouchX = touch.clientX
        lastTouchY = touch.clientY
      } else if (e.touches.length === 2) {
        // Pinch to zoom بإصبعين
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
        const rect = el.getBoundingClientRect()

        if (lastTouchDist) {
          let zoom = canvas.getZoom() * (dist / lastTouchDist)
          zoom = Math.min(Math.max(zoom, ZOOM_MIN), ZOOM_MAX)
          canvas.zoomToPoint({ x: midX - rect.left, y: midY - rect.top }, zoom)
          setZoom(zoom)
        }
        lastTouchDist = dist
        lastTouchX = midX
        lastTouchY = midY
      }
      e.preventDefault()
    }, { passive: false })

    el.addEventListener('touchend', () => {
      lastTouchDist = null
      touchTarget = null
      const vpt = canvas.viewportTransform
      setPan(vpt[4], vpt[5])
    }, { passive: true })

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      canvas.dispose()
      fabricCanvasRef.current = null
    }
  }, [])

  return fabricCanvasRef
}
