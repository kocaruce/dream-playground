// 계좌번호 복사 + 간단한 안내 토스트
const toast = document.getElementById("toast");
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 1800);
}

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

// 카카오페이 후원 버튼 — 링크가 준비되면 여기에 연결 (지금은 안내만)
document.getElementById("kakao-btn").addEventListener("click", (e) => {
  e.preventDefault();
  showToast("카카오페이 링크 연결 예정이에요");
});
