/**
 * Header.jsx
 * ----------
 * شريط علوي بسيط يحمل عنوان التطبيق فقط. فصله في ملف مستقل (بدل وضعه
 * مباشرة في App.jsx) يسهّل إضافة عناصر تحكم عامة لاحقاً (مثل تبديل
 * الوضع الليلي، أو قائمة "حفظ المشروع") دون تضخيم App.jsx.
 */

export default function Header() {
  return (
    <header className="h-14 bg-pattern-blue text-white flex items-center px-6 shadow-md shrink-0">
      <h1 className="text-base font-bold">مولّد باترون البنطلون الاحترافي</h1>
    </header>
  )
}
