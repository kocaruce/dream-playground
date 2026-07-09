// 꿈 놀이터 로그인 잠금 화면.
// REQUIRE_LOGIN 이 true 면 로그인해야 허브가 열립니다. (키오스크와 세션 공유)

(function () {
  const body = document.body;

  function reveal() {
    body.classList.remove("locked");
    const ov = document.getElementById("login-overlay");
    if (ov) ov.style.display = "none";
  }

  function setAccount(user) {
    const chip = document.getElementById("account-btn");
    if (!chip || !user) return;
    const label = user.email ? user.email.split("@")[0] : "선생님";
    chip.innerHTML = `<span class="dot"></span>${label} 선생님`;
    chip.title = "눌러서 로그아웃";
    chip.onclick = async () => {
      if (confirm("로그아웃할까요?")) { await window.signOutUser(); location.reload(); }
    };
  }

  function buildOverlay() {
    if (document.getElementById("login-overlay")) return;
    const ov = document.createElement("div");
    ov.id = "login-overlay";
    ov.innerHTML = `
      <form id="login-box" autocomplete="on">
        <div class="login-brand"><span>🌈</span> 꿈 놀이터</div>
        <h2>선생님 로그인</h2>
        <p class="login-sub">로그인하면 놀이 도구를 이용할 수 있어요.</p>
        <input id="login-email" type="email" placeholder="이메일" autocomplete="username" required>
        <input id="login-pw" type="password" placeholder="비밀번호" autocomplete="current-password" required>
        <button type="submit" id="login-btn">로그인</button>
        <p class="login-err" id="login-err"></p>
      </form>`;
    body.appendChild(ov);
    ov.querySelector("#login-box").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = ov.querySelector("#login-email").value.trim();
      const pw = ov.querySelector("#login-pw").value;
      const btn = ov.querySelector("#login-btn");
      const err = ov.querySelector("#login-err");
      err.textContent = "";
      btn.disabled = true; btn.textContent = "확인 중…";
      try {
        await window.signIn(email, pw);
      } catch (ex) {
        err.textContent = "이메일 또는 비밀번호를 확인해 주세요.";
        btn.disabled = false; btn.textContent = "로그인";
      }
    });
  }

  function begin() {
    if (!window.REQUIRE_LOGIN || !window.AUTH_ENABLED || !window.watchAuth) {
      reveal();
      return;
    }
    buildOverlay();
    window.watchAuth((user) => {
      if (user) { setAccount(user); reveal(); }
      else {
        body.classList.add("locked");
        const ov = document.getElementById("login-overlay");
        if (ov) ov.style.display = "flex";
      }
    });
  }

  if (window.AUTH_READY) begin();
  else window.addEventListener("auth-ready", begin, { once: true });
})();
