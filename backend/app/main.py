"""
main.py
-------
نقطة الدخول الرئيسية لتطبيق FastAPI. مسؤول فقط عن:
1. إنشاء instance التطبيق وضبط الـ metadata (للتوثيق التلقائي /docs).
2. تفعيل CORS middleware.
3. تسجيل (include) كل الـ routers من app/api/routes.

لا يوجد أي منطق حسابي هنا — كل الحسابات في app/services، وكل التعريفات
في app/models، حفاظاً على فصل المسؤوليات (Separation of Concerns).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import APP_TITLE, APP_VERSION, APP_DESCRIPTION, CORS_ORIGINS
from app.api.routes import pattern
from app.api.routes import export

app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# تسجيل الـ routers: كل مجموعة endpoints في ملفها الخاص لسهولة التوسع
app.include_router(pattern.router)
app.include_router(export.router)


@app.get("/", tags=["Health"])
def health_check():
    """نقطة فحص بسيطة للتأكد من أن الخدمة تعمل."""
    return {"status": "ok", "service": APP_TITLE}
