// 마이페이지: 프로필 수정 · 로그아웃 · 회원 탈퇴.
// 우측 상단 계정칩을 누르면 열립니다.

(function () {
  const REGIONS = ["서울","부산","대구","인천","광주","대전","울산","세종",
    "경기","강원","충북","충남","전북","전남","경북","경남","제주"];

  function toast(msg) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.hidden = true; }, 1800);
  }

  function close() {
    const ov = document.getElementById("mypage-overlay");
    if (ov) ov.remove();
  }

  window.openMyPage = async function () {
    const user = window.getCurrentUser && window.getCurrentUser();
    if (!user) return;
    let profile = {};
    try { profile = (await window.getProfile(user.uid)) || {}; } catch (e) {}

    const sel = (id, val, opts) => opts.map(o =>
      `<option${o === val ? " selected" : ""}>${o}</option>`).join("");
    const regionOpts = `<option value="" ${profile.region ? "" : "selected"} disabled>지역 (시/도)</option>` +
      REGIONS.map(r => `<option${r === profile.region ? " selected" : ""}>${r}</option>`).join("");

    const ov = document.createElement("div");
    ov.id = "mypage-overlay";
    ov.innerHTML = `
      <div class="mypage-card">
        <div class="mypage-head">
          <h2>마이페이지</h2>
          <button class="mypage-x" id="mp-close" aria-label="닫기">✕</button>
        </div>
        <p class="mypage-email">${user.email || ""}</p>

        <form id="mp-form">
          <label>선생님 이름</label>
          <input id="mp-name" type="text" value="${profile.name || ""}" required>
          <label>소속</label>
          <select id="mp-aff" required>
            <option value="" disabled ${profile.affiliation ? "" : "selected"}>소속 유형</option>
            ${sel("mp", profile.affiliation, ["유치원","어린이집","프리랜스","기타"])}
          </select>
          <label>지역</label>
          <select id="mp-region" required>${regionOpts}</select>
          <label>원 이름</label>
          <input id="mp-org" type="text" value="${profile.orgName || ""}" placeholder="예: 꿈터유치원">
          <button type="submit" class="mypage-save" id="mp-save">저장하기</button>
        </form>

        <div class="mypage-divider"></div>
        <button class="mypage-logout" id="mp-logout">로그아웃</button>
        <button class="mypage-delete" id="mp-delete">회원 탈퇴</button>
        <p class="mypage-err" id="mp-err"></p>
      </div>`;
    document.body.appendChild(ov);

    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    ov.querySelector("#mp-close").onclick = close;

    // 저장
    ov.querySelector("#mp-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        name: ov.querySelector("#mp-name").value.trim(),
        affiliation: ov.querySelector("#mp-aff").value,
        region: ov.querySelector("#mp-region").value,
        orgName: ov.querySelector("#mp-org").value.trim(),
        email: user.email || "",
        createdAt: profile.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      const btn = ov.querySelector("#mp-save");
      btn.disabled = true; btn.textContent = "저장 중…";
      try {
        await window.saveProfile(user.uid, data);
        const chip = document.getElementById("account-btn");
        if (chip) chip.innerHTML = `<span class="dot"></span>${data.name} 선생님`;
        toast("저장했어요");
        close();
      } catch (ex) {
        btn.disabled = false; btn.textContent = "저장하기";
        ov.querySelector("#mp-err").textContent = "저장에 실패했어요. 잠시 후 다시 시도해 주세요.";
      }
    });

    // 로그아웃
    ov.querySelector("#mp-logout").onclick = async () => {
      await window.signOutUser(); location.reload();
    };

    // 회원 탈퇴
    ov.querySelector("#mp-delete").onclick = () => deleteFlow(ov);
  };

  async function deleteFlow(ov) {
    const err = ov.querySelector("#mp-err");
    err.textContent = "";
    if (!confirm("정말 탈퇴할까요?\n입력하신 정보가 삭제되며 되돌릴 수 없어요.")) return;

    try {
      await window.deleteAccount();
      done();
    } catch (e) {
      if (e && e.code === "auth/requires-recent-login") {
        try {
          await reauth(ov);
          await window.deleteUserOnly();
          done();
        } catch (re) {
          if (re && re.code === "auth/popup-closed-by-user") { err.textContent = ""; return; }
          err.textContent = "본인 확인에 실패했어요. 다시 시도해 주세요.";
        }
      } else {
        err.textContent = "탈퇴 처리에 실패했어요. 잠시 후 다시 시도해 주세요.";
      }
    }
  }

  // 최근 로그인이 필요할 때 재인증
  async function reauth(ov) {
    const provider = window.providerId ? window.providerId() : "";
    if (provider === "google.com") {
      await window.reauthGoogle();
    } else {
      const pw = prompt("보안을 위해 비밀번호를 다시 입력해 주세요.");
      if (pw === null) throw { code: "auth/popup-closed-by-user" };
      await window.reauthEmail(pw);
    }
  }

  function done() {
    alert("탈퇴가 완료되었어요. 그동안 이용해 주셔서 감사합니다.");
    location.reload();
  }
})();
