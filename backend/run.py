"""
run.py
------
سكريبت تشغيل مبسّط للتطوير المحلي.
التشغيل: python run.py
الخدمة ستعمل على: http://127.0.0.1:8000
التوثيق التفاعلي (Swagger UI): http://127.0.0.1:8000/docs
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,  # إعادة تحميل تلقائية عند تعديل أي ملف (للتطوير فقط)
    )
