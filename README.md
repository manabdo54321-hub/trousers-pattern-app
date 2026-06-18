# مولّد باترون البنطلون الاحترافي

تطبيق ويب لتوليد باترون بنطلون بارامتري بالكامل، مع تصدير صناعي
(SVG / PDF / DXF). الباك إند بـ FastAPI، الفرونت إند بـ React + Vite.

## خطوات النشر (من الموبايل، بدون كمبيوتر)

### الخطوة 1: رفع الكود على GitHub

1. افتح تطبيق GitHub (أو من المتصفح)، اعمل مستودع (Repository) جديد
   باسم مثلاً `trousers-pattern-app`، واخليه **Public** (مجاني، وأسهل
   للربط مع Render/Vercel).
2. ارفع كل محتوى هذا المجلد (backend + frontend + الملفات في الجذر)
   إلى المستودع. لو معاك Termux، تقدر تستخدم git مباشرة:
   ```
   cd trousers-pattern-app
   git init
   git add .
   git commit -m "أول نسخة من المشروع"
   git branch -M main
   git remote add origin https://github.com/USERNAME/trousers-pattern-app.git
   git push -u origin main
   ```
   (لو git مش مثبت في Termux: `pkg install git`)

### الخطوة 2: نشر الباك إند على Render

1. روح على render.com وسجّل دخول بحساب GitHub بتاعك.
2. اضغط "New +" ثم "Web Service".
3. اختار المستودع `trousers-pattern-app`.
4. Render هيكتشف ملف `render.yaml` تلقائياً ويملأ الإعدادات (Root
   Directory: backend، Build Command، Start Command). لو ملف
   render.yaml ما اتعرفش تلقائياً، حدد يدوياً:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. اختار الخطة (Plan): **Free**.
6. اضغط "Create Web Service" وانتظر حتى ينتهي البناء (Build).
7. بعد الانتهاء، Render هيعطيك رابطاً مثل:
   `https://trousers-pattern-backend.onrender.com`
   **احتفظ بهذا الرابط، ستحتاجه في الخطوة القادمة.**

> ملاحظة: الخطة المجانية في Render "تنام" بعد فترة من عدم الاستخدام،
> وأول طلب بعد النوم قد يستغرق 30-50 ثانية حتى "يصحى" السيرفر. هذا
> طبيعي ولا يعني وجود خطأ.

### الخطوة 3: نشر الفرونت إند على Vercel

1. روح على vercel.com وسجّل دخول بحساب GitHub بتاعك.
2. اضغط "Add New..." ثم "Project".
3. اختار نفس المستودع `trousers-pattern-app`.
4. في إعدادات المشروع:
   - Root Directory: اضغط "Edit" واختار `frontend`.
   - Framework Preset: سيكتشف Vite تلقائياً.
5. **مهم جداً**: قبل الضغط على Deploy، افتح قسم "Environment Variables"
   وأضف:
   - Name: `VITE_API_URL`
   - Value: الرابط اللي أخدته من Render في الخطوة السابقة (بدون / في
     النهاية)، مثلاً: `https://trousers-pattern-backend.onrender.com`
6. اضغط "Deploy" وانتظر حتى ينتهي البناء.
7. بعد الانتهاء، Vercel هيعطيك رابطاً مثل:
   `https://trousers-pattern-app.vercel.app`
   **هذا هو رابط التطبيق النهائي الذي تفتحه من المتصفح في موبايلك.**

### الخطوة 4: ربط الباك إند بدومين الفرونت إند (لإتمام CORS)

1. رجّع روح على لوحة تحكم Render، افتح الباك إند بتاعك.
2. روح "Environment" وأضف متغير جديد:
   - Key: `FRONTEND_URL`
   - Value: رابط Vercel اللي أخدته في الخطوة السابقة، مثلاً:
     `https://trousers-pattern-app.vercel.app`
3. احفظ، وRender هيعيد تشغيل الباك إند تلقائياً بهذا التعديل.

### الخطوة 5: التجربة

افتح رابط Vercel من متصفح موبايلك. أول طلب ممكن ياخد وقت (لأن
الباك إند "بيصحى" من النوم)، بعد كده هيشتغل بسلاسة.

## التطوير المحلي (لو حصلت على كمبيوتر مستقبلاً)

```bash
# الباك إند
cd backend
pip install -r requirements.txt
python run.py
# الباك إند هيشتغل على http://127.0.0.1:8000

# الفرونت إند (تيرمينال/تاب تانية)
cd frontend
npm install
npm run dev
# الفرونت إند هيشتغل على http://localhost:5173
```
