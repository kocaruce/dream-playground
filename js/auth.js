// 꿈 놀이터 로그인/가입 (Firebase Auth + 프로필 저장).
// 구글 · 이메일 로그인. 처음 로그인하면 선생님 프로필을 받아 users/{uid} 에 저장.
// 카페 키오스크와 같은 Firebase 프로젝트 + 같은 주소라 로그인 세션이 공유됩니다.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const cfg = window.FIREBASE_CONFIG || {};
const configured = cfg.apiKey && !String(cfg.apiKey).startsWith("여기에");

let auth = null, db = null;
if (configured) {
  try {
    const app = initializeApp(cfg);
    auth = getAuth(app);
    db = getDatabase(app);
  } catch (e) {
    console.error("[auth] Firebase 초기화 실패:", e);
  }
} else {
  console.warn("[auth] Firebase 설정이 없어 로그인 잠금이 꺼져 있습니다.");
}

window.AUTH_ENABLED = !!auth;
window.watchAuth = (cb) => { if (auth) onAuthStateChanged(auth, cb); };

window.signInEmail = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
window.signUpEmail = (email, pw) => createUserWithEmailAndPassword(auth, email, pw);
window.signInGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
window.signOutUser = () => signOut(auth);

// 선생님 프로필 (users/{uid})
window.getProfile = async (uid) => {
  const snap = await get(ref(db, "users/" + uid));
  return snap.exists() ? snap.val() : null;
};
window.saveProfile = (uid, data) => set(ref(db, "users/" + uid), data);

window.AUTH_READY = true;
window.dispatchEvent(new Event("auth-ready"));
