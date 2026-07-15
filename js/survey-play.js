// 우리 반 조사 놀이: 로그인 게이트 → 조사 선택 → 투표 / 실시간 그래프.
// 데이터: /surveys(질문·선택지, 관리자 작성) + /votes/{surveyId}(투표 1건 = 1push).
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const COLORS = ["#5DCAA5", "#FAC775", "#F0997B", "#9CD6F5"]; // 선택지별 블록 색 (최대 4개)
  let surveys = [], cur = null, votes = {}, unwatch = null, busy = false;

  function show(which) {
    ["gate", "select", "vote", "graph"].forEach(n => { $("sv-" + n).hidden = n !== which; });
    if (which !== "graph" && unwatch) { unwatch(); unwatch = null; }
  }

  function gateMsg(html) { $("sv-gate").innerHTML = `<div class="sv-msg">${html}</div>`; show("gate"); }

  // ── 조사 선택 ──
  async function renderSelect() {
    try { surveys = await window.listSurveys(); } catch (e) { surveys = []; }
    surveys.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const host = $("sv-list");
    const open = surveys.filter(s => s.status !== "closed");
    const closed = surveys.filter(s => s.status === "closed");
    const item = (s) => `
      <div class="sv-item${s.status === "closed" ? " closed" : ""}" data-id="${s.id}">
        <div class="em">${esc((s.options || []).map(o => o.emoji).join(" "))}</div>
        <h3>${esc(s.title || "조사")}</h3>
        <div class="meta">${s.status === "closed" ? "조사 끝! 결과 보기 📊" : "투표할 수 있어요 ✋"}</div>
      </div>`;
    host.innerHTML = open.map(item).join("") + closed.map(item).join("");
    if (!surveys.length) {
      host.innerHTML = `<p class="sv-empty">아직 만든 조사가 없어요.<br>관리자 화면에서 <b>새 조사</b>를 만들어 주세요!</p>`;
    }
    host.querySelectorAll(".sv-item").forEach(el => el.onclick = () => {
      const s = surveys.find(x => x.id === el.dataset.id);
      if (!s) return;
      if (s.status === "closed") openGraph(s);
      else openVote(s);
    });
    show("select");
  }

  // ── 투표 화면 ──
  function openVote(s) {
    cur = s;
    $("vote-q").textContent = s.title || "";
    const host = $("vote-opts");
    host.innerHTML = (s.options || []).map((o, i) =>
      `<button type="button" class="opt" data-i="${i}">
         <span class="em">${esc(o.emoji || "❓")}</span><span class="nm">${esc(o.name || "")}</span>
       </button>`).join("");
    host.querySelectorAll(".opt").forEach(b => b.onclick = () => castVote(+b.dataset.i));
    show("vote");
  }

  async function castVote(i) {
    if (busy) return;
    busy = true;
    $("vote-opts").querySelectorAll(".opt").forEach(b => b.disabled = true);
    try {
      await window.submitVote(cur.id, i);
      const th = $("sv-thanks");
      th.hidden = false;
      setTimeout(() => {
        th.hidden = true;
        $("vote-opts").querySelectorAll(".opt").forEach(b => b.disabled = false);
        busy = false;
      }, 1800);
    } catch (e) {
      $("vote-opts").querySelectorAll(".opt").forEach(b => b.disabled = false);
      busy = false;
      alert("기록에 실패했어요. 인터넷 연결을 확인해 주세요.");
    }
  }

  // ── 그래프 화면 ──
  function openGraph(s) {
    cur = s;
    $("graph-q").textContent = s.title || "";
    $("graph-vote").hidden = (s.status === "closed");
    votes = {};
    renderGraph();
    if (unwatch) unwatch();
    unwatch = window.watchVotes(s.id, (v) => { votes = v || {}; renderGraph(); });
    show("graph");
  }

  function renderGraph() {
    const host = $("graph-body");
    const opts = cur.options || [];
    const counts = opts.map(() => 0);
    let total = 0;
    for (const k in votes) {
      const o = votes[k] && votes[k].opt;
      if (o >= 0 && o < counts.length) { counts[o]++; total++; }
    }

    // 마감 전 비공개 조사: 몇 명이 참여했는지만 보여줌
    if (cur.showLive === false && cur.status !== "closed") {
      host.innerHTML = `<div class="g-secret"><span class="em">🤫</span>
        아직 비밀이에요!<br>조사가 끝나면 함께 볼 수 있어요.<br>
        <span style="color:var(--tomato)">지금까지 ${total}명 참여</span></div>`;
      return;
    }

    const max = Math.max(1, ...counts);
    const blockH = Math.max(14, Math.min(40, Math.floor(260 / max)));
    const isClosed = cur.status === "closed";
    host.innerHTML = `<div class="g-cols">` + opts.map((o, i) => {
      const blocks = Array.from({ length: counts[i] }, () =>
        `<div class="g-block" style="height:${blockH}px;background:${COLORS[i % COLORS.length]}"></div>`).join("");
      const crown = (isClosed && counts[i] === max && max > 0 && total > 0) ? `<div class="g-crown">👑</div>` : "";
      return `<div class="g-col">${crown}<div class="g-stack">${blocks}</div>
        <div class="g-foot"><span class="em">${esc(o.emoji || "❓")}</span>
        <span class="nm">${esc(o.name || "")}</span><span class="ct">${counts[i]}</span></div></div>`;
    }).join("") + `</div>
    <p class="g-total">지금까지 <b>${total}명</b>이 마음을 알려줬어요${isClosed ? " · 조사 끝!" : ""}</p>`;
  }

  // ── 버튼 ──
  function wire() {
    $("vote-back").onclick = renderSelect;
    $("graph-back").onclick = renderSelect;
    $("vote-graph").onclick = () => openGraph(cur);
    $("graph-vote").onclick = () => openVote(cur);
  }

  // ── 부팅 ──
  function begin() {
    wire();
    if (!window.watchAuth) { gateMsg("Firebase 설정이 필요해요."); return; }
    window.watchAuth((user) => {
      if (!user) {
        gateMsg(`🔒 로그인이 필요해요.<br>꿈 놀이터에서 로그인한 뒤 이용해 주세요.<br>
          <a class="chip-btn" href="../index.html">꿈 놀이터에서 로그인하기</a>`);
        return;
      }
      renderSelect();
    });
  }

  if (window.AUTH_READY) begin();
  else window.addEventListener("auth-ready", begin, { once: true });

  // 핀치·더블탭 확대 잠금 (태블릿 놀이 공통)
  document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  let lastTouch = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouch <= 300) e.preventDefault();
    lastTouch = now;
  }, { passive: false });
})();
