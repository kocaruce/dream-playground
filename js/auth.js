// 꿈 놀이터 로그인 (Firebase Auth).
// 카페 키오스크와 '같은 Firebase 프로젝트 + 같은 주소(origin)'를 쓰므로,
// 여기서 로그인하면 키오스크 관리화면 세션도 함께 공유됩니다.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const cfg = window.FIREBASE_CONFIG || {};
const configured = cfg.apiKey && !String(cfg.apiKey).startsWith("여기에");

let auth = null;
if (configured) {
  try {
    auth = getAuth(initializeApp(cfg));
  } catch (e) {
    console.error("[auth] Firebase 초기화 실패:", e);
  }
} else {
  console.warn("[auth] Firebase 설정이 없어 로그인 잠금이 꺼져 있습니다.");
}

window.AUTH_ENABLED = !!auth;
window.watchAuth = (cb) => { if (auth) onAuthStateChanged(auth, cb); };
window.signIn = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
window.signOutUser = () => signOut(auth);

window.AUTH_READY = true;
window.dispatchEvent(new Event("auth-ready"));
