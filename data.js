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

var DATA_VERSION = 32;

var DEFAULT_GAMES = [
  {
    id: 1,
    title: "the supper",
    ar: "العشاء",
    cover: "downloads/cover-1785828125556.jpg",
    genres: ["طبخ", "رعب", "إدارة وقت"],
    platforms: ["ويندوز", "لينكس"],
    size: "",
    downloads: "0",
    date: "2026-08-04",
    desc: "The Supper (العشاء) هي لعبة مغامرات قصيرة من نوع Point & Click تدور حول الجانب المظلم من النفس البشرية. تلعب بشخصية السيدة آبلتون (Ms. Appleton)، صاحبة حانة كانت معروفة بلطفها، لكن صوتًا غامضًا بدأ يهمس في رأسها ويأمرها بإعداد وجبة خاصة جدًا لعدد من الضيوف المميزين. مع تقدم الأحداث، تكتشف أسرارًا مرعبة وتجمع المكونات وتحل الألغاز للوصول إلى النهاية.\n\nمميزات اللعبة:\n\n🎮 مغامرة Point & Click.\n🧩 ألغاز بسيطة وممتعة.\n👻 قصة رعب نفسي وغموض مع أجواء مظلمة.\n🎨 رسومات Pixel Art جميلة.\n⏱️ مدة اللعب قصيرة (حوالي 20–30 دقيقة).\n💰 مجانية على Steam",
    min: "نظام التشغيل: ويندوز 10 او لينكس، المعالج: معالج ثنائي النواة بسرعة 1.8 جيجاهرتز، الذاكرة: 4 رام، كرت الشاشة: :الرسومات المدمجة، مساحة التخزين: مساحة متاحة 280 ميجابايت",
    rec: "نظام التشغيل: او مافوق، المعالج: او مافوق، الذاكرة: او مافوق، كرت الشاشة: اي كرت تشتغل، مساحة التخزين: قد تصل الى 300ميجابايت",
    link: "https://cmn124you-byte.github.io/ryangames/downloads/The-Supper-Arabic-Patch-v1.0.exe",
    buy: "https://store.steampowered.com/app/1171370/The_Supper/",
    tradRate: "100%",
    installTime: "2 دقائق",
    compat: "Windows 10/11",
    arLocal: true,
    browserTitle: "تعريب لعبة the supper",
    gallery: [],
    video: "",
    free: false,
    isApp: false,
  },
  {
    id: 2,
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
    id: 3,
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
    id: 4,
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
];

var DEFAULT_LESSONS = [
  { id: 1, icon: "🛠️", title: "تحديث اللعبة المتوافق", desc: "كيف أنزّل تحديث اللعبة المتوافق مع التعريب؟", link: "" },
  { id: 2, icon: "🛡️", title: "الحصول على الألعاب قانونيًا", desc: "كيف أحصل على الألعاب بدون اللجوء للقرصنة؟", link: "" },
  { id: 3, icon: "📁", title: "معرفة مسار التنصيب", desc: "أين أثبّت التعريب؟ وأين أجد اللعبة على حاسبي؟", link: "" },
  { id: 4, icon: "⬇️", title: "طريقة التحميل والتشغيل", desc: "كيف تحمّل اللعبة من الموقع وتثبّتها وتشغّلها على جهازك؟ اتبع الخطوات بالترتيب لتحصل على تجربة سلسة.", link: "" },
];

var DEFAULT_UPDATES = [
  { id: 1, title: "تعريب لعبة the supper", ar: "العشاء ", days: "محدث منذ يوم", link: "https://cmn124you-byte.github.io/ryangames/game-the-supper.html" },
  { id: 2, title: "Bon Appétit", ar: "بون آبيتي", days: "محدث منذ يومين", link: "" },
  { id: 3, title: "Kitchen Rush", ar: "اندفاع المطبخ", days: "محدث منذ 5 أيام", link: "" },
  { id: 4, title: "Chef's Journey", ar: "رحلة الشيف", days: "محدث منذ أسبوع", link: "" },
];

var DEFAULT_SETTINGS = {
  site: { name: "ريان", mark: "ر", tagline: "ألعابُك بِلمسةٍ عربيةٍ أصيلة" },
  about: "RCP GAMAR — وجهتك لتعريب ألعاب الكمبيوتر إلى العربية. نقدم ألعابًا معرّبة كاملة مع دروس تثبيت وروابط تحميل مباشرة، بشكل مجاني وبدون إعلانات مزعجة.",
  supportNote: "ادعمنا لمواصلة تعريب الألعاب مجانًا.",
  contactEmail: "",
  adminPass: "",
  publishKey: "ryan2026",
  slides: [
    { id: 1, gameId: 2, badge: "تعريب جديد", tagline: "تجربة عربية كاملة في مطبخك! إعدّ أطباقًا شهية واخدُم زبائنك تحت ضغط الوقت." },
    { id: 2, gameId: 4, badge: "قصة ممتعة", tagline: "رافق الشيف في رحلته من مطعم متواضع إلى مطبخ عالمي." },
    { id: 3, gameId: 3, badge: "تحدٍ ممتع", tagline: "سباق مع الزمن! أدر مطبخك بسرعة وحافظ على رضا الزبائن." },
  ],
  socials: { telegram: "", youtube: "", discord: "", twitter: "", instagram: "", facebook: "", kofi: "", patreon: "" },
  ads: { top: "", inFeed: "", bottom: "" },
};
