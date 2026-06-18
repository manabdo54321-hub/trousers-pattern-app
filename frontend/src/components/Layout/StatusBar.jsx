/**
 * StatusBar.jsx
 * -------------
 * شريط سفلي صغير يعرض معلومات سياقية مفيدة: مستوى الزووم الحالي
 * (مهم جداً في تطبيق CAD حتى يعرف المستخدم إذا كان يشاهد الباترون
 * بمقياس حقيقي أو مكبّراً)، وعدد القطع المعروضة حالياً.
 */

import { usePatternStore } from '../../store/patternStore'

export default function StatusBar() {
  const zoom = usePatternStore((state) => state.zoom)
  const pieces = usePatternStore((state) => state.pieces)

  return (
    <footer className="h-8 bg-gray-100 border-t border-gray-200 flex items-center justify-between px-4 text-xs text-gray-500 shrink-0">
      <span>عدد القطع: {pieces.length}</span>
      <span>مستوى التكبير: {Math.round(zoom * 100)}%</span>
    </footer>
  )
}
