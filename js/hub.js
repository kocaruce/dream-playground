// 계좌번호 복사 · 후원 자기기록 · 토스트

const toast = document.getElementById("toast");
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2000);
}

// 계좌번호 복사
document.querySelectorAll(".acct").forEach(b => {
  b.onclick = async () => {
    const acct = b.dataset.acct;
    try {
      await navigator.clipboard.writeText(acct);
      showToast("계좌번호를 복사했어요");
    } catch (e) {
      showToast(acct);
    }
  };
});

// 후원 자기기록: 후원을 마친 선생님이 스스로 기록을 남김
const recordBtn = document.getElementById("record-btn");
if (recordBtn) {
  recordBtn.addEventListener("click", async () => {
    const user = window.getCurrentUser && window.getCurrentUser();
    if (!user || !window.recordDonation) { showToast("로그인 후 이용해 주세요"); return; }
    recordBtn.disabled = true;
    let profile = {};
    try { profile = (await window.getProfile(user.uid)) || {}; } catch (e) {}
    try {
      await window.recordDonation({
        uid: user.uid,
        name: profile.name || (user.email ? user.email.split("@")[0] : "선생님"),
        orgName: profile.orgName || "",
        region: profile.region || "",
        affiliation: profile.affiliation || "",
        email: user.email || "",
        at: Date.now(),
        method: "kakaopay",
      });
      recordBtn.textContent = "기록했어요! 감사합니다 💚";
      showToast("후원 기록을 남겼어요. 감사합니다! 💚");
    } catch (e) {
      recordBtn.disabled = false;
      showToast("기록에 실패했어요. 잠시 후 다시 시도해 주세요");
    }
  });
}
