/**
 * useFabricCanvas.js
 * ------------------
 * هذا الـ hook مسؤول حصرياً عن "دورة حياة" fabric.Canvas: إنشاؤه مرة
 * واحدة عند تحميل المكوّن، وتدميره (dispose) عند إلغاء التحميل، وربط
 * أحداث الـ Pan (بالماوس) والـ Zoom (بعجلة الماوس) به.
 *
 * فصل هذا المنطق عن CanvasArea.jsx يحل مشكلة شائعة جداً عند دمج
 * مكتبات canvas خارجية مع React: لو وضعنا new fabric.Canvas() مباشرة
 * داخل useEffect في المكوّن الرئيسي بدون عناية، أي إعادة render
 * (re-render) قد يعيد إنشاء الكانفاس من الصفر ويفقد كل الحالة
 * (موضع الزووم، القطع المسحوبة). هنا نضمن أن "إنشاء الكانفاس" يحدث
 * مرة واحدة فقط طوال عمر المكوّن (dependency array فاضية []).
 */

import { useEffect, useRef } from 'react'
import * as fabric from 'fabric'
import { usePatternStore } from '../store/patternStore'
import { ZOOM_MIN, ZOOM_MAX } from '../utils/constants'

export function useFabricCanvas(canvasElementRef) {
  // fabricCanvasRef يحمل الـ instance الفعلي طوال عمر المكوّن،
  // ونستخدم useRef بدل useState لأن تغييره لا يجب أن يسبب re-render
  // (Fabric.js يدير رسمه الداخلي بنفسه عبر render loop خاص به)
  const fabricCanvasRef = useRef(null)

  const setZoom = usePatternStore((state) => state.setZoom)
  const setPan = usePatternStore((state) => state.setPan)

  useEffect(() => {
    if (!canvasElementRef.current) return

    const canvas = new fabric.Canvas(canvasElementRef.current, {
      backgroundColor: '#f8f9fa',
      selection: false, // نمنع التحديد المتعدد بالمستطيل، لأن قطعنا تُسحب فردياً فقط
      preserveObjectStacking: true,
    })
    fabricCanvasRef.current = canvas

    // ---------------------------------------------------
    // ضبط حجم الكانفاس ليطابق حجم العنصر الأب (responsive)
    // ---------------------------------------------------
    function resizeCanvas() {
      const container = canvasElementRef.current.parentElement
      if (!container) return
      canvas.setWidth(container.clientWidth)
      canvas.setHeight(container.clientHeight)
      canvas.renderAll()
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // ---------------------------------------------------
    // التكبير/التصغير بعجلة الماوس (Zoom)
    // المبدأ: Fabric.js يدعم "viewportTransform" وهو مصفوفة تحويل
    // تُطبَّق على كل المحتوى دفعة واحدة، فلا نحتاج لإعادة حساب موضع
    // كل نقطة من نقاط الباترون يدوياً عند الزووم — هذا يحافظ على
    // المقياس الحقيقي (real-world scale) للأبعاد بدقة 100%، لأن
    // البيانات بالسنتيمتر تبقى ثابتة ولا تُعاد كتابتها أبداً، فقط
    // "كاميرا" العرض هي التي تتحرك وتتكبّر.
    // ---------------------------------------------------
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY
      let zoom = canvas.getZoom()
      zoom *= 0.999 ** delta
      if (zoom > ZOOM_MAX) zoom = ZOOM_MAX
      if (zoom < ZOOM_MIN) zoom = ZOOM_MIN

      // التكبير حول نقطة الماوس (zoomToPoint) وليس حول مركز الشاشة،
      // وهذا هو السلوك المتوقع في برامج CAD الاحترافية: الجزء الذي
      // يشير إليه المستخدم هو الذي يبقى ثابتاً بصرياً أثناء التكبير.
      const pointer = canvas.getPointer(opt.e)
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom)

      setZoom(zoom)
      const vpt = canvas.viewportTransform
      setPan(vpt[4], vpt[5])

      opt.e.preventDefault()
      opt.e.stopPropagation()
    })

    // ---------------------------------------------------
    // التحريك (Pan) بالسحب على فضاء الكانفاس الفارغ
    // نفعّله فقط عند الضغط على المسافة الفاضية (ليس على قطعة)، حتى لا
    // يتعارض مع سحب القطع نفسها (Manual Nesting بالسحب)
    // ---------------------------------------------------
    let isPanning = false
    let lastPosX = 0
    let lastPosY = 0

    canvas.on('mouse:down', (opt) => {
      const evt = opt.e
      // نبدأ الـ pan فقط إذا لم يكن المستخدم قد ضغط على شكل (target)،
      // أي ضغط على الخلفية الفارغة فقط
      if (!opt.target) {
        isPanning = true
        canvas.selection = false
        lastPosX = evt.clientX
        lastPosY = evt.clientY
        canvas.setCursor('grabbing')
      }
    })

    canvas.on('mouse:move', (opt) => {
      if (isPanning) {
        const evt = opt.e
        const vpt = canvas.viewportTransform
        vpt[4] += evt.clientX - lastPosX
        vpt[5] += evt.clientY - lastPosY
        canvas.requestRenderAll()
        lastPosX = evt.clientX
        lastPosY = evt.clientY
      }
    })

    canvas.on('mouse:up', () => {
      isPanning = false
      canvas.setCursor('default')
      const vpt = canvas.viewportTransform
      setPan(vpt[4], vpt[5])
    })

    // ---------------------------------------------------
    // التنظيف: تدمير الكانفاس عند إلغاء تحميل المكوّن (مهم جداً لمنع
    // تسريب الذاكرة وتراكم event listeners عبر إعادة التحميلات المتكررة
    // في بيئة React StrictMode)
    // ---------------------------------------------------
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      canvas.dispose()
      fabricCanvasRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return fabricCanvasRef
}
