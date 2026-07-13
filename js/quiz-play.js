// 낱말 퀴즈 놀이 화면: 로그인 게이트 → 퀴즈 선택 → 게임.
// 퀴즈 엔진(격자·힌트카드)은 quiz-model.js의 buildPuzzle 결과로 동작한다.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let quizzes = [];
  let idx = 0, CARDS = [], inputs = {}, ans = {};

  const COLORS = [['#FFD36B', '#FFE9A8'], ['#9CD6F5', '#C9EAFB'], ['#FF9E8A', '#FFC9BE'], ['#A9DD7B', '#CFEEAE'],
    ['#C9A7E8', '#E2CFF4'], ['#FFB85C', '#FFD49A'], ['#7FD0C4', '#B4E6DE'], ['#F4A0C0', '#FBC9DC']];
  const dots = (n) => '○ '.repeat(n).trim();

  function showScreen(which) {
    $("wq-gate").hidden = which !== "gate";
    $("wq-select").hidden = which !== "select";
    $("game").hidden = which !== "game";
  }

  // ── 게이트 ──
  function gateSplash() {
    $("wq-gate").innerHTML = `<div class="wq-splash">🧩<br>낱말 퀴즈</div>`;
    showScreen("gate");
  }
  function gateLoggedOut() {
    $("wq-gate").innerHTML =
      `<div class="wq-gate-msg">🔒 로그인이 필요해요.<br>꿈 놀이터에서 로그인한 뒤 이용해 주세요.<br>
       <a class="btn btn-show" href="../index.html">꿈 놀이터에서 로그인하기</a></div>`;
    showScreen("gate");
  }

  // ── 퀴즈 선택 화면 ──
  function renderSelect() {
    const host = $("wq-select");
    host.innerHTML =
      `<div class="wq-select-head"><h1>🧩 낱말 퀴즈</h1><p class="sub">함께 풀 퀴즈를 골라요!</p></div>
       <div class="wq-grid" id="wq-grid"></div>`;
    const grid = $("wq-grid");
    quizzes.forEach((q) => {
      const div = document.createElement("div");
      div.className = "wq-quiz";
      const n = (q.words || []).length;
      div.innerHTML =
        `<div class="em">${esc(q.emojis || "🧩")}</div>` +
        `<h3>${esc(q.title || "낱말 퀴즈")}</h3>` +
        `<p>${esc(q.subtitle || "")}</p>` +
        `<div class="meta">${n}낱말${q.builtin ? " · 기본" : ""}</div>`;
      div.onclick = () => startGame(q);
      grid.appendChild(div);
    });
    showScreen("select");
  }

  // ── 게임 시작 ──
  function startGame(quiz) {
    const p = window.buildPuzzle(quiz);
    $("q-title").textContent = quiz.title || "낱말퀴즈";
    $("q-sub").textContent = quiz.subtitle || "";
    $("q-emojis").textContent = quiz.emojis || "";

    const board = $("board");
    board.style.gridTemplateColumns = `repeat(${p.cols},1fr)`;
    board.style.aspectRatio = `${p.cols}/${p.rows}`;
    board.innerHTML = "";
    ans = {}; inputs = {};
    p.cells.forEach(([r, c, ch]) => { ans[r + "_" + c] = ch; });
    for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) {
      const key = r + "_" + c;
      const div = document.createElement("div");
      if (ans[key]) {
        div.className = "cell on"; div.dataset.key = key;
        if (p.nums[key]) { const s = document.createElement("span"); s.className = "num"; s.textContent = p.nums[key]; div.appendChild(s); }
        const inp = document.createElement("input");
        inp.className = "cinp"; inp.type = "text"; inp.setAttribute("inputmode", "text"); inp.maxLength = 2;
        inp.addEventListener("input", () => { div.classList.remove("correct", "wrong"); $("result").textContent = ""; });
        div.appendChild(inp); inputs[key] = inp;
      } else { div.className = "cell"; }
      board.appendChild(div);
    }

    CARDS = p.cards; idx = 0;
    const prog = $("progress"); prog.innerHTML = "";
    CARDS.forEach((cd, i) => {
      const pip = document.createElement("div"); pip.className = "pip"; pip.textContent = cd.n;
      pip.onclick = () => { idx = i; renderCard(); };
      prog.appendChild(pip);
    });
    renderCard();
    $("result").textContent = "";
    showScreen("game");
  }

  function renderCard() {
    const card = CARDS[idx];
    const [c1, c2] = COLORS[idx % COLORS.length];
    const tiles = $("tiles");
    tiles.innerHTML = "";
    card.clues.forEach((cl) => {
      const tile = document.createElement("div"); tile.className = "tile";
      tile.style.setProperty("--c1", c1); tile.style.setProperty("--c2", c2);
      tile.innerHTML =
        '<div class="tinner">' +
          '<div class="tface tfront">' +
            '<div class="tag"><span class="dir">' + esc(cl.dir) + '</span></div>' +
            '<div class="clue-text">' + esc(cl.text) + '</div>' +
            '<div class="blanks">' + dots(cl.blanks) + '</div>' +
            '<div class="tap-hint">👆 눌러서 정답 보기</div>' +
          '</div>' +
          '<div class="tface tback">' +
            '<div class="ans-emoji">' + esc(cl.emoji) + '</div>' +
            '<div class="ans-word">' + esc(cl.word) + '</div>' +
            '<div class="ans-desc">' + esc(cl.desc) + '</div>' +
          '</div>' +
        '</div>';
      tile.addEventListener("click", () => tile.classList.toggle("flipped"));
      tiles.appendChild(tile);
    });
    [...$("progress").children].forEach((pip, i) => pip.classList.toggle("active", i === idx));
    $("prevBtn").disabled = idx === 0;
    $("nextBtn").disabled = idx === CARDS.length - 1;
  }

  function gradeAll() {
    let total = 0, right = 0;
    for (const key in ans) {
      total++;
      const cellDiv = $("board").querySelector('[data-key="' + key + '"]');
      const v = (inputs[key].value || "").trim();
      cellDiv.classList.remove("correct", "wrong");
      if (v === "") continue;
      if (v === ans[key]) { cellDiv.classList.add("correct"); right++; }
      else { cellDiv.classList.add("wrong"); }
    }
    return { total, right };
  }

  function wireButtons() {
    $("checkBtn").onclick = () => {
      const { total, right } = gradeAll();
      $("result").textContent = right === total
        ? "🎉 와! " + total + "칸 모두 정답이에요!"
        : "총 " + total + "칸 중 " + right + "칸 맞았어요! 다시 도전해봐요 💪";
    };
    $("showBtn").onclick = () => {
      for (const key in ans) {
        const cellDiv = $("board").querySelector('[data-key="' + key + '"]');
        inputs[key].value = ans[key];
        cellDiv.classList.remove("wrong"); cellDiv.classList.add("correct");
      }
      $("result").textContent = "정답을 모두 보여줄게요 ✨";
    };
    $("clearBtn").onclick = () => {
      for (const key in ans) {
        inputs[key].value = "";
        $("board").querySelector('[data-key="' + key + '"]').classList.remove("correct", "wrong");
      }
      $("result").textContent = "";
    };
    $("prevBtn").onclick = () => { if (idx > 0) { idx--; renderCard(); } };
    $("nextBtn").onclick = () => { if (idx < CARDS.length - 1) { idx++; renderCard(); } };
    $("back-btn").onclick = () => renderSelect();
  }

  // ── 부팅 ──
  async function onUser(user) {
    if (!user) { gateLoggedOut(); return; }
    quizzes = [window.QUIZ_DEFAULT];
    try {
      const fromDb = await window.listQuizzes();
      // 최신 생성순으로 뒤에 붙임
      fromDb.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      quizzes = quizzes.concat(fromDb);
    } catch (e) { /* 규칙 준비 전이거나 아직 만든 퀴즈가 없음 */ }
    renderSelect();
  }

  function begin() {
    wireButtons();
    if (!window.watchAuth) { quizzes = [window.QUIZ_DEFAULT]; renderSelect(); return; }
    gateSplash();
    window.watchAuth(onUser);
  }

  if (window.AUTH_READY) begin();
  else window.addEventListener("auth-ready", begin, { once: true });

  // 핀치 확대 / 더블탭 확대 잠금 (태블릿)
  document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  let lastTouch = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouch <= 300) e.preventDefault();
    lastTouch = now;
  }, { passive: false });
})();
