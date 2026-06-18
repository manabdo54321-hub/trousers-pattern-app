/**
 * usePatternData.js
 * -----------------
 * هذا الـ hook هو "الجسر" بين تغييرات المستخدم في الـ Sidebar (المقاسات)
 * واستدعاء الباك إند. يستخدم debounce بسيط (300ms) لتجنب إرسال طلب API
 * في كل بكسل يحركه المستخدم على الـ slider، وبدلاً من ذلك ينتظر حتى
 * يتوقف عن السحب لحظة قصيرة، ثم يرسل طلباً واحداً فقط.
 *
 * هذا الـ hook لا يُستخدم إلا مرة واحدة في App.jsx (المستوى الأعلى)،
 * لأنه يراقب التغييرات على مستوى التطبيق كله ويحدّث بيانات الباترون
 * في الـ store المركزي.
 */

import { useEffect, useRef } from 'react'
import { usePatternStore } from '../store/patternStore'
import { generatePattern } from '../api/patternApi'

const DEBOUNCE_MS = 300

export function usePatternData() {
  const measurements = usePatternStore((state) => state.measurements)
  const seamAllowance = usePatternStore((state) => state.seamAllowance)
  const nestingOptions = usePatternStore((state) => state.nestingOptions)
  const setPatternData = usePatternStore((state) => state.setPatternData)
  const setLoading = usePatternStore((state) => state.setLoading)
  const setError = usePatternStore((state) => state.setError)

  // نحتفظ بمرجع للـ timeout الحالي حتى نقدر نلغيه إذا حصل تغيير جديد
  // قبل انتهاء فترة الانتظار (هذا هو جوهر مبدأ الـ debounce)
  const debounceTimer = useRef(null)

  useEffect(() => {
    // إلغاء أي طلب مجدول سابقاً، لأن المستخدم غيّر قيمة جديدة
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await generatePattern(measurements, seamAllowance, nestingOptions)
        setPatternData(data)
      } catch (err) {
        setError('حدث خطأ في توليد الباترون. تأكد من أن السيرفر يعمل.')
        console.error('فشل توليد الباترون:', err)
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    // تنظيف الـ timer عند إلغاء تحميل المكوّن لمنع تسريب الذاكرة
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measurements, seamAllowance, nestingOptions])
}
