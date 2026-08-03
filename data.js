function svgCover(emoji, title, c1, c2, tag) {
  var w = 600, h = 800;
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/>' +
    '</linearGradient></defs>' +
    '<rect width="' + w + '" height="' + h + '" fill="url(#g)"/>' +
    '<circle cx="' + (w / 2) + '" cy="' + (h * 0.32) + '" r="' + (w * 0.26) + '" fill="rgba(255,255,255,0.14)"/>' +
    '<text x="' + (w / 2) + '" y="' + (h * 0.34) + '" font-size="160" text-anchor="middle">' + emoji + "</text>" +
    '<text x="' + (w / 2) + '" y="' + (h * 0.6) + '" font-size="50" font-weight="bold" fill="#fff" text-anchor="middle" font-family="Cairo, Arial, sans-serif">' + title + "</text>" +
    (tag ? '<text x="' + (w / 2) + '" y="' + (h * 0.7) + '" font-size="27" fill="rgba(255,255,255,0.85)" text-anchor="middle" font-family="Cairo, Arial, sans-serif">' + tag + "</text>" : "") +
    '<text x="' + (w / 2) + '" y="' + (h * 0.9) + '" font-size="30" font-weight="bold" fill="rgba(255,255,255,0.9)" text-anchor="middle" font-family="Cairo, Arial, sans-serif">فريق ريان</text>' +
    "</svg>";
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function svgBanner(emoji, title, c1, c2, tag) {
  var w = 960, h = 540;
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/>' +
    '</linearGradient></defs>' +
    '<rect width="' + w + '" height="' + h + '" fill="url(#g)"/>' +
    '<circle cx="' + (w * 0.28) + '" cy="' + (h * 0.5) + '" r="' + (h * 0.3) + '" fill="rgba(255,255,255,0.15)"/>' +
    '<text x="' + (w * 0.28) + '" y="' + (h * 0.62) + '" font-size="220" text-anchor="middle">' + emoji + "</text>" +
    '<text x="' + (w * 0.62) + '" y="' + (h * 0.44) + '" font-size="64" font-weight="bold" fill="#fff" text-anchor="middle" font-family="Cairo, Arial, sans-serif">' + title + "</text>" +
    (tag ? '<text x="' + (w * 0.62) + '" y="' + (h * 0.58) + '" font-size="32" fill="rgba(255,255,255,0.85)" text-anchor="middle" font-family="Cairo, Arial, sans-serif">' + tag + "</text>" : "") +
    '<text x="' + (w * 0.92) + '" y="' + (h * 0.93) + '" font-size="26" font-weight="bold" fill="rgba(255,255,255,0.8)" text-anchor="end" font-family="Cairo, Arial, sans-serif">فريق ريان</text>' +
    "</svg>";
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

var DEFAULT_GAMES = [
  {
    id: 1,
    title: "Bon Appétit",
    ar: "بون آبيتي",
    cover: "",
    genres: ["طبخ", "مغامرات"],
    platforms: ["ويندوز", "أندرويد"],
    size: "1.5 جيجا",
    downloads: "850",
    date: "2026-07-30",
    desc: "لعبة طبخ عربية ممتعة! إعدّ أشهى الأطباق في مطبخك، اخدُم الزبائن تحت ضغط الوقت، وافتح مستويات جديدة ومعدات حديثة لتصبح أفضل طبّاخ في المدينة.",
    min: "معالج i3، ذاكرة 4 جيجا",
    rec: "معالج i5، ذاكرة 8 جيجا",
    link: "",
    buy: "",
    tradRate: "100%",
    installTime: "5 دقائق",
    compat: "Windows 10/11",
    arLocal: true,
    linkAlt: "",
  },
  {
    id: 2,
    title: "Kitchen Rush",
    ar: "اندفاع المطبخ",
    cover: "",
    genres: ["طبخ", "إدارة وقت"],
    platforms: ["ويندوز", "آيفون"],
    size: "900 ميجا",
    downloads: "420",
    date: "2026-07-22",
    desc: "أدر مطبخك بسرعة البرق! جهّز الطلبات، أضف التوابل، وحافظ على رضا الزبائن في سباق مع الزمن.",
    min: "معالج i3، ذاكرة 4 جيجا",
    rec: "معالج i5، ذاكرة 8 جيجا",
    link: "",
    buy: "",
    tradRate: "100%",
    installTime: "5 دقائق",
    compat: "Windows 10/11",
    arLocal: true,
    linkAlt: "",
  },
  {
    id: 3,
    title: "Chef's Journey",
    ar: "رحلة الشيف",
    cover: "",
    genres: ["طبخ", "قصة"],
    platforms: ["ويندوز", "أندرويد", "آيفون"],
    size: "2.1 جيجا",
    downloads: "610",
    date: "2026-07-15",
    desc: "رافق الشيف في رحلته من مطعم متواضع إلى مطبخ عالمي، واكسب النجوم وطوّر وصفاتك الخاصة في هذه المغامرة الحكائية.",
    min: "معالج i3، ذاكرة 4 جيجا",
    rec: "معالج i5، ذاكرة 8 جيجا",
    link: "",
    buy: "",
    tradRate: "100%",
    installTime: "5 دقائق",
    compat: "Windows 10/11",
    arLocal: true,
    linkAlt: "",
  },
  {
    id: 4,
    title: "Sweet Kingdom",
    ar: "مملكة الحلويات",
    cover: svgCover("🍰", "مملكة الحلويات", "#f472b6", "#db2777", "تعريب عربي كامل"),
    gallery: [
      svgBanner("🧁", "معاينة ١ — مطبخ الحلوى", "#f472b6", "#db2777", "تُزيّن الكعك وتقدّمها"),
      svgBanner("🍩", "معاينة ٢ — عالم سحري", "#ec4899", "#9d174d", "مستويات ملوّنة ممتعة"),
    ],
    video: "promo/ryaan-games-promo.webm",
    genres: ["طبخ", "أطفال"],
    platforms: ["ويندوز", "أندرويد", "آيفون"],
    size: "1.8 جيجا",
    downloads: "1240",
    date: "2026-08-01",
    desc: "ادخل مملكة الحلويات واسعد الصغار والكبار! أعدّ الكيك والجاتوه والدونات الملوّنة، وزيّنها بأفكارك الخاصة في هذا العالم السحري المليء بالمغامرات.",
    min: "معالج i3، ذاكرة 4 جيجا",
    rec: "معالج i5، ذاكرة 8 جيجا",
    link: "",
    buy: "",
    tradRate: "100%",
    installTime: "4 دقائق",
    compat: "Windows 10/11",
    arLocal: true,
    free: true,
    linkAlt: "",
  },
  {
    id: 5,
    title: "Grill Masters",
    ar: "أساتذة الشواء",
    cover: svgCover("🍖", "أساتذة الشواء", "#f97316", "#b91c1c", "تحدٍّ ناري"),
    gallery: [
      svgBanner("🔥", "معاينة ١ — المشواة", "#f97316", "#b91c1c", "اقلب اللحوم في التوقيت المثالي"),
      svgBanner("🍗", "معاينة ٢ — الوصفات", "#ea580c", "#7f1d1d", "ألذ الوصفات المشوية"),
    ],
    video: "promo/ryaan-games-promo.webm",
    genres: ["طبخ", "إدارة وقت"],
    platforms: ["ويندوز", "بلايستيشن"],
    size: "3.2 جيجا",
    downloads: "980",
    date: "2026-07-28",
    desc: "أشعل الفحم وتحدَّ أصدقاءك! تحكم بالمشواة، اقلب اللحوم في الوقت المناسب، وقدّم ألذ الشواء قبل أن يحترق.",
    min: "معالج i3، ذاكرة 4 جيجا",
    rec: "معالج i5، ذاكرة 8 جيجا",
    link: "",
    buy: "",
    tradRate: "100%",
    installTime: "6 دقائق",
    compat: "Windows 10/11",
    arLocal: true,
    linkAlt: "",
  },
  {
    id: 6,
    title: "Sushi Sensei",
    ar: "سوشي سينسي",
    cover: svgCover("🍣", "سوشي سينسي", "#22c55e", "#166534", "فنّ المطبخ الياباني"),
    gallery: [
      svgBanner("🍚", "معاينة ١ — اللفّ", "#22c55e", "#166534", "لُفّ السوشي بدقة"),
      svgBanner("🥢", "معاينة ٢ — التقديم", "#16a34a", "#14532d", "رتّب الأطباق كالشيف"),
    ],
    video: "promo/ryaan-games-promo.webm",
    genres: ["طبخ", "لغز"],
    platforms: ["ويندوز", "أندرويد"],
    size: "1.2 جيجا",
    downloads: "760",
    date: "2026-07-25",
    desc: "تعلّم فنّ السوشي خطوة بخطوة! اقطع، لُفّ، ورتّب الأطباق بدقة لتحصل على نجوم الشيف الياباني.",
    min: "معالج i3، ذاكرة 4 جيجا",
    rec: "معالج i5، ذاكرة 8 جيجا",
    link: "",
    buy: "",
    tradRate: "100%",
    installTime: "4 دقائق",
    compat: "Windows 10/11",
    arLocal: true,
    free: true,
    linkAlt: "",
  },
  {
    id: 7,
    title: "Pizza Empire",
    ar: "إمبراطورية البيتزا",
    cover: svgCover("🍕", "إمبراطورية البيتزا", "#eab308", "#ca8a04", "محاكاة مطاعم"),
    gallery: [
      svgBanner("🧀", "معاينة ١ — الفرن", "#eab308", "#ca8a04", "افرن بيتزاك حتى الذهبية"),
      svgBanner("🛵", "معاينة ٢ — التوصيل", "#d97706", "#92400e", "وسّع إمبراطوريتك"),
    ],
    video: "promo/ryaan-games-promo.webm",
    genres: ["طبخ", "محاكاة"],
    platforms: ["ويندوز", "ماك"],
    size: "2.6 جيجا",
    downloads: "1530",
    date: "2026-07-20",
    desc: "ابنِ إمبراطورية بيتزا من الصفر! افتح مطعمك، طوّر القائمة، ودعّد الموظفين، واجذب الزبائن إلى أرقى مطاعم المدينة.",
    min: "معالج i3، ذاكرة 4 جيجا",
    rec: "معالج i5، ذاكرة 8 جيجا",
    link: "",
    buy: "",
    tradRate: "100%",
    installTime: "5 دقائق",
    compat: "Windows 10/11",
    arLocal: true,
    linkAlt: "",
  },
  {
    id: 8,
    title: "Coffee Barista",
    ar: "باريستا القهوة",
    cover: svgCover("☕", "باريستا القهوة", "#92400e", "#451a03", "فنّ القهوة"),
    gallery: [
      svgBanner("🤎", "معاينة ١ — الكابتشينو", "#92400e", "#451a03", "رغوة الحليب والفن"),
      svgBanner("🥐", "معاينة ٢ — المقهى", "#78350f", "#292524", "أجواء مقهى هادئة"),
    ],
    video: "promo/ryaan-games-promo.webm",
    genres: ["طبخ", "إدارة وقت"],
    platforms: ["ويندوز", "أندرويد", "آيفون"],
    size: "850 ميجا",
    downloads: "640",
    date: "2026-07-18",
    desc: "اصنع أروع مشروبات القهوة في المقهى! اسحب الكابتشينو بالحليب الرغوي، زيّنه بفن اللاتيه، وأسعد زبائنك كل صباح.",
    min: "معالج i3، ذاكرة 4 جيجا",
    rec: "معالج i5، ذاكرة 8 جيجا",
    link: "",
    buy: "",
    tradRate: "100%",
    installTime: "3 دقائق",
    compat: "Windows 10/11",
    arLocal: true,
    linkAlt: "",
  },
  {
    id: 9,
    title: "Family Feast",
    ar: "وليمة العائلة",
    cover: svgCover("🍽️", "وليمة العائلة", "#0ea5e9", "#0369a1", "طبخ جماعي"),
    gallery: [
      svgBanner("👨‍👩‍👧‍👦", "معاينة ١ — معًا", "#0ea5e9", "#0369a1", "تعاون مع العائلة"),
      svgBanner("🥗", "معاينة ٢ — المائدة", "#0284c7", "#075985", "جهّزوا وليمة كاملة"),
    ],
    video: "promo/ryaan-games-promo.webm",
    genres: ["طبخ", "جماعية"],
    platforms: ["ويندوز", "أندرويد"],
    size: "1.9 جيجا",
    downloads: "1120",
    date: "2026-07-15",
    desc: "لعبة طبخ جماعية للمناسبات! تعاون مع عائلتك وأصدقائك في تحضير وليمة كاملة، واربحوا النقاط معًا في أجواء مليئة بالضحك.",
    min: "معالج i3، ذاكرة 4 جيجا",
    rec: "معالج i5، ذاكرة 8 جيجا",
    link: "",
    buy: "",
    tradRate: "100%",
    installTime: "5 دقائق",
    compat: "Windows 10/11",
    arLocal: true,
    free: true,
    linkAlt: "",
  },
];

var DEFAULT_LESSONS = [
  { id: 1, icon: "🔄", title: "تحديث اللعبة المتوافق", desc: "كيف أنزّل تحديث اللعبة المتوافق مع التعريب؟", link: "" },
  { id: 2, icon: "🛡️", title: "الحصول على الألعاب قانونيًا", desc: "كيف أحصل على الألعاب بدون اللجوء للقرصنة؟", link: "" },
  { id: 3, icon: "📁", title: "معرفة مسار التنصيب", desc: "أين أثبّت التعريب؟ وأين أجد اللعبة على حاسبي؟", link: "" },
  { id: 4, icon: "⬇️", title: "طريقة التحميل والتشغيل", desc: "كيف تحمّل اللعبة من الموقع وتثبّتها وتشغّلها على جهازك؟ اتبع الخطوات بالترتيب لتحصل على تجربة سلسة.", link: "" },
];

var DEFAULT_UPDATES = [
  { id: 1, title: "Bon Appétit", ar: "بون آبيتي", days: "محدث منذ يومين", link: "" },
  { id: 2, title: "Kitchen Rush", ar: "اندفاع المطبخ", days: "محدث منذ 5 أيام", link: "" },
  { id: 3, title: "Chef's Journey", ar: "رحلة الشيف", days: "محدث منذ أسبوع", link: "" },
  { id: 4, title: "Sweet Kingdom", ar: "مملكة الحلويات", days: "محدث منذ يوم", link: "" },
  { id: 5, title: "Grill Masters", ar: "أساتذة الشواء", days: "محدث منذ 3 أيام", link: "" },
  { id: 6, title: "Sushi Sensei", ar: "سوشي سينسي", days: "محدث منذ 5 أيام", link: "" },
  { id: 7, title: "Pizza Empire", ar: "إمبراطورية البيتزا", days: "محدث منذ 8 أيام", link: "" },
  { id: 8, title: "Coffee Barista", ar: "باريستا القهوة", days: "محدث منذ 10 أيام", link: "" },
  { id: 9, title: "Family Feast", ar: "وليمة العائلة", days: "محدث منذ أسبوعين", link: "" },
];

var DEFAULT_SETTINGS = {
  site: { name: "ريان", mark: "ر", tagline: "ألعابُك بِلمسةٍ عربيةٍ أصيلة" },
  about: "RCP GAMAR — وجهتك لتعريب ألعاب الكمبيوتر إلى العربية. نقدم ألعابًا معرّبة كاملة مع دروس تثبيت وروابط تحميل مباشرة، بشكل مجاني وبدون إعلانات مزعجة.",
  supportNote: "ادعمنا لمواصلة تعريب الألعاب مجانًا.",
  contactEmail: "",
  adminPass: "",
  slides: [
    { id: 1, gameId: 1, badge: "تعريب جديد", tagline: "تجربة عربية كاملة في مطبخك! إعدّ أطباقًا شهية واخدُم زبائنك تحت ضغط الوقت." },
    { id: 2, gameId: 3, badge: "قصة ممتعة", tagline: "رافق الشيف في رحلته من مطعم متواضع إلى مطبخ عالمي." },
    { id: 3, gameId: 2, badge: "تحدٍ ممتع", tagline: "سباق مع الزمن! أدر مطبخك بسرعة وحافظ على رضا الزبائن." },
  ],
  socials: { telegram: "", youtube: "", discord: "", twitter: "", instagram: "", facebook: "", kofi: "", patreon: "" },
  ads: { top: "", inFeed: "", bottom: "" },
};
