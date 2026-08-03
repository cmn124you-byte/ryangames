/* Offline mini-games: fishing, jump, fight + Baba Munsif Words, with easy email login & leaderboard */
(function () {
  var menu = document.getElementById("mgMenu");
  var arena = document.getElementById("mgArena");
  if (!menu || !arena) return;

  var timers = [];
  var raf = null;
  var current = null;
  var jumpFn = null;

  function clearTimers() {
    timers.forEach(function (t) { clearInterval(t); clearTimeout(t); });
    timers = [];
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function escTxt(s) { var d = document.createElement("div"); d.textContent = String(s == null ? "" : s); return d.innerHTML; }
  function toast(txt) {
    var t = el("div", "mg-toast", txt);
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
  }

  document.addEventListener("keydown", function (e) {
    if (current === "jump" && (e.code === "Space" || e.code === "ArrowUp")) {
      e.preventDefault();
      if (typeof jumpFn === "function") jumpFn();
    }
  });

  /* ================= MENU / SHELL ================= */
  var MENU = [
    { id: "fish", emoji: "🐟", title: "صيد السمك", desc: "اقذف الخطّ في اللحظة المناسبة قبل انتهاء الوقت" },
    { id: "jump", emoji: "🏃", title: "لعبة القفز", desc: "اقفز فوق العقبات واجمع أطول مسافة بلا توقف" },
    { id: "fight", emoji: "⚔️", title: "نزال الأبطال", desc: "لعبة قتال بأجواء الكونسل: لكمة، ركلة، دفاع" },
    { id: "ahmd", emoji: "🔥", title: "احمد قيمز", desc: "معركة ملكية بأسلوب فري فاير: أسلحة، روبوتات، ومنطقة آمنة" },
    { id: "words", emoji: "✨", title: "كلمات بابا منصف", desc: "أسئلة دينية وأذكار وخيرات وترتيب الحروف" }
  ];

  function buildHeader(title) {
    var head = el("div", "mg-head");
    head.appendChild(el("h3", "", title));
    var ex = el("button", "mg-btn", "✕ خروج");
    ex.addEventListener("click", showMenu);
    head.appendChild(ex);
    return head;
  }
  function msgBox() { return el("p", "mg-msg", ""); }

  function showMenu() {
    clearTimers();
    current = null;
    arena.hidden = true;
    menu.hidden = false;
    clear(menu);
    MENU.forEach(function (g) {
      var card = el("div", "mg-card", "");
      card.setAttribute("data-game", g.id);
      card.appendChild(el("span", "mg-emoji", g.emoji));
      card.appendChild(el("h3", "", g.title));
      card.appendChild(el("p", "", g.desc));
      card.appendChild(el("span", "mg-offline-badge", "تعمل بدون إنترنت"));
      var dl = el("button", "mg-btn mg-dl", "⬇ تحميل اللعبة");
      dl.setAttribute("type", "button");
      dl.addEventListener("click", function (e) { e.stopPropagation(); downloadGame(g.id); });
      card.appendChild(dl);
      card.addEventListener("click", function () { openGame(g.id); });
      menu.appendChild(card);
    });
  }

  function openGame(id) {
    clearTimers();
    current = id;
    menu.hidden = true;
    arena.hidden = false;
    clear(arena);
    var start = { fish: startFish, jump: startJump, fight: startFight, ahmd: startAhmd, words: startWords }[id];
    if (start) start();
  }

  function centerOverlay(icon, text, mode) {
    var ov = el("div", "mg-overlay", "");
    var box = el("div", "mg-overlay-box win", "");
    box.appendChild(el("div", "mg-overlay-icon", icon));
    box.appendChild(el("div", "mg-overlay-text", text));
    box.appendChild(el("div", "mg-overlay-sub", "اضغط في أي مكان لإعادة اللعب"));
    box.addEventListener("click", function () { openGame(current); });
    ov.appendChild(box);
    arena.appendChild(ov);
  }

  /* ================= FISHING ================= */
  function startFish() {
    arena.appendChild(buildHeader("🎣 صيد السمك"));
    arena.appendChild(el("p", "mg-hint", "اضغط أو المس لإلقاء الخط في اتجاه السمكة"));
    var info = el("div", "mg-head", "");
    info.appendChild(el("span", "mg-score", "النقاط: 0"));
    info.appendChild(el("span", "mg-timer", "الوقت: 30"));
    arena.appendChild(info);
    var canvas = el("canvas", "mg-canvas", "");
    var ctx = canvas.getContext("2d");
    var W = 420, H = 260;
    canvas.width = W; canvas.height = H;
    arena.appendChild(canvas);
    var res = msgBox();
    arena.appendChild(res);

    var score = 0, time = 30;
    var fishX = 60, dir = 1, speed = 2.4;
    var hook = { x: W / 2, y: 0, falling: false, vy: 6 };
    var over = false;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(37,99,235,0.14)";
      ctx.fillRect(0, 0, W, H);
      ctx.font = "34px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🐟", fishX, 200);
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hook.x, 0);
      ctx.lineTo(hook.x, hook.y);
      ctx.stroke();
      ctx.font = "18px serif";
      ctx.fillText("🪝", hook.x, hook.y);
    }
    function cast(x) {
      if (over || hook.falling) return;
      hook.x = x; hook.y = 6; hook.falling = true;
    }
    function loop() {
      if (over) return;
      fishX += dir * speed;
      if (fishX > W - 40) { fishX = W - 40; dir = -1; }
      if (fishX < 40) { fishX = 40; dir = 1; }
      if (hook.falling) {
        hook.y += hook.vy;
        if (hook.y >= 200) {
          hook.falling = false;
          hook.y = 0;
          if (Math.abs(hook.x - fishX) <= 34) {
            score++;
            res.textContent = "🎉 أمسكتها! أحسنت";
            res.className = "mg-msg win";
            fishX = 40 + Math.random() * (W - 80);
          } else {
            res.textContent = "فاتتك… حاول مجددًا";
            res.className = "mg-msg lose";
          }
          info.querySelector(".mg-score").textContent = "النقاط: " + score;
        }
      }
      draw();
      raf = requestAnimationFrame(loop);
    }
    canvas.addEventListener("pointerdown", function (e) {
      var r = canvas.getBoundingClientRect();
      cast((e.clientX - r.left) * (W / r.width));
    });
    var t = setInterval(function () {
      if (over) return;
      time--;
      info.querySelector(".mg-timer").textContent = "الوقت: " + time;
      if (time <= 0) {
        over = true;
        res.textContent = "انتهى الوقت! نتيجتك: " + score;
        res.className = "mg-msg";
        saveScoreFlow("fish", score);
        centerOverlay("⏰", "انتهى الوقت!", "lose");
      }
    }, 1000);
    timers.push(t);
    loop();
  }

  /* ================= JUMP ================= */
  function startJump() {
    arena.appendChild(buildHeader("🏃 لعبة القفز"));
    arena.appendChild(el("p", "mg-hint", "اضغط أو المس أو استخدم مسطرة المسافة للقفز"));
    var info = el("div", "mg-head", "");
    info.appendChild(el("span", "mg-score", "المسافة: 0"));
    arena.appendChild(info);
    var canvas = el("canvas", "mg-canvas", "");
    var ctx = canvas.getContext("2d");
    var W = 420, H = 260;
    canvas.width = W; canvas.height = H;
    arena.appendChild(canvas);
    var res = msgBox();
    arena.appendChild(res);

    var GROUND = 222;
    var p = { x: 70, y: GROUND, vy: 0, onGround: true };
    var obs = [];
    var dist = 0, over = false, speed = 4, spawn = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(15,23,42,0.28)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, GROUND + 8, W, H - GROUND - 8);
      ctx.font = "32px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🦘", p.x, p.y - 14);
      obs.forEach(function (o) { ctx.fillText("🌵", o.x, o.y - 16); });
    }
    function jump() {
      if (over) return;
      if (p.onGround) { p.vy = -10.5; p.onGround = false; }
    }
    jumpFn = jump;
    function loop() {
      if (over) return;
      dist += 0.5;
      speed = 4 + dist / 400;
      spawn += speed;
      if (spawn > 130) {
        spawn = 0;
        obs.push({ x: W + 30, y: GROUND });
      }
      p.vy += 0.6;
      p.y += p.vy;
      if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
      obs.forEach(function (o) { o.x -= speed; });
      obs = obs.filter(function (o) { return o.x > -40; });
      var hit = obs.some(function (o) {
        return Math.abs(o.x - p.x) < 26 && p.y > GROUND - 34;
      });
      if (hit) {
        over = true;
        res.textContent = "💥 صدمت! المسافة: " + Math.floor(dist) + "م";
        res.className = "mg-msg lose";
        info.querySelector(".mg-score").textContent = "المسافة: " + Math.floor(dist) + "م";
        saveScoreFlow("jump", Math.floor(dist));
        centerOverlay("💥", "حاول مجددًا!", "lose");
        return;
      }
      info.querySelector(".mg-score").textContent = "المسافة: " + Math.floor(dist) + "م";
      draw();
      raf = requestAnimationFrame(loop);
    }
    canvas.addEventListener("pointerdown", jump);
    loop();
  }

  /* ================= FIGHT (console) ================= */
  function startFight() {
    arena.appendChild(buildHeader("⚔️ نزال الأبطال"));
    arena.appendChild(el("p", "mg-hint", "أجواء كونسل: اختر لكمة أو ركلة أو دفاع واهزم الروبوت"));
    var hud = el("div", "fight-hud", "");
    var eCol = el("div", "fighter", "");
    eCol.appendChild(el("span", "fname", "الروبوت 🤖"));
    var eWrap = el("div", "hp-wrap", "");
    eWrap.appendChild(el("div", "hp right", ""));
    eCol.appendChild(eWrap);
    var pCol = el("div", "fighter", "");
    pCol.appendChild(el("span", "fname", "أنت 🥷"));
    var pWrap = el("div", "hp-wrap", "");
    pWrap.appendChild(el("div", "hp", ""));
    pCol.appendChild(pWrap);
    hud.appendChild(eCol);
    hud.appendChild(el("span", "fight-vs", "VS"));
    hud.appendChild(pCol);
    arena.appendChild(hud);

    var stage = el("div", "fight-stage", "");
    var pChar = el("span", "fighter-char", "🥷");
    var eChar = el("span", "fighter-char enemy", "🤖");
    stage.appendChild(eChar);
    stage.appendChild(pChar);
    arena.appendChild(stage);

    var log = el("p", "fight-log", "ابدأ الهجوم!");
    arena.appendChild(log);
    var inputs = el("div", "fight-inputs", "");
    var btnPunch = el("button", "mg-btn primary", "🥊 لكمة");
    var btnKick = el("button", "mg-btn primary", "🦵 ركلة");
    var btnBlock = el("button", "mg-btn primary", "🛡️ دفاع");
    inputs.appendChild(btnPunch);
    inputs.appendChild(btnKick);
    inputs.appendChild(btnBlock);
    arena.appendChild(inputs);

    var pHPv = 100, eHPv = 100, busy = false, over = false, dealt = 0;
    var pHPbar = pWrap.querySelector(".hp"), eHPbar = eWrap.querySelector(".hp");

    function setHp() {
      pHPbar.style.width = pHPv + "%";
      eHPbar.style.width = eHPv + "%";
      pHPbar.classList.toggle("low", pHPv <= 30);
      eHPbar.classList.toggle("low", eHPv <= 30);
    }
    function ko(playerWon) {
      over = true;
      stage.appendChild(el("div", "fight-ko", playerWon ? "🏆 فوز!" : "💥 KO"));
      log.textContent = playerWon ? "انتصارك! أعد النزال متى شئت" : "الروبوت انتصر… حاول مجددًا";
      if (playerWon) saveScoreFlow("fight", dealt);
      centerOverlay(playerWon ? "🎉" : "💥", playerWon ? "عيد مبارك! انتصارك" : "حاول مجددًا!", playerWon ? "win" : "lose");
    }
    function anim(ch, cls) {
      ch.classList.add(cls);
      setTimeout(function () { ch.classList.remove(cls); }, 300);
    }
    function playerAct(act) {
      if (busy || over) return;
      busy = true;
      var enemyAct = Math.random() < 0.4 ? "punch" : (Math.random() < 0.6 ? "kick" : "block");
      var pDmg = act === "punch" ? 10 : act === "kick" ? 16 : 0;
      var eDmg = enemyAct === "punch" ? 8 : enemyAct === "kick" ? 13 : 0;

      if (act === "block") {
        anim(pChar, "block");
        log.textContent = "🛡️ تمنّعت…";
      } else {
        anim(pChar, act === "punch" ? "punch" : "kick");
        var d = pDmg;
        if (enemyAct === "block") d = Math.round(d / 2);
        eHPv = Math.max(0, eHPv - d);
        dealt += d;
        log.textContent = (act === "punch" ? "🥊 لكمة" : "🦵 ركلة") + "! " + (enemyAct === "block" ? "الروبوت صدّها (-" + Math.round(pDmg / 2) + ")" : "أصابت (-" + d + ")");
      }
      setHp();
      if (eHPv <= 0) { ko(true); busy = false; return; }

      later(function () {
        if (act === "block") {
          var d2 = Math.round(eDmg / 2);
          pHPv = Math.max(0, pHPv - d2);
          log.textContent = "الروبوت هاجم وأنت تحمي (-" + d2 + ")";
          anim(pChar, "hit");
        } else if (enemyAct !== "block") {
          pHPv = Math.max(0, pHPv - eDmg);
          log.textContent = "الروبوت ردّ (" + (enemyAct === "kick" ? "ركلة" : "لكمة") + " -" + eDmg + ")";
          anim(pChar, "hit");
        } else {
          log.textContent = "الروبوت يتحصن بالدفاع.";
        }
        setHp();
        if (pHPv <= 0) { ko(false); busy = false; return; }
        busy = false;
      }, 550);
    }
    btnPunch.addEventListener("click", function () { playerAct("punch"); });
    btnKick.addEventListener("click", function () { playerAct("kick"); });
    btnBlock.addEventListener("click", function () { playerAct("block"); });
    setHp();
  }

  /* ================= AHMED GAMES (battle royale, Free Fire style) ================= */
  function startAhmd() {
    arena.appendChild(buildHeader("🎯 احمد قيمز"));
    arena.appendChild(el("p", "mg-hint", "تحرّك بالأسهم / WASD أو بلمس الشاشة — إطلاق النار تلقائي، انجُ من دائرة الخطر"));
    var info = el("div", "mg-head", "");
    info.appendChild(el("span", "mg-score", "الإقصاءات: 0"));
    info.appendChild(el("span", "mg-timer", "الموجة: 1"));
    arena.appendChild(info);
    var canvas = el("canvas", "mg-canvas", "");
    var ctx = canvas.getContext("2d");
    var W = 820, H = 520;
    canvas.width = W; canvas.height = H;
    arena.appendChild(canvas);
    var res = msgBox();
    arena.appendChild(res);

    var hpWrap = el("div", "ah-hp", "");
    var hpFill = el("div", "ah-hp-bar", "");
    hpWrap.appendChild(hpFill);
    arena.appendChild(hpWrap);

    var MAXHP = 100, TOTAL_WAVES = 5;
    var player = { x: W / 2, y: H / 2, hp: MAXHP, r: 15, speed: 190 };
    var enemies = [], bullets = [], packs = [];
    var zone = { cx: W / 2, cy: H / 2, r: Math.max(W, H) / 2 + 40 };
    var wave = 1, elims = 0, over = false;
    var waveLeft = 0, spawnTimer = 0, fireTimer = 0, dmgCd = 0, packTimer = 4;
    var keys = {};
    var joy = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
    var last = performance.now();

    function hpSet() {
      hpFill.style.width = Math.max(0, player.hp) + "%";
      hpFill.classList.toggle("low", player.hp <= 30);
    }
    function move(vx, vy) {
      var nx = player.x + vx, ny = player.y + vy, r = player.r;
      if (nx < r) nx = r;
      if (nx > W - r) nx = W - r;
      if (ny < r) ny = r;
      if (ny > H - r) ny = H - r;
      player.x = nx; player.y = ny;
    }
    function spawnEnemy() {
      var side = Math.floor(Math.random() * 4), x, y;
      if (side === 0) { x = -20; y = Math.random() * H; }
      else if (side === 1) { x = W + 20; y = Math.random() * H; }
      else if (side === 2) { x = Math.random() * W; y = -20; }
      else { x = Math.random() * W; y = H + 20; }
      enemies.push({ x: x, y: y, r: 13, hp: wave >= 4 ? 3 : wave >= 2 ? 2 : 1, speed: 55 + wave * 12 });
    }
    function startWave() {
      waveLeft = 3 + wave;
      spawnTimer = 0;
      info.querySelector(".mg-timer").textContent = "الموجة: " + wave;
      if (wave === 2) { zone.target = 300; zone.shrink = true; }
      else if (wave === 3) { zone.target = 190; }
      else if (wave === 4) { zone.target = 120; }
      else if (wave === 5) { zone.target = 70; }
    }
    function damagePlayer(d) {
      if (over) return;
      player.hp -= d;
      hpSet();
      if (player.hp <= 0) { player.hp = 0; hpSet(); lose(); }
    }
    function lose() {
      over = true;
      res.textContent = "💥 انتهت المباراة! الإقصاءات: " + elims + " — الموجة " + wave;
      res.className = "mg-msg lose";
      saveScoreFlow("ahmd", elims);
      centerOverlay("💥", "حاول مجددًا!", "lose");
    }
    function win() {
      over = true;
      res.textContent = "🏆 عيد مبارك! نجوت من كل الموجات! الإقصاءات: " + elims;
      res.className = "mg-msg win";
      saveScoreFlow("ahmd", elims);
      centerOverlay("🎉", "عيد مبارك! أكملت", "win");
    }

    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!over) {
        var mvx = 0, mvy = 0;
        if (keys["ArrowLeft"] || keys["KeyA"]) mvx -= 1;
        if (keys["ArrowRight"] || keys["KeyD"]) mvx += 1;
        if (keys["ArrowUp"] || keys["KeyW"]) mvy -= 1;
        if (keys["ArrowDown"] || keys["KeyS"]) mvy += 1;
        if (joy.active) { mvx = joy.dx; mvy = joy.dy; }
        var ml = Math.sqrt(mvx * mvx + mvy * mvy);
        if (ml > 1) { mvx /= ml; mvy /= ml; }
        move(mvx * player.speed * dt, mvy * player.speed * dt);

        if (zone.shrink) zone.r += (zone.target - zone.r) * 0.002;
        if (zone.r > 40) {
          var dz = Math.sqrt((player.x - zone.cx) * (player.x - zone.cx) + (player.y - zone.cy) * (player.y - zone.cy));
          if (dz > zone.r - player.r) {
            if (dmgCd <= 0) { damagePlayer(6); dmgCd = 0.5; }
          }
        }
        if (dmgCd > 0) dmgCd -= dt;

        if (waveLeft > 0) {
          spawnTimer += dt;
          if (spawnTimer > Math.max(0.4, 1.6 - wave * 0.18)) {
            spawnTimer = 0;
            spawnEnemy();
            waveLeft--;
          }
        }

        enemies.forEach(function (e) {
          var dx = player.x - e.x, dy = player.y - e.y;
          var d = Math.sqrt(dx * dx + dy * dy) || 1;
          e.x += (dx / d) * e.speed * dt;
          e.y += (dy / d) * e.speed * dt;
        });
        enemies.forEach(function (e) {
          var dx = e.x - player.x, dy = e.y - player.y;
          if (dx * dx + dy * dy < (e.r + player.r) * (e.r + player.r)) {
            if (dmgCd <= 0) { damagePlayer(8); dmgCd = 0.6; }
          }
        });

        var target = null, bd = Infinity;
        enemies.forEach(function (e) {
          var dx = e.x - player.x, dy = e.y - player.y;
          var d = dx * dx + dy * dy;
          if (d < bd) { bd = d; target = e; }
        });
        if (target) {
          fireTimer += dt;
          if (fireTimer > 0.24) {
            fireTimer = 0;
            var dx = target.x - player.x, dy = target.y - player.y;
            var d = Math.sqrt(dx * dx + dy * dy) || 1;
            bullets.push({ x: player.x, y: player.y, vx: (dx / d) * 420, vy: (dy / d) * 420, life: 1.2 });
          }
        }
        bullets = bullets.filter(function (b) {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.life -= dt;
          if (b.life <= 0) return false;
          for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            var dx = e.x - b.x, dy = e.y - b.y;
            if (dx * dx + dy * dy < (e.r + 4) * (e.r + 4)) {
              e.hp--;
              if (e.hp <= 0) {
                enemies.splice(i, 1);
                elims++;
                if (Math.random() < 0.25) packs.push({ x: e.x, y: e.y, life: 8 });
                info.querySelector(".mg-score").textContent = "الإقصاءات: " + elims;
              }
              return false;
            }
          }
          return true;
        });

        packTimer -= dt;
        if (packTimer <= 0) {
          packTimer = 6 + Math.random() * 5;
          packs.push({ x: 40 + Math.random() * (W - 80), y: 40 + Math.random() * (H - 80), life: 10 });
        }
        packs = packs.filter(function (p) {
          p.life -= dt;
          var dx = p.x - player.x, dy = p.y - player.y;
          if (dx * dx + dy * dy < 26 * 26) { player.hp = Math.min(MAXHP, player.hp + 30); hpSet(); return false; }
          return p.life > 0;
        });

        if (waveLeft <= 0 && enemies.length === 0) {
          if (wave >= TOTAL_WAVES) { win(); }
          else {
            wave++;
            startWave();
            res.textContent = "🎉 الموجة " + (wave - 1) + "! انتقلت للموجة " + wave;
            res.className = "mg-msg win";
          }
        }
      }

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0d1420";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(250,204,21,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(zone.cx, zone.cy, zone.r, 0, Math.PI * 2);
      ctx.stroke();
      if (zone.shrink) {
        ctx.fillStyle = "rgba(220,38,38,0.18)";
        ctx.beginPath();
        ctx.arc(zone.cx, zone.cy, zone.r + 60, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = "20px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      packs.forEach(function (p) { ctx.fillText("❤️", p.x, p.y); });
      ctx.fillStyle = "#fde047";
      bullets.forEach(function (b) { ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill(); });
      ctx.font = "26px serif";
      enemies.forEach(function (e) { ctx.fillText("🤖", e.x, e.y); });
      ctx.fillText("🪖", player.x, player.y);
      if (joy.active) {
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(joy.ox, joy.oy, 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.arc(joy.ox + joy.dx * 34, joy.oy + joy.dy * 34, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!over) raf = requestAnimationFrame(loop);
    }

    document.addEventListener("keydown", function (e) { keys[e.code] = true; });
    document.addEventListener("keyup", function (e) { keys[e.code] = false; });
    canvas.addEventListener("touchstart", function (e) {
      var t = e.changedTouches[0];
      var r = canvas.getBoundingClientRect();
      var x = (t.clientX - r.left) * (W / r.width);
      var y = (t.clientY - r.top) * (H / r.height);
      joy.active = true; joy.id = t.identifier; joy.ox = x; joy.oy = y; joy.dx = 0; joy.dy = 0;
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener("touchmove", function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joy.id) {
          var t = e.changedTouches[i];
          var r = canvas.getBoundingClientRect();
          var x = (t.clientX - r.left) * (W / r.width);
          var y = (t.clientY - r.top) * (H / r.height);
          var dx = x - joy.ox, dy = y - joy.oy;
          var d = Math.sqrt(dx * dx + dy * dy) || 1;
          if (d > 40) { dx = (dx / d) * 40; dy = (dy / d) * 40; }
          joy.dx = dx / 40; joy.dy = dy / 40;
        }
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener("touchend", function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joy.id) { joy.active = false; joy.id = null; }
      }
      e.preventDefault();
    }, { passive: false });

    hpSet();
    startWave();
    raf = requestAnimationFrame(loop);
  }

  /* ================= WORDS (Baba Munsif) — Stages ================= */
  function startWords() {
    arena.appendChild(buildHeader("✨ كلمات بابا منصف"));
    var logo = el("div", "mg-logo", "");
    "كلمات بابا منصف".split("").forEach(function (ch, i) {
      var s = el("span", ch === " " ? "l-spark" : "", ch === " " ? "✦" : ch);
      s.style.animationDelay = (i * 0.12) + "s";
      logo.appendChild(s);
    });
    arena.appendChild(logo);
    arena.appendChild(el("p", "mg-hint", "اختر لعبة من ألعاب كلمات بابا منصف — كل لعبة مراحل متدرجة وتعمل بدون إنترنت"));
    arena.appendChild(el("p", "mg-hint mg-count", "⭐ إجمالي المراحل: 330 — أسئلة دينية (110) + أذكار وخيرات (110) + ترتيب الحروف (110)"));
    var sub = el("div", "mg-submenu", "");
    var items = [
      { id: "quiz", emoji: "📖", title: "أسئلة دينية" },
      { id: "arrange", emoji: "🧩", title: "ترتيب الحروف" },
      { id: "dhikr", emoji: "🕌", title: "أذكار وخيرات" }
    ];
    items.forEach(function (it) {
      var card = el("div", "mg-sub-card", "");
      card.appendChild(el("span", "mg-emoji", it.emoji));
      card.appendChild(el("span", "", it.title));
      card.addEventListener("click", function () { wordsShell(it.title, { quiz: wordsQuiz, arrange: runStageArrange, dhikr: wordsDhikr }[it.id]); });
      sub.appendChild(card);
    });
    arena.appendChild(sub);
  }

  function wordsShell(title, builder) {
    clearTimers();
    current = "words";
    clear(arena);
    arena.appendChild(buildHeader("✨ كلمات بابا منصف"));
    var head = el("div", "mg-head", "");
    head.appendChild(el("h3", "", title));
    var back = el("button", "mg-btn", "↩ رجوع");
    back.addEventListener("click", function () { openGame("words"); });
    head.appendChild(back);
    arena.appendChild(head);
    builder();
  }

  /* ----- multiple choice stages (quiz / dhikr) ----- */
  var QUIZ_STAGES = [
    {
      title: "أساسيات الإسلام",
      items: [
        { p: "كم عدد أركان الإسلام؟", a: 0, o: ["5", "4", "6", "7"] },
        { p: "كم عدد سور القرآن الكريم؟", a: 2, o: ["100", "113", "114", "120"] },
        { p: "في أي شهر يصوم المسلمون؟", a: 1, o: ["شوال", "رمضان", "ذو الحجة", "محرّم"] },
        { p: "كم عدد أركان الإيمان؟", a: 0, o: ["6", "5", "7", "4"] },
        { p: "كم ركعة في صلاة الفجر؟", a: 1, o: ["4", "2", "3", "5"] }
      ]
    },
    {
      title: "معرفة القرآن والسيرة",
      items: [
        { p: "ما أول سورة في القرآن الكريم؟", a: 1, o: ["البقرة", "الفاتحة", "الإخلاص", "العلق"] },
        { p: "من هو خاتم الأنبياء والمرسلين؟", a: 0, o: ["محمد ﷺ", "عيسى عليه السلام", "موسى عليه السلام", "إبراهيم عليه السلام"] },
        { p: "ما القبلة الأولى للمسلمين؟", a: 3, o: ["الكعبة", "المسجد النبوي", "قبة الصخرة", "المسجد الأقصى"] },
        { p: "من الصحابي الملقّب بسيف الله المسلول؟", a: 3, o: ["أبو بكر", "عمر بن الخطاب", "عثمان بن عفان", "خالد بن الوليد"] },
        { p: "ما أعظم آية في القرآن الكريم؟", a: 2, o: ["سورة الإخلاص", "آية النور", "آية الكرسي", "سورة الناس"] }
      ]
    },
    {
      title: "التحدي",
      items: [
        { p: "ما السورة التي تُلقَّب بعروس القرآن؟", a: 0, o: ["الرحمن", "الملك", "يوسف", "النمل"] },
        { p: "من هو النبي الذي ابتلعه الحوت؟", a: 2, o: ["موسى", "عيسى", "يونس", "إلياس"] },
        { p: "كم عدد الأنبياء والرسل المذكورين في القرآن؟", a: 1, o: ["15", "25", "30", "40"] },
        { p: "ما اسم خازن الجنة؟", a: 3, o: ["ميكائيل", "إسرافيل", "جبرائيل", "رضوان"] },
        { p: "كم عدد الأشهر الحرم في السنة؟", a: 2, o: ["2", "3", "4", "5"] }
      ]
    },
    {
      title: "أركان الإسلام",
      items: [
        { p: "ما الركن الأول من أركان الإسلام؟", a: 0, o: ["الشهادتان", "الصلاة", "الزكاة", "الصوم"] },
        { p: "كم مرة يجب على المسلم حج البيت في العمر؟", a: 2, o: ["مرتين", "كل عام", "مرة واحدة", "ثلاث مرات"] },
        { p: "الزكاة حق واجب في ……", a: 3, o: ["الطعام فقط", "الملابس", "البيوت", "المال"] },
        { p: "الصوم فريضة في شهر ……", a: 1, o: ["شوال", "رمضان", "محرّم", "رجب"] },
        { p: "كم عدد أركان الإسلام؟", a: 0, o: ["5", "4", "6", "3"] }
      ]
    },
    {
      title: "أركان الإيمان",
      items: [
        { p: "كم عدد أركان الإيمان؟", a: 1, o: ["5", "6", "7", "4"] },
        { p: "من أركان الإيمان: الإيمان بالملائكة والكتب و……", a: 0, o: ["الرسل", "الخلفاء", "الصحابة", "الأئمة"] },
        { p: "الإيمان بالقدر خيره وشره من ……", a: 3, o: ["الشروط", "السنن", "المكروهات", "أركان الإيمان"] },
        { p: "التوراة نزلت على ……", a: 2, o: ["عيسى", "محمد ﷺ", "موسى", "داود"] },
        { p: "الزبور نزل على ……", a: 1, o: ["موسى", "داود", "عيسى", "إبراهيم"] }
      ]
    },
    {
      title: "الأنبياء (1)",
      items: [
        { p: "من أول الأنبياء؟", a: 3, o: ["نوح", "إبراهيم", "إدريس", "آدم عليه السلام"] },
        { p: "من أبو الأنبياء؟", a: 0, o: ["إبراهيم عليه السلام", "نوح", "إسماعيل", "يعقوب"] },
        { p: "من النبي الذي بنى السفينة؟", a: 2, o: ["موسى", "يونس", "نوح عليه السلام", "لوط"] },
        { p: "من النبي الذي أُلقي في النار فلم تحرقه؟", a: 1, o: ["إسماعيل", "إبراهيم عليه السلام", "يوسف", "أيوب"] },
        { p: "من النبي الذي أُلقي في الجب؟", a: 0, o: ["يوسف عليه السلام", "يعقوب", "هارون", "سليمان"] }
      ]
    },
    {
      title: "الأنبياء (2)",
      items: [
        { p: "من النبي الملقّب بكليم الله؟", a: 3, o: ["عيسى", "إدريس", "هارون", "موسى عليه السلام"] },
        { p: "من النبي الذي أُنزل عليه الإنجيل؟", a: 2, o: ["موسى", "داود", "عيسى عليه السلام", "يحيى"] },
        { p: "من النبي الذي أُنزل عليه الزبور؟", a: 1, o: ["موسى", "داود عليه السلام", "سليمان", "أيوب"] },
        { p: "من أنبياء أولي العزم؟", a: 0, o: ["نوح وإبراهيم وموسى وعيسى ومحمد ﷺ", "آدم ونوح وهود وصالح", "إدريس ولوط وإسحاق", "يعقوب ويوسف وأيوب"] },
        { p: "من النبي الذي رُفع إلى السماء وهو حي؟", a: 2, o: ["يوسف", "يونس", "عيسى عليه السلام", "إلياس"] }
      ]
    },
    {
      title: "سور القرآن",
      items: [
        { p: "ما أطول سورة في القرآن الكريم؟", a: 1, o: ["آل عمران", "البقرة", "النساء", "المائدة"] },
        { p: "ما أقصر سورة في القرآن؟", a: 0, o: ["الكوثر", "الناس", "الفلق", "الإخلاص"] },
        { p: "سورة تعدل ثلث القرآن؟", a: 2, o: ["النصر", "الفاتحة", "الإخلاص", "الكافرون"] },
        { p: "سورة لا تبدأ بالبسملة؟", a: 3, o: ["الفاتحة", "العلق", "يس", "التوبة"] },
        { p: "السورة التي تسمى عروس القرآن؟", a: 0, o: ["الرحمن", "الواقعة", "النمل", "يس"] }
      ]
    },
    {
      title: "الصلاة",
      items: [
        { p: "كم عدد الصلوات المفروضة في اليوم والليلة؟", a: 2, o: ["3", "4", "5", "6"] },
        { p: "كم عدد ركعات صلاة المغرب؟", a: 1, o: ["4", "3", "2", "5"] },
        { p: "كم عدد ركعات صلاة الظهر؟", a: 0, o: ["4", "3", "2", "5"] },
        { p: "الصلاة الوسطى هي صلاة ……", a: 3, o: ["الفجر", "الظهر", "المغرب", "العصر"] },
        { p: "أول ما يُحاسب عليه العبد يوم القيامة؟", a: 1, o: ["الصوم", "الصلاة", "الزكاة", "الذكر"] }
      ]
    },
    {
      title: "الصوم",
      items: [
        { p: "متى فُرض صيام رمضان؟", a: 2, o: ["السنة الأولى للهجرة", "السنة الثالثة", "السنة الثانية للهجرة", "السنة الرابعة"] },
        { p: "من مبطلات الصوم؟", a: 0, o: ["الأكل والشرب عمدًا", "الكلام", "المشي", "النوم"] },
        { p: "السحور سنة وبركة في ……", a: 1, o: ["النهار", "الطعام", "العمل", "الصلاة"] },
        { p: "صيام يوم عاشوراء يُكفّر ذنوب ……", a: 3, o: ["سنتين", "ثلاث سنوات", "شهرًا", "سنة ماضية"] },
        { p: "من حكم الصيام: تربية النفس على ……", a: 0, o: ["التقوى", "الكسل", "الأكل", "النوم"] }
      ]
    },
    {
      title: "الزكاة والصدقة",
      items: [
        { p: "نصاب الزكاة في الذهب؟", a: 2, o: ["50 جرامًا", "70 جرامًا", "85 جرامًا", "100 جرام"] },
        { p: "مقدار زكاة المال؟", a: 1, o: ["العُشر", "ربع العشر (2.5٪)", "الخُمس", "النصف"] },
        { p: "زكاة الفطر تُخرج قبل ……", a: 0, o: ["صلاة العيد", "صلاة الجمعة", "صلاة الفجر", "صلاة المغرب"] },
        { p: "الصدقة الجارية من أعمال ……", a: 3, o: ["النساء", "المسافرين", "الأطباء", "الخير"] },
        { p: "كم عدد مصارف الزكاة؟", a: 2, o: ["6", "7", "8", "9"] }
      ]
    },
    {
      title: "الحج والعمرة",
      items: [
        { p: "ما البيت الذي يحج إليه المسلمون؟", a: 1, o: ["المسجد النبوي", "الكعبة", "المسجد الأقصى", "قبة الصخرة"] },
        { p: "الوقوف بعرفة يكون يوم ……", a: 0, o: ["عرفة", "العيد", "التشريق", "التروية"] },
        { p: "السعي يكون بين ……", a: 3, o: ["جبل أحد والبقيع", "الحجر الأسود والملتزم", "منى والمزدلفة", "الصفا والمروة"] },
        { p: "رمي الجمرات يكون في ……", a: 2, o: ["عرفة", "مزدلفة", "منى", "مكة"] },
        { p: "طواف الإفاضة يكون بعد ……", a: 1, o: ["الإحرام", "الوقوف بعرفة", "السعي", "الرمي"] }
      ]
    },
    {
      title: "الصحابة",
      items: [
        { p: "من أول الخلفاء الراشدين؟", a: 0, o: ["أبو بكر الصديق", "عمر بن الخطاب", "عثمان بن عفان", "علي بن أبي طالب"] },
        { p: "من الملقّب بالفاروق؟", a: 1, o: ["أبو بكر", "عمر بن الخطاب", "عثمان", "علي"] },
        { p: "من الملقّب بذي النورين؟", a: 2, o: ["أبو بكر", "عمر", "عثمان بن عفان", "علي"] },
        { p: "من الملقّب بأسد الله؟", a: 3, o: ["خالد", "أبو عبيدة", "سعد", "حمزة بن عبد المطلب"] },
        { p: "من كاتم سر النبي ﷺ؟", a: 0, o: ["حذيفة بن اليمان", "زيد بن حارثة", "بلال", "سلمان"] }
      ]
    },
    {
      title: "الغزوات",
      items: [
        { p: "ما أول غزوة كبرى في الإسلام؟", a: 2, o: ["أحد", "الخندق", "بدر", "تبوك"] },
        { p: "في أي غزوة استشهد حمزة بن عبد المطلب؟", a: 1, o: ["بدر", "أحد", "الخندق", "حنين"] },
        { p: "غزوة الأحزاب تسمى أيضًا غزوة ……", a: 0, o: ["الخندق", "حنين", "تبوك", "مؤتة"] },
        { p: "في أي عام كان فتح مكة؟", a: 3, o: ["السنة الخامسة للهجرة", "السنة السادسة", "السنة السابعة", "السنة الثامنة للهجرة"] },
        { p: "ما آخر غزوات النبي ﷺ؟", a: 1, o: ["حنين", "تبوك", "بدر", "أحد"] }
      ]
    },
    {
      title: "الملائكة",
      items: [
        { p: "من الملك الموكل بالوحي؟", a: 0, o: ["جبريل عليه السلام", "ميكائيل", "إسرافيل", "رضوان"] },
        { p: "من الملك الموكل بأمطار الغيث والرزق؟", a: 1, o: ["جبريل", "ميكائيل", "عزرائيل", "مالك"] },
        { p: "من الملك الموكل بالنفخ في الصور؟", a: 2, o: ["جبريل", "ميكائيل", "إسرافيل", "جبرائيل"] },
        { p: "من الملك الموكل بقبض الأرواح؟", a: 3, o: ["جبريل", "إسرافيل", "مالك", "ملك الموت"] },
        { p: "من ملك خازن النار؟", a: 1, o: ["رضوان", "مالك", "منكر", "نكير"] }
      ]
    },
    {
      title: "يوم القيامة",
      items: [
        { p: "من أول من تنشق عنه الأرض يوم القيامة؟", a: 2, o: ["آدم", "إبراهيم", "نبينا محمد ﷺ", "عيسى"] },
        { p: "الحوض الذي للنبي ﷺ اسمه ……", a: 0, o: ["الكوثر", "السلسبيل", "الرحمة", "السدرة"] },
        { p: "الصراط هو صراط ……", a: 1, o: ["الجنة", "المستقيم", "النار", "البرزخ"] },
        { p: "الشفاعة العظمى يوم القيامة تكون لمن؟", a: 3, o: ["لآدم", "لنوح", "لإبراهيم", "لنبينا محمد ﷺ"] },
        { p: "الموازين يوم القيامة توزن فيها ……", a: 0, o: ["الأعمال", "الأموال", "الأجسام", "الطعام"] }
      ]
    },
    {
      title: "الجنة والنار",
      items: [
        { p: "ما اسم خازن الجنة؟", a: 2, o: ["مالك", "نكير", "رضوان", "عزرائيل"] },
        { p: "أعلى منزلة في الجنة؟", a: 0, o: ["الوسيلة", "الغرفة", "الحور", "الرضوان"] },
        { p: "نهر في الجنة أنعم الله به نبيه ﷺ؟", a: 1, o: ["السلسبيل", "الكوثر", "التسنيم", "الرحيق"] },
        { p: "شجرة الجنة التي تظلل الجنة؟", a: 3, o: ["النخل", "الزيتون", "السدر", "طوبى"] },
        { p: "أول أمة تدخل الجنة؟", a: 1, o: ["اليهود", "أمة محمد ﷺ", "النصارى", "المشركون"] }
      ]
    },
    {
      title: "الأخلاق",
      items: [
        { p: "من الحديث: الحياء من ……", a: 0, o: ["الإيمان", "العمل", "الصلاة", "الصوم"] },
        { p: "لا يؤمن أحدكم حتى يحب لأخيه ……", a: 2, o: ["المال", "الجاه", "ما يحبه لنفسه", "الأولاد"] },
        { p: "أفضل الأعمال بعد الإيمان بالله؟", a: 1, o: ["الجهاد", "بر الوالدين", "الصدقة", "الحج"] },
        { p: "الكلمة الطيبة ……", a: 3, o: ["خسارة", "كلام", "زينة", "صدقة"] },
        { p: "الصدق يهدي إلى ……", a: 0, o: ["البر", "الشر", "الكذب", "الغفلة"] }
      ]
    },
    {
      title: "الأذكار والفضائل",
      items: [
        { p: "أحب الكلام إلى الله؟", a: 1, o: ["سبحان الله", "سبحان الله وبحمده", "الله أكبر", "الحمد لله"] },
        { p: "كلمتان حبيبتان إلى الرحمن: سبحان الله وبحمده، و……", a: 0, o: ["سبحان الله العظيم", "الحمد لله", "لا إله إلا الله", "الله أكبر"] },
        { p: "أفضل الذكر؟", a: 2, o: ["الحمد لله", "الله أكبر", "لا إله إلا الله", "سبحان الله"] },
        { p: "سيد الاستغفار يبدأ بـ: اللهم أنت ربي ……", a: 3, o: ["الملك", "الغفور", "الرحيم", "لا إله إلا أنت"] },
        { p: "من قال: لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير عشر مرات، كان كمن ……", a: 0, o: ["أعتق أربعة أنفس من ولد إسماعيل", "صام الدهر", "حج كل عام", "قرأ القرآن"] }
      ]
    },
    {
      title: "التاريخ والسيرة",
      items: [
        { p: "أين نزل الوحي على النبي ﷺ لأول مرة؟", a: 2, o: ["في المدينة", "على جبل أحد", "في غار حراء", "عند الكعبة"] },
        { p: "ما اسم المدينة قبل الهجرة؟", a: 0, o: ["يثرب", "مكة", "الطائف", "جدة"] },
        { p: "كم سنة استمر الوحي على النبي ﷺ؟", a: 1, o: ["20 سنة", "23 سنة", "25 سنة", "30 سنة"] },
        { p: "في أي عام توفي النبي ﷺ؟", a: 3, o: ["السنة 8 للهجرة", "السنة 9", "السنة 10", "السنة 11 للهجرة"] },
        { p: "إلى أين كانت أول هجرة في الإسلام؟", a: 2, o: ["الطائف", "يثرب", "الحبشة", "مصر"] }
      ]
    },
    {
      title: "القرآن العظيم",
      items: [
        { p: "كم عدد آيات سورة الفاتحة؟", a: 0, o: ["7", "6", "8", "5"] },
        { p: "سورة يس تُلقَّب بـ ……", a: 3, o: ["أم الكتاب", "عروس القرآن", "الفاتحة", "قلب القرآن"] },
        { p: "أطول آية في القرآن هي آية ……", a: 1, o: ["الكرسي", "المداينة (الدين)", "النور", "الكهف"] },
        { p: "السورة التي تجادل عن صاحبها في القبر؟", a: 2, o: ["الفاتحة", "يس", "الملك", "الكهف"] },
        { p: "من قرأ سورة الكهف يوم الجمعة أضاء له ……", a: 0, o: ["نور ما بين الجمعتين", "سنة كاملة", "شهرًا", "يومًا"] }
      ]
    },
    {
      title: "متنوع",
      items: [
        { p: "في أي عشْر توجد ليلة القدر؟", a: 1, o: ["أول رمضان", "العشر الأواخر", "منتصف رمضان", "بعد العيد"] },
        { p: "ليلة القدر خير من ……", a: 0, o: ["ألف شهر", "خمسمائة شهر", "مائة شهر", "ألف سنة"] },
        { p: "ما أول ما خلقه الله؟", a: 3, o: ["السماء", "الملائكة", "النور", "القلم"] },
        { p: "ما اسم والد النبي ﷺ؟", a: 2, o: ["أبو طالب", "عبد المطلب", "عبد الله", "أبو لهب"] },
        { p: "ما اسم أم النبي ﷺ؟", a: 1, o: ["حليمة", "آمنة بنت وهب", "فاطمة", "خديجة"] }
      ]
    }
  ];
  var DHIKR_STAGES = [
    {
      title: "الأذكار الأساسية",
      items: [
        { p: "بسم الله الرحمن ……", a: 1, o: ["الودود", "الرحيم", "السميع", "العزيز"] },
        { p: "الحمد لله رب ……", a: 0, o: ["العالمين", "الناس", "الملائكة", "الأنبياء"] },
        { p: "قل هو الله ……", a: 3, o: ["الملك", "الرحمن", "الرحيم", "أحد"] },
        { p: "لا حول ولا قوة إلا ……", a: 1, o: ["بالله", "الله", "الواحد", "القوي"] },
        { p: "سبحان الله وبحمده سبحان الله ……", a: 2, o: ["الكريم", "الغفور", "العظيم", "الرحمن"] }
      ]
    },
    {
      title: "أذكار الصباح والمساء",
      items: [
        { p: "اللهم بك أصبحنا وبك ……", a: 3, o: ["ننام", "نستيقظ", "نحيا", "أمسينا"] },
        { p: "اللهم بك نحيا وبك نموت وإليك ……", a: 0, o: ["النشور", "المصير", "المعاد", "الرجوع"] },
        { p: "أستغفر الله و…… إليه", a: 0, o: ["أتوب", "أعود", "أدعو", "أشكر"] },
        { p: "رضيت بالله ربًا وبالإسلام دينًا وبمحمد ……", a: 2, o: ["سيدًا", "رسولًا", "نبيًّا", "قائدًا"] },
        { p: "اللهم إني أسألك ……", a: 1, o: ["الدنيا", "الجنة", "العفو", "الهدى"] }
      ]
    },
    {
      title: "خيرات وأذكار",
      items: [
        { p: "سبحان الله عدد خلقه ورضا ……", a: 0, o: ["نفسه", "ربه", "الخلق", "الملائكة"] },
        { p: "من قال سبحان الله وبحمده غُرست له نخلة في ……", a: 3, o: ["الدنيا", "القصر", "الفردوس", "الجنة"] },
        { p: "اللهم أصلح لي ديني الذي هو …… أمري", a: 2, o: ["نور", "زاد", "عصمة", "حياة"] },
        { p: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء ……", a: 0, o: ["قدير", "عليم", "حكيم", "سميع"] },
        { p: "اللهم صلِّ على …… وعلى آله", a: 3, o: ["الأنبياء", "الملائكة", "الصالحين", "محمد"] }
      ]
    },
    {
      title: "أذكار النوم",
      items: [
        { p: "اللهم باسمك أموت وباسمك ……", a: 0, o: ["أحيا", "أصحو", "أنام", "أعيش"] },
        { p: "اللهم أسلمت نفسي إليك ووجهت وجهي إليك وفوضت أمري ……", a: 2, o: ["إليك أمري", "إليك كل شيء", "إليك", "إليك وحدك"] },
        { p: "آية الكرسي تُقرأ قبل …… حماية من الشيطان", a: 1, o: ["الطعام", "النوم", "الصلاة", "السفر"] },
        { p: "من قرأ المعوذتين قبل النوم كفتاه من ……", a: 3, o: ["البرد", "الحر", "المرض", "كل شر"] },
        { p: "كان النبي ﷺ يعلّم …… التسبيح قبل النوم: سبحان الله والحمد لله والله أكبر", a: 2, o: ["الصبيان", "الكبار", "فاطمة وعليًا", "المهاجرين"] }
      ]
    },
    {
      title: "أذكار الاستيقاظ",
      items: [
        { p: "الحمد لله الذي أحيانا بعد ما أماتنا وإليه ……", a: 1, o: ["المرجع", "النشور", "المعاد", "المصير"] },
        { p: "الحمد لله الذي ردّ عليّ روحي وعافاني في ……", a: 0, o: ["جسدي", "مالي", "أهلي", "عملي"] },
        { p: "اللهم ما أصبح بي من نعمة فمنك ……", a: 3, o: ["المبارك", "العظيم", "الرزاق", "وحدك لا شريك لك"] },
        { p: "اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في ……", a: 2, o: ["مالي", "عملي", "بصري", "ديني"] },
        { p: "أصبحنا وأصبح الملك لله و……", a: 0, o: ["الحمد لله", "الشكر لله", "العزة لله", "القدرة لله"] }
      ]
    },
    {
      title: "أذكار الطعام",
      items: [
        { p: "نقول قبل الأكل: بسم الله، وإن نسينا نقول: بسم الله ……", a: 2, o: ["الرحمن", "العظيم", "أوله وآخره", "الملك"] },
        { p: "بعد الأكل نقول: الحمد لله الذي أطعمنا وسقانا وجعلنا ……", a: 0, o: ["مسلمين", "صائمين", "قائمين", "ذاكرين"] },
        { p: "من أكل طعامًا فقال: الحمد لله الذي أطعمني هذا ورزقنيه من غير حول مني ولا قوة، غُفر له ما تقدم من ……", a: 3, o: ["عمله", "يومه", "أهله", "ذنبه"] },
        { p: "من الحديث: بحسب ابن آدم لقيمات يقمن صلبه؛ ما ملأ آدمي وعاء شرًا من ……", a: 1, o: ["المال", "البطن", "الحرص", "الكلام"] },
        { p: "نقول قبل الشرب: بسم الله، وبعده: ……", a: 0, o: ["الحمد لله", "سبحان الله", "لا حول", "اللهم"] }
      ]
    },
    {
      title: "أذكار الدخول والخروج",
      items: [
        { p: "دخول البيت: بسم الله ولجنا وبسم الله ……", a: 0, o: ["خرجنا", "أكلنا", "شربنا", "صلينا"] },
        { p: "دخول الخلاء: اللهم إني أعوذ بك من الخبث و……", a: 2, o: ["الأذى", "الضرر", "الخبائث", "الشرور"] },
        { p: "الخروج من الخلاء نقول: ……", a: 1, o: ["اللهم إني أسألك الجنة", "غفرانك", "اللهم أعني", "بسم الله"] },
        { p: "من لم يذكر اسم الله عند دخوله بيته قال الشيطان: لا مبيت لكم ولا ……", a: 2, o: ["طعام", "راحة", "عشاء", "صلاة"] },
        { p: "دخول المسجد: اللهم افتح لي أبواب ……", a: 0, o: ["رحمتك", "جنتك", "رزقك", "علومك"] }
      ]
    },
    {
      title: "أذكار المسجد والأذان",
      items: [
        { p: "الخروج من المسجد: اللهم إني أسألك من ……", a: 1, o: ["خير الدنيا", "فضلك", "رحمة الله", "الجنات"] },
        { p: "الماشي إلى المسجد يُكتب له بكل خطوة ……", a: 0, o: ["حسنة", "ركعة", "دعوة", "صدقة"] },
        { p: "عند سماع الأذان: اللهم رب هذه الدعوة التامة والصلاة ……", a: 3, o: ["الواقعة", "المكتوبة", "المؤداة", "القائمة"] },
        { p: "بعد الأذان نسأل الله لرسوله ﷺ ……", a: 2, o: ["الرزق", "الصحة", "الوسيلة", "النجاة"] },
        { p: "الدعاء بين الأذان والإقامة ……", a: 0, o: ["لا يُرَد", "مستجاب أحيانًا", "مرغوب فيه", "مقبول"] }
      ]
    },
    {
      title: "أذكار الوضوء والصلاة",
      items: [
        { p: "قبل الوضوء نقول: ……", a: 0, o: ["بسم الله", "سبحان الله", "الحمد لله", "الله أكبر"] },
        { p: "بعد الوضوء: أشهد أن لا إله إلا الله وأن محمدًا ……", a: 2, o: ["نبي الله", "رسول الله", "عبده ورسوله", "خاتم الله"] },
        { p: "بعد الوضوء: اللهم اجعلني من التوابين واجعلني من ……", a: 1, o: ["الصالحين", "المتطهرين", "الذاكرين", "المتقين"] },
        { p: "من ذكر السجود: سبحان ربي الأعلى و……", a: 0, o: ["بحمده", "شكره", "فضله", "حبه"] },
        { p: "بعد الصلاة: اللهم أنت السلام ومنك السلام تباركت يا ذا ……", a: 2, o: ["الرحمة", "المغفرة", "الجلال والإكرام", "الفضل"] }
      ]
    },
    {
      title: "أسماء الله الحسنى",
      items: [
        { p: "من أسماء الله: الرحمن و……", a: 1, o: ["الملك", "الرحيم", "العزيز", "الحكيم"] },
        { p: "الله …… لا إله إلا هو الحي القيوم", a: 0, o: ["الواحد", "الرحمن", "الغفور", "الرزاق"] },
        { p: "من أسماء الله الحسنى: …… السماوات والأرض", a: 3, o: ["خالق كل شيء", "الرازق", "الغفار", "بديع"] },
        { p: "الذي يسمع كل شيء هو ……", a: 2, o: ["العليم", "القدير", "السميع", "البصير"] },
        { p: "الذي يرى كل شيء هو ……", a: 1, o: ["السميع", "البصير", "العالم", "الخبير"] }
      ]
    },
    {
      title: "أدعية قرآنية",
      items: [
        { p: "ربنا آتنا في الدنيا حسنة وفي …… حسنة وقنا عذاب النار", a: 0, o: ["الآخرة", "الدار", "الحياة", "الجنة"] },
        { p: "ربنا لا تؤاخذنا إن نسينا أو ……", a: 3, o: ["أخطأنا", "ظلمنا", "جهلنا", "أخفقنا"] },
        { p: "ربنا اغفر لي ولوالدي وللمؤمنين يوم يقوم ……", a: 2, o: ["العمل", "الدين", "الحساب", "الصراط"] },
        { p: "ربنا هب لنا من أزواجنا وذرياتنا قرة ……", a: 1, o: ["العين", "أعين", "القلب", "الخاطر"] },
        { p: "ربنا إننا آمنا فاغفر لنا ذنوبنا وقنا عذاب ……", a: 0, o: ["النار", "القبر", "الجهنم", "الدار"] }
      ]
    },
    {
      title: "الصلاة على النبي ﷺ",
      items: [
        { p: "اللهم صلِّ على محمد وعلى آل محمد كما صليت على ……", a: 2, o: ["الأنبياء", "المرسلين", "إبراهيم", "المؤمنين"] },
        { p: "اللهم بارك على محمد وعلى آل محمد كما باركت على ……", a: 0, o: ["إبراهيم", "موسى", "عيسى", "الرسل"] },
        { p: "من صلى عليّ صلاة صلى الله عليه بها ……", a: 1, o: ["حسنة", "عشرًا", "سبعًا", "واحدة"] },
        { p: "الصلاة على النبي ﷺ في التشهد الأخير من واجبات ……", a: 2, o: ["الوضوء", "الصوم", "الصلاة", "الحج"] },
        { p: "من أكثر من الصلاة على النبي ﷺ يوم …… قربًا", a: 3, o: ["العيد", "الجمعة", "الأضحى", "الفطر"] }
      ]
    },
    {
      title: "أدعية الرزق",
      items: [
        { p: "اللهم اكفني بحلالك عن حرامك وأغنني بفضلك عمن ……", a: 0, o: ["سواك", "غيرك", "الخلق", "الناس"] },
        { p: "من قال صباحًا: اللهم إني أسألك علمًا نافعًا ورزقًا طيبًا وعملًا ……", a: 2, o: ["جميلًا", "نافعًا", "متقبلًا", "مقبولًا"] },
        { p: "اللهم لا مانع لما أعطيت ولا معطي لما ……", a: 1, o: ["منعت", "أعطيت", "أردت", "شئت"] },
        { p: "اللهم أنت ذو المن وذو ……", a: 0, o: ["الفضل", "الجاه", "المال", "السلطان"] },
        { p: "من أراد الغنى فليكثر من ذكر ……", a: 3, o: ["المال", "العمل", "الدعاء", "الله"] }
      ]
    },
    {
      title: "أدعية الوالدين",
      items: [
        { p: "رب ارحمهما كما ربياني ……", a: 1, o: ["سعيدًا", "صغيرًا", "شابًا", "محبوبًا"] },
        { p: "اللهم اغفر لي ولوالدي وللمؤمنين يوم ……", a: 0, o: ["يقوم الحساب", "القيامة", "الحشر", "النشور"] },
        { p: "اللهم اجعل والديّ من أهل ……", a: 3, o: ["الخير", "البر", "الفضل", "الجنة"] },
        { p: "رضا الرب في رضا ……", a: 2, o: ["الأولاد", "الجيران", "الوالدين", "الأصدقاء"] },
        { p: "بر الوالدين من أحب الأعمال إلى ……", a: 0, o: ["الله", "الناس", "الرسول", "المجتمع"] }
      ]
    },
    {
      title: "أدعية الهم والحزن",
      items: [
        { p: "اللهم إني أعوذ بك من الهم والحزن والعجز و……", a: 0, o: ["الكسل", "النوم", "الجهل", "الفقر"] },
        { p: "لا إله إلا الله العظيم الحليم، لا إله إلا الله رب العرش ……", a: 2, o: ["الرحيم", "العظيم", "العظيم", "الرفيع"] },
        { p: "حسبنا الله ونعم ……", a: 1, o: ["الولي", "الوكيل", "الرب", "النصير"] },
        { p: "اللهم رحمتك أرجو فلا تكلني إلى نفسي طرفة ……", a: 3, o: ["ساعة", "يوم", "لحظة", "عين"] },
        { p: "أعوذ بكلمات الله التامات من شر ما ……", a: 0, o: ["خلق", "رزق", "علم", "قدر"] }
      ]
    },
    {
      title: "أذكار السفر",
      items: [
        { p: "قول عند الركوب: سبحان الذي سخر لنا هذا وما كنا له ……", a: 1, o: ["قادرين", "مقربين", "مطيقين", "ممكنين"] },
        { p: "اللهم إنا نسألك في سفرنا هذا البر والتقوى ومن العمل ما ……", a: 0, o: ["ترضى", "تحب", "تشاء", "تريد"] },
        { p: "عند الإياب نقول: آيبون تائبون عابدون لربنا ……", a: 2, o: ["شاكرون", "مؤمنون", "حامدون", "صالحون"] },
        { p: "اللهم اطوِ لنا الأرض وهون علينا ……", a: 3, o: ["الطريق", "الركوب", "المسير", "السفر"] },
        { p: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء ……", a: 1, o: ["مقتدر", "قدير", "قادر", "حكيم"] }
      ]
    },
    {
      title: "أذكار المطر والرعد",
      items: [
        { p: "قول عند نزول المطر: اللهم صيبًا ……", a: 0, o: ["نافعًا", "غزيرًا", "مباركًا", "كريمًا"] },
        { p: "مطرنا بفضل الله و……", a: 2, o: ["قدرته", "عنايته", "رحمته", "فضله"] },
        { p: "اللهم إني أسألك خيرها وخير ما فيها وخير ما أُرسلت به وأعوذ بك من ……", a: 1, o: ["شرها وشر ما فيها", "أذاها", "بردها", "سيولها"] },
        { p: "قول عند الرعد: سبحان الذي يسبح الرعد بحمده و……", a: 3, o: ["عظمته", "جلاله", "سلطانه", "الملائكة"] },
        { p: "اللهم سقيا رحمة لا سقيا ……", a: 0, o: ["عذاب", "بلاء", "نقمة", "بوار"] }
      ]
    },
    {
      title: "التسبيح والتهليل",
      items: [
        { p: "من قال: سبحان الله وبحمده مائة مرة حُطّت خطاياه وإن كانت مثل ……", a: 2, o: ["الجبل", "البحر", "زبد البحر", "الرمال"] },
        { p: "من قال: سبحان الله العظيم وبحمده غُرست له …… في الجنة", a: 0, o: ["نخلة", "شجرة", "زهرة", "سدرة"] },
        { p: "التسبيح والتحميد والتكبير بعد الصلوات المفروضات …… مرة", a: 3, o: ["مرة", "مرتين", "خمسًا", "ثلاثًا وثلاثين"] },
        { p: "كلمتان خفيفتان على اللسان ثقيلتان في الميزان: سبحان الله وبحمده، سبحان الله ……", a: 1, o: ["الملك", "العظيم", "الغفور", "الواحد"] },
        { p: "من قال: لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير مائة مرة في اليوم كانت له عدل ……", a: 0, o: ["عشر رقاب", "حرث", "شهر", "حجة"] }
      ]
    },
    {
      title: "الاستغفار",
      items: [
        { p: "أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب ……", a: 0, o: ["إليه", "له", "عنه", "فيه"] },
        { p: "من أكثر الاستغفار جعل الله له من كل هم فرجًا ومن كل ضيق ……", a: 3, o: ["رزقًا", "فرجًا", "خيرًا", "مخرجًا"] },
        { p: "اللهم إنك عفو تحب العفو فاعفُ ……", a: 2, o: ["عني", "مني", "عنا", "عبادك"] },
        { p: "سيد الاستغفار: اللهم أنت ربي لا إله إلا أنت خلقتني وأنا ……", a: 1, o: ["مسلم", "عبدك", "فاتبك", "مطيع"] },
        { p: "من قال: استغفر الله الذي لا إله إلا هو الحي القيوم وأتوب إليه، غُفر له وإن كان قد ……", a: 0, o: ["فرّ من الزحف", "نام", "سافر", "مرض"] }
      ]
    },
    {
      title: "أدعية متنوعة (1)",
      items: [
        { p: "اللهم إني أسألك العفو و…… في الدنيا والآخرة", a: 0, o: ["العافية", "الراحة", "الصحة", "السلامة"] },
        { p: "اللهم حاسبني حسابًا ……", a: 2, o: ["كثيفًا", "شديدًا", "يسيرًا", "عادلًا"] },
        { p: "اللهم أعني على ذكرك وشكرك وحسن ……", a: 1, o: ["خاتمتي", "عبادتك", "عملي", "أخلاقي"] },
        { p: "اللهم اجعل خير عمري ……", a: 3, o: ["آخره", "أوله", "منتصفه", "كلّه"] },
        { p: "اللهم إني أسألك الهدى والتقى والعفاف و……", a: 0, o: ["الغنى", "الرزق", "الجاه", "العلم"] }
      ]
    },
    {
      title: "أدعية متنوعة (2)",
      items: [
        { p: "اللهم بارك لنا فيما رزقتنا وقنا عذاب ……", a: 1, o: ["البرزخ", "النار", "القبر", "الدنيا"] },
        { p: "اللهم اغفر لي خطيئتي وجهلي وإسرافي في ……", a: 0, o: ["أمري", "عملي", "قولي", "مالي"] },
        { p: "اللهم إني أعوذ بك من علم لا ينفع وقلب لا يخشع ودعاء لا يُسمع و…… لا تشبع", a: 3, o: ["معدة", "عين", "جسد", "نفس"] },
        { p: "اللهم اهدني وسددني وثبتني على ……", a: 2, o: ["الهدى", "الصراط", "الحق", "الإيمان"] },
        { p: "اللهم إني ظلمت نفسي ظلمًا كثيرًا ولا يغفر الذنوب إلا ……", a: 0, o: ["أنت", "الله", "ربي", "الغفور"] }
      ]
    },
    {
      title: "أذكار الخيرات",
      items: [
        { p: "من عمل خيرًا فله ……", a: 1, o: ["الحمد", "حسنة بعشر أمثالها", "الرزق", "الثواب"] },
        { p: "من دعا إلى هدى كان له من الأجر مثل أجور من …… بغير أن ينقص من أجورهم شيء", a: 0, o: ["اتبعه", "عرفه", "سمعه", "شاركه"] },
        { p: "الدال على الخير كفاعل ……", a: 2, o: ["المسلمين", "الجنة", "الخير", "الأجر"] },
        { p: "من سنّ في الإسلام سنة حسنة فله أجرها وأجر من عمل بها إلى يوم ……", a: 3, o: ["القيامة", "الدين", "الحساب", "الجزاء"] },
        { p: "تبسمك في وجه أخيك ……", a: 0, o: ["صدقة", "سنة", "مكرمة", "خلق"] }
      ]
    }
  ];

  function runStageMC(stages, key) {
    var score = 0, st = 0, item = 0;
    var box = el("div", "", "");
    var scoreEl = el("p", "mg-score", "النتيجة: 0");
    var stageEl = el("p", "mg-stage", "");
    var prog = el("div", "mg-stage-bar", "");
    prog.appendChild(el("div", "mg-stage-fill", ""));
    var qEl = el("p", "mg-q", "");
    var opts = el("div", "mg-q-opts", "");
    var res = msgBox();
    box.appendChild(scoreEl);
    box.appendChild(stageEl);
    box.appendChild(prog);
    box.appendChild(qEl);
    box.appendChild(opts);
    box.appendChild(res);
    arena.appendChild(box);
    var fill = prog.querySelector(".mg-stage-fill");

    function paint() {
      var s = stages[st];
      stageEl.textContent = "المرحلة " + (st + 1) + " من " + stages.length + " — " + s.title;
      fill.style.width = Math.round((item / s.items.length) * 100) + "%";
      scoreEl.textContent = "النتيجة: " + score;
    }
    function nextOrFinish() {
      var s = stages[st];
      if (item < s.items.length) { later(showQ, 900); return; }
      if (st < stages.length - 1) {
        st++; item = 0;
        paint();
        res.textContent = "🎉 انتقلت إلى المرحلة " + (st + 1) + "!";
        res.className = "mg-msg win";
        later(showQ, 1100);
        return;
      }
      res.textContent = "🏆 أكملت كل المراحل! نتيجتك: " + score;
      res.className = "mg-msg win";
      saveScoreFlow(key, score);
      centerOverlay("🎉", "عيد مبارك! أكملت كل المراحل", "win");
    }
    function showQ() {
      res.className = "mg-msg";
      res.textContent = "";
      var s = stages[st];
      var it = s.items[item];
      qEl.textContent = "المرحلة " + (st + 1) + " — السؤال " + (item + 1) + ". " + it.p;
      clear(opts);
      it.o.forEach(function (opt, i) {
        var b = el("button", "mg-q-opt", opt);
        b.addEventListener("click", function () {
          if (res.className === "mg-msg win" || res.className === "mg-msg lose") return;
          opts.querySelectorAll(".mg-q-opt").forEach(function (x) { x.classList.add("disabled"); });
          if (i === it.a) {
            score++;
            b.classList.add("correct");
            res.textContent = "✓ صحيح!";
            res.className = "mg-msg win";
          } else {
            b.classList.add("wrong");
            opts.querySelectorAll(".mg-q-opt").forEach(function (x, i2) { if (i2 === it.a) x.classList.add("correct"); });
            res.textContent = "✗ الإجابة: " + it.o[it.a];
            res.className = "mg-msg lose";
          }
          item++;
          paint();
          nextOrFinish();
        });
        opts.appendChild(b);
      });
    }
    paint();
    showQ();
  }
  function wordsQuiz() { runStageMC(QUIZ_STAGES, "quiz"); }
  function wordsDhikr() { runStageMC(DHIKR_STAGES, "dhikr"); }

  /* ----- arrange letters (Words Crush style) — stages ----- */
  var ARRANGE_STAGES = [
    { title: "كلمات سهلة", words: ["حج", "صوم", "زكاة", "شكر", "خير"] },
    { title: "كلمات متوسطة", words: ["صلاة", "سلام", "نور", "هدى", "علم"] },
    { title: "كلمات متقدمة", words: ["قرآن", "سورة", "آية", "صبر", "صدق"] },
    { title: "كلمات العبادات", words: ["رمضان", "تقوى", "إيمان", "كرامة", "شفاء"] },
    { title: "أخلاق القيم", words: ["أمانة", "حياء", "رحمة", "عدل", "وفاء"] },
    { title: "أنبياء (1)", words: ["نوح", "هود", "موسى", "عيسى", "يونس"] },
    { title: "أنبياء (2)", words: ["يوسف", "يعقوب", "إدريس", "لوط", "صالح"] },
    { title: "أهل البيت", words: ["محمد", "أحمد", "خديجة", "فاطمة", "عائشة"] },
    { title: "أذكار اللسان", words: ["تسبيح", "تحميد", "تكبير", "تهليل", "استغفار"] },
    { title: "أركان الصلاة", words: ["وضوء", "أذان", "ركوع", "سجود", "تشهد"] },
    { title: "أيام ومواسم", words: ["جمعة", "عيد", "فطر", "أضحى", "عاشوراء"] },
    { title: "أماكن مقدسة", words: ["كعبة", "مكة", "منى", "عرفة", "مسجد"] },
    { title: "من الجنة", words: ["كوثر", "سلسبيل", "طوبى", "فردوس", "نعيم"] },
    { title: "أسماء الحسنى", words: ["رحمن", "رحيم", "ملك", "قدوس", "سلام"] },
    { title: "سور قصيرة", words: ["بقرة", "إخلاص", "ناس", "فلق", "كوثر"] },
    { title: "صفات المؤمن", words: ["حافظ", "ذاكر", "قانت", "خاشع", "مؤمن"] },
    { title: "أعمال الخير", words: ["صدقة", "زكاة", "حجة", "عمرة", "اعتكاف"] },
    { title: "أعلام الأمة", words: ["صحابة", "خليفة", "شهيد", "قائد", "عابد"] },
    { title: "أوقات الذكر", words: ["صباح", "مساء", "ليلة", "فجر", "شروق"] },
    { title: "أسماء حسنة", words: ["مبارك", "كريم", "غفور", "شكور", "صبور"] },
    { title: "قيم راقية", words: ["منهاج", "سراج", "خيرية", "إحسان", "تقوى"] },
    { title: "أصحاب العزم", words: ["سليمان", "داود", "الكفل", "إلياس", "أيوب"] }
  ];
  function shuffleArr(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function runStageArrange() {
    var score = 0, st = 0, item = 0, target = "";
    var scoreEl = el("p", "mg-score", "النتيجة: 0");
    var stageEl = el("p", "mg-stage", "");
    var prog = el("div", "mg-stage-bar", "");
    prog.appendChild(el("div", "mg-stage-fill", ""));
    var wordEl = el("p", "mg-q", "رتّب الحروف لتكوين الكلمة");
    var line = el("div", "mg-word-line", "");
    var tiles = el("div", "mg-tiles", "");
    var res = msgBox();
    var restart = el("button", "mg-btn primary", "🔄 إعادة");
    arena.appendChild(scoreEl);
    arena.appendChild(stageEl);
    arena.appendChild(prog);
    arena.appendChild(wordEl);
    arena.appendChild(line);
    arena.appendChild(tiles);
    arena.appendChild(res);
    arena.appendChild(restart);
    var fill = prog.querySelector(".mg-stage-fill");
    var letters = [], filled = [];

    function paint() {
      var words = ARRANGE_STAGES[st].words;
      stageEl.textContent = "المرحلة " + (st + 1) + " من " + ARRANGE_STAGES.length + " — " + ARRANGE_STAGES[st].title;
      fill.style.width = Math.round((item / words.length) * 100) + "%";
      scoreEl.textContent = "النتيجة: " + score;
    }
    function buildWord() {
      var words = ARRANGE_STAGES[st].words;
      target = words[item % words.length];
      var s = shuffleArr(target.split("")).join("");
      var guard = 0;
      while (s === target && guard++ < 10) s = shuffleArr(target.split("")).join("");
      letters = s.split("");
      filled = [];
      for (var fi1 = 0; fi1 < target.length; fi1++) filled[fi1] = "";
      paint();
      wordEl.textContent = "رتّب الحروف لتكوين الكلمة (" + (item + 1) + "/" + words.length + ")";
      render();
    }
    function render() {
      clear(line);
      clear(tiles);
      for (var i = 0; i < target.length; i++) {
        (function (i) {
          var slot = el("button", "mg-slot" + (filled[i] ? " filled" : ""), filled[i] ? filled[i] : "");
          slot.addEventListener("click", function () {
            if (filled[i]) {
              letters.push(filled[i]);
              filled[i] = "";
              render();
            }
          });
          line.appendChild(slot);
        })(i);
      }
      letters.forEach(function (ch, i) {
        (function (i) {
          var t = el("button", "mg-tile", ch);
          t.addEventListener("click", function () {
            var next = filled.indexOf("");
            if (next === -1) return;
            filled[next] = letters[i];
            letters.splice(i, 1);
            render();
          });
          tiles.appendChild(t);
        })(i);
      });
      if (filled.indexOf("") === -1) checkAnswer();
    }
    function checkAnswer() {
      var words = ARRANGE_STAGES[st].words;
      if (filled.join("") === target) {
        score++;
        item++;
        paint();
        res.textContent = "✓ أحسنت! الكلمة: " + target;
        res.className = "mg-msg win";
        if (item >= words.length) {
          if (st < ARRANGE_STAGES.length - 1) {
            st++; item = 0;
            res.textContent = "🎉 انتقلت إلى المرحلة " + (st + 1) + "!";
            res.className = "mg-msg win";
            later(buildWord, 1100);
            return;
          }
          res.textContent = "🏆 أكملت كل المراحل! نتيجتك: " + score;
          res.className = "mg-msg win";
          saveScoreFlow("arrange", score);
          centerOverlay("🎉", "عيد مبارك! أكملت كل المراحل", "win");
          return;
        }
        later(buildWord, 700);
      } else {
        res.textContent = "✗ ليست صحيحة… حاول مجددًا";
        res.className = "mg-msg lose";
        letters = filled.slice();
        filled = [];
        for (var fi2 = 0; fi2 < target.length; fi2++) filled[fi2] = "";
        later(render, 500);
      }
    }
    restart.addEventListener("click", function () { wordsShell("ترتيب الحروف", runStageArrange); });
    paint();
    buildWord();
  }

  /* ================= DOWNLOAD GAMES AS STANDALONE FILES ================= */
  var STANDALONE_CSS = "" +
    "*{box-sizing:border-box}" +
    "body{margin:0;font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:linear-gradient(160deg,#0f172a,#1e293b);color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:16px;text-align:center}" +
    "h1{font-size:22px;margin:6px 0}" +
    ".sub{color:#cbd5e1;font-size:14px;margin:0 0 12px}" +
    "canvas{max-width:100%;border-radius:12px;background:#0b1220;touch-action:manipulation;display:block;margin:0 auto}" +
    "button{font-size:16px;padding:10px 16px;border-radius:10px;border:0;cursor:pointer;background:#e11d48;color:#fff;margin:6px;font-weight:700}" +
    "button:active{transform:scale(.96)}" +
    ".bar{display:flex;gap:12px;justify-content:center;align-items:center;margin:10px 0;font-weight:700}" +
    ".chip{background:#1e293b;padding:6px 14px;border-radius:20px;color:#fbbf24}" +
    ".msg{font-size:16px;min-height:22px;margin:8px 0;font-weight:700}" +
    ".win{color:#4ade80}.lose{color:#f87171}" +
    ".fight-hud{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;max-width:420px;margin:8px auto}" +
    ".fight-hud>div{flex:1}.fname{font-weight:700;margin-bottom:4px;font-size:14px}" +
    ".hp-wrap{height:16px;background:#334155;border-radius:10px;overflow:hidden}" +
    ".hp{height:100%;width:100%;background:linear-gradient(90deg,#22c55e,#4ade80);transition:width .3s;border-radius:10px}" +
    ".hp.right{background:linear-gradient(90deg,#ef4444,#f87171);direction:ltr}" +
    ".hp.low{background:#fbbf24}" +
    ".vs{font-weight:900;color:#e11d48}" +
    ".stage{display:flex;justify-content:space-around;align-items:center;width:100%;max-width:420px;margin:14px auto;font-size:44px}" +
    ".btns{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}" +
    ".submenu{display:flex;flex-direction:column;gap:10px;width:100%;max-width:340px;margin-top:8px}" +
    ".submenu button{background:#1e293b}" +
    ".opt{display:block;width:100%;max-width:340px;margin:6px auto}" +
    ".opt.correct{background:#16a34a}.opt.wrong{background:#b91c1c}" +
    ".opt.disabled{opacity:.55}" +
    ".tiles{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin:10px 0}" +
    ".tile,.slot{font-size:24px;width:44px;height:44px;border-radius:10px;border:0;background:#334155;color:#fff;font-weight:800}" +
    ".slot{background:transparent;border:2px dashed #64748b}" +
    ".slot.filled{background:#1d4ed8;border-style:solid}" +
    ".q{font-size:18px;font-weight:700;margin:10px 0}" +
    ".stagebar{height:8px;background:#334155;border-radius:6px;overflow:hidden;width:100%;max-width:340px;margin:6px auto}" +
    ".stagefill{height:100%;width:0%;background:linear-gradient(90deg,#e11d48,#fbbf24);transition:width .3s}" +
    ".ah-hp{width:100%;max-width:820px;height:14px;background:#334155;border-radius:10px;overflow:hidden;margin:8px auto}" +
    ".ah-hp-bar{height:100%;width:100%;background:linear-gradient(90deg,#22c55e,#4ade80);transition:width .2s}" +
    ".ah-hp-bar.low{background:#fbbf24}";

  function fishPage() {
    var app = document.getElementById("app");
    app.innerHTML =
      "<h1>🎣 صيد السمك</h1>" +
      "<p class=\"sub\">اضغط أو المس لإلقاء الخط في اتجاه السمكة — لديك 30 ثانية</p>" +
      "<div class=\"bar\"><span class=\"chip\" id=\"sc\">النقاط: 0</span><span class=\"chip\" id=\"tm\">الوقت: 30</span></div>" +
      "<canvas id=\"c\" width=\"420\" height=\"260\"></canvas>" +
      "<p class=\"msg\" id=\"msg\"></p>" +
      "<button id=\"again\" style=\"display:none\">🔄 العب مجددًا</button>";
    var cv = document.getElementById("c");
    var ctx = cv.getContext("2d");
    var W = 420, H = 260;
    var score = 0, time = 30;
    var fishX = 60, dir = 1, speed = 2.4;
    var hook = { x: W / 2, y: 0, falling: false, vy: 6 };
    var over = false;
    var sc = document.getElementById("sc");
    var tm = document.getElementById("tm");
    var msg = document.getElementById("msg");
    var again = document.getElementById("again");
    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(37,99,235,0.14)";
      ctx.fillRect(0, 0, W, H);
      ctx.font = "34px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🐟", fishX, 200);
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hook.x, 0);
      ctx.lineTo(hook.x, hook.y);
      ctx.stroke();
      ctx.font = "18px serif";
      ctx.fillText("🪝", hook.x, hook.y);
    }
    function cast(x) {
      if (over || hook.falling) return;
      hook.x = x; hook.y = 6; hook.falling = true;
    }
    function loop() {
      if (over) return;
      fishX += dir * speed;
      if (fishX > W - 40) { fishX = W - 40; dir = -1; }
      if (fishX < 40) { fishX = 40; dir = 1; }
      if (hook.falling) {
        hook.y += hook.vy;
        if (hook.y >= 200) {
          hook.falling = false;
          hook.y = 0;
          if (Math.abs(hook.x - fishX) <= 34) {
            score++;
            msg.textContent = "🎉 أمسكتها! أحسنت";
            msg.className = "msg win";
            fishX = 40 + Math.random() * (W - 80);
          } else {
            msg.textContent = "فاتتك… حاول مجددًا";
            msg.className = "msg lose";
          }
          sc.textContent = "النقاط: " + score;
        }
      }
      draw();
      requestAnimationFrame(loop);
    }
    cv.addEventListener("pointerdown", function (e) {
      var r = cv.getBoundingClientRect();
      cast((e.clientX - r.left) * (W / r.width));
    });
    var t = setInterval(function () {
      if (over) return;
      time--;
      tm.textContent = "الوقت: " + time;
      if (time <= 0) {
        over = true;
        clearInterval(t);
        msg.textContent = "انتهى الوقت! نتيجتك: " + score;
        msg.className = "msg";
        again.style.display = "";
      }
    }, 1000);
    loop();
    again.addEventListener("click", function () { location.reload(); });
  }

  function jumpPage() {
    var app = document.getElementById("app");
    app.innerHTML =
      "<h1>🏃 لعبة القفز</h1>" +
      "<p class=\"sub\">اقفز فوق الصبّار — استخدم مسطرة المسافة أو انقر أو المس</p>" +
      "<div class=\"bar\"><span class=\"chip\" id=\"sc\">المسافة: 0</span></div>" +
      "<canvas id=\"c\" width=\"420\" height=\"260\"></canvas>" +
      "<p class=\"msg\" id=\"msg\"></p>" +
      "<button id=\"again\" style=\"display:none\">🔄 العب مجددًا</button>";
    var cv = document.getElementById("c");
    var ctx = cv.getContext("2d");
    var W = 420, H = 260;
    var GROUND = 222;
    var p = { x: 70, y: GROUND, vy: 0, onGround: true };
    var obs = [];
    var dist = 0, over = false, speed = 4, spawn = 0;
    var sc = document.getElementById("sc");
    var msg = document.getElementById("msg");
    var again = document.getElementById("again");
    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(15,23,42,0.28)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, GROUND + 8, W, H - GROUND - 8);
      ctx.font = "32px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🦘", p.x, p.y - 14);
      obs.forEach(function (o) { ctx.fillText("🌵", o.x, o.y - 16); });
    }
    function jump() {
      if (over) return;
      if (p.onGround) { p.vy = -10.5; p.onGround = false; }
    }
    function loop() {
      if (over) return;
      dist += 0.5;
      speed = 4 + dist / 400;
      spawn += speed;
      if (spawn > 130) { spawn = 0; obs.push({ x: W + 30, y: GROUND }); }
      p.vy += 0.6;
      p.y += p.vy;
      if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
      obs.forEach(function (o) { o.x -= speed; });
      obs = obs.filter(function (o) { return o.x > -40; });
      var hit = obs.some(function (o) {
        return Math.abs(o.x - p.x) < 26 && p.y > GROUND - 34;
      });
      if (hit) {
        over = true;
        msg.textContent = "💥 صدمت! المسافة: " + Math.floor(dist) + "م";
        msg.className = "msg lose";
        sc.textContent = "المسافة: " + Math.floor(dist) + "م";
        again.style.display = "";
        return;
      }
      sc.textContent = "المسافة: " + Math.floor(dist) + "م";
      draw();
      requestAnimationFrame(loop);
    }
    document.addEventListener("keydown", function (e) {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
    });
    cv.addEventListener("pointerdown", jump);
    loop();
    again.addEventListener("click", function () { location.reload(); });
  }

  function fightPage() {
    var app = document.getElementById("app");
    app.innerHTML =
      "<h1>⚔️ نزال الأبطال</h1>" +
      "<p class=\"sub\">أجواء كونسل: لكمة، ركلة، دفاع — اهزم الروبوت</p>" +
      "<div class=\"fight-hud\">" +
      "<div><div class=\"fname\">الروبوت 🤖</div><div class=\"hp-wrap\"><div class=\"hp right\" id=\"eHP\"></div></div></div>" +
      "<span class=\"vs\">VS</span>" +
      "<div><div class=\"fname\">أنت 🥷</div><div class=\"hp-wrap\"><div class=\"hp\" id=\"pHP\"></div></div></div>" +
      "</div>" +
      "<div class=\"stage\"><span class=\"vs\" style=\"font-size:38px\">🤖</span><span class=\"vs\" style=\"font-size:38px\">🥷</span></div>" +
      "<p class=\"msg\" id=\"log\">ابدأ الهجوم!</p>" +
      "<div class=\"btns\">" +
      "<button id=\"punch\">🥊 لكمة</button>" +
      "<button id=\"kick\">🦵 ركلة</button>" +
      "<button id=\"block\">🛡️ دفاع</button>" +
      "</div>" +
      "<button id=\"again\" style=\"display:none\">🔄 العب مجددًا</button>";
    var pHPv = 100, eHPv = 100, busy = false, over = false, dealt = 0;
    var pHPbar = document.getElementById("pHP");
    var eHPbar = document.getElementById("eHP");
    var log = document.getElementById("log");
    var again = document.getElementById("again");
    function setHp() {
      pHPbar.style.width = pHPv + "%";
      eHPbar.style.width = eHPv + "%";
      pHPbar.classList.toggle("low", pHPv <= 30);
      eHPbar.classList.toggle("low", eHPv <= 30);
    }
    function ko(playerWon) {
      over = true;
      log.textContent = playerWon ? "🏆 انتصارك!" : "💥 KO";
      log.className = "msg " + (playerWon ? "win" : "lose");
      again.style.display = "";
    }
    function playerAct(act) {
      if (busy || over) return;
      busy = true;
      var enemyAct = Math.random() < 0.4 ? "punch" : (Math.random() < 0.6 ? "kick" : "block");
      var pDmg = act === "punch" ? 10 : act === "kick" ? 16 : 0;
      var eDmg = enemyAct === "punch" ? 8 : enemyAct === "kick" ? 13 : 0;
      if (act === "block") {
        log.textContent = "🛡️ تمنّعت…";
      } else {
        var d = pDmg;
        if (enemyAct === "block") d = Math.round(d / 2);
        eHPv = Math.max(0, eHPv - d);
        dealt += d;
        log.textContent = (act === "punch" ? "🥊 لكمة" : "🦵 ركلة") + "! " + (enemyAct === "block" ? "الروبوت صدّها (-" + Math.round(pDmg / 2) + ")" : "أصابت (-" + d + ")");
      }
      log.className = "msg";
      setHp();
      if (eHPv <= 0) { ko(true); busy = false; return; }
      setTimeout(function () {
        if (act === "block") {
          var d2 = Math.round(eDmg / 2);
          pHPv = Math.max(0, pHPv - d2);
          log.textContent = "الروبوت هاجم وأنت تحمي (-" + d2 + ")";
        } else if (enemyAct !== "block") {
          pHPv = Math.max(0, pHPv - eDmg);
          log.textContent = "الروبوت ردّ (" + (enemyAct === "kick" ? "ركلة" : "لكمة") + " -" + eDmg + ")";
        } else {
          log.textContent = "الروبوت يتحصن بالدفاع.";
        }
        log.className = "msg";
        setHp();
        if (pHPv <= 0) { ko(false); busy = false; return; }
        busy = false;
      }, 550);
    }
    document.getElementById("punch").addEventListener("click", function () { playerAct("punch"); });
    document.getElementById("kick").addEventListener("click", function () { playerAct("kick"); });
    document.getElementById("block").addEventListener("click", function () { playerAct("block"); });
    setHp();
    again.addEventListener("click", function () { location.reload(); });
  }

  function wordsPage() {
    var QUIZ_STAGES = [
    {
      title: "أساسيات الإسلام",
      items: [
        { p: "كم عدد أركان الإسلام؟", a: 0, o: ["5", "4", "6", "7"] },
        { p: "كم عدد سور القرآن الكريم؟", a: 2, o: ["100", "113", "114", "120"] },
        { p: "في أي شهر يصوم المسلمون؟", a: 1, o: ["شوال", "رمضان", "ذو الحجة", "محرّم"] },
        { p: "كم عدد أركان الإيمان؟", a: 0, o: ["6", "5", "7", "4"] },
        { p: "كم ركعة في صلاة الفجر؟", a: 1, o: ["4", "2", "3", "5"] }
      ]
    },
    {
      title: "معرفة القرآن والسيرة",
      items: [
        { p: "ما أول سورة في القرآن الكريم؟", a: 1, o: ["البقرة", "الفاتحة", "الإخلاص", "العلق"] },
        { p: "من هو خاتم الأنبياء والمرسلين؟", a: 0, o: ["محمد ﷺ", "عيسى عليه السلام", "موسى عليه السلام", "إبراهيم عليه السلام"] },
        { p: "ما القبلة الأولى للمسلمين؟", a: 3, o: ["الكعبة", "المسجد النبوي", "قبة الصخرة", "المسجد الأقصى"] },
        { p: "من الصحابي الملقّب بسيف الله المسلول؟", a: 3, o: ["أبو بكر", "عمر بن الخطاب", "عثمان بن عفان", "خالد بن الوليد"] },
        { p: "ما أعظم آية في القرآن الكريم؟", a: 2, o: ["سورة الإخلاص", "آية النور", "آية الكرسي", "سورة الناس"] }
      ]
    },
    {
      title: "التحدي",
      items: [
        { p: "ما السورة التي تُلقَّب بعروس القرآن؟", a: 0, o: ["الرحمن", "الملك", "يوسف", "النمل"] },
        { p: "من هو النبي الذي ابتلعه الحوت؟", a: 2, o: ["موسى", "عيسى", "يونس", "إلياس"] },
        { p: "كم عدد الأنبياء والرسل المذكورين في القرآن؟", a: 1, o: ["15", "25", "30", "40"] },
        { p: "ما اسم خازن الجنة؟", a: 3, o: ["ميكائيل", "إسرافيل", "جبرائيل", "رضوان"] },
        { p: "كم عدد الأشهر الحرم في السنة؟", a: 2, o: ["2", "3", "4", "5"] }
      ]
    },
    {
      title: "أركان الإسلام",
      items: [
        { p: "ما الركن الأول من أركان الإسلام؟", a: 0, o: ["الشهادتان", "الصلاة", "الزكاة", "الصوم"] },
        { p: "كم مرة يجب على المسلم حج البيت في العمر؟", a: 2, o: ["مرتين", "كل عام", "مرة واحدة", "ثلاث مرات"] },
        { p: "الزكاة حق واجب في ……", a: 3, o: ["الطعام فقط", "الملابس", "البيوت", "المال"] },
        { p: "الصوم فريضة في شهر ……", a: 1, o: ["شوال", "رمضان", "محرّم", "رجب"] },
        { p: "كم عدد أركان الإسلام؟", a: 0, o: ["5", "4", "6", "3"] }
      ]
    },
    {
      title: "أركان الإيمان",
      items: [
        { p: "كم عدد أركان الإيمان؟", a: 1, o: ["5", "6", "7", "4"] },
        { p: "من أركان الإيمان: الإيمان بالملائكة والكتب و……", a: 0, o: ["الرسل", "الخلفاء", "الصحابة", "الأئمة"] },
        { p: "الإيمان بالقدر خيره وشره من ……", a: 3, o: ["الشروط", "السنن", "المكروهات", "أركان الإيمان"] },
        { p: "التوراة نزلت على ……", a: 2, o: ["عيسى", "محمد ﷺ", "موسى", "داود"] },
        { p: "الزبور نزل على ……", a: 1, o: ["موسى", "داود", "عيسى", "إبراهيم"] }
      ]
    },
    {
      title: "الأنبياء (1)",
      items: [
        { p: "من أول الأنبياء؟", a: 3, o: ["نوح", "إبراهيم", "إدريس", "آدم عليه السلام"] },
        { p: "من أبو الأنبياء؟", a: 0, o: ["إبراهيم عليه السلام", "نوح", "إسماعيل", "يعقوب"] },
        { p: "من النبي الذي بنى السفينة؟", a: 2, o: ["موسى", "يونس", "نوح عليه السلام", "لوط"] },
        { p: "من النبي الذي أُلقي في النار فلم تحرقه؟", a: 1, o: ["إسماعيل", "إبراهيم عليه السلام", "يوسف", "أيوب"] },
        { p: "من النبي الذي أُلقي في الجب؟", a: 0, o: ["يوسف عليه السلام", "يعقوب", "هارون", "سليمان"] }
      ]
    },
    {
      title: "الأنبياء (2)",
      items: [
        { p: "من النبي الملقّب بكليم الله؟", a: 3, o: ["عيسى", "إدريس", "هارون", "موسى عليه السلام"] },
        { p: "من النبي الذي أُنزل عليه الإنجيل؟", a: 2, o: ["موسى", "داود", "عيسى عليه السلام", "يحيى"] },
        { p: "من النبي الذي أُنزل عليه الزبور؟", a: 1, o: ["موسى", "داود عليه السلام", "سليمان", "أيوب"] },
        { p: "من أنبياء أولي العزم؟", a: 0, o: ["نوح وإبراهيم وموسى وعيسى ومحمد ﷺ", "آدم ونوح وهود وصالح", "إدريس ولوط وإسحاق", "يعقوب ويوسف وأيوب"] },
        { p: "من النبي الذي رُفع إلى السماء وهو حي؟", a: 2, o: ["يوسف", "يونس", "عيسى عليه السلام", "إلياس"] }
      ]
    },
    {
      title: "سور القرآن",
      items: [
        { p: "ما أطول سورة في القرآن الكريم؟", a: 1, o: ["آل عمران", "البقرة", "النساء", "المائدة"] },
        { p: "ما أقصر سورة في القرآن؟", a: 0, o: ["الكوثر", "الناس", "الفلق", "الإخلاص"] },
        { p: "سورة تعدل ثلث القرآن؟", a: 2, o: ["النصر", "الفاتحة", "الإخلاص", "الكافرون"] },
        { p: "سورة لا تبدأ بالبسملة؟", a: 3, o: ["الفاتحة", "العلق", "يس", "التوبة"] },
        { p: "السورة التي تسمى عروس القرآن؟", a: 0, o: ["الرحمن", "الواقعة", "النمل", "يس"] }
      ]
    },
    {
      title: "الصلاة",
      items: [
        { p: "كم عدد الصلوات المفروضة في اليوم والليلة؟", a: 2, o: ["3", "4", "5", "6"] },
        { p: "كم عدد ركعات صلاة المغرب؟", a: 1, o: ["4", "3", "2", "5"] },
        { p: "كم عدد ركعات صلاة الظهر؟", a: 0, o: ["4", "3", "2", "5"] },
        { p: "الصلاة الوسطى هي صلاة ……", a: 3, o: ["الفجر", "الظهر", "المغرب", "العصر"] },
        { p: "أول ما يُحاسب عليه العبد يوم القيامة؟", a: 1, o: ["الصوم", "الصلاة", "الزكاة", "الذكر"] }
      ]
    },
    {
      title: "الصوم",
      items: [
        { p: "متى فُرض صيام رمضان؟", a: 2, o: ["السنة الأولى للهجرة", "السنة الثالثة", "السنة الثانية للهجرة", "السنة الرابعة"] },
        { p: "من مبطلات الصوم؟", a: 0, o: ["الأكل والشرب عمدًا", "الكلام", "المشي", "النوم"] },
        { p: "السحور سنة وبركة في ……", a: 1, o: ["النهار", "الطعام", "العمل", "الصلاة"] },
        { p: "صيام يوم عاشوراء يُكفّر ذنوب ……", a: 3, o: ["سنتين", "ثلاث سنوات", "شهرًا", "سنة ماضية"] },
        { p: "من حكم الصيام: تربية النفس على ……", a: 0, o: ["التقوى", "الكسل", "الأكل", "النوم"] }
      ]
    },
    {
      title: "الزكاة والصدقة",
      items: [
        { p: "نصاب الزكاة في الذهب؟", a: 2, o: ["50 جرامًا", "70 جرامًا", "85 جرامًا", "100 جرام"] },
        { p: "مقدار زكاة المال؟", a: 1, o: ["العُشر", "ربع العشر (2.5٪)", "الخُمس", "النصف"] },
        { p: "زكاة الفطر تُخرج قبل ……", a: 0, o: ["صلاة العيد", "صلاة الجمعة", "صلاة الفجر", "صلاة المغرب"] },
        { p: "الصدقة الجارية من أعمال ……", a: 3, o: ["النساء", "المسافرين", "الأطباء", "الخير"] },
        { p: "كم عدد مصارف الزكاة؟", a: 2, o: ["6", "7", "8", "9"] }
      ]
    },
    {
      title: "الحج والعمرة",
      items: [
        { p: "ما البيت الذي يحج إليه المسلمون؟", a: 1, o: ["المسجد النبوي", "الكعبة", "المسجد الأقصى", "قبة الصخرة"] },
        { p: "الوقوف بعرفة يكون يوم ……", a: 0, o: ["عرفة", "العيد", "التشريق", "التروية"] },
        { p: "السعي يكون بين ……", a: 3, o: ["جبل أحد والبقيع", "الحجر الأسود والملتزم", "منى والمزدلفة", "الصفا والمروة"] },
        { p: "رمي الجمرات يكون في ……", a: 2, o: ["عرفة", "مزدلفة", "منى", "مكة"] },
        { p: "طواف الإفاضة يكون بعد ……", a: 1, o: ["الإحرام", "الوقوف بعرفة", "السعي", "الرمي"] }
      ]
    },
    {
      title: "الصحابة",
      items: [
        { p: "من أول الخلفاء الراشدين؟", a: 0, o: ["أبو بكر الصديق", "عمر بن الخطاب", "عثمان بن عفان", "علي بن أبي طالب"] },
        { p: "من الملقّب بالفاروق؟", a: 1, o: ["أبو بكر", "عمر بن الخطاب", "عثمان", "علي"] },
        { p: "من الملقّب بذي النورين؟", a: 2, o: ["أبو بكر", "عمر", "عثمان بن عفان", "علي"] },
        { p: "من الملقّب بأسد الله؟", a: 3, o: ["خالد", "أبو عبيدة", "سعد", "حمزة بن عبد المطلب"] },
        { p: "من كاتم سر النبي ﷺ؟", a: 0, o: ["حذيفة بن اليمان", "زيد بن حارثة", "بلال", "سلمان"] }
      ]
    },
    {
      title: "الغزوات",
      items: [
        { p: "ما أول غزوة كبرى في الإسلام؟", a: 2, o: ["أحد", "الخندق", "بدر", "تبوك"] },
        { p: "في أي غزوة استشهد حمزة بن عبد المطلب؟", a: 1, o: ["بدر", "أحد", "الخندق", "حنين"] },
        { p: "غزوة الأحزاب تسمى أيضًا غزوة ……", a: 0, o: ["الخندق", "حنين", "تبوك", "مؤتة"] },
        { p: "في أي عام كان فتح مكة؟", a: 3, o: ["السنة الخامسة للهجرة", "السنة السادسة", "السنة السابعة", "السنة الثامنة للهجرة"] },
        { p: "ما آخر غزوات النبي ﷺ؟", a: 1, o: ["حنين", "تبوك", "بدر", "أحد"] }
      ]
    },
    {
      title: "الملائكة",
      items: [
        { p: "من الملك الموكل بالوحي؟", a: 0, o: ["جبريل عليه السلام", "ميكائيل", "إسرافيل", "رضوان"] },
        { p: "من الملك الموكل بأمطار الغيث والرزق؟", a: 1, o: ["جبريل", "ميكائيل", "عزرائيل", "مالك"] },
        { p: "من الملك الموكل بالنفخ في الصور؟", a: 2, o: ["جبريل", "ميكائيل", "إسرافيل", "جبرائيل"] },
        { p: "من الملك الموكل بقبض الأرواح؟", a: 3, o: ["جبريل", "إسرافيل", "مالك", "ملك الموت"] },
        { p: "من ملك خازن النار؟", a: 1, o: ["رضوان", "مالك", "منكر", "نكير"] }
      ]
    },
    {
      title: "يوم القيامة",
      items: [
        { p: "من أول من تنشق عنه الأرض يوم القيامة؟", a: 2, o: ["آدم", "إبراهيم", "نبينا محمد ﷺ", "عيسى"] },
        { p: "الحوض الذي للنبي ﷺ اسمه ……", a: 0, o: ["الكوثر", "السلسبيل", "الرحمة", "السدرة"] },
        { p: "الصراط هو صراط ……", a: 1, o: ["الجنة", "المستقيم", "النار", "البرزخ"] },
        { p: "الشفاعة العظمى يوم القيامة تكون لمن؟", a: 3, o: ["لآدم", "لنوح", "لإبراهيم", "لنبينا محمد ﷺ"] },
        { p: "الموازين يوم القيامة توزن فيها ……", a: 0, o: ["الأعمال", "الأموال", "الأجسام", "الطعام"] }
      ]
    },
    {
      title: "الجنة والنار",
      items: [
        { p: "ما اسم خازن الجنة؟", a: 2, o: ["مالك", "نكير", "رضوان", "عزرائيل"] },
        { p: "أعلى منزلة في الجنة؟", a: 0, o: ["الوسيلة", "الغرفة", "الحور", "الرضوان"] },
        { p: "نهر في الجنة أنعم الله به نبيه ﷺ؟", a: 1, o: ["السلسبيل", "الكوثر", "التسنيم", "الرحيق"] },
        { p: "شجرة الجنة التي تظلل الجنة؟", a: 3, o: ["النخل", "الزيتون", "السدر", "طوبى"] },
        { p: "أول أمة تدخل الجنة؟", a: 1, o: ["اليهود", "أمة محمد ﷺ", "النصارى", "المشركون"] }
      ]
    },
    {
      title: "الأخلاق",
      items: [
        { p: "من الحديث: الحياء من ……", a: 0, o: ["الإيمان", "العمل", "الصلاة", "الصوم"] },
        { p: "لا يؤمن أحدكم حتى يحب لأخيه ……", a: 2, o: ["المال", "الجاه", "ما يحبه لنفسه", "الأولاد"] },
        { p: "أفضل الأعمال بعد الإيمان بالله؟", a: 1, o: ["الجهاد", "بر الوالدين", "الصدقة", "الحج"] },
        { p: "الكلمة الطيبة ……", a: 3, o: ["خسارة", "كلام", "زينة", "صدقة"] },
        { p: "الصدق يهدي إلى ……", a: 0, o: ["البر", "الشر", "الكذب", "الغفلة"] }
      ]
    },
    {
      title: "الأذكار والفضائل",
      items: [
        { p: "أحب الكلام إلى الله؟", a: 1, o: ["سبحان الله", "سبحان الله وبحمده", "الله أكبر", "الحمد لله"] },
        { p: "كلمتان حبيبتان إلى الرحمن: سبحان الله وبحمده، و……", a: 0, o: ["سبحان الله العظيم", "الحمد لله", "لا إله إلا الله", "الله أكبر"] },
        { p: "أفضل الذكر؟", a: 2, o: ["الحمد لله", "الله أكبر", "لا إله إلا الله", "سبحان الله"] },
        { p: "سيد الاستغفار يبدأ بـ: اللهم أنت ربي ……", a: 3, o: ["الملك", "الغفور", "الرحيم", "لا إله إلا أنت"] },
        { p: "من قال: لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير عشر مرات، كان كمن ……", a: 0, o: ["أعتق أربعة أنفس من ولد إسماعيل", "صام الدهر", "حج كل عام", "قرأ القرآن"] }
      ]
    },
    {
      title: "التاريخ والسيرة",
      items: [
        { p: "أين نزل الوحي على النبي ﷺ لأول مرة؟", a: 2, o: ["في المدينة", "على جبل أحد", "في غار حراء", "عند الكعبة"] },
        { p: "ما اسم المدينة قبل الهجرة؟", a: 0, o: ["يثرب", "مكة", "الطائف", "جدة"] },
        { p: "كم سنة استمر الوحي على النبي ﷺ؟", a: 1, o: ["20 سنة", "23 سنة", "25 سنة", "30 سنة"] },
        { p: "في أي عام توفي النبي ﷺ؟", a: 3, o: ["السنة 8 للهجرة", "السنة 9", "السنة 10", "السنة 11 للهجرة"] },
        { p: "إلى أين كانت أول هجرة في الإسلام؟", a: 2, o: ["الطائف", "يثرب", "الحبشة", "مصر"] }
      ]
    },
    {
      title: "القرآن العظيم",
      items: [
        { p: "كم عدد آيات سورة الفاتحة؟", a: 0, o: ["7", "6", "8", "5"] },
        { p: "سورة يس تُلقَّب بـ ……", a: 3, o: ["أم الكتاب", "عروس القرآن", "الفاتحة", "قلب القرآن"] },
        { p: "أطول آية في القرآن هي آية ……", a: 1, o: ["الكرسي", "المداينة (الدين)", "النور", "الكهف"] },
        { p: "السورة التي تجادل عن صاحبها في القبر؟", a: 2, o: ["الفاتحة", "يس", "الملك", "الكهف"] },
        { p: "من قرأ سورة الكهف يوم الجمعة أضاء له ……", a: 0, o: ["نور ما بين الجمعتين", "سنة كاملة", "شهرًا", "يومًا"] }
      ]
    },
    {
      title: "متنوع",
      items: [
        { p: "في أي عشْر توجد ليلة القدر؟", a: 1, o: ["أول رمضان", "العشر الأواخر", "منتصف رمضان", "بعد العيد"] },
        { p: "ليلة القدر خير من ……", a: 0, o: ["ألف شهر", "خمسمائة شهر", "مائة شهر", "ألف سنة"] },
        { p: "ما أول ما خلقه الله؟", a: 3, o: ["السماء", "الملائكة", "النور", "القلم"] },
        { p: "ما اسم والد النبي ﷺ؟", a: 2, o: ["أبو طالب", "عبد المطلب", "عبد الله", "أبو لهب"] },
        { p: "ما اسم أم النبي ﷺ؟", a: 1, o: ["حليمة", "آمنة بنت وهب", "فاطمة", "خديجة"] }
      ]
    }
  ];
    var DHIKR_STAGES = [
    {
      title: "الأذكار الأساسية",
      items: [
        { p: "بسم الله الرحمن ……", a: 1, o: ["الودود", "الرحيم", "السميع", "العزيز"] },
        { p: "الحمد لله رب ……", a: 0, o: ["العالمين", "الناس", "الملائكة", "الأنبياء"] },
        { p: "قل هو الله ……", a: 3, o: ["الملك", "الرحمن", "الرحيم", "أحد"] },
        { p: "لا حول ولا قوة إلا ……", a: 1, o: ["بالله", "الله", "الواحد", "القوي"] },
        { p: "سبحان الله وبحمده سبحان الله ……", a: 2, o: ["الكريم", "الغفور", "العظيم", "الرحمن"] }
      ]
    },
    {
      title: "أذكار الصباح والمساء",
      items: [
        { p: "اللهم بك أصبحنا وبك ……", a: 3, o: ["ننام", "نستيقظ", "نحيا", "أمسينا"] },
        { p: "اللهم بك نحيا وبك نموت وإليك ……", a: 0, o: ["النشور", "المصير", "المعاد", "الرجوع"] },
        { p: "أستغفر الله و…… إليه", a: 0, o: ["أتوب", "أعود", "أدعو", "أشكر"] },
        { p: "رضيت بالله ربًا وبالإسلام دينًا وبمحمد ……", a: 2, o: ["سيدًا", "رسولًا", "نبيًّا", "قائدًا"] },
        { p: "اللهم إني أسألك ……", a: 1, o: ["الدنيا", "الجنة", "العفو", "الهدى"] }
      ]
    },
    {
      title: "خيرات وأذكار",
      items: [
        { p: "سبحان الله عدد خلقه ورضا ……", a: 0, o: ["نفسه", "ربه", "الخلق", "الملائكة"] },
        { p: "من قال سبحان الله وبحمده غُرست له نخلة في ……", a: 3, o: ["الدنيا", "القصر", "الفردوس", "الجنة"] },
        { p: "اللهم أصلح لي ديني الذي هو …… أمري", a: 2, o: ["نور", "زاد", "عصمة", "حياة"] },
        { p: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء ……", a: 0, o: ["قدير", "عليم", "حكيم", "سميع"] },
        { p: "اللهم صلِّ على …… وعلى آله", a: 3, o: ["الأنبياء", "الملائكة", "الصالحين", "محمد"] }
      ]
    },
    {
      title: "أذكار النوم",
      items: [
        { p: "اللهم باسمك أموت وباسمك ……", a: 0, o: ["أحيا", "أصحو", "أنام", "أعيش"] },
        { p: "اللهم أسلمت نفسي إليك ووجهت وجهي إليك وفوضت أمري ……", a: 2, o: ["إليك أمري", "إليك كل شيء", "إليك", "إليك وحدك"] },
        { p: "آية الكرسي تُقرأ قبل …… حماية من الشيطان", a: 1, o: ["الطعام", "النوم", "الصلاة", "السفر"] },
        { p: "من قرأ المعوذتين قبل النوم كفتاه من ……", a: 3, o: ["البرد", "الحر", "المرض", "كل شر"] },
        { p: "كان النبي ﷺ يعلّم …… التسبيح قبل النوم: سبحان الله والحمد لله والله أكبر", a: 2, o: ["الصبيان", "الكبار", "فاطمة وعليًا", "المهاجرين"] }
      ]
    },
    {
      title: "أذكار الاستيقاظ",
      items: [
        { p: "الحمد لله الذي أحيانا بعد ما أماتنا وإليه ……", a: 1, o: ["المرجع", "النشور", "المعاد", "المصير"] },
        { p: "الحمد لله الذي ردّ عليّ روحي وعافاني في ……", a: 0, o: ["جسدي", "مالي", "أهلي", "عملي"] },
        { p: "اللهم ما أصبح بي من نعمة فمنك ……", a: 3, o: ["المبارك", "العظيم", "الرزاق", "وحدك لا شريك لك"] },
        { p: "اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في ……", a: 2, o: ["مالي", "عملي", "بصري", "ديني"] },
        { p: "أصبحنا وأصبح الملك لله و……", a: 0, o: ["الحمد لله", "الشكر لله", "العزة لله", "القدرة لله"] }
      ]
    },
    {
      title: "أذكار الطعام",
      items: [
        { p: "نقول قبل الأكل: بسم الله، وإن نسينا نقول: بسم الله ……", a: 2, o: ["الرحمن", "العظيم", "أوله وآخره", "الملك"] },
        { p: "بعد الأكل نقول: الحمد لله الذي أطعمنا وسقانا وجعلنا ……", a: 0, o: ["مسلمين", "صائمين", "قائمين", "ذاكرين"] },
        { p: "من أكل طعامًا فقال: الحمد لله الذي أطعمني هذا ورزقنيه من غير حول مني ولا قوة، غُفر له ما تقدم من ……", a: 3, o: ["عمله", "يومه", "أهله", "ذنبه"] },
        { p: "من الحديث: بحسب ابن آدم لقيمات يقمن صلبه؛ ما ملأ آدمي وعاء شرًا من ……", a: 1, o: ["المال", "البطن", "الحرص", "الكلام"] },
        { p: "نقول قبل الشرب: بسم الله، وبعده: ……", a: 0, o: ["الحمد لله", "سبحان الله", "لا حول", "اللهم"] }
      ]
    },
    {
      title: "أذكار الدخول والخروج",
      items: [
        { p: "دخول البيت: بسم الله ولجنا وبسم الله ……", a: 0, o: ["خرجنا", "أكلنا", "شربنا", "صلينا"] },
        { p: "دخول الخلاء: اللهم إني أعوذ بك من الخبث و……", a: 2, o: ["الأذى", "الضرر", "الخبائث", "الشرور"] },
        { p: "الخروج من الخلاء نقول: ……", a: 1, o: ["اللهم إني أسألك الجنة", "غفرانك", "اللهم أعني", "بسم الله"] },
        { p: "من لم يذكر اسم الله عند دخوله بيته قال الشيطان: لا مبيت لكم ولا ……", a: 2, o: ["طعام", "راحة", "عشاء", "صلاة"] },
        { p: "دخول المسجد: اللهم افتح لي أبواب ……", a: 0, o: ["رحمتك", "جنتك", "رزقك", "علومك"] }
      ]
    },
    {
      title: "أذكار المسجد والأذان",
      items: [
        { p: "الخروج من المسجد: اللهم إني أسألك من ……", a: 1, o: ["خير الدنيا", "فضلك", "رحمة الله", "الجنات"] },
        { p: "الماشي إلى المسجد يُكتب له بكل خطوة ……", a: 0, o: ["حسنة", "ركعة", "دعوة", "صدقة"] },
        { p: "عند سماع الأذان: اللهم رب هذه الدعوة التامة والصلاة ……", a: 3, o: ["الواقعة", "المكتوبة", "المؤداة", "القائمة"] },
        { p: "بعد الأذان نسأل الله لرسوله ﷺ ……", a: 2, o: ["الرزق", "الصحة", "الوسيلة", "النجاة"] },
        { p: "الدعاء بين الأذان والإقامة ……", a: 0, o: ["لا يُرَد", "مستجاب أحيانًا", "مرغوب فيه", "مقبول"] }
      ]
    },
    {
      title: "أذكار الوضوء والصلاة",
      items: [
        { p: "قبل الوضوء نقول: ……", a: 0, o: ["بسم الله", "سبحان الله", "الحمد لله", "الله أكبر"] },
        { p: "بعد الوضوء: أشهد أن لا إله إلا الله وأن محمدًا ……", a: 2, o: ["نبي الله", "رسول الله", "عبده ورسوله", "خاتم الله"] },
        { p: "بعد الوضوء: اللهم اجعلني من التوابين واجعلني من ……", a: 1, o: ["الصالحين", "المتطهرين", "الذاكرين", "المتقين"] },
        { p: "من ذكر السجود: سبحان ربي الأعلى و……", a: 0, o: ["بحمده", "شكره", "فضله", "حبه"] },
        { p: "بعد الصلاة: اللهم أنت السلام ومنك السلام تباركت يا ذا ……", a: 2, o: ["الرحمة", "المغفرة", "الجلال والإكرام", "الفضل"] }
      ]
    },
    {
      title: "أسماء الله الحسنى",
      items: [
        { p: "من أسماء الله: الرحمن و……", a: 1, o: ["الملك", "الرحيم", "العزيز", "الحكيم"] },
        { p: "الله …… لا إله إلا هو الحي القيوم", a: 0, o: ["الواحد", "الرحمن", "الغفور", "الرزاق"] },
        { p: "من أسماء الله الحسنى: …… السماوات والأرض", a: 3, o: ["خالق كل شيء", "الرازق", "الغفار", "بديع"] },
        { p: "الذي يسمع كل شيء هو ……", a: 2, o: ["العليم", "القدير", "السميع", "البصير"] },
        { p: "الذي يرى كل شيء هو ……", a: 1, o: ["السميع", "البصير", "العالم", "الخبير"] }
      ]
    },
    {
      title: "أدعية قرآنية",
      items: [
        { p: "ربنا آتنا في الدنيا حسنة وفي …… حسنة وقنا عذاب النار", a: 0, o: ["الآخرة", "الدار", "الحياة", "الجنة"] },
        { p: "ربنا لا تؤاخذنا إن نسينا أو ……", a: 3, o: ["أخطأنا", "ظلمنا", "جهلنا", "أخفقنا"] },
        { p: "ربنا اغفر لي ولوالدي وللمؤمنين يوم يقوم ……", a: 2, o: ["العمل", "الدين", "الحساب", "الصراط"] },
        { p: "ربنا هب لنا من أزواجنا وذرياتنا قرة ……", a: 1, o: ["العين", "أعين", "القلب", "الخاطر"] },
        { p: "ربنا إننا آمنا فاغفر لنا ذنوبنا وقنا عذاب ……", a: 0, o: ["النار", "القبر", "الجهنم", "الدار"] }
      ]
    },
    {
      title: "الصلاة على النبي ﷺ",
      items: [
        { p: "اللهم صلِّ على محمد وعلى آل محمد كما صليت على ……", a: 2, o: ["الأنبياء", "المرسلين", "إبراهيم", "المؤمنين"] },
        { p: "اللهم بارك على محمد وعلى آل محمد كما باركت على ……", a: 0, o: ["إبراهيم", "موسى", "عيسى", "الرسل"] },
        { p: "من صلى عليّ صلاة صلى الله عليه بها ……", a: 1, o: ["حسنة", "عشرًا", "سبعًا", "واحدة"] },
        { p: "الصلاة على النبي ﷺ في التشهد الأخير من واجبات ……", a: 2, o: ["الوضوء", "الصوم", "الصلاة", "الحج"] },
        { p: "من أكثر من الصلاة على النبي ﷺ يوم …… قربًا", a: 3, o: ["العيد", "الجمعة", "الأضحى", "الفطر"] }
      ]
    },
    {
      title: "أدعية الرزق",
      items: [
        { p: "اللهم اكفني بحلالك عن حرامك وأغنني بفضلك عمن ……", a: 0, o: ["سواك", "غيرك", "الخلق", "الناس"] },
        { p: "من قال صباحًا: اللهم إني أسألك علمًا نافعًا ورزقًا طيبًا وعملًا ……", a: 2, o: ["جميلًا", "نافعًا", "متقبلًا", "مقبولًا"] },
        { p: "اللهم لا مانع لما أعطيت ولا معطي لما ……", a: 1, o: ["منعت", "أعطيت", "أردت", "شئت"] },
        { p: "اللهم أنت ذو المن وذو ……", a: 0, o: ["الفضل", "الجاه", "المال", "السلطان"] },
        { p: "من أراد الغنى فليكثر من ذكر ……", a: 3, o: ["المال", "العمل", "الدعاء", "الله"] }
      ]
    },
    {
      title: "أدعية الوالدين",
      items: [
        { p: "رب ارحمهما كما ربياني ……", a: 1, o: ["سعيدًا", "صغيرًا", "شابًا", "محبوبًا"] },
        { p: "اللهم اغفر لي ولوالدي وللمؤمنين يوم ……", a: 0, o: ["يقوم الحساب", "القيامة", "الحشر", "النشور"] },
        { p: "اللهم اجعل والديّ من أهل ……", a: 3, o: ["الخير", "البر", "الفضل", "الجنة"] },
        { p: "رضا الرب في رضا ……", a: 2, o: ["الأولاد", "الجيران", "الوالدين", "الأصدقاء"] },
        { p: "بر الوالدين من أحب الأعمال إلى ……", a: 0, o: ["الله", "الناس", "الرسول", "المجتمع"] }
      ]
    },
    {
      title: "أدعية الهم والحزن",
      items: [
        { p: "اللهم إني أعوذ بك من الهم والحزن والعجز و……", a: 0, o: ["الكسل", "النوم", "الجهل", "الفقر"] },
        { p: "لا إله إلا الله العظيم الحليم، لا إله إلا الله رب العرش ……", a: 2, o: ["الرحيم", "العظيم", "العظيم", "الرفيع"] },
        { p: "حسبنا الله ونعم ……", a: 1, o: ["الولي", "الوكيل", "الرب", "النصير"] },
        { p: "اللهم رحمتك أرجو فلا تكلني إلى نفسي طرفة ……", a: 3, o: ["ساعة", "يوم", "لحظة", "عين"] },
        { p: "أعوذ بكلمات الله التامات من شر ما ……", a: 0, o: ["خلق", "رزق", "علم", "قدر"] }
      ]
    },
    {
      title: "أذكار السفر",
      items: [
        { p: "قول عند الركوب: سبحان الذي سخر لنا هذا وما كنا له ……", a: 1, o: ["قادرين", "مقربين", "مطيقين", "ممكنين"] },
        { p: "اللهم إنا نسألك في سفرنا هذا البر والتقوى ومن العمل ما ……", a: 0, o: ["ترضى", "تحب", "تشاء", "تريد"] },
        { p: "عند الإياب نقول: آيبون تائبون عابدون لربنا ……", a: 2, o: ["شاكرون", "مؤمنون", "حامدون", "صالحون"] },
        { p: "اللهم اطوِ لنا الأرض وهون علينا ……", a: 3, o: ["الطريق", "الركوب", "المسير", "السفر"] },
        { p: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء ……", a: 1, o: ["مقتدر", "قدير", "قادر", "حكيم"] }
      ]
    },
    {
      title: "أذكار المطر والرعد",
      items: [
        { p: "قول عند نزول المطر: اللهم صيبًا ……", a: 0, o: ["نافعًا", "غزيرًا", "مباركًا", "كريمًا"] },
        { p: "مطرنا بفضل الله و……", a: 2, o: ["قدرته", "عنايته", "رحمته", "فضله"] },
        { p: "اللهم إني أسألك خيرها وخير ما فيها وخير ما أُرسلت به وأعوذ بك من ……", a: 1, o: ["شرها وشر ما فيها", "أذاها", "بردها", "سيولها"] },
        { p: "قول عند الرعد: سبحان الذي يسبح الرعد بحمده و……", a: 3, o: ["عظمته", "جلاله", "سلطانه", "الملائكة"] },
        { p: "اللهم سقيا رحمة لا سقيا ……", a: 0, o: ["عذاب", "بلاء", "نقمة", "بوار"] }
      ]
    },
    {
      title: "التسبيح والتهليل",
      items: [
        { p: "من قال: سبحان الله وبحمده مائة مرة حُطّت خطاياه وإن كانت مثل ……", a: 2, o: ["الجبل", "البحر", "زبد البحر", "الرمال"] },
        { p: "من قال: سبحان الله العظيم وبحمده غُرست له …… في الجنة", a: 0, o: ["نخلة", "شجرة", "زهرة", "سدرة"] },
        { p: "التسبيح والتحميد والتكبير بعد الصلوات المفروضات …… مرة", a: 3, o: ["مرة", "مرتين", "خمسًا", "ثلاثًا وثلاثين"] },
        { p: "كلمتان خفيفتان على اللسان ثقيلتان في الميزان: سبحان الله وبحمده، سبحان الله ……", a: 1, o: ["الملك", "العظيم", "الغفور", "الواحد"] },
        { p: "من قال: لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير مائة مرة في اليوم كانت له عدل ……", a: 0, o: ["عشر رقاب", "حرث", "شهر", "حجة"] }
      ]
    },
    {
      title: "الاستغفار",
      items: [
        { p: "أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب ……", a: 0, o: ["إليه", "له", "عنه", "فيه"] },
        { p: "من أكثر الاستغفار جعل الله له من كل هم فرجًا ومن كل ضيق ……", a: 3, o: ["رزقًا", "فرجًا", "خيرًا", "مخرجًا"] },
        { p: "اللهم إنك عفو تحب العفو فاعفُ ……", a: 2, o: ["عني", "مني", "عنا", "عبادك"] },
        { p: "سيد الاستغفار: اللهم أنت ربي لا إله إلا أنت خلقتني وأنا ……", a: 1, o: ["مسلم", "عبدك", "فاتبك", "مطيع"] },
        { p: "من قال: استغفر الله الذي لا إله إلا هو الحي القيوم وأتوب إليه، غُفر له وإن كان قد ……", a: 0, o: ["فرّ من الزحف", "نام", "سافر", "مرض"] }
      ]
    },
    {
      title: "أدعية متنوعة (1)",
      items: [
        { p: "اللهم إني أسألك العفو و…… في الدنيا والآخرة", a: 0, o: ["العافية", "الراحة", "الصحة", "السلامة"] },
        { p: "اللهم حاسبني حسابًا ……", a: 2, o: ["كثيفًا", "شديدًا", "يسيرًا", "عادلًا"] },
        { p: "اللهم أعني على ذكرك وشكرك وحسن ……", a: 1, o: ["خاتمتي", "عبادتك", "عملي", "أخلاقي"] },
        { p: "اللهم اجعل خير عمري ……", a: 3, o: ["آخره", "أوله", "منتصفه", "كلّه"] },
        { p: "اللهم إني أسألك الهدى والتقى والعفاف و……", a: 0, o: ["الغنى", "الرزق", "الجاه", "العلم"] }
      ]
    },
    {
      title: "أدعية متنوعة (2)",
      items: [
        { p: "اللهم بارك لنا فيما رزقتنا وقنا عذاب ……", a: 1, o: ["البرزخ", "النار", "القبر", "الدنيا"] },
        { p: "اللهم اغفر لي خطيئتي وجهلي وإسرافي في ……", a: 0, o: ["أمري", "عملي", "قولي", "مالي"] },
        { p: "اللهم إني أعوذ بك من علم لا ينفع وقلب لا يخشع ودعاء لا يُسمع و…… لا تشبع", a: 3, o: ["معدة", "عين", "جسد", "نفس"] },
        { p: "اللهم اهدني وسددني وثبتني على ……", a: 2, o: ["الهدى", "الصراط", "الحق", "الإيمان"] },
        { p: "اللهم إني ظلمت نفسي ظلمًا كثيرًا ولا يغفر الذنوب إلا ……", a: 0, o: ["أنت", "الله", "ربي", "الغفور"] }
      ]
    },
    {
      title: "أذكار الخيرات",
      items: [
        { p: "من عمل خيرًا فله ……", a: 1, o: ["الحمد", "حسنة بعشر أمثالها", "الرزق", "الثواب"] },
        { p: "من دعا إلى هدى كان له من الأجر مثل أجور من …… بغير أن ينقص من أجورهم شيء", a: 0, o: ["اتبعه", "عرفه", "سمعه", "شاركه"] },
        { p: "الدال على الخير كفاعل ……", a: 2, o: ["المسلمين", "الجنة", "الخير", "الأجر"] },
        { p: "من سنّ في الإسلام سنة حسنة فله أجرها وأجر من عمل بها إلى يوم ……", a: 3, o: ["القيامة", "الدين", "الحساب", "الجزاء"] },
        { p: "تبسمك في وجه أخيك ……", a: 0, o: ["صدقة", "سنة", "مكرمة", "خلق"] }
      ]
    }
  ];
    var ARRANGE_STAGES = [
    { title: "كلمات سهلة", words: ["حج", "صوم", "زكاة", "شكر", "خير"] },
    { title: "كلمات متوسطة", words: ["صلاة", "سلام", "نور", "هدى", "علم"] },
    { title: "كلمات متقدمة", words: ["قرآن", "سورة", "آية", "صبر", "صدق"] },
    { title: "كلمات العبادات", words: ["رمضان", "تقوى", "إيمان", "كرامة", "شفاء"] },
    { title: "أخلاق القيم", words: ["أمانة", "حياء", "رحمة", "عدل", "وفاء"] },
    { title: "أنبياء (1)", words: ["نوح", "هود", "موسى", "عيسى", "يونس"] },
    { title: "أنبياء (2)", words: ["يوسف", "يعقوب", "إدريس", "لوط", "صالح"] },
    { title: "أهل البيت", words: ["محمد", "أحمد", "خديجة", "فاطمة", "عائشة"] },
    { title: "أذكار اللسان", words: ["تسبيح", "تحميد", "تكبير", "تهليل", "استغفار"] },
    { title: "أركان الصلاة", words: ["وضوء", "أذان", "ركوع", "سجود", "تشهد"] },
    { title: "أيام ومواسم", words: ["جمعة", "عيد", "فطر", "أضحى", "عاشوراء"] },
    { title: "أماكن مقدسة", words: ["كعبة", "مكة", "منى", "عرفة", "مسجد"] },
    { title: "من الجنة", words: ["كوثر", "سلسبيل", "طوبى", "فردوس", "نعيم"] },
    { title: "أسماء الحسنى", words: ["رحمن", "رحيم", "ملك", "قدوس", "سلام"] },
    { title: "سور قصيرة", words: ["بقرة", "إخلاص", "ناس", "فلق", "كوثر"] },
    { title: "صفات المؤمن", words: ["حافظ", "ذاكر", "قانت", "خاشع", "مؤمن"] },
    { title: "أعمال الخير", words: ["صدقة", "زكاة", "حجة", "عمرة", "اعتكاف"] },
    { title: "أعلام الأمة", words: ["صحابة", "خليفة", "شهيد", "قائد", "عابد"] },
    { title: "أوقات الذكر", words: ["صباح", "مساء", "ليلة", "فجر", "شروق"] },
    { title: "أسماء حسنة", words: ["مبارك", "كريم", "غفور", "شكور", "صبور"] },
    { title: "قيم راقية", words: ["منهاج", "سراج", "خيرية", "إحسان", "تقوى"] },
    { title: "أصحاب العزم", words: ["سليمان", "داود", "الكفل", "إلياس", "أيوب"] }
  ];

    var app = document.getElementById("app");

    function renderMenu() {
      app.innerHTML =
        "<h1>✨ كلمات بابا منصف</h1>" +
        "<p class=\"sub\">أسئلة دينية، أذكار وخيرات، وترتيب الحروف — مراحل متدرجة، تعمل بلا إنترنت</p>" +
        "<div class=\"submenu\">" +
        "<button data-m=\"quiz\">📖 أسئلة دينية</button>" +
        "<button data-m=\"arrange\">🧩 ترتيب الحروف</button>" +
        "<button data-m=\"dhikr\">🕌 أذكار وخيرات</button>" +
        "</div>";
      app.querySelectorAll(".submenu button").forEach(function (b) {
        b.addEventListener("click", function () { start(b.getAttribute("data-m")); });
      });
    }
    function shuffle(a) {
      var x = a.slice();
      for (var i = x.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = x[i]; x[i] = x[j]; x[j] = t;
      }
      return x;
    }
    function runMC(stages) {
      var score = 0, st = 0, item = 0;
      app.innerHTML =
        "<div class=\"bar\"><span class=\"chip\" id=\"sc\">النتيجة: 0</span><span class=\"chip\" id=\"stg\"></span></div>" +
        "<div class=\"stagebar\"><div class=\"stagefill\" id=\"fill\"></div></div>" +
        "<p class=\"q\" id=\"q\"></p>" +
        "<div id=\"opts\"></div>" +
        "<p class=\"msg\" id=\"msg\"></p>" +
        "<button id=\"back\">↩ رجوع</button>";
      var sc = document.getElementById("sc");
      var stg = document.getElementById("stg");
      var fill = document.getElementById("fill");
      var qEl = document.getElementById("q");
      var opts = document.getElementById("opts");
      var msg = document.getElementById("msg");
      document.getElementById("back").addEventListener("click", renderMenu);
      function paint() {
        var s = stages[st];
        stg.textContent = "المرحلة " + (st + 1) + " من " + stages.length;
        fill.style.width = Math.round((item / s.items.length) * 100) + "%";
        sc.textContent = "النتيجة: " + score;
      }
      function next() {
        var s = stages[st];
        if (item < s.items.length) { setTimeout(showQ, 900); return; }
        if (st < stages.length - 1) {
          st++; item = 0;
          paint();
          msg.textContent = "🎉 انتقلت إلى المرحلة " + (st + 1) + "!";
          msg.className = "msg win";
          setTimeout(showQ, 1100);
          return;
        }
        msg.textContent = "🏆 أكملت كل المراحل! نتيجتك: " + score;
        msg.className = "msg win";
      }
      function showQ() {
        msg.className = "msg";
        msg.textContent = "";
        var it = stages[st].items[item];
        qEl.textContent = "المرحلة " + (st + 1) + " — السؤال " + (item + 1) + ". " + it.p;
        opts.innerHTML = "";
        it.o.forEach(function (opt, i) {
          var b = document.createElement("button");
          b.className = "opt";
          b.textContent = opt;
          b.addEventListener("click", function () {
            if (msg.className === "msg win" || msg.className === "msg lose") return;
            opts.querySelectorAll(".opt").forEach(function (x) { x.classList.add("disabled"); });
            if (i === it.a) {
              score++;
              b.classList.add("correct");
              msg.textContent = "✓ صحيح!";
              msg.className = "msg win";
            } else {
              b.classList.add("wrong");
              opts.querySelectorAll(".opt").forEach(function (x, i2) { if (i2 === it.a) x.classList.add("correct"); });
              msg.textContent = "✗ الإجابة: " + it.o[it.a];
              msg.className = "msg lose";
            }
            item++;
            paint();
            next();
          });
          opts.appendChild(b);
        });
      }
      paint();
      showQ();
    }
    function runArrange() {
      var score = 0, st = 0, item = 0, target = "";
      app.innerHTML =
        "<div class=\"bar\"><span class=\"chip\" id=\"sc\">النتيجة: 0</span><span class=\"chip\" id=\"stg\"></span></div>" +
        "<div class=\"stagebar\"><div class=\"stagefill\" id=\"fill\"></div></div>" +
        "<p class=\"q\" id=\"q\">رتّب الحروف لتكوين الكلمة</p>" +
        "<div class=\"tiles\" id=\"line\"></div>" +
        "<div class=\"tiles\" id=\"pool\"></div>" +
        "<p class=\"msg\" id=\"msg\"></p>" +
        "<div class=\"btns\"><button id=\"back\">↩ رجوع</button><button id=\"again\">🔄 إعادة</button></div>";
      var sc = document.getElementById("sc");
      var stg = document.getElementById("stg");
      var fill = document.getElementById("fill");
      var qEl = document.getElementById("q");
      var lineEl = document.getElementById("line");
      var poolEl = document.getElementById("pool");
      var msg = document.getElementById("msg");
      var letters = [], filled = [];
      document.getElementById("back").addEventListener("click", renderMenu);
      document.getElementById("again").addEventListener("click", runArrange);
      function paint() {
        var words = ARRANGE_STAGES[st].words;
        stg.textContent = "المرحلة " + (st + 1) + " من " + ARRANGE_STAGES.length;
        fill.style.width = Math.round((item / words.length) * 100) + "%";
        sc.textContent = "النتيجة: " + score;
      }
      function buildWord() {
        var words = ARRANGE_STAGES[st].words;
        target = words[item % words.length];
        var s = shuffle(target.split("")).join("");
        var guard = 0;
        while (s === target && guard++ < 10) s = shuffle(target.split("")).join("");
        letters = s.split("");
        filled = [];
        for (var fi3 = 0; fi3 < target.length; fi3++) filled[fi3] = "";
        paint();
        qEl.textContent = "رتّب الحروف لتكوين الكلمة (" + (item + 1) + "/" + words.length + ")";
        render();
      }
      function render() {
        lineEl.innerHTML = "";
        poolEl.innerHTML = "";
        for (var i = 0; i < target.length; i++) {
          (function (i) {
            var s = document.createElement("button");
            s.className = "slot" + (filled[i] ? " filled" : "");
            s.textContent = filled[i] || "";
            s.addEventListener("click", function () {
              if (filled[i]) {
                letters.push(filled[i]);
                filled[i] = "";
                render();
              }
            });
            lineEl.appendChild(s);
          })(i);
        }
        letters.forEach(function (ch, i) {
          (function (i) {
            var t = document.createElement("button");
            t.className = "tile";
            t.textContent = ch;
            t.addEventListener("click", function () {
              var next = filled.indexOf("");
              if (next === -1) return;
              filled[next] = letters[i];
              letters.splice(i, 1);
              render();
            });
            poolEl.appendChild(t);
          })(i);
        });
        if (filled.indexOf("") === -1) checkAnswer();
      }
      function checkAnswer() {
        var words = ARRANGE_STAGES[st].words;
        if (filled.join("") === target) {
          score++;
          item++;
          paint();
          msg.textContent = "✓ أحسنت! الكلمة: " + target;
          msg.className = "msg win";
          if (item >= words.length) {
            if (st < ARRANGE_STAGES.length - 1) {
              st++; item = 0;
              msg.textContent = "🎉 انتقلت إلى المرحلة " + (st + 1) + "!";
              msg.className = "msg win";
              setTimeout(buildWord, 1100);
              return;
            }
            msg.textContent = "🏆 أكملت كل المراحل! نتيجتك: " + score;
            msg.className = "msg win";
            return;
          }
          setTimeout(buildWord, 700);
        } else {
          msg.textContent = "✗ ليست صحيحة… حاول مجددًا";
          msg.className = "msg lose";
          letters = filled.slice();
          filled = [];
          for (var fi4 = 0; fi4 < target.length; fi4++) filled[fi4] = "";
          setTimeout(render, 500);
        }
      }
      buildWord();
    }
    function start(mode) {
      if (mode === "quiz") runMC(QUIZ_STAGES);
      else if (mode === "dhikr") runMC(DHIKR_STAGES);
      else runArrange();
    }
    renderMenu();
  }

  function ahmdPage() {
    var app = document.getElementById("app");
    app.innerHTML =
      "<h1>🎯 احمد قيمز</h1>" +
      "<p class=\"sub\">تحرّك بالأسهم / WASD أو بلمس الشاشة — إطلاق النار تلقائي، انجُ من دائرة الخطر!</p>" +
      "<div class=\"bar\"><span class=\"chip\" id=\"sc\">الإقصاءات: 0</span><span class=\"chip\" id=\"wv\">الموجة: 1</span></div>" +
      "<canvas id=\"c\" width=\"820\" height=\"520\"></canvas>" +
      "<div class=\"ah-hp\"><div class=\"ah-hp-bar\" id=\"hp\"></div></div>" +
      "<p class=\"msg\" id=\"msg\"></p>" +
      "<button id=\"again\" style=\"display:none\">🔄 إعادة اللعب</button>";
    var cv = document.getElementById("c");
    var ctx = cv.getContext("2d");
    var W = 820, H = 520;
    var MAXHP = 100, TOTAL_WAVES = 5;
    var player = { x: W / 2, y: H / 2, hp: MAXHP, r: 15, speed: 190 };
    var enemies = [], bullets = [], packs = [];
    var zone = { cx: W / 2, cy: H / 2, r: Math.max(W, H) / 2 + 40 };
    var wave = 1, elims = 0, over = false;
    var waveLeft = 0, spawnTimer = 0, fireTimer = 0, dmgCd = 0, packTimer = 4;
    var keys = {};
    var joy = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
    var last = performance.now();
    var sc = document.getElementById("sc");
    var wv = document.getElementById("wv");
    var hpEl = document.getElementById("hp");
    var msg = document.getElementById("msg");
    var again = document.getElementById("again");
    function hpSet() {
      hpEl.style.width = Math.max(0, player.hp) + "%";
      hpEl.classList.toggle("low", player.hp <= 30);
    }
    function move(vx, vy) {
      var nx = player.x + vx, ny = player.y + vy, r = player.r;
      if (nx < r) nx = r;
      if (nx > W - r) nx = W - r;
      if (ny < r) ny = r;
      if (ny > H - r) ny = H - r;
      player.x = nx; player.y = ny;
    }
    function spawnEnemy() {
      var side = Math.floor(Math.random() * 4), x, y;
      if (side === 0) { x = -20; y = Math.random() * H; }
      else if (side === 1) { x = W + 20; y = Math.random() * H; }
      else if (side === 2) { x = Math.random() * W; y = -20; }
      else { x = Math.random() * W; y = H + 20; }
      enemies.push({ x: x, y: y, r: 13, hp: wave >= 4 ? 3 : wave >= 2 ? 2 : 1, speed: 55 + wave * 12 });
    }
    function startWave() {
      waveLeft = 3 + wave;
      spawnTimer = 0;
      wv.textContent = "الموجة: " + wave;
      if (wave === 2) { zone.target = 300; zone.shrink = true; }
      else if (wave === 3) { zone.target = 190; }
      else if (wave === 4) { zone.target = 120; }
      else if (wave === 5) { zone.target = 70; }
    }
    function endGame(won) {
      over = true;
      if (won) {
        msg.textContent = "🏆 عيد مبارك! نجوت من كل الموجات! الإقصاءات: " + elims;
        msg.className = "msg win";
      } else {
        msg.textContent = "💥 انتهت المباراة! الإقصاءات: " + elims + " — الموجة " + wave;
        msg.className = "msg lose";
      }
      again.style.display = "";
    }
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!over) {
        var mvx = 0, mvy = 0;
        if (keys["ArrowLeft"] || keys["KeyA"]) mvx -= 1;
        if (keys["ArrowRight"] || keys["KeyD"]) mvx += 1;
        if (keys["ArrowUp"] || keys["KeyW"]) mvy -= 1;
        if (keys["ArrowDown"] || keys["KeyS"]) mvy += 1;
        if (joy.active) { mvx = joy.dx; mvy = joy.dy; }
        var ml = Math.sqrt(mvx * mvx + mvy * mvy);
        if (ml > 1) { mvx /= ml; mvy /= ml; }
        move(mvx * player.speed * dt, mvy * player.speed * dt);

        if (zone.shrink) zone.r += (zone.target - zone.r) * 0.002;
        if (zone.r > 40) {
          var dz = Math.sqrt((player.x - zone.cx) * (player.x - zone.cx) + (player.y - zone.cy) * (player.y - zone.cy));
          if (dz > zone.r - player.r) {
            if (dmgCd <= 0) { player.hp -= 6; hpSet(); dmgCd = 0.5; }
          }
        }
        if (dmgCd > 0) dmgCd -= dt;

        if (waveLeft > 0) {
          spawnTimer += dt;
          if (spawnTimer > Math.max(0.4, 1.6 - wave * 0.18)) {
            spawnTimer = 0;
            spawnEnemy();
            waveLeft--;
          }
        }
        enemies.forEach(function (e) {
          var dx = player.x - e.x, dy = player.y - e.y;
          var d = Math.sqrt(dx * dx + dy * dy) || 1;
          e.x += (dx / d) * e.speed * dt;
          e.y += (dy / d) * e.speed * dt;
        });
        enemies.forEach(function (e) {
          var dx = e.x - player.x, dy = e.y - player.y;
          if (dx * dx + dy * dy < (e.r + player.r) * (e.r + player.r)) {
            if (dmgCd <= 0) { player.hp -= 8; hpSet(); dmgCd = 0.6; }
          }
        });
        if (player.hp <= 0) { player.hp = 0; hpSet(); endGame(false); }

        var target = null, bd = Infinity;
        enemies.forEach(function (e) {
          var dx = e.x - player.x, dy = e.y - player.y;
          var d = dx * dx + dy * dy;
          if (d < bd) { bd = d; target = e; }
        });
        if (target) {
          fireTimer += dt;
          if (fireTimer > 0.24) {
            fireTimer = 0;
            var dx = target.x - player.x, dy = target.y - player.y;
            var d = Math.sqrt(dx * dx + dy * dy) || 1;
            bullets.push({ x: player.x, y: player.y, vx: (dx / d) * 420, vy: (dy / d) * 420, life: 1.2 });
          }
        }
        bullets = bullets.filter(function (b) {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.life -= dt;
          if (b.life <= 0) return false;
          for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            var dx = e.x - b.x, dy = e.y - b.y;
            if (dx * dx + dy * dy < (e.r + 4) * (e.r + 4)) {
              e.hp--;
              if (e.hp <= 0) {
                enemies.splice(i, 1);
                elims++;
                if (Math.random() < 0.25) packs.push({ x: e.x, y: e.y, life: 8 });
                sc.textContent = "الإقصاءات: " + elims;
              }
              return false;
            }
          }
          return true;
        });

        packTimer -= dt;
        if (packTimer <= 0) {
          packTimer = 6 + Math.random() * 5;
          packs.push({ x: 40 + Math.random() * (W - 80), y: 40 + Math.random() * (H - 80), life: 10 });
        }
        packs = packs.filter(function (p) {
          p.life -= dt;
          var dx = p.x - player.x, dy = p.y - player.y;
          if (dx * dx + dy * dy < 26 * 26) { player.hp = Math.min(MAXHP, player.hp + 30); hpSet(); return false; }
          return p.life > 0;
        });

        if (waveLeft <= 0 && enemies.length === 0) {
          if (wave >= TOTAL_WAVES) { endGame(true); }
          else {
            wave++;
            startWave();
            msg.textContent = "🎉 الموجة " + (wave - 1) + "! انتقلت للموجة " + wave;
            msg.className = "msg win";
          }
        }
      }

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0d1420";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(250,204,21,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(zone.cx, zone.cy, zone.r, 0, Math.PI * 2);
      ctx.stroke();
      if (zone.shrink) {
        ctx.fillStyle = "rgba(220,38,38,0.18)";
        ctx.beginPath();
        ctx.arc(zone.cx, zone.cy, zone.r + 60, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = "20px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      packs.forEach(function (p) { ctx.fillText("❤️", p.x, p.y); });
      ctx.fillStyle = "#fde047";
      bullets.forEach(function (b) { ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill(); });
      ctx.font = "26px serif";
      enemies.forEach(function (e) { ctx.fillText("🤖", e.x, e.y); });
      ctx.fillText("🪖", player.x, player.y);
      if (joy.active) {
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(joy.ox, joy.oy, 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.arc(joy.ox + joy.dx * 34, joy.oy + joy.dy * 34, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!over) requestAnimationFrame(loop);
    }
    document.addEventListener("keydown", function (e) { keys[e.code] = true; });
    document.addEventListener("keyup", function (e) { keys[e.code] = false; });
    cv.addEventListener("touchstart", function (e) {
      var t = e.changedTouches[0];
      var r = cv.getBoundingClientRect();
      var x = (t.clientX - r.left) * (W / r.width);
      var y = (t.clientY - r.top) * (H / r.height);
      joy.active = true; joy.id = t.identifier; joy.ox = x; joy.oy = y; joy.dx = 0; joy.dy = 0;
      e.preventDefault();
    }, { passive: false });
    cv.addEventListener("touchmove", function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joy.id) {
          var t = e.changedTouches[i];
          var r = cv.getBoundingClientRect();
          var x = (t.clientX - r.left) * (W / r.width);
          var y = (t.clientY - r.top) * (H / r.height);
          var dx = x - joy.ox, dy = y - joy.oy;
          var d = Math.sqrt(dx * dx + dy * dy) || 1;
          if (d > 40) { dx = (dx / d) * 40; dy = (dy / d) * 40; }
          joy.dx = dx / 40; joy.dy = dy / 40;
        }
      }
      e.preventDefault();
    }, { passive: false });
    cv.addEventListener("touchend", function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joy.id) { joy.active = false; joy.id = null; }
      }
      e.preventDefault();
    }, { passive: false });
    hpSet();
    startWave();
    requestAnimationFrame(loop);
    again.addEventListener("click", function () { location.reload(); });
  }

  function standalonePage(title, css, fn) {
    return "<!DOCTYPE html>\n<html lang=\"ar\" dir=\"rtl\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>" + title + " — ريان ألعاب بلا نت</title>\n<style>" + css + "</style>\n</head>\n<body>\n<div id=\"app\"></div>\n<script>\n" + fn.toString() + "\n" + fn.name + "();\n</script>\n</body>\n</html>";
  }

  function downloadGame(id) {
    var pages = {
      fish: { title: "صيد السمك", fn: fishPage },
      jump: { title: "لعبة القفز", fn: jumpPage },
      fight: { title: "نزال الأبطال", fn: fightPage },
      words: { title: "كلمات بابا منصف", fn: wordsPage },
      ahmd: { title: "احمد قيمز", fn: ahmdPage }
    };
    var p = pages[id];
    if (!p) return;
    var html = standalonePage(p.title, STANDALONE_CSS, p.fn);
    try {
      var blob = new Blob([html], { type: "text/html;charset=utf-8" });
      if (window.navigator && window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, "rayan-" + id + ".html");
        return;
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "rayan-" + id + ".html";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
      }, 120);
      toast("⬇ تم تحميل " + p.title + " — يعمل بدون إنترنت");
    } catch (err) {
      toast("تعذر التحميل في هذا المتصفح");
    }
  }

  /* ================= EASY EMAIL LOGIN & LEADERBOARD ================= */
  var ACCT_KEY = "ry_acct";
  var acct = null;
  function loadAcct() {
    try { acct = JSON.parse(localStorage.getItem(ACCT_KEY) || "null"); } catch (e) { acct = null; }
  }
  function saveAcct() {
    try { localStorage.setItem(ACCT_KEY, JSON.stringify(acct)); } catch (e) {}
  }

  var COUNTRIES = [
    ["SA", "🇸🇦", "السعودية"], ["AE", "🇦🇪", "الإمارات"], ["EG", "🇪🇬", "مصر"], ["DZ", "🇩🇿", "الجزائر"],
    ["MA", "🇲🇦", "المغرب"], ["TN", "🇹🇳", "تونس"], ["LY", "🇱🇾", "ليبيا"], ["SD", "🇸🇩", "السودان"],
    ["IQ", "🇮🇶", "العراق"], ["JO", "🇯🇴", "الأردن"], ["LB", "🇱🇧", "لبنان"], ["SY", "🇸🇾", "سوريا"],
    ["YE", "🇾🇪", "اليمن"], ["OM", "🇴🇲", "عُمان"], ["QA", "🇶🇦", "قطر"], ["KW", "🇰🇼", "الكويت"],
    ["BH", "🇧🇭", "البحرين"], ["PS", "🇵🇸", "فلسطين"], ["MR", "🇲🇷", "موريتانيا"], ["SO", "🇸🇴", "الصومال"],
    ["DJ", "🇩🇯", "جيبوتي"], ["KM", "🇰🇲", "جزر القمر"], ["TR", "🇹🇷", "تركيا"], ["IR", "🇮🇷", "إيران"],
    ["PK", "🇵🇰", "باكستان"], ["IN", "🇮🇳", "الهند"], ["ID", "🇮🇩", "إندونيسيا"], ["MY", "🇲🇾", "ماليزيا"],
    ["CN", "🇨🇳", "الصين"], ["JP", "🇯🇵", "اليابان"], ["KR", "🇰🇷", "كوريا"], ["US", "🇺🇸", "الولايات المتحدة"],
    ["CA", "🇨🇦", "كندا"], ["MX", "🇲🇽", "المكسيك"], ["BR", "🇧🇷", "البرازيل"], ["AR", "🇦🇷", "الأرجنتين"],
    ["GB", "🇬🇧", "بريطانيا"], ["FR", "🇫🇷", "فرنسا"], ["DE", "🇩🇪", "ألمانيا"], ["IT", "🇮🇹", "إيطاليا"],
    ["ES", "🇪🇸", "إسبانيا"], ["NL", "🇳🇱", "هولندا"], ["BE", "🇧🇪", "بلجيكا"], ["CH", "🇨🇭", "سويسرا"],
    ["AT", "🇦🇹", "النمسا"], ["SE", "🇸🇪", "السويد"], ["NO", "🇳🇴", "النرويج"], ["DK", "🇩🇰", "الدنمارك"],
    ["FI", "🇫🇮", "فنلندا"], ["PL", "🇵🇱", "بولندا"], ["RU", "🇷🇺", "روسيا"], ["UA", "🇺🇦", "أوكرانيا"],
    ["GR", "🇬🇷", "اليونان"], ["PT", "🇵🇹", "البرتغال"], ["AU", "🇦🇺", "أستراليا"], ["NZ", "🇳🇿", "نيوزيلندا"],
    ["NG", "🇳🇬", "نيجيريا"], ["ET", "🇪🇹", "إثيوبيا"], ["ZA", "🇿🇦", "جنوب أفريقيا"], ["AF", "🇦🇫", "أفغانستان"],
    ["BD", "🇧🇩", "بنغلاديش"], ["TH", "🇹🇭", "تايلاند"], ["VN", "🇻🇳", "فيتنام"]
  ];
  var pendingSave = null;
  var lbGame = "all", lbTab = "world", lbCountry = "";

  function renderAuth() {
    var btn = document.getElementById("authBtn");
    if (!btn) return;
    btn.textContent = acct ? (acct.nickname || acct.email.split("@")[0] || acct.email) + " ⏻" : "دخول";
    btn.title = acct ? "تسجيل الخروج" : "أدخل بريدك الإلكتروني فقط";
  }

  function openLoginModal(cb) {
    var backdrop = el("div", "modal-backdrop", "");
    var modal = el("div", "modal modal-sm", "");
    backdrop.appendChild(modal);
    var head = el("div", "modal-head", "");
    head.appendChild(el("h3", "", "👋 سجّل دخولك ببريدك"));
    modal.appendChild(head);
    modal.appendChild(el("p", "hint", "يكفي إدخال بريدك الإلكتروني — لا كلمة مرور."));

    var email = document.createElement("input");
    email.type = "email";
    email.className = "mg-input";
    email.style.cssText = "width:100%;margin:.4rem 0;";
    email.placeholder = "بريدك الإلكتروني";
    email.autocomplete = "off";
    modal.appendChild(email);

    var nick = document.createElement("input");
    nick.className = "mg-input";
    nick.style.cssText = "width:100%;margin:.4rem 0;";
    nick.placeholder = "اسمك في الترتيب (اختياري)";
    modal.appendChild(nick);

    var sel = document.createElement("select");
    sel.className = "mg-input";
    sel.style.cssText = "width:100%;margin:.4rem 0;";
    sel.innerHTML = '<option value="">— علم بلدك (اختياري) —</option>' + COUNTRIES.map(function (c) {
      return '<option value="' + c[0] + '" data-flag="' + c[1] + '">' + c[1] + " " + c[2] + "</option>";
    }).join("");
    modal.appendChild(sel);

    var msg = el("p", "mg-msg", "");
    modal.appendChild(msg);
    var actions = el("div", "form-actions", "");
    var save = el("button", "btn btn-primary", "دخول");
    save.addEventListener("click", function () {
      var em = (email.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { msg.textContent = "أدخل بريدًا إلكترونيًا صحيحًا"; msg.className = "mg-msg lose"; return; }
      acct = {
        email: em.toLowerCase(),
        nickname: nick.value.trim() || em.split("@")[0],
        country: sel.value || "",
        flag: sel.value ? sel.options[sel.selectedIndex].getAttribute("data-flag") : "🌍"
      };
      saveAcct();
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      cb();
    });
    actions.appendChild(save);
    modal.appendChild(actions);
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop && backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
        cb();
      }
    });
    email.focus();
  }

  function saveScoreFlow(game, score) {
    if (!acct) {
      openLoginModal(function () { if (acct) finishSave(game, score); });
      return;
    }
    finishSave(game, score);
  }

  function finishSave(game, score) {
    fetch("/.netlify/functions/submit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: acct.email,
        nickname: acct.nickname,
        country: acct.country,
        flag: acct.flag,
        game: game,
        score: score
      })
    }).then(function (r) { return r.json(); }).then(function (res) {
      toast(res.saved ? "✓ حُفظت نتيجتك!" : "⭐ سجلك الحالي أفضل");
      loadLeaderboard();
    }).catch(function () { toast("تعذر الحفظ — تحقق من الاتصال"); });
  }

  /* ----- leaderboard UI ----- */
  var GAMES = [
    { id: "all", label: "🏆 الكل" },
    { id: "fish", label: "🐟 صيد السمك" },
    { id: "jump", label: "🏃 القفز" },
    { id: "fight", label: "⚔️ النزال" },
    { id: "words", label: "✨ كلمات بابا منصف" },
    { id: "ahmd", label: "🎯 احمد قيمز" }
  ];

  function initLeaderboard() {
    var sel = document.getElementById("lbGame");
    if (!sel) return;
    sel.innerHTML = GAMES.map(function (g) { return '<option value="' + g.id + '">' + g.label + "</option>"; }).join("");
    sel.addEventListener("change", function () { lbGame = sel.value; loadLeaderboard(); });

    var cSel = document.getElementById("lbCountry");
    if (cSel) {
      cSel.innerHTML = '<option value="">— اختر الدولة —</option>' + COUNTRIES.map(function (c) {
        return '<option value="' + c[0] + '">' + c[1] + " " + c[2] + "</option>";
      }).join("");
      if (acct && acct.country) cSel.value = acct.country;
      cSel.addEventListener("change", function () { lbCountry = cSel.value; loadLeaderboard(); });
    }

    document.querySelectorAll(".lb-tab").forEach(function (t) {
      t.addEventListener("click", function () {
        document.querySelectorAll(".lb-tab").forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active");
        lbTab = t.getAttribute("data-tab");
        if (cSel) cSel.hidden = lbTab !== "country";
        loadLeaderboard();
      });
    });
    loadLeaderboard();
  }

  function loadLeaderboard() {
    var listEl = document.getElementById("lbList");
    if (!listEl) return;
    var q = "game=" + encodeURIComponent(lbGame);
    if (lbTab === "country" && lbCountry) q += "&country=" + encodeURIComponent(lbCountry);
    listEl.innerHTML = '<p class="lb-empty">جارٍ التحميل…</p>';
    fetch("/.netlify/functions/leaderboard?" + q)
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.list || !res.list.length) {
          listEl.innerHTML = '<p class="lb-empty">لا توجد نتائج بعد — كن الأول!</p>';
          return;
        }
        listEl.innerHTML = "";
        var myEmail = acct ? acct.email : null;
        var medals = ["🥇", "🥈", "🥉"];
        res.list.forEach(function (e) {
          var row = el("div", "lb-row" + (myEmail && e.email === myEmail ? " lb-you" : ""), "");
          row.appendChild(el("span", "lb-rank" + (e.rank <= 3 ? " top" : ""), e.rank <= 3 ? medals[e.rank - 1] : String(e.rank)));
          row.appendChild(el("span", "lb-flag", e.flag || "🌍"));
          row.appendChild(el("span", "lb-name", escTxt(e.nickname)));
          row.appendChild(el("span", "lb-score", escTxt(e.score)));
          listEl.appendChild(row);
        });
      })
      .catch(function () { listEl.innerHTML = '<p class="lb-empty">تتطلب الاتصال بالإنترنت</p>'; });
  }

  /* ================= INIT ================= */
  loadAcct();
  showMenu();
  initLeaderboard();
  renderAuth();

  var authBtn = document.getElementById("authBtn");
  if (authBtn) {
    authBtn.addEventListener("click", function () {
      if (acct) {
        acct = null;
        localStorage.removeItem(ACCT_KEY);
        renderAuth();
        loadLeaderboard();
        toast("تم تسجيل الخروج");
      } else {
        openLoginModal(function () {
          renderAuth();
          loadLeaderboard();
          toast("✓ مرحبًا بك!");
        });
      }
    });
  }
})();
