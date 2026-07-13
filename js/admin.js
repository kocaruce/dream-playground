// 관리자 화면: 가입 선생님 목록 + 후원 기록 + 운영 관리. (99p 관리자만 접근)

let allUsers = [];
let allDons = [];
let shownUsers = [];

function kstToday() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
function fmtDate(ts) {
  if (!ts) return "–";
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function gate(msg, cls) {
  const g = document.getElementById("admin-gate");
  g.hidden = false;
  g.className = "admin-note" + (cls ? " " + cls : "");
  g.innerHTML = msg;
  document.getElementById("admin-content").hidden = true;
}

function loginPrompt() {
  gate(`
    <div class="admin-login">
      <p>관리자 로그인이 필요해요.</p>
      <button class="social-btn google" id="ad-google"><span class="g">G</span> 구글로 로그인</button>
      <div class="gate-divider"><span>또는 이메일</span></div>
      <input id="ad-email" type="email" placeholder="이메일">
      <input id="ad-pw" type="password" placeholder="비밀번호">
      <button class="gate-primary" id="ad-login">로그인</button>
      <p class="gate-err" id="ad-err"></p>
    </div>`);
  const err = document.getElementById("ad-err");
  document.getElementById("ad-google").onclick = async () => {
    err.textContent = "";
    try { await window.signInGoogle(); } catch (e) { err.textContent = "로그인에 실패했어요."; }
  };
  document.getElementById("ad-login").onclick = async () => {
    err.textContent = "";
    try { await window.signInEmail(document.getElementById("ad-email").value.trim(), document.getElementById("ad-pw").value); }
    catch (e) { err.textContent = "이메일 또는 비밀번호를 확인해 주세요."; }
  };
}

/* ── 표 렌더링 ── */
function renderUsers(list) {
  shownUsers = list;
  const utb = document.querySelector("#users-table tbody");
  utb.innerHTML = list.length ? list.map(u => `
    <tr>
      <td>${esc(u.name)}</td>
      <td>${esc(u.affiliation)}</td>
      <td>${esc(u.region)}</td>
      <td>${esc(u.orgName) || "–"}</td>
      <td class="mono">${esc(u.email)}</td>
      <td class="mono">${fmtDate(u.createdAt)}</td>
    </tr>`).join("") : `<tr><td colspan="6" class="empty">${allUsers.length ? "검색 결과가 없어요." : "아직 가입한 선생님이 없어요."}</td></tr>`;
  document.getElementById("count-users").textContent = `(${list.length}명)`;
}

function renderDons(list) {
  const dtb = document.querySelector("#dons-table tbody");
  dtb.innerHTML = list.length ? list.map(d => `
    <tr>
      <td class="mono">${fmtDate(d.at)}</td>
      <td>${esc(d.name)}</td>
      <td>${esc([d.affiliation, d.orgName].filter(Boolean).join(" · ")) || "–"}</td>
      <td>${esc(d.region) || "–"}</td>
      <td>${esc(d.method === "kakaopay" ? "카카오페이" : d.method) || "–"}</td>
    </tr>`).join("") : `<tr><td colspan="5" class="empty">아직 후원 기록이 없어요.</td></tr>`;
  document.getElementById("count-dons").textContent = `(${list.length}건)`;
}

/* ── 검색 필터 ── */
function applyUserSearch() {
  const q = document.getElementById("user-search").value.trim().toLowerCase();
  if (!q) { renderUsers(allUsers); return; }
  const filtered = allUsers.filter(u =>
    [u.name, u.affiliation, u.region, u.orgName].some(v => String(v || "").toLowerCase().includes(q)));
  renderUsers(filtered);
}

/* ── CSV 내보내기 ── */
function csvEscape(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCSV(rows, headers) {
  const lines = [headers.map(h => csvEscape(h.label)).join(",")];
  rows.forEach(r => lines.push(headers.map(h => csvEscape(h.get(r))).join(",")));
  return "﻿" + lines.join("\r\n"); // BOM: 엑셀에서 한글 깨짐 방지
}
function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function exportUsersCSV() {
  const csv = toCSV(shownUsers, [
    { label: "이름", get: u => u.name },
    { label: "소속", get: u => u.affiliation },
    { label: "지역", get: u => u.region },
    { label: "원 이름", get: u => u.orgName },
    { label: "이메일", get: u => u.email },
    { label: "가입일", get: u => fmtDate(u.createdAt) },
  ]);
  downloadCSV(`꿈놀이터_회원목록_${kstToday()}.csv`, csv);
}
function exportDonsCSV() {
  const csv = toCSV(allDons, [
    { label: "일시", get: d => fmtDate(d.at) },
    { label: "이름", get: d => d.name },
    { label: "소속", get: d => d.affiliation },
    { label: "원 이름", get: d => d.orgName },
    { label: "지역", get: d => d.region },
    { label: "방법", get: d => d.method === "kakaopay" ? "카카오페이" : d.method },
  ]);
  downloadCSV(`꿈놀이터_후원기록_${kstToday()}.csv`, csv);
}

/* ── 운영 관리: 오래된 주문 정리 ── */
function setupCleanup() {
  const dateInput = document.getElementById("cleanup-date");
  const d = new Date(Date.now() - 90 * 86400000);
  dateInput.value = d.toISOString().slice(0, 10); // 기본값: 90일 전

  document.getElementById("cleanup-btn").onclick = async () => {
    const before = dateInput.value;
    const result = document.getElementById("cleanup-result");
    if (!before) { result.textContent = "날짜를 선택해 주세요."; return; }
    if (!confirm(`${before} 이전 주문을 모두 삭제할까요?\n되돌릴 수 없어요.`)) return;
    result.textContent = "정리하는 중…";
    try {
      const count = await window.adminCleanupOrders(before);
      result.textContent = count > 0 ? `${count}건을 정리했어요.` : "정리할 주문이 없어요.";
    } catch (e) {
      result.textContent = "정리에 실패했어요. 잠시 후 다시 시도해 주세요.";
    }
  };

  // 후원기록 개인정보 정리
  const donBtn = document.getElementById("don-cleanup-btn");
  if (donBtn) donBtn.onclick = async () => {
    const result = document.getElementById("don-cleanup-result");
    if (!confirm("모든 후원 기록에서 이름·이메일 등 개인정보를 지울까요?\n후원 건수·시각은 유지되며, 되돌릴 수 없어요.")) return;
    donBtn.disabled = true;
    result.textContent = "정리하는 중…";
    try {
      const count = await window.adminCleanupDonations();
      result.textContent = count > 0 ? `${count}건의 개인정보를 정리했어요.` : "정리할 개인정보가 없어요.";
    } catch (e) {
      result.textContent = "정리에 실패했어요. 보안 규칙(관리자 write 허용)을 확인해 주세요.";
    } finally {
      donBtn.disabled = false;
    }
  };
}

/* ── 데이터 로드 ── */
async function loadAdmin() {
  gate("불러오는 중…");
  try {
    allUsers = await window.adminGetUsers();
    allDons = await window.adminGetDonations();
  } catch (e) {
    gate("데이터를 불러오지 못했어요. 잠시 후 새로고침해 주세요.", "err");
    return;
  }

  document.getElementById("admin-gate").hidden = true;
  document.getElementById("admin-content").hidden = false;

  // 후원 기록은 개인정보를 담지 않으므로(uid만), 회원 정보와 조인해 표시용 필드를 채운다.
  // 탈퇴한 회원(users에 없음)은 개인을 식별할 수 없어 "(탈퇴 회원)"으로 표시된다.
  const uMap = {};
  allUsers.forEach(u => { uMap[u.uid] = u; });
  allDons = allDons.map(d => {
    const u = uMap[d.uid] || {};
    return {
      ...d,
      name: u.name || d.name || "(탈퇴 회원)",
      affiliation: u.affiliation || d.affiliation || "",
      orgName: u.orgName || d.orgName || "",
      region: u.region || d.region || "",
    };
  });

  allUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  allDons.sort((a, b) => (b.at || 0) - (a.at || 0));

  document.getElementById("stat-users").textContent = allUsers.length;
  document.getElementById("stat-dons").textContent = allDons.length;

  renderUsers(allUsers);
  renderDons(allDons);

  document.getElementById("user-search").oninput = applyUserSearch;
  document.getElementById("users-csv").onclick = exportUsersCSV;
  document.getElementById("dons-csv").onclick = exportDonsCSV;
  setupCleanup();
  setupNav();
  setupWordQuiz();
}

/* ── 좌측 메뉴 ↔ 패널 전환 ── */
function setupNav() {
  const items = document.querySelectorAll(".nav-item");
  const panels = document.querySelectorAll(".panel");
  const show = (name) => {
    items.forEach(i => i.classList.toggle("is-active", i.dataset.panel === name));
    panels.forEach(p => p.classList.toggle("is-active", p.id === "panel-" + name));
  };
  items.forEach(i => { i.onclick = () => show(i.dataset.panel); });
  document.querySelectorAll("[data-jump]").forEach(el => { el.onclick = () => show(el.dataset.jump); });
  const logout = document.getElementById("admin-logout");
  if (logout) logout.onclick = async () => { await window.signOutUser(); location.reload(); };
}

/* ── 낱말 퀴즈 관리 (격자 편집기) ── */
let wqQuizzes = [];
let wqEdit = null; // { id, title, subtitle, emojis, rows, cols, words, dir, sel }

function setupWordQuiz() {
  document.getElementById("wq-new").onclick = () => openQuizEditor(null);
  loadWordQuizzes();
}

async function loadWordQuizzes() {
  try { wqQuizzes = await window.listQuizzes(); }
  catch (e) { wqQuizzes = []; }
  renderQuizList();
}

function renderQuizList() {
  document.getElementById("wq-editor").hidden = true;
  const list = document.getElementById("wq-list");
  list.hidden = false;
  document.getElementById("wq-count").textContent = `(${wqQuizzes.length}개)`;

  const def = window.QUIZ_DEFAULT;
  let html = `<div class="wq-card">
      <div class="wq-card-main"><span class="wq-em">${esc(def.emojis)}</span>
        <div><b>${esc(def.title)}</b><span class="wq-sub">기본 제공 · ${def.words.length}낱말</span></div></div>
      <div class="wq-card-btns"><button class="csv-btn" data-clone="default">복제해서 편집</button></div>
    </div>`;
  html += wqQuizzes.map(q => `<div class="wq-card">
      <div class="wq-card-main"><span class="wq-em">${esc(q.emojis || "🧩")}</span>
        <div><b>${esc(q.title || "제목 없음")}</b><span class="wq-sub">${(q.words || []).length}낱말</span></div></div>
      <div class="wq-card-btns">
        <button class="csv-btn" data-edit="${q.id}">수정</button>
        <button class="csv-btn wq-del" data-del="${q.id}">삭제</button>
      </div>
    </div>`).join("");
  if (!wqQuizzes.length) html += `<p class="wq-empty">아직 만든 퀴즈가 없어요. 위 <b>+ 새 퀴즈 만들기</b> 또는 기본 퀴즈 <b>복제</b>로 시작해 보세요.</p>`;
  list.innerHTML = html;

  list.querySelector('[data-clone="default"]').onclick = () => openQuizEditor(cloneQuiz(def, true));
  list.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => {
    const q = wqQuizzes.find(x => x.id === b.dataset.edit);
    openQuizEditor(cloneQuiz(q, false));
  });
  list.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    const q = wqQuizzes.find(x => x.id === b.dataset.del);
    if (!confirm(`'${q.title || "제목 없음"}' 퀴즈를 삭제할까요?\n되돌릴 수 없어요.`)) return;
    try { await window.deleteQuiz(q.id); await loadWordQuizzes(); }
    catch (e) { alert("삭제에 실패했어요. 보안 규칙(관리자 write 허용)을 확인해 주세요."); }
  });
}

