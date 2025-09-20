# دليل المطور - نظام أبو فرحان للنقل الخفيف

## 🚀 البدء السريع

### المتطلبات الأساسية
- Node.js 18 أو أحدث
- npm أو yarn أو pnpm
- حساب Firebase مع مشروع جديد
- محرر نصوص (VS Code مُوصى به)

### خطوات التشغيل

1. **تثبيت التبعيات**
```bash
npm install
```

2. **إعداد Firebase**
   - إنشاء مشروع جديد في [Firebase Console](https://console.firebase.google.com)
   - تفعيل الخدمات التالية:
     - Authentication (Email/Password)
     - Firestore Database
     - Storage
     - Cloud Messaging
   - نسخ ملف الإعدادات:
   ```bash
   cp src/firebase/firebase-config.template.ts src/firebase/firebase-config.ts
   ```
   - تحديث `firebase-config.ts` بإعدادات مشروعك

3. **رفع قواعد الأمان**
```bash
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

4. **تشغيل التطبيق**
```bash
npm run dev
```

5. **بناء التطبيق للإنتاج**
```bash
npm run build
```

## 🏗️ بنية المشروع

```
al-farhan/
├── public/                 # ملفات الـ PWA والأصول العامة
│   ├── manifest.json      # ملف الـ PWA
│   └── robots.txt         # إعدادات محركات البحث
├── src/
│   ├── components/        # المكونات القابلة للإعادة الاستخدام
│   │   ├── ui/           # مكونات واجهة المستخدم الأساسية
│   │   ├── layout/       # مكونات تخطيط الصفحة
│   │   ├── inventory/    # مكونات إدارة المخزون
│   │   ├── sales/        # مكونات المبيعات
│   │   ├── agents/       # مكونات الوكلاء
│   │   ├── documents/    # مكونات تتبع الوثائق
│   │   ├── reports/      # مكونات التقارير
│   │   └── customer-inquiry/ # مكونات استعلام العملاء
│   ├── pages/            # صفحات التطبيق
│   ├── hooks/            # React Hooks مخصصة
│   ├── lib/              # وظائف مساعدة ومكتبات
│   ├── types/            # تعريفات TypeScript
│   ├── utils/            # وظائف مفيدة
│   ├── firebase/         # إعدادات وخدمات Firebase
│   ├── App.tsx           # المكون الرئيسي
│   ├── main.tsx          # نقطة الدخول
│   └── index.css         # الأنماط الرئيسية
├── firestore.rules       # قواعد أمان Firestore
├── Dockerfile            # إعدادات Docker
├── nginx.conf            # إعدادات Nginx للإنتاج
└── package.json          # تبعيات المشروع
```

## 🔧 التقنيات المستخدمة

### Frontend
- **React 18** - مكتبة واجهة المستخدم
- **TypeScript** - لغة البرمجة
- **Vite** - أداة البناء
- **Tailwind CSS** - إطار CSS مع دعم RTL
- **React Router** - التنقل
- **React Hook Form** - إدارة النماذج
- **Radix UI** - مكونات واجهة المستخدم
- **Lucide React** - الأيقونات

### Backend & Database
- **Firebase Firestore** - قاعدة البيانات NoSQL
- **Firebase Auth** - المصادقة والأمان
- **Firebase Storage** - تخزين الملفات
- **Firebase Cloud Messaging** - الإشعارات

### الميزات المتقدمة
- **Tesseract.js** - التعرف الضوئي على النصوص (OCR)
- **react-camera-pro** - التقاط الصور
- **Workbox** - العمل الأوفلاين (Service Worker)
- **date-fns** - معالجة التواريخ

## 🎯 الميزات الرئيسية

### ✅ مكتمل
- 🏠 **الصفحة الرئيسية**: لوحة معلومات شاملة مع الإحصائيات والأنشطة الحديثة
- 🔐 **نظام المصادقة**: تسجيل دخول آمن مع أدوار متعددة
- 📦 **إدارة المخزون**: إضافة وتحرير وعرض الأصناف مع OCR
- 🎨 **واجهة المستخدم**: تصميم احترافي مع دعم العربية (RTL)
- 📱 **PWA**: دعم كامل للتطبيق التقدمي

### 🚧 قيد التطوير
- 🛒 **نظام المبيعات**: فواتير البيع مع OCR لبطاقة العميل
- 👥 **إدارة الوكلاء**: حسابات الوكلاء والمدفوعات
- 📄 **تتبع الوثائق**: نظام تتبع الجواب
- 🔍 **استعلام العملاء**: البحث الشامل عن العملاء
- 📊 **التقارير**: تقارير المبيعات والمخزون والأرباح
- 🔔 **الإشعارات**: نظام الإشعارات الفورية
- ⚙️ **الإعدادات**: إعدادات النظام والمؤسسة

## 🛠️ التطوير

### إضافة ميزة جديدة

1. **إنشاء Branch جديد**
```bash
git checkout -b feature/feature-name
```

2. **إنشاء الأنواع المطلوبة في `src/types/`**
```typescript
export interface NewFeatureType {
  id: string;
  // ... other properties
}
```

3. **إنشاء المكونات في `src/components/`**
```tsx
export function NewFeatureComponent() {
  // Component implementation
}
```

4. **إنشاء الصفحة في `src/pages/`**
```tsx
export function NewFeaturePage() {
  // Page implementation
}
```

5. **إضافة التنقل في `src/components/layout/DashboardLayout.tsx`**

6. **اختبار الميزة**
```bash
npm run dev
```

7. **Commit والـ Push**
```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/feature-name
```

### قواعد الكود

- **TypeScript**: استخدام أنواع صارمة دائماً
- **الأسماء**: استخدام أسماء وصفية بالإنجليزية للمتغيرات والوظائف
- **التعليقات**: التعليقات بالعربية للوضوح
- **الأخطاء**: استخدام try-catch وعرض رسائل خطأ واضحة بالعربية
- **الأداء**: تحسين الاستعلامات وتجنب Re-renders غير الضرورية

### Firebase Security Rules

قواعد الأمان محفوظة في `firestore.rules`. عند تحديث القواعد:

```bash
firebase deploy --only firestore:rules
```

### اختبار OCR

لاختبار وظائف OCR:
1. استخدم صور واضحة مع إضاءة جيدة
2. تأكد من وضع النص داخل الإطار المحدد
3. استخدم خطوط واضحة وحجم كبير للنص
4. تجنب الظلال والانعكاسات

## 🚀 النشر

### النشر المحلي باستخدام Docker

```bash
# بناء الصورة
docker build -t al-farhan-app .

# تشغيل الحاوية
docker run -p 8080:80 al-farhan-app
```

### النشر على Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

### النشر على خادم Linux

```bash
# بناء التطبيق
npm run build

# رفع ملفات dist/ إلى الخادم
scp -r dist/* user@server:/var/www/html/

# إعداد Nginx
sudo cp nginx.conf /etc/nginx/sites-available/al-farhan
sudo ln -s /etc/nginx/sites-available/al-farhan /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

## 🐛 استكشاف الأخطاء

### مشاكل شائعة

1. **Firebase Connection Error**
   - تأكد من صحة إعدادات Firebase
   - تحقق من قواعد الأمان

2. **OCR لا يعمل**
   - تأكد من جودة الصورة
   - تحقق من إعدادات الكاميرا
   - راجع console للأخطاء

3. **PWA لا يثبت**
   - تأكد من وجود ملف manifest.json
   - تحقق من أن التطبيق يعمل على HTTPS

4. **مشاكل RTL**
   - تأكد من وجود `dir="rtl"` في HTML
   - استخدم فئات Tailwind المناسبة للـ RTL

### سجلات الأخطاء

- **Development**: تحقق من browser console
- **Production**: تحقق من Firebase Console > Analytics

## 📞 الدعم

للحصول على المساعدة أو الإبلاغ عن مشاكل:
1. راجع هذا الدليل أولاً
2. تحقق من الـ Issues المفتوحة
3. أنشئ Issue جديد مع تفاصيل المشكلة

## 📈 خطة التطوير المستقبلية

### الإصدار 1.1 (الربع القادم)
- [ ] إكمال نظام المبيعات
- [ ] نظام إدارة الوكلاء
- [ ] تتبع الوثائق الأساسي

### الإصدار 1.2
- [ ] التقارير المتقدمة
- [ ] نظام الإشعارات
- [ ] تطبيق Android/iOS

### الإصدار 2.0
- [ ] API للتكامل الخارجي
- [ ] لوحة معلومات تحليلية متقدمة
- [ ] نظام النسخ الاحتياطي التلقائي

---

**مطور بحب ❤️ لخدمة مؤسسة أبو فرحان للنقل الخفيف**