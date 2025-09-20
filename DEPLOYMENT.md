# دليل النشر على Vercel 🚀

## متطلبات النشر

### 1. متغيرات البيئة المطلوبة في Vercel

يجب إضافة هذه المتغيرات في لوحة تحكم Vercel:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyBuuM3rbUFdu2MSTEg-w7pB-9l_Q1SOj5M
VITE_FIREBASE_AUTH_DOMAIN=al-farhan-c3a30.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=al-farhan-c3a30
VITE_FIREBASE_STORAGE_BUCKET=al-farhan-c3a30.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=871976480343
VITE_FIREBASE_APP_ID=1:871976480343:web:baea3ef580b28a3589fd12
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# App Configuration
VITE_APP_NAME=نظام أبو فرحان للنقل الخفيف
VITE_APP_VERSION=1.0.0

# Build Configuration
NODE_ENV=production
```

### 2. خطوات النشر

#### الطريقة الأولى: ربط Git Repository
1. ادفع الكود إلى GitHub/GitLab
2. اربط المستودع بـ Vercel
3. أضف متغيرات البيئة في إعدادات المشروع
4. انشر تلقائياً

#### الطريقة الثانية: Vercel CLI
```bash
# تثبيت Vercel CLI
npm i -g vercel

# تسجيل الدخول
vercel login

# النشر
vercel --prod
```

### 3. إعدادات Vercel المطلوبة

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node.js Version**: 18.x

### 4. ملفات التكوين الموجودة

- ✅ `vercel.json` - إعدادات النشر
- ✅ `vite.config.ts` - إعدادات البناء محسنة
- ✅ `tsconfig.json` - إعدادات TypeScript محسنة
- ✅ `src/vite-env.d.ts` - تعريفات متغيرات البيئة
- ✅ `.vercelignore` - ملفات مستبعدة من النشر
- ✅ `public/offline.html` - صفحة أوف لاين للـ PWA

### 5. ميزات PWA المدعومة

- ✅ Service Worker للعمل أوف لاين
- ✅ Web App Manifest للتثبيت
- ✅ Caching للأداء السريع
- ✅ صفحة أوف لاين مخصصة

### 6. استكشاف الأخطاء

#### خطأ في البناء (Build Error)
```bash
# تحقق من الأخطاء محلياً
npm run build

# تحقق من TypeScript
npx tsc --noEmit
```

#### خطأ في متغيرات البيئة
- تأكد من إضافة جميع متغيرات البيئة في Vercel
- تحقق من أن الأسماء تبدأ بـ `VITE_`

#### خطأ في PWA
- تحقق من وجود ملف `public/manifest.json`
- تحقق من وجود الصور المطلوبة في `public/`

### 7. بعد النشر

1. تحقق من عمل الموقع
2. اختبر ميزات PWA
3. تحقق من عمل Firebase
4. اختبر الوضع أوف لاين

## روابط مفيدة

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [PWA Deployment](https://vite-pwa-org.netlify.app/deployment/)

---

✨ **ملاحظة**: تم تحسين جميع الإعدادات للنشر الناجح على Vercel