function cloneQuiz(q, asNew) {
  return {
    id: asNew ? null : q.id,
    title: (q.title || "") + (asNew ? " (복사본)" : ""),
    subtitle: q.subtitle || "",
    emojis: q.emojis || "🧩",
    rows: q.rows || 8, cols: q.cols || 10,
    words: (q.words || []).map(w => ({ ...w })),
    dir: "가로", sel: null,
  };
}

function openQuizEditor(draft) {
  wqEdit = draft || { id: null, title: "", subtitle: "", emojis: "🧩", rows: 8, cols: 10, words: [], dir: "가로", sel: null };
  wqEdit.dir = wqEdit.dir || "가로";
  document.getElementById("wq-list").hidden = true;
  const ed = document.getElementById("wq-editor");
  ed.hidden = false;
  ed.innerHTML = `
    <div class="wq-ed-head">
      <button class="csv-btn" id="wq-cancel">← 목록으로</button>
      <button class="gate-primary" id="wq-save">저장하기</button>
    </div>
    <div class="wq-ed-meta">
      <label>제목<input id="wq-title" value="${esc(wqEdit.title)}" placeholder="예: 동물 낱말퀴즈"></label>
      <label>부제<input id="wq-subtitle" value="${esc(wqEdit.subtitle)}" placeholder="예: 함께 동물 이름을 찾아봐요!"></label>
      <label>이모지 줄<input id="wq-emojis" value="${esc(wqEdit.emojis)}" placeholder="예: 🐶 🐱 🐰"></label>
      <label>가로 칸<input id="wq-cols" type="number" min="4" max="16" value="${wqEdit.cols}"></label>
      <label>세로 칸<input id="wq-rows" type="number" min="4" max="16" value="${wqEdit.rows}"></label>
    </div>
    <div class="wq-ed-body">
      <div><div class="wq-grid" id="wq-grid"></div><p class="wq-hint">단어의 <b>시작 칸</b>을 격자에서 클릭한 뒤 오른쪽에 단어를 입력하세요.</p></div>
      <div class="wq-side">
        <div class="wq-addform">
          <div class="wq-addform-t">단어 추가</div>
          <div class="wq-dir" id="wq-dir">
            <button type="button" data-dir="가로">가로 ▶</button>
            <button type="button" data-dir="세로">세로 ▼</button>
          </div>
          <div class="wq-sel" id="wq-sel"></div>
          <input id="wq-answer" placeholder="정답 (예: 소금)" maxlength="8">
          <input id="wq-clue" placeholder="힌트 (예: 짠맛을 내는 조미료)">
          <input id="wq-emoji" placeholder="정답 이모지 (예: 🧂)" maxlength="4">
          <input id="wq-desc" placeholder="한 줄 설명 (예: 요리에 꼭 필요해요)">
          <button class="gate-primary" id="wq-add">단어 추가</button>
          <p class="wq-msg" id="wq-msg"></p>
        </div>
        <div class="wq-words" id="wq-words"></div>
      </div>
    </div>`;

  const bind = (id, key, num) => {
    const el = document.getElementById(id);
    el.oninput = () => {
      wqEdit[key] = num ? Math.max(4, Math.min(16, parseInt(el.value) || wqEdit[key])) : el.value;
      if (num) renderGrid();
    };
  };
  bind("wq-title", "title"); bind("wq-subtitle", "subtitle"); bind("wq-emojis", "emojis");
  bind("wq-cols", "cols", true); bind("wq-rows", "rows", true);

  document.getElementById("wq-cancel").onclick = () => renderQuizList();
  document.getElementById("wq-save").onclick = saveQuizEditor;
  document.getElementById("wq-add").onclick = addWordToEditor;
  document.querySelectorAll("#wq-dir button").forEach(b => b.onclick = () => {
    wqEdit.dir = b.dataset.dir; updateDirButtons();
  });
  updateDirButtons();
  updateSelLabel();
  renderGrid();
  renderWordList();
}

