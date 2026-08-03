(function () {
  "use strict";

  var PAGE_SIZE = 12;
  var state = { genre: "all", search: "", sort: "newest", page: 1 };

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function gameHref(id) {
    return "game.html?id=" + id;
  }

  function coverMarkup(g, big) {
    var size = big ? "cover-emoji big" : "cover-emoji";
    var badges = "";
    if (g.badge) badges += '<span class="badge">' + g.badge + "</span>";
    if (g.hv) badges += '<span class="badge hv">HV</span>';
    return (
      '<div class="cover" style="background:' + g.gradient + '">' +
      badges +
      '<span class="' + size + '">' + g.emoji + "</span>" +
      "</div>"
    );
  }

  /* ---------- Slider ---------- */
  function renderSlider() {
    var track = document.getElementById("sliderTrack");
    var dotsWrap = document.getElementById("sliderDots");
    if (!track || !dotsWrap) return;

    FEATURED.forEach(function (f) {
      var g = GAMES[f.id];
      if (!g) return;
      var slide = el("div", "slide");
      slide.style.background = g.gradient;
      slide.innerHTML =
        '<div class="container slide-inner">' +
        '<div class="slide-copy">' +
        '<span class="slide-badge">لعبة مميزة</span>' +
        "<h2>" + g.title + "</h2>" +
        '<span class="ar-title">' + g.ar + "</span>" +
        "<p>" + f.tagline + "</p>" +
        '<div class="slide-actions">' +
        '<a class="btn-slide" href="' + gameHref(g.id) + '">صفحة اللعبة</a>' +
        '<a class="btn-slide ghost" href="#games">تصفح الألعاب</a>' +
        "</div></div>" +
        '<div class="slide-art">' + g.emoji + "</div></div>";
      track.appendChild(slide);

      var dot = el("button", "", "");
      dot.setAttribute("aria-label", "شريحة");
      dot.addEventListener("click", function () { go(Array.prototype.indexOf.call(track.children, slide)); });
      dotsWrap.appendChild(dot);
    });

    var dots = dotsWrap.children;
    var index = 0;
    var timer = null;

    function go(i) {
      index = (i + track.children.length) % track.children.length;
      track.style.transform = "translateX(-" + index * 100 + "%)";
      Array.prototype.forEach.call(dots, function (d, j) {
        d.classList.toggle("active", j === index);
      });
    }

    function next() { go(index + 1); }

    function start() {
      timer = setInterval(next, 5000);
    }

    function stop() { if (timer) clearInterval(timer); }

    go(0);
    start();
    track.addEventListener("mouseenter", stop);
    track.addEventListener("mouseleave", start);
  }

  /* ---------- Stats ---------- */
  function renderStats() {
    var wrap = document.getElementById("statsGrid");
    if (!wrap) return;
    STATS.forEach(function (s) {
      wrap.appendChild(el("div", "stat", '<div class="stat-num">' + s.num + "</div><div class=\"stat-label\">" + s.label + "</div>"));
    });
  }

  /* ---------- Filters ---------- */
  function renderFilters() {
    var wrap = document.getElementById("filters");
    if (!wrap) return;
    var set = {};
    GAMES.forEach(function (g) {
      g.genres.forEach(function (genre) { set[genre] = true; });
    });
    Object.keys(set).sort().forEach(function (genre) {
      var chip = el("button", "chip", genre);
      chip.dataset.genre = genre;
      chip.addEventListener("click", function () {
        state.genre = genre;
        state.page = 1;
        setActiveChip();
        renderGrid();
      });
      wrap.appendChild(chip);
    });
  }

  function setActiveChip() {
    document.querySelectorAll("#filters .chip").forEach(function (chip) {
      chip.classList.toggle("active", chip.dataset.genre === state.genre);
    });
  }

  /* ---------- Game grid ---------- */
  function getFiltered() {
    var q = state.search.trim().toLowerCase();
    return GAMES.filter(function (g) {
      if (state.genre !== "all" && g.genres.indexOf(state.genre) === -1) return false;
      if (!q) return true;
      return (g.title + " " + (g.ar || "")).toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) {
      if (state.sort === "downloads") return parseInt(b.downloads) - parseInt(a.downloads);
      if (state.sort === "size") return sizeToBytes(a.size) - sizeToBytes(b.size);
      return new Date(b.date) - new Date(a.date);
    });
  }

  function sizeToBytes(s) {
    var m = s.match(/([\d.]+)\s*(ميجا|جيجا)/);
    if (!m) return 0;
    return parseFloat(m[1]) * (m[2] === "جيجا" ? 1024 : 1);
  }

  function renderGrid() {
    var grid = document.getElementById("gameGrid");
    var pager = document.getElementById("pagination");
    var title = document.getElementById("gridTitle");
    if (!grid || !pager) return;

    var list = getFiltered();
    var totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;

    title.textContent = state.genre === "all" ? "أحدث الألعاب" : "ألعاب تصنيف: " + state.genre;

    grid.innerHTML = "";
    if (list.length === 0) {
      grid.appendChild(el("div", "empty-state", "لا توجد ألعاب مطابقة لبحثك."));
    } else {
      var start = (state.page - 1) * PAGE_SIZE;
      list.slice(start, start + PAGE_SIZE).forEach(function (g) {
        var card = el("a", "game-card");
        card.href = gameHref(g.id);
        card.innerHTML =
          coverMarkup(g) +
          '<div class="card-body">' +
          "<h3>" + g.title + "</h3>" +
          '<span class="card-ar">' + (g.ar || "") + "</span>" +
          '<div class="genres">' + g.genres.map(function (x) { return '<span class="genre-tag">' + x + "</span>"; }).join("") + "</div>" +
          '<div class="meta"><span class="size">' + g.size + "</span><span>⬇ " + g.downloads + "</span></div>" +
          "</div>";
        grid.appendChild(card);
      });
    }

    renderPagination(pager, totalPages);
  }

  function renderPagination(pager, totalPages) {
    pager.innerHTML = "";
    if (totalPages <= 1) return;

    function btn(label, page, isCurrent, disabled) {
      var b = el(disabled ? "span" : "button", "page-btn" + (isCurrent ? " current" : ""), label);
      if (!disabled && !isCurrent) {
        b.addEventListener("click", function () {
          state.page = page;
          renderGrid();
          document.getElementById("games").scrollIntoView({ behavior: "smooth" });
        });
      }
      return b;
    }

    pager.appendChild(btn("السابق", state.page - 1, false, state.page === 1));
    for (var i = 1; i <= totalPages; i++) {
      pager.appendChild(btn(String(i), i, i === state.page, false));
    }
    pager.appendChild(btn("التالي", state.page + 1, false, state.page === totalPages));
  }

  /* ---------- New translations + updates ---------- */
  function renderNewTranslations() {
    var wrap = document.getElementById("newTranslations");
    if (!wrap) return;
    GAMES.slice(0, 6).forEach(function (g) {
      var card = el("a", "mini-card");
      card.href = gameHref(g.id);
      card.innerHTML =
        '<div class="mini-cover" style="background:' + g.gradient + '">' +
        '<span class="mini-badge">لعبة حديثة</span>' + g.emoji + "</div>" +
        '<div class="mini-body">' +
        "<h4>" + g.title + "</h4>" +
        '<div class="mini-ar">' + (g.ar || "") + "</div>" +
        '<span class="mini-date">' + g.size + "</span></div>";
      wrap.appendChild(card);
    });
  }

  function renderUpdates() {
    var wrap = document.getElementById("updatesList");
    if (!wrap) return;
    UPDATES.forEach(function (u) {
      var g = GAMES.filter(function (x) { return x.title === u.title; })[0];
      var item = el("a", "update-item", "");
      if (g) item.href = gameHref(g.id);
      item.innerHTML =
        "<small>" + u.days + "</small>" +
        "<h4>" + u.title + "</h4>" +
        '<div class="update-ar">' + (u.ar || "") + "</div>";
      wrap.appendChild(item);
    });
  }

  /* ---------- Lessons ---------- */
  function renderLessons() {
    var wrap = document.getElementById("lessonsGrid");
    if (!wrap) return;
    LESSONS.forEach(function (l) {
      wrap.appendChild(el("div", "lesson-card",
        '<span class="lesson-icon">' + l.icon + "</span>" +
        "<h3>" + l.title + "</h3>" +
        "<p>" + l.desc + "</p>"));
    });
  }

  /* ---------- Footer ---------- */
  function renderFooter() {
    var recs = document.getElementById("footerRecs");
    if (recs) {
      [16, 10, 13, 17, 1].forEach(function (id) {
        var g = GAMES[id];
        if (!g) return;
        recs.appendChild(el("li", "", '<a href="' + gameHref(g.id) + '">' + g.title + "</a>"));
      });
    }
    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
  }

  /* ---------- Init ---------- */
  function init() {
    renderSlider();
    renderStats();
    renderFilters();
    renderGrid();
    renderNewTranslations();
    renderUpdates();
    renderLessons();
    renderFooter();

    var searchInput = document.getElementById("searchInput");
    var searchBtn = document.getElementById("searchBtn");
    var sortSelect = document.getElementById("sortSelect");
    var navToggle = document.getElementById("navToggle");
    var mainNav = document.getElementById("mainNav");

    function doSearch() {
      state.search = searchInput.value;
      state.page = 1;
      renderGrid();
    }

    if (searchBtn) searchBtn.addEventListener("click", doSearch);
    if (searchInput) searchInput.addEventListener("keyup", function (e) {
      if (e.key === "Enter") doSearch();
    });

    if (sortSelect) sortSelect.addEventListener("change", function () {
      state.sort = sortSelect.value;
      state.page = 1;
      renderGrid();
    });

    if (navToggle && mainNav) {
      navToggle.addEventListener("click", function () {
        mainNav.classList.toggle("open");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
