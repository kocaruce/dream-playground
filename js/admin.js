// 관리자 화면: 가입 선생님 목록 + 후원 기록. (99p 관리자만 접근)

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

async function loadAdmin() {
  gate("불러오는 중…");
  let users = [], dons = [];
  try {
    users = await window.adminGetUsers();
    dons = await window.adminGetDonations();
  } catch (e) {
    gate("데이터를 불러오지 못했어요. 잠시 후 새로고침해 주세요.", "err");
    return;
  }

  document.getElementById("admin-gate").hidden = true;
  document.getElementById("admin-content").hidden = false;

  users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  dons.sort((a, b) => (b.at || 0) - (a.at || 0));

  document.getElementById("stat-users").textContent = users.length;
  document.getElementById("stat-dons").textContent = dons.length;
  document.getElementById("count-users").textContent = `(${users.length}명)`;
  document.getElementById("count-dons").textContent = `(${dons.length}건)`;

  const utb = document.querySelector("#users-table tbody");
  utb.innerHTML = users.length ? users.map(u => `
    <tr>
      <td>${esc(u.name)}</td>
      <td>${esc(u.affiliation)}</td>
      <td>${esc(u.region)}</td>
      <td>${esc(u.orgName) || "–"}</td>
      <td class="mono">${esc(u.email)}</td>
      <td class="mono">${fmtDate(u.createdAt)}</td>
    </tr>`).join("") : `<tr><td colspan="6" class="empty">아직 가입한 선생님이 없어요.</td></tr>`;

  const dtb = document.querySelector("#dons-table tbody");
  dtb.innerHTML = dons.length ? dons.map(d => `
    <tr>
      <td class="mono">${fmtDate(d.at)}</td>
      <td>${esc(d.name)}</td>
      <td>${esc([d.affiliation, d.orgName].filter(Boolean).join(" · ")) || "–"}</td>
      <td>${esc(d.region) || "–"}</td>
      <td>${esc(d.method === "kakaopay" ? "카카오페이" : d.method) || "–"}</td>
    </tr>`).join("") : `<tr><td colspan="5" class="empty">아직 후원 기록이 없어요.</td></tr>`;
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