function updateDirButtons() {
  document.querySelectorAll("#wq-dir button").forEach(b =>
    b.classList.toggle("on", b.dataset.dir === wqEdit.dir));
}
function updateSelLabel() {
  const el = document.getElementById("wq-sel");
  el.innerHTML = wqEdit.sel
    ? `시작 칸: <b>${wqEdit.sel.r + 1}행 ${wqEdit.sel.c + 1}열</b>`
    : `시작 칸: <span class="muted">격자를 클릭하세요</span>`;
}

function renderGrid() {
  const p = window.buildPuzzle(wqEdit);
  const cellCh = {}; p.cells.forEach(([r, c, ch]) => cellCh[r + "_" + c] = ch);
  const conflictKeys = {}; p.conflicts.forEach(cf => { if (cf.r >= 0 && cf.c >= 0) conflictKeys[cf.r + "_" + cf.c] = 1; });
  const grid = document.getElementById("wq-grid");
  grid.style.gridTemplateColumns = `repeat(${wqEdit.cols}, 1fr)`;
  let html = "";
  for (let r = 0; r < wqEdit.rows; r++) for (let c = 0; c < wqEdit.cols; c++) {
    const key = r + "_" + c;
    const on = cellCh[key] != null;
    const sel = wqEdit.sel && wqEdit.sel.r === r && wqEdit.sel.c === c;
    const cls = ["wqc"]; if (on) cls.push("on"); if (sel) cls.push("sel"); if (conflictKeys[key]) cls.push("bad");
    html += `<button type="button" class="${cls.join(" ")}" data-r="${r}" data-c="${c}">${on ? esc(cellCh[key]) : ""
      }${p.nums[key] ? `<span class="wqn">${p.nums[key]}</span>` : ""}</button>`;
  }
  grid.innerHTML = html;
  grid.querySelectorAll(".wqc").forEach(b => b.onclick = () => {
    wqEdit.sel = { r: +b.dataset.r, c: +b.dataset.c };
    updateSelLabel(); renderGrid();
  });
  const msg = document.getElementById("wq-msg");
  if (p.conflicts.length && msg) { msg.textContent = "⚠️ 겹치는 글자가 서로 달라요. 빨간 칸을 확인하세요."; msg.className = "wq-msg bad"; }
}

