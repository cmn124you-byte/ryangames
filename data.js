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

var DATA_VERSION = 8;

var DEFAULT_GAMES = [];

var DEFAULT_LESSONS = [
  { id: 1, icon: "🔄", title: "تحديث اللعبة المتوافق", desc: "كيف أنزّل تحديث اللعبة المتوافق مع التعريب؟", link: "" },
  { id: 2, icon: "🛡️", title: "الحصول على الألعاب قانونيًا", desc: "كيف أحصل على الألعاب بدون اللجوء للقرصنة؟", link: "" },
  { id: 3, icon: "📁", title: "معرفة مسار التنصيب", desc: "أين أثبّت التعريب؟ وأين أجد اللعبة على حاسبي؟", link: "" },
  { id: 4, icon: "⬇️", title: "طريقة التحميل والتشغيل", desc: "كيف تحمّل اللعبة من الموقع وتثبّتها وتشغّلها على جهازك؟ اتبع الخطوات بالترتيب لتحصل على تجربة سلسة.", link: "" },
];

var DEFAULT_UPDATES = [
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
