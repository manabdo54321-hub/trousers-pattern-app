/**
 * App.jsx
 * -------
 * المكوّن الجذري للتطبيق. مسؤوليته الوحيدة هي التخطيط (Layout) العام:
 * Header في الأعلى، Sidebar في الجانب، CanvasArea في الوسط، StatusBar
 * في الأسفل. كل المنطق الفعلي (الحالة، API، الرسم) موجود في الأماكن
 * المتخصصة له (store, hooks, components/Canvas).
 *
 * usePatternData() يُستدعى هنا مرة واحدة فقط على مستوى التطبيق كله،
 * لأنه "يستمع" لتغيّرات المقاسات في الـ store ويُحدِّث بيانات الباترون
 * تلقائياً — لا حاجة لاستدعائه في أي مكوّن فرعي آخر.
 */

import { useEffect } from 'react'
import Header from './components/Layout/Header'
import StatusBar from './components/Layout/StatusBar'
import Sidebar from './components/Sidebar/Sidebar'
import CanvasArea from './components/Canvas/CanvasArea'
import { usePatternData } from './hooks/usePatternData'

export default function App() {
  // يراقب تغييرات المقاسات/سماح الخياطة/إعدادات Nesting في الـ store
  // ويرسل طلب توليد جديد للباك إند تلقائياً (مع debounce)
  usePatternData()

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* الكانفاس في المنتصف (لاحظ ترتيب flex مع RTL: في HTML الجانبي
            الذي نكتبه أولاً (Sidebar) يظهر على اليمين بصرياً بسبب dir="rtl"
            في index.html، وهذا هو الترتيب المتوقع للمستخدم العربي:
            عناصر التحكم على اليمين، مساحة العرض الرئيسية تتوسّع لليسار) */}
        <Sidebar />
        <CanvasArea />
      </div>

      <StatusBar />
    </div>
  )
}
