/**
 * patternApi.js
 * -------------
 * كل دوال الاتصال بالـ FastAPI backend في مكان واحد. أي مكوّن React
 * يحتاج بيانات من السيرفر يستورد من هنا فقط، ولا يستخدم axios/fetch
 * مباشرة في أي مكان آخر — هذا يسهّل تغيير الـ base URL أو إضافة
 * معالجة أخطاء موحّدة دون لمس باقي الكود.
 *
 * ملاحظة عن النشر (Deployment):
 * في التطوير المحلي، نستخدم مساراً نسبياً '/api' ويتولى بروكسي Vite
 * (vite.config.js) توجيهه إلى 127.0.0.1:8000. بعد النشر على Vercel،
 * لا يوجد بروكسي، فنحتاج الرابط الكامل للباك إند على Render، والذي
 * نقرأه من متغير بيئة VITE_API_URL (يُضبط من لوحة تحكم Vercel).
 */

import axios from 'axios'

// إذا كان متغير البيئة VITE_API_URL موجوداً (في بيئة الإنتاج على Vercel)
// نستخدمه كاملاً، وإلا نستخدم '/api' النسبي (في التطوير المحلي عبر بروكسي Vite)
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * يطلب توليد باترون جديد من الباك إند بناءً على المقاسات الحالية
 * وإعدادات الـ Nesting (عدد القطع، المسافة، العكس).
 *
 * @param {Object} measurements - كل المقاسات (يطابق TrousersMeasurements)
 * @param {number} seamAllowance - سماح الخياطة بالسنتيمتر
 * @param {Object} nestingOptions - { numPieces, spacing, autoFlip }
 * @returns {Promise<Object>} - PatternGenerationResponse من الباك إند
 */
export async function generatePattern(measurements, seamAllowance, nestingOptions) {
  const response = await api.post('/pattern/generate', {
    measurements,
    seam_allowance: seamAllowance,
    num_pieces: nestingOptions.numPieces,
    spacing: nestingOptions.spacing,
    auto_flip: nestingOptions.autoFlip,
  })
  return response.data
}

/**
 * يصدّر القطع الحالية (بعد أي تعديل يدوي بالسحب) إلى الصيغة المطلوبة.
 * يرجع الملف كـ Blob جاهز للتنزيل المباشر في المتصفح.
 *
 * @param {string} format - 'svg' | 'pdf' | 'dxf'
 * @param {Array} pieces - قطع الباترون الحالية (بنفس بنية PatternPiece)
 * @param {Object} options - { pageSize, includeSeamAllowance, includeGrainline, includeLabels }
 */
export async function exportPattern(format, pieces, options = {}) {
  const payload = {
    pieces,
    page_size: options.pageSize ?? 'A4',
    include_seam_allowance: options.includeSeamAllowance ?? true,
    include_grainline: options.includeGrainline ?? true,
    include_labels: options.includeLabels ?? true,
  }

  let url = `/export/${format}`
  if (format === 'pdf' && options.pageSize) {
    url += `?page_size=${options.pageSize}`
  }

  const response = await api.post(url, payload, { responseType: 'blob' })
  return response.data
}

/**
 * دالة مساعدة لتنزيل Blob مباشرة في المتصفح بدون الحاجة لفتح تبويب جديد،
 * تُستخدم بعد استدعاء exportPattern للحصول على تجربة "تنزيل فوري".
 */
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
