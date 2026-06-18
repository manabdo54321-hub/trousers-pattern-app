/**
 * constants.js
 * ------------
 * كل النصوص العربية والقيم الافتراضية الثابتة في مكان واحد، حتى يسهل
 * تعديل أي تسمية أو قيمة افتراضية دون البحث في كل الملفات.
 */

// تعريف كل حقل مقاس: المفتاح (يطابق Pydantic schema في الباك إند)،
// الاسم المعروض بالعربي، والحدود (min/max) المنطقية لكل مقاس بالسنتيمتر.
export const MEASUREMENT_FIELDS = [
  { key: 'total_length', label: 'الطول الكامل', min: 60, max: 130, step: 0.5 },
  { key: 'waist_width', label: 'نصف عرض الخصر', min: 15, max: 40, step: 0.5 },
  { key: 'hip_drop', label: 'انخفاض الأرداف عن الخصر', min: 10, max: 25, step: 0.5 },
  { key: 'hip_width', label: 'نصف عرض الأرداف', min: 15, max: 45, step: 0.5 },
  { key: 'crotch_drop', label: 'انخفاض فتحة الحوض', min: 15, max: 35, step: 0.5 },
  { key: 'thigh_width', label: 'نصف عرض الفخذ', min: 20, max: 50, step: 0.5 },
  { key: 'knee_drop', label: 'انخفاض الركبة', min: 35, max: 70, step: 0.5 },
  { key: 'knee_width', label: 'نصف عرض الركبة', min: 12, max: 30, step: 0.5 },
  { key: 'hem_width', label: 'نصف عرض الكفة', min: 8, max: 25, step: 0.5 },
  { key: 'dart_length', label: 'طول البنس (الكسرة)', min: 0, max: 20, step: 0.5 },
  { key: 'dart_width', label: 'عرض البنس', min: 0, max: 6, step: 0.25 },
]

// القيم الافتراضية تطابق Pydantic defaults في schemas.py تماماً
export const DEFAULT_MEASUREMENTS = {
  total_length: 92.0,
  waist_width: 24.5,
  hip_drop: 18.0,
  hip_width: 25.5,
  crotch_drop: 27.0,
  thigh_width: 35.0,
  knee_drop: 55.0,
  knee_width: 21.0,
  hem_width: 15.0,
  dart_length: 10.0,
  dart_width: 2.5,
}

export const DEFAULT_SEAM_ALLOWANCE = 1.5

// تحويل سم إلى بكسل على الكانفاس. هذا "المقياس الأساسي" (base scale)
// عند مستوى تكبير = 1. الزووم بعد ذلك يضرب في هذا المقياس فقط بصرياً
// دون التأثير على البيانات الحقيقية بالسنتيمتر.
export const CM_TO_PX = 6

// حدود الزووم المسموحة (لمنع التصغير/التكبير المفرط الذي يفسد التجربة)
export const ZOOM_MIN = 0.1
export const ZOOM_MAX = 8

export const EXPORT_FORMATS = [
  { key: 'svg', label: 'SVG (للتعديل المتجهي)' },
  { key: 'pdf_a4', label: 'PDF - A4 للطباعة المنزلية' },
  { key: 'pdf_plotter', label: 'PDF - بلوتر صناعي' },
  { key: 'dxf', label: 'DXF (لماكينات القطع بالليزر)' },
]