function addWordToEditor() {
  const msg = document.getElementById("wq-msg");
  const setMsg = (m, ok) => { msg.textContent = m; msg.className = "wq-msg" + (ok ? " ok" : " bad"); };
  const answer = document.getElementById("wq-answer").value.trim();
  const clue = document.getElementById("wq-clue").value.trim();
  const emoji = document.getElementById("wq-emoji").value.trim() || "❓";
  const desc = document.getElementById("wq-desc").value.trim();
  if (!answer) return setMsg("정답 단어를 입력해 주세요.");
  if (!wqEdit.sel) return setMsg("격자에서 시작 칸을 먼저 클릭해 주세요.");
  const w = { answer, dir: wqEdit.dir, r: wqEdit.sel.r, c: wqEdit.sel.c, clue, emoji, desc };
  // 검증: 임시로 추가해 충돌·범위 확인
  const test = window.buildPuzzle({ rows: wqEdit.rows, cols: wqEdit.cols, words: wqEdit.words.concat([w]) });
  const before = window.buildPuzzle(wqEdit).conflicts.length;
  if (test.conflicts.length > before) {
    const oob = test.conflicts.some(cf => cf.reason === "밖");
    return setMsg(oob ? "단어가 격자 밖으로 나가요. 시작 위치나 격자 크기를 조정하세요." : "겹치는 칸의 글자가 달라요. 교차 글자를 맞춰 주세요.");
  }
  wqEdit.words.push(w);
  document.getElementById("wq-answer").value = "";
  document.getElementById("wq-clue").value = "";
  document.getElementById("wq-emoji").value = "";
  document.getElementById("wq-desc").value = "";
  setMsg("추가했어요! ✨", true);
  renderGrid(); renderWordList();
}

