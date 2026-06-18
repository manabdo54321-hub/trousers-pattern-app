/**
 * MeasurementSlider.jsx
 * ----------------------
 * مكوّن واحد قابل لإعادة الاستخدام لعرض وتعديل مقاس واحد (slider + رقم).
 * فصله عن Sidebar.jsx يجعل إضافة مقاس جديد مستقبلاً (مثلاً لموديل قميص)
 * أمراً بسيطاً: فقط أضف عنصراً جديداً في MEASUREMENT_FIELDS بـ constants.js
 * دون الحاجة لتكرار أي JSX.
 */

export default function MeasurementSlider({ field, value, onChange }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-medium text-gray-700">{field.label}</label>
        <span className="text-sm font-semibold text-pattern-blue bg-blue-50 px-2 py-0.5 rounded">
          {value} سم
        </span>
      </div>
      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={(e) => onChange(field.key, parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-700"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>{field.min}</span>
        <span>{field.max}</span>
      </div>
    </div>
  )
}
