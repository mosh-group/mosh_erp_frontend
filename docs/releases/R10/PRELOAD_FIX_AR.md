# MOSH ERP — R10 — إصلاح تحذيرات JavaScript preload

## السبب الجذري
كان `js/api-boot.js` ينشئ `link rel="preload" as="script"` لكل عنصر في `api-map.json` دفعة واحدة، ثم ينتظر `auth/status` و`bootstrap`، وبعد ذلك ينشئ عناصر `script` وينتظر كل ملف على حدة قبل إضافة التالي. قيمة `as="script"` كانت صحيحة، ولم يوجد preload ثابت في `index.html` أو إدراج مكرر لملفات 44–59. المشكلة كانت أن الملفات المتأخرة في ترتيب الـmanifest تبقى محمّلة مسبقاً بلا استخدام لعدة ثوانٍ، فيصدر Chromium تحذير `preloaded ... but not used`.

## الإصلاح
- أزيل إنشاء `link rel="preload"` لملفات JavaScript من `js/api-boot.js`.
- تُنشأ كل عناصر `script` مباشرة من ترتيب `manifest.scripts`.
- يُضبط `script.async=false` قبل الإضافة، فيسمح للمتصفح بتنزيل الملفات بالتوازي مع الحفاظ على ترتيب تنفيذها كما هو في الـmanifest.
- ينتظر الـboot اكتمال جميع ملفات JavaScript قبل `api.initialize()` كما كان ينتظر اكتمالها سابقاً.
- تغيّر cache-buster لملف الـloader فقط إلى `loader-r10` حتى لا يعيد المتصفح استخدام `api-boot.js` القديم. ملفات التطبيق نفسها لم تتغير وتبقى مراجعها `workdesk-r9`.

## ملفات التشغيل المعدلة
- `js/api-boot.js`
- `index.html` (مرجع `api-boot.js` فقط)

`api-map.json` وملفات الأعمال 01–60 لم تتغير.

## التحقق
- لا يوجد أي `rel="preload"` خاص بملفات JavaScript في ملفات التشغيل بعد الإصلاح.
- اختبار Chromium بواجهة فعلية وAPI محاكاة مع تأخير `auth/status` عمداً 4.2 ثوانٍ: صفر تحذيرات preload، صفر page errors، صفر preload nodes، وجميع ملفات الـmanifest الستين طلبت مرة واحدة فقط وبنفس ترتيب الـmanifest مع `async=false`.
- مجموعة Node الحالية: 38 اختباراً ناجحاً / صفر فشل.
- فحص R9 للإنشاء والاستلام والـboot: 20 تحققاً ناجحاً / صفر فشل.
- لا تغيير في Business Logic أو UX أو API أو قاعدة البيانات.
