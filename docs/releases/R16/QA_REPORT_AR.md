# MOSH ERP R16 — تقرير الدمج والفحص

الأساس: R15 المدموجة مع نسخة فريق IT وZKTeco.

## إصلاحات R16
- صورة الموظف: تحويل الصور القابلة للقراءة إلى JPEG آمن ومخفف قبل الرفع، ربط `photoKey` بملف الموظف، وإظهار رسالة الخادم الفعلية عند الفشل.
- محادثة المهمة: Enter يرسل وShift+Enter لسطر جديد، وإصلاح تمرير معرفات المهام النصية داخل HTML.
- المرفقات: إصلاح زر المشبك ليشير إلى input الصحيح حتى مع معرف مهمة نصي.
- الصوت: على HTTPS يستمر التسجيل المباشر؛ على HTTP يفتح زر المايك منتقي ملفات صوت مباشرة من دون Alert يقطع user activation. نفس السلوك في إنشاء المهمة ومحادثتها.
- تحويل المهمة إلى الإدارة: تحديث `assigneeId` مع اسم المسؤول الإداري لمنع بقاء معرف الموظف السابق ورفض الخادم العملية.
- لوحة قسم التصميم: تجربة مختصرة فقط لهذا القسم: 3 مؤشرات أساسية، المهام المهمة، وحالة الفريق؛ لم تُعمم على باقي الأقسام.
- Social Hub: أساس مستقل عن Workflow المهام، منظم حسب العميل، مع تعريف الحسابات ومسودات وجدولة داخل MOSH. النشر الخارجي الحقيقي مقفول حتى إعداد OAuth/API رسمي وHTTPS.

## فحوص منفذة
- R16 browser regression: Enter، paperclip، HTTP audio picker، standalone audio picker، لوحة التصميم، تحويل الإدارة، Social Hub وعدم تغيير المهام: ناجح بلا JavaScript errors.
- Profile photo browser regression: تجهيز الصورة، رفعها، وربط `photoKey` بملف الموظف: ناجح.
- R14 system regression: ناجح.
- R12 task attachments: ناجح.
- R13 sidebar navigation: ناجح.
- R9 receipt/boot: 20 تحققاً ناجحاً.
- R10 preload: 0 warnings، 0 preload nodes، 63 manifest scripts مرة واحدة وبالترتيب.
- Node model suites: ناجحة.
- JavaScript syntax: 65 ملفاً بلا أخطاء.
- PHP lint: 93 ملفاً بلا أخطاء.
- SQLite quick_check: أربع قواعد = ok.
- Backend: مطابق بايتاً لـR15؛ لم يتم تعديل ملفات ZKTeco أو `.env` أو قاعدة البيانات أو `storage` أو `vendor`.

## قيد خارجي معروف
المتصفح لا يسمح بتسجيل المايك مباشرة على عنوان HTTP غير آمن. التسجيل المباشر يحتاج HTTPS. على HTTP تم اعتماد اختيار ملف صوت كبديل يعمل من نفس زر المايك.

Social Hub لا يستطيع الاتصال أو النشر فعلياً إلى Meta/TikTok/LinkedIn من دون App IDs/Secrets وصلاحيات OAuth الرسمية وHTTPS redirect URLs. لا توجد كلمات مرور أو Tokens وهمية داخل الحزمة.