function renderWordList() {
  const host = document.getElementById("wq-words");
  if (!wqEdit.words.length) { host.innerHTML = `<p class="wq-empty">추가한 단어가 여기에 표시돼요.</p>`; return; }
  host.innerHTML = `<div class="wq-words-t">추가한 단어 (${wqEdit.words.length})</div>` +
    wqEdit.words.map((w, i) => `<div class="wq-word">
      <span class="wq-word-dir ${w.dir === "가로" ? "h" : "v"}">${w.dir}</span>
      <b>${esc(w.answer)}</b> <span class="wq-word-clue">${esc(w.clue || "")}</span>
      <button class="wq-word-del" data-i="${i}">✕</button>
    </div>`).join("");
  host.querySelectorAll(".wq-word-del").forEach(b => b.onclick = () => {
    wqEdit.words.splice(+b.dataset.i, 1); renderGrid(); renderWordList();
  });
}

async function saveQuizEditor() {
  const msg = document.getElementById("wq-msg");
  const title = document.getElementById("wq-title").value.trim();
  if (!title) { msg.textContent = "제목을 입력해 주세요."; msg.className = "wq-msg bad"; return; }
  if (!wqEdit.words.length) { msg.textContent = "단어를 하나 이상 추가해 주세요."; msg.className = "wq-msg bad"; return; }
  const p = window.buildPuzzle(wqEdit);
  if (p.conflicts.length) { msg.textContent = "겹치는 글자 충돌을 먼저 해결해 주세요 (빨간 칸)."; msg.className = "wq-msg bad"; return; }
  const data = {
    title, subtitle: document.getElementById("wq-subtitle").value.trim(),
    emojis: document.getElementById("wq-emojis").value.trim() || "🧩",
    rows: wqEdit.rows, cols: wqEdit.cols,
    words: wqEdit.words.map(w => ({ answer: w.answer, dir: w.dir, r: w.r, c: w.c, clue: w.clue || "", emoji: w.emoji || "❓", desc: w.desc || "" })),
  };
  const btn = document.getElementById("wq-save");
  btn.disabled = true; btn.textContent = "저장 중…";
  try {
    await window.saveQuiz(wqEdit.id, data);
    await loadWordQuizzes();
  } catch (e) {
    btn.disabled = false; btn.textContent = "저장하기";
    msg.textContent = "저장에 실패했어요. 보안 규칙(관리자 write 허용)을 확인해 주세요."; msg.className = "wq-msg bad";
  }
}

function begin() {
  if (!window.AUTH_ENABLED) { gate("Firebase 설정이 필요해요.", "err"); return; }
  window.watchAuth((user) => {
    if (!user) { loginPrompt(); return; }
    if (window.isAdmin && window.isAdmin()) loadAdmin();
    else gate("이 화면은 <b>관리자</b>만 볼 수 있어요.<br>관리자 계정으로 로그인해 주세요.", "err");
  });
}

if (window.AUTH_READY) begin();
else window.addEventListener("auth-ready", begin, { once: true });
