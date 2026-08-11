# Ryan Games — ريان ألعاب

منصة موحّدة لتعريبات الألعاب العربية: ويب + PWA + أندرويد + ويندوز، بمصدر بيانات واحد (Supabase) ولوحة إدارة تنشر مرة واحدة فتظهر في كل مكان.

| المنصة | التقنية | الخرج |
|---|---|---|
| الويب | GitHub Pages | `https://cmn124you-byte.github.io/ryangames/` |
| PWA | manifest.json + sw.js | تثبيت من المتصفح |
| أندرويد | Capacitor | `RyanGames-*.apk` |
| ويندوز | Electron | `RyanGames-*-setup.exe` + portable |

## البنية

```
ry-config.js        إعدادات التشغيل (SUPABASE_URL/ANON_KEY فارغة حتى تُملأ يدوياً)
ry-api.js           عميل البيانات الموحد لكل المنصات (قراءة Supabase + كاش محلي)
data.js             البيانات الافتراضية (مصدر الهجرة، لا يُحذف)
app.js              منطق الموقع ولوحة الإدارة القديمة (متوافق مع ry-api)
home.js             واجهة الصفحة الرئيسية
functions/          Netlify Functions — طبقة الكتابة الإدارية فقط (service role)
supabase/schema.sql مخطط Supabase + RLS (نفّذه في محرر SQL أولاً)
supabase/seed/      الهجرة الآمنة data.js → Supabase
scripts/            مولّد صفحات الألعاب الثابتة للـ SEO
desktop/            مشروع Electron (ويندوز)
mobile/             مشروع Capacitor (أندرويد)
.github/workflows/  بناء ونشر تلقائي (Pages + APK + EXE)
```

## خطوات التشغيل

### 1) إنشاء Supabase
1. أنشئ مشروعاً جديداً في supabase.com.
2. نفّذ محتوى `supabase/schema.sql` في SQL Editor.
3. أنشئ Bucket باسم `ry-games` واجعله **public**.
4. من **Settings → API** انسخ: Project URL و anon key و service role key.

### 2) الهجرة (مرة واحدة)
```bash
cd supabase/seed
cp .env.example .env   # املأ SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm install
npm run seed           # يرفع الألعاب + الصور + الدروس + الأخبار + الطلبات
```

### 3) ربط الواجهة
في `ry-config.js` ضع:
```js
SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
SUPABASE_ANON_KEY: "your-anon-key"
```
> ملاحظة: حقل القيم الفارغة يعني أن الموقع يعمل بالكاش/البيانات الافتراضية لحين ملئه.

### 4) Netlify Functions (الطبقة الإدارية)
انشر المجلد الجذر على Netlify، ونسخ `functions/.env.example` إلى **Site settings → Environment variables**:
- `SUPABASE_URL` و `SUPABASE_SERVICE_ROLE_KEY` (ضروري)
- `ADMIN_WRITE_KEY` = نفس «مفتاح النشر» في إعدادات المالك بلوحة الإدارة
- `AI_TRANSLATE_PROVIDER` + `OPENAI_API_KEY` أو `GOOGLE_API_KEY` (اختياري، للتعريب الذكي)

التوجيهات في `netlify.toml`: `/api/*` → الدوال، و`/game/:slug` → صفحات الألعاب.

### 5) البناء المحلي أو عبر GitHub Actions
- **ويب**: ادفع إلى `main` → يبني GitHub Actions صفحات SEO وينشرها على Pages تلقائياً.
- **أندرويد**: من GitHub → Actions → Build Android APK → Run workflow. الناتج في Artifacts.
- **ويندوز**: نفس الشيء عبر Build Windows EXE.

## الأمان
- مفتاح service role **في الدوال فقط** (Netlify env vars). الواجهة تستخدم anon key + RLS.
- RLS تسمح للعموم بقراءة المنشور فقط، ولأي زائر إرسال طلب تعريب، ولا شيء غيره.
- لا ترفع أي `*.env` يحتوي مفاتيح حقيقية إلى git.
