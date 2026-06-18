/**
 * Sidebar.jsx
 * -----------
 * القائمة الجانبية الكاملة: تحتوي على كل عناصر التحكم التي يغيّرها
 * المستخدم — المقاسات (sliders)، سماح الخياطة، إعدادات الـ Nesting
 * (عدد القطع، المسافة، العكس التلقائي)، وأخيراً لوحة التصدير.
 *
 * هذا المكوّن لا يستدعي API مباشرة؛ هو فقط يقرأ ويكتب في usePatternStore،
 * والـ hook usePatternData (المُستخدَم في App.jsx على المستوى الأعلى)
 * هو من يلاحظ تغيّر الـ store ويرسل الطلب فعلياً. هذا يحافظ على مبدأ
 * "مصدر واحد للحقيقة" (Single Source of Truth) ويمنع تكرار منطق API.
 */

import { RotateCcw } from 'lucide-react'
import { usePatternStore } from '../../store/patternStore'
import { MEASUREMENT_FIELDS } from '../../utils/constants'
import MeasurementSlider from './MeasurementSlider'
import ExportPanel from './ExportPanel'

export default function Sidebar() {
  const measurements = usePatternStore((state) => state.measurements)
  const updateMeasurement = usePatternStore((state) => state.updateMeasurement)
  const seamAllowance = usePatternStore((state) => state.seamAllowance)
  const setSeamAllowance = usePatternStore((state) => state.setSeamAllowance)
  const resetMeasurements = usePatternStore((state) => state.resetMeasurements)

  const nestingOptions = usePatternStore((state) => state.nestingOptions)
  const updateNestingOption = usePatternStore((state) => state.updateNestingOption)
  const resetManualOffsets = usePatternStore((state) => state.resetManualOffsets)

  return (
    <aside className="w-80 h-full bg-white border-l border-gray-200 overflow-y-auto p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">مقاسات البنطلون</h2>
        <button
          onClick={resetMeasurements}
          title="إعادة ضبط كل المقاسات للقيم الافتراضية"
          className="text-gray-400 hover:text-pattern-blue transition-colors"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* ------------------------------------------------- */}
      {/* قسم المقاسات الجسدية                                */}
      {/* ------------------------------------------------- */}
      <section className="mb-6">
        {MEASUREMENT_FIELDS.map((field) => (
          <MeasurementSlider
            key={field.key}
            field={field}
            value={measurements[field.key]}
            onChange={updateMeasurement}
          />
        ))}
      </section>

      {/* ------------------------------------------------- */}
      {/* قسم سماح الخياطة                                    */}
      {/* ------------------------------------------------- */}
      <section className="mb-6 border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">سماح الخياطة</h3>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-gray-700">المسافة</label>
          <span className="text-sm font-semibold text-pattern-red bg-red-50 px-2 py-0.5 rounded">
            {seamAllowance} سم
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={5}
          step={0.25}
          value={seamAllowance}
          onChange={(e) => setSeamAllowance(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
        />
      </section>

      {/* ------------------------------------------------- */}
      {/* قسم Auto-Nesting (التعشيش الآلي)                    */}
      {/* ------------------------------------------------- */}
      <section className="mb-2 border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">التعشيش الآلي (Auto-Nesting)</h3>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-gray-700">عدد القطع</label>
            <span className="text-sm font-semibold text-gray-700">{nestingOptions.numPieces}</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={nestingOptions.numPieces}
            onChange={(e) => updateNestingOption('numPieces', parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-700"
          />
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-gray-700">المسافة بين القطع</label>
            <span className="text-sm font-semibold text-gray-700">{nestingOptions.spacing} سم</span>
          </div>
          <input
            type="range"
            min={0}
            max={20}
            step={0.5}
            value={nestingOptions.spacing}
            onChange={(e) => updateNestingOption('spacing', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-700"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={nestingOptions.autoFlip}
            onChange={(e) => {
              updateNestingOption('autoFlip', e.target.checked)
              // عكس القطع يغيّر شكلها بالكامل، فمن المنطقي تصفير أي
              // إزاحات سحب يدوي قديمة كانت محسوبة على شكل مختلف
              resetManualOffsets()
            }}
            className="w-4 h-4 accent-pattern-blue"
          />
          <span className="text-sm text-gray-700">عكس القطع الزوجية (توفير قماش)</span>
        </label>
      </section>

      {/* ------------------------------------------------- */}
      {/* قسم التصدير                                         */}
      {/* ------------------------------------------------- */}
      <ExportPanel />
    </aside>
  )
}
