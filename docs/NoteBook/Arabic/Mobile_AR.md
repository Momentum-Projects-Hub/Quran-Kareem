# إذاعة القرآن الكريم 98.2 (القاهرة) — تطبيق الهاتف المحمول

تطبيق هاتف محمول مبني باستخدام React Native / Expo لنظامي iOS و Android لمشغل راديو إذاعة القرآن الكريم 98.2 (القاهرة)، مدعوم بالتشغيل الصوتي في الخلفية وعناصر التحكم في شاشة القفل.

**الحالة اعتباراً من 2026-09-20:** الكود مكتمل (المرحلة 3)، ولكن لم يتم اختباره على جهاز حقيقي أو محاكي في بيئة البناء الحالية (لعدم وجود Android Studio أو Xcode).

---

### ما هو التطبيق
حزمة `packages/mobile` (`@quran-fm/mobile`) تدار عبر Expo SDK 57 / React Native 0.87 / React 19.2. تعيد استخدام نفس منطق حل رابط البث والترجمة من `@quran-fm/core` مع واجهة مشغل مخصصة للمحمول وخدمة تشغيل الصوت في الخلفية.

---

### سبب اختيار `react-native-track-player`
تم اختيار هذه المكتبة لأن عناصر التحكم في شاشة القفل وخدمة التشغيل في الخلفية متطلبات أساسية لتطبيق الراديو. وبما أنها لا تتضمن إضافة تكوين لـ Expo (`app.plugin.js`)، فإن التطبيق يتطلب استخدام `expo prebuild` لتوليد مشاريع Android و iOS الناتجة (Bare Workflow) ولا يعمل داخل Expo Go العادي.

---

### المعمارية البرمجية (Architecture)
```
packages/mobile/
├── App.tsx           # LocaleProvider + EnhancedPlayer
├── index.js          # registerRootComponent + TrackPlayer.registerPlaybackService
├── app.json           # إعدادات Expo: معرفات الحزمة وصلاحيات صوت الخلفية
├── assets/            # أيقونات وشاشات توقف مؤقتة 1x1
├── eas.json            # ملفات تعريف EAS Build/Submit
└── src/
    ├── i18n/LocaleContext.tsx   # إعدادات اللغة المحفوظة في AsyncStorage وإعادة التشغيل عند RTL
    └── player/
        ├── usePlayer.ts           # ربط حل البث في core مع TrackPlayer
        ├── trackPlayerAdapter.ts  # محول بين react-native-track-player و AudioAdapter
        ├── playbackService.ts     # خدمة الخلفية لـ TrackPlayer
        ├── EnhancedPlayer.tsx     # واجهة شاشة المشغل الرئيسية
        ├── EqualizerBars.tsx     # أعمدة التسوية الصوتية المتحركة
        └── OfflineLinks.tsx
```

**نقاط التنفيذ الرئيسية:**
1. **الأذونات (Permissions):** معلنة في `app.json` (iOS `UIBackgroundModes: ["audio"]` و Android `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`).
2. **تسجيل خدمة الخلفية:** يستدعي `index.js` الدالة `TrackPlayer.registerPlaybackService` لتعمل بشكل منفصل عن شجرة React.
3. **محول الصوت `trackPlayerAdapter.ts`:** ينفذ نفس عقد `AudioAdapter` الخاص بالويب لضمان عمل آلة الحالة بنفس المنطق وبدون تكرار للكود.
4. **بيانات شاشة القفل:** عنوان المحطة واسم الفنان مأخوذ من اللغة الحالية مع الشعار المحلي.
5. **المقاطعات الصوتية (Phone Calls / Audio Interruption):** يتوقف التشغيل عند تلقي مكالمة ولا يعاد التشغيل تلقائياً لتجنب إزعاج المستخدم.
6. **التدويل ودعم الاتجاه RTL:** تعتمد اللغة الافتراضية على العربية، ويتم حفظ الاختيار في `AsyncStorage`. يتطلب تغيير الاتجاه إعادة تشغيل التطبيق.

---

### البناء والتوزيع (Building & Distribution)
يتم البناء والنشر عبر خدمة **EAS Build/Submit** السحابية من Expo:
```sh
pnpm --filter @quran-fm/mobile prebuild          # توليد مشاريع android و ios
pnpm --filter @quran-fm/mobile typecheck         # الفحص البرمجي التلقائي الوحيد
pnpm --filter @quran-fm/mobile build:android     # بناء نسخة Android عبر EAS
pnpm --filter @quran-fm/mobile submit:android    # رفع النسخة لمتجر Google Play
pnpm --filter @quran-fm/mobile build:ios         # بناء نسخة iOS عبر EAS
pnpm --filter @quran-fm/mobile submit:ios        # رفع النسخة لمتجر App Store
```

---

### النشر على متجر App Store و Google Play
1. التسجيل في برنامج مطوري Apple ($99 سنوياً).
2. إنشاء سجل التطبيق في App Store Connect بمعرف الحزمة `com.quranfm.cairo982` واللغة الأساسية العربية.
3. تعبئة بيانات الإيداع في `eas.json`.
4. تجهيز وصف المتاجر باللغتين العربية والإنجليزية، وسياسة الخصوصية، ولقطات الشاشة.

---

### الاختبارات واستكشاف الأخطاء
* **الفحص التلقائي الوحيد:** `pnpm --filter @quran-fm/mobile typecheck`.
* **الاختبار السلوكي:** يتطلب جهازاً فيزيائياً حقيقياً لاختبار صوت الخلفية.
* **استكشاف الأخطاء:** عدم تشغيل التطبيق على Expo Go أمر متوقع؛ يجب الاعتماد على النسخ المولدة بعد `prebuild`.
