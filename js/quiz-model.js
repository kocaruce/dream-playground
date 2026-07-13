// 낱말 퀴즈 데이터 모델 (놀이 화면·관리자 공용, 순수 함수).
// 퀴즈는 "격자에 배치한 단어 목록"으로 저장하고, 격자/번호/힌트카드는 여기서 생성한다.
//
// quiz = {
//   title, subtitle, emojis, rows, cols,
//   words: [{ answer, dir:'가로'|'세로', r, c, clue, emoji, desc }]
// }
(function () {
  const key = (r, c) => r + "_" + c;

  // 단어 하나가 차지하는 칸 좌표들
  function cellsOfWord(w) {
    const out = [];
    const chars = [...String(w.answer || "")];
    for (let i = 0; i < chars.length; i++) {
      const r = w.dir === "세로" ? w.r + i : w.r;
      const c = w.dir === "세로" ? w.c : w.c + i;
      out.push({ r, c, ch: chars[i] });
    }
    return out;
  }

  // 퀴즈 → { rows, cols, cells:[[r,c,ch]], nums:{'r_c':n}, cards:[{n,clues:[...]}], conflicts:[] }
  function buildPuzzle(quiz) {
    const rows = quiz.rows || 8;
    const cols = quiz.cols || 10;
    const words = (quiz.words || []).filter(w => w && w.answer && w.dir);

    // 1) 칸 채우기 + 교차 충돌 검사
    const cellMap = {};        // 'r_c' -> ch
    const conflicts = [];
    words.forEach(w => {
      cellsOfWord(w).forEach(({ r, c, ch }) => {
        if (r < 0 || c < 0 || r >= rows || c >= cols) { conflicts.push({ r, c, ch, reason: "밖" }); return; }
        const k = key(r, c);
        if (cellMap[k] && cellMap[k] !== ch) conflicts.push({ r, c, ch, was: cellMap[k], reason: "교차불일치" });
        cellMap[k] = ch;
      });
    });
    const cells = Object.keys(cellMap).map(k => {
      const [r, c] = k.split("_").map(Number);
      return [r, c, cellMap[k]];
    });

    // 2) 시작 칸 번호 매기기 (읽기 순서: 위→아래, 왼→오)
    const startKeys = [];
    words.forEach(w => { const k = key(w.r, w.c); if (!startKeys.includes(k)) startKeys.push(k); });
    startKeys.sort((a, b) => {
      const [ar, ac] = a.split("_").map(Number), [br, bc] = b.split("_").map(Number);
      return ar - br || ac - bc;
    });
    const nums = {};
    startKeys.forEach((k, i) => { nums[k] = i + 1; });

    // 3) 힌트 카드: 시작 칸(번호)별로 그 칸에서 시작하는 단어들을 묶음 (가로 먼저)
    const cards = startKeys.map(k => {
      const n = nums[k];
      const clues = words
        .filter(w => key(w.r, w.c) === k)
        .sort((a, b) => (a.dir === "가로" ? 0 : 1) - (b.dir === "가로" ? 0 : 1))
        .map(w => ({
          dir: w.dir,
          text: w.clue || "",
          blanks: [...String(w.answer)].length,
          word: w.answer,
          emoji: w.emoji || "❓",
          desc: w.desc || "",
        }));
      return { n, clues };
    });

    return { rows, cols, cells, nums, cards, conflicts };
  }

  // 기본 제공 퀴즈 (기존 식재료 낱말퀴즈를 단어목록 포맷으로)
  const QUIZ_DEFAULT = {
    id: "default-food",
    builtin: true,
    title: "식재료 가로세로 낱말퀴즈",
    subtitle: "우리 친구들과 함께 맛있는 낱말을 찾아봐요!",
    emojis: "🥕 🥬 🍠 🌶️ 🐟 🧂",
    rows: 8, cols: 10,
    words: [
      { answer: "소금", dir: "가로", r: 0, c: 8, clue: "짠맛을 내는 기본 조미료", emoji: "🧂", desc: "요리에 꼭 필요해요" },
      { answer: "소고기", dir: "세로", r: 0, c: 8, clue: "소에서 얻는 붉은 고기", emoji: "🥩", desc: "불고기를 만들어요" },
      { answer: "다시마", dir: "세로", r: 2, c: 5, clue: "감칠맛 국물을 내는 검은 바다풀", emoji: "🌿", desc: "국물이 깊어져요" },
      { answer: "참기름", dir: "가로", r: 2, c: 7, clue: "참깨를 짜서 만든 고소한 기름", emoji: "🫗", desc: "나물 무침에 톡톡" },
      { answer: "참치", dir: "세로", r: 2, c: 7, clue: "통조림으로 즐겨 먹는 큰 바닷물고기", emoji: "🐟", desc: "김밥에 넣어요" },
      { answer: "시금치", dir: "가로", r: 3, c: 5, clue: "철분이 많은 녹색 잎채소, 뽀빠이가 먹던", emoji: "🥬", desc: "힘이 불끈!" },
      { answer: "고구마", dir: "가로", r: 4, c: 3, clue: "달콤한 뿌리채소, 구워 먹어요", emoji: "🍠", desc: "겨울 간식이에요" },
      { answer: "고추장", dir: "세로", r: 4, c: 3, clue: "매운맛을 내는 붉은 발효 양념", emoji: "🌶️", desc: "비빔밥에 쓱쓱" },
      { answer: "양배추", dir: "가로", r: 5, c: 1, clue: "둥글고 단단한 잎채소, 쌈에 싸 먹어요", emoji: "🥬", desc: "아삭아삭" },
      { answer: "양상추", dir: "세로", r: 5, c: 1, clue: "아삭한 잎채소, 샐러드에 넣어요", emoji: "🥗", desc: "햄버거에도" },
      { answer: "장어", dir: "가로", r: 6, c: 3, clue: "기름지고 길쭉한 보양 생선, 구이로", emoji: "🐟", desc: "힘이 솟아요" },
      { answer: "부추", dir: "가로", r: 7, c: 0, clue: "가늘고 긴 잎채소, 전이나 무침에", emoji: "🌱", desc: "부추전이 맛있어요" },
    ],
  };

  window.buildPuzzle = buildPuzzle;
  window.QUIZ_DEFAULT = QUIZ_DEFAULT;
})();
