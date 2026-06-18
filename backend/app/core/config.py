"""
config.py
---------
إعدادات عامة قابلة للتعديل من مكان واحد، بدل توزيعها في main.py.

ملاحظة عن النشر (Deployment):
في بيئة التطوير المحلي نسمح فقط لـ localhost. في بيئة الإنتاج (Render)،
نقرأ دومين الفرونت إند الحقيقي (مثلاً https://your-app.vercel.app) من
متغير بيئة اسمه FRONTEND_URL، حتى لا نحتاج لتعديل الكود نفسه عند كل
نشر جديد — فقط نضبط المتغير من لوحة تحكم Render.
"""

import os

# النطاقات المسموح لها بالاتصال بالـ API (CORS).
# نبدأ بقائمة التطوير المحلي، ثم نضيف دومين الإنتاج إذا كان متوفراً
# كمتغير بيئة (سيُضبط هذا في لوحة تحكم Render بعد ربط الفرونت إند).
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

_frontend_url = os.environ.get("FRONTEND_URL")
if _frontend_url:
    CORS_ORIGINS.append(_frontend_url)

APP_TITLE = "Trousers Pattern Generator API"
APP_VERSION = "1.0.0"
APP_DESCRIPTION = "خدمة توليد باترونات البنطلون البارامترية (Parametric Trousers Pattern Service)"

