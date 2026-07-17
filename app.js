const passages = window.typingPassages;

const keyboardRows = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
  [" "],
];

const keyGuides = {
  q: { hand: "左手", finger: "小指", home: "A" },
  a: { hand: "左手", finger: "小指", home: "A" },
  z: { hand: "左手", finger: "小指", home: "A" },
  w: { hand: "左手", finger: "无名指", home: "S" },
  s: { hand: "左手", finger: "无名指", home: "S" },
  x: { hand: "左手", finger: "无名指", home: "S" },
  e: { hand: "左手", finger: "中指", home: "D" },
  d: { hand: "左手", finger: "中指", home: "D" },
  c: { hand: "左手", finger: "中指", home: "D" },
  r: { hand: "左手", finger: "食指", home: "F" },
  f: { hand: "左手", finger: "食指", home: "F" },
  v: { hand: "左手", finger: "食指", home: "F" },
  t: { hand: "左手", finger: "食指", home: "F" },
  g: { hand: "左手", finger: "食指", home: "F" },
  b: { hand: "左手", finger: "食指", home: "F" },
  y: { hand: "右手", finger: "食指", home: "J" },
  h: { hand: "右手", finger: "食指", home: "J" },
  n: { hand: "右手", finger: "食指", home: "J" },
  u: { hand: "右手", finger: "食指", home: "J" },
  j: { hand: "右手", finger: "食指", home: "J" },
  m: { hand: "右手", finger: "食指", home: "J" },
  i: { hand: "右手", finger: "中指", home: "K" },
  k: { hand: "右手", finger: "中指", home: "K" },
  ",": { hand: "右手", finger: "中指", home: "K" },
  o: { hand: "右手", finger: "无名指", home: "L" },
  l: { hand: "右手", finger: "无名指", home: "L" },
  ".": { hand: "右手", finger: "无名指", home: "L" },
  p: { hand: "右手", finger: "小指", home: ";" },
  ";": { hand: "右手", finger: "小指", home: ";" },
  "/": { hand: "右手", finger: "小指", home: ";" },
  " ": { hand: "双手", finger: "拇指", home: "空格" },
};

const fingerClassNames = {
  小指: "pinky",
  无名指: "ring",
  中指: "middle",
  食指: "index",
  拇指: "thumb",
};

const elements = {
  accuracy: document.querySelector("#accuracy"),
  calibration: document.querySelector("#calibration"),
  calibrationF: document.querySelector("#calibrationF"),
  calibrationInstruction: document.querySelector("#calibrationInstruction"),
  calibrationJ: document.querySelector("#calibrationJ"),
  calibrationStatus: document.querySelector("#calibrationStatus"),
  fingerName: document.querySelector("#fingerName"),
  keyboardStatus: document.querySelector("#keyboardStatus"),
  mappingHint: document.querySelector("#mappingHint"),
  mappingKey: document.querySelector("#mappingKey"),
  nextButton: document.querySelector("#nextButton"),
  nextKey: document.querySelector("#nextKey"),
  practiceContent: document.querySelector("#practiceContent"),
  prompt: document.querySelector("#prompt"),
  resetButton: document.querySelector("#resetButton"),
  result: document.querySelector("#result"),
  resultText: document.querySelector("#resultText"),
  returnHint: document.querySelector("#returnHint"),
  startHint: document.querySelector("#startHint"),
  themeButton: document.querySelector("#themeButton"),
  time: document.querySelector("#time"),
  typingArea: document.querySelector("#typingArea"),
  typingInput: document.querySelector("#typingInput"),
  virtualKeyboard: document.querySelector("#virtualKeyboard"),
  wpm: document.querySelector("#wpm"),
};

const keyboardKeys = new Map();
const handFingers = Array.from(document.querySelectorAll(".finger-shape"));
let passageIndex = 0;
let typedValue = "";
let startedAt = null;
let timerId = null;
let mistakes = 0;
let totalKeystrokes = 0;
let correctKeystrokes = 0;
let calibrationStep = 0;
let isCalibrating = true;
let calibrationDelayId = null;
let feedbackDelayId = null;

function getPassage() {
  return passages[passageIndex];
}

function getFingerGroup(guide) {
  if (guide.hand === "双手") return "thumb";
  const handName = guide.hand === "左手" ? "left" : "right";
  return `${handName}-${fingerClassNames[guide.finger]}`;
}

function createKeyboard() {
  const rows = keyboardRows.map((rowKeys) => {
    const row = document.createElement("div");
    row.className = "keyboard-row";

    rowKeys.forEach((key) => {
      const guide = keyGuides[key];
      const keyElement = document.createElement("span");
      keyElement.className = "virtual-key";
      keyElement.classList.add(guide.hand === "左手" ? "left" : "right");
      keyElement.classList.add(`finger-group-${getFingerGroup(guide)}`);
      keyElement.dataset.key = key;
      keyElement.textContent = key === " " ? "空格" : key;

      if (key === "f" || key === "j") keyElement.classList.add("home");
      if (key === " ") keyElement.classList.add("space");

      keyboardKeys.set(key, keyElement);
      row.append(keyElement);
    });

    return row;
  });

  elements.virtualKeyboard.replaceChildren(...rows);
}

function renderPrompt() {
  const passage = getPassage();
  elements.prompt.replaceChildren(
    ...Array.from(passage, (character, index) => {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = character;

      if (index < typedValue.length) {
        span.classList.add(typedValue[index] === character ? "correct" : "incorrect");
      } else if (index === typedValue.length) {
        span.classList.add("current");
      }

      return span;
    }),
  );
}

function renderFingerGuide() {
  keyboardKeys.forEach((keyElement) => keyElement.classList.remove("target"));
  handFingers.forEach((fingerElement) => fingerElement.classList.remove("active"));
  const target = getPassage()[typedValue.length];

  if (!target) {
    elements.nextKey.textContent = "✓";
    elements.fingerName.textContent = "本段完成";
    elements.returnHint.textContent = "双手放松";
    elements.mappingHint.textContent = "练习完成";
    elements.mappingKey.textContent = "✓";
    return;
  }

  const guide = keyGuides[target];
  const targetKey = keyboardKeys.get(target);
  if (targetKey) targetKey.classList.add("target");
  handFingers
    .filter(
      (fingerElement) =>
        fingerElement.dataset.hand === guide.hand &&
        fingerElement.dataset.finger === guide.finger,
    )
    .forEach((fingerElement) => fingerElement.classList.add("active"));

  elements.nextKey.textContent = target === " " ? "␣" : target;
  elements.fingerName.textContent = `${guide.hand}${guide.finger}`;
  elements.mappingHint.textContent = `${guide.hand}${guide.finger}`;
  elements.mappingKey.textContent = `${target === " " ? "空格" : target.toUpperCase()} 键`;
  elements.returnHint.textContent =
    target === " "
      ? "双手保持在基准键位"
      : target.toUpperCase() === guide.home
        ? `手指留在 ${guide.home}`
        : `按完回到 ${guide.home}`;
  elements.keyboardStatus.classList.remove("error");
  elements.keyboardStatus.textContent = `请用${guide.hand}${guide.finger}按 ${target === " " ? "空格" : target.toUpperCase()}`;
}

function showWrongKey(actual, expected) {
  window.clearTimeout(feedbackDelayId);
  const wrongKey = keyboardKeys.get(actual.toLowerCase());
  const guide = keyGuides[expected];
  if (wrongKey) wrongKey.classList.add("wrong");

  elements.keyboardStatus.classList.add("error");
  elements.keyboardStatus.textContent = `按错了：目标是 ${expected === " " ? "空格" : expected.toUpperCase()}，请使用${guide.hand}${guide.finger}`;

  feedbackDelayId = window.setTimeout(() => {
    if (wrongKey) wrongKey.classList.remove("wrong");
    renderFingerGuide();
  }, 900);
}

function getElapsedSeconds() {
  return startedAt ? Math.max(1, (Date.now() - startedAt) / 1000) : 0;
}

function getCorrectCharacters() {
  return Array.from(typedValue).reduce(
    (total, character, index) => total + Number(character === getPassage()[index]),
    0,
  );
}

function updateStats() {
  const elapsedSeconds = getElapsedSeconds();
  const accuracy = totalKeystrokes
    ? Math.round((correctKeystrokes / totalKeystrokes) * 100)
    : 100;
  const wpm = elapsedSeconds
    ? Math.round(getCorrectCharacters() / 5 / (elapsedSeconds / 60))
    : 0;

  const wholeSeconds = Math.floor(elapsedSeconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const seconds = String(wholeSeconds % 60).padStart(2, "0");

  elements.wpm.textContent = String(wpm);
  elements.accuracy.textContent = `${accuracy}%`;
  elements.time.textContent = `${minutes}:${seconds}`;
}

function startTimer() {
  if (startedAt) return;
  startedAt = Date.now();
  elements.startHint.classList.add("hidden");
  timerId = window.setInterval(updateStats, 250);
}

function finishPractice() {
  window.clearInterval(timerId);
  timerId = null;
  updateStats();
  elements.resultText.textContent = `${elements.wpm.textContent} WPM · ${elements.accuracy.textContent} 正确率 · ${mistakes} 次错误`;
  elements.result.hidden = false;
  elements.typingInput.blur();
}

function handleInput() {
  const passage = getPassage();
  const previousLength = typedValue.length;
  const nextValue = elements.typingInput.value.slice(0, passage.length);
  let lastAttempt = null;

  if (nextValue.length > previousLength) {
    startTimer();
    for (let index = previousLength; index < nextValue.length; index += 1) {
      const actual = nextValue[index];
      const expected = passage[index];
      const isCorrect = actual === expected;
      totalKeystrokes += 1;
      correctKeystrokes += Number(isCorrect);
      mistakes += Number(!isCorrect);
      lastAttempt = { actual, expected, isCorrect };
    }
  }

  typedValue = nextValue;
  elements.typingInput.value = typedValue;
  renderPrompt();
  renderFingerGuide();
  updateStats();

  if (lastAttempt && !lastAttempt.isCorrect) {
    showWrongKey(lastAttempt.actual, lastAttempt.expected);
  }

  if (typedValue.length === passage.length) finishPractice();
}

function focusInput() {
  if (isCalibrating || !elements.result.hidden) return;
  elements.typingInput.focus({ preventScroll: true });
}

function setCalibrationInstruction(prefix, key) {
  const keyElement = document.createElement("kbd");
  keyElement.textContent = key;
  elements.calibrationInstruction.replaceChildren(prefix, keyElement);
}

function beginCalibration() {
  window.clearTimeout(calibrationDelayId);
  calibrationStep = 0;
  isCalibrating = true;
  elements.calibration.hidden = false;
  elements.practiceContent.hidden = true;
  elements.calibrationF.classList.remove("done");
  elements.calibrationJ.classList.remove("done", "target");
  elements.calibrationF.classList.add("target");
  elements.calibrationStatus.classList.remove("error");
  elements.calibrationStatus.textContent = "不用看键盘，用食指触摸凸点。";
  setCalibrationInstruction("左手食指按一下 ", "F");
  elements.typingInput.blur();
}

function completeCalibration() {
  isCalibrating = false;
  elements.calibration.hidden = true;
  elements.practiceContent.hidden = false;
  elements.startHint.classList.remove("hidden");
  renderPrompt();
  renderFingerGuide();
  focusInput();
}

function handleCalibrationKey(event) {
  if (event.key.length !== 1 || calibrationStep > 1) return;
  const pressedKey = event.key.toLowerCase();
  const expectedKey = calibrationStep === 0 ? "f" : "j";

  event.preventDefault();
  if (pressedKey !== expectedKey) {
    elements.calibrationStatus.classList.add("error");
    elements.calibrationStatus.textContent = `现在请按 ${expectedKey.toUpperCase()}，找到键帽上的小凸点。`;
    elements.calibration.classList.remove("shake");
    requestAnimationFrame(() => elements.calibration.classList.add("shake"));
    return;
  }

  elements.calibrationStatus.classList.remove("error");
  if (calibrationStep === 0) {
    elements.calibrationF.classList.remove("target");
    elements.calibrationF.classList.add("done");
    elements.calibrationJ.classList.add("target");
    elements.calibrationStatus.textContent = "很好，左手已经归位。";
    setCalibrationInstruction("右手食指按一下 ", "J");
    calibrationStep = 1;
    return;
  }

  elements.calibrationJ.classList.remove("target");
  elements.calibrationJ.classList.add("done");
  elements.calibrationStatus.textContent = "双手已归位，保持这个位置。";
  setCalibrationInstruction("校准完成 ", "✓");
  calibrationStep = 2;
  calibrationDelayId = window.setTimeout(completeCalibration, 450);
}

function resetPractice() {
  window.clearInterval(timerId);
  window.clearTimeout(feedbackDelayId);
  timerId = null;
  typedValue = "";
  startedAt = null;
  mistakes = 0;
  totalKeystrokes = 0;
  correctKeystrokes = 0;
  elements.typingInput.value = "";
  elements.result.hidden = true;
  keyboardKeys.forEach((keyElement) => keyElement.classList.remove("target", "wrong"));
  renderPrompt();
  updateStats();
  beginCalibration();
}

function nextPassage() {
  passageIndex = (passageIndex + 1) % passages.length;
  resetPractice();
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("typing-theme", theme);
  elements.themeButton.setAttribute(
    "aria-label",
    theme === "dark" ? "切换浅色模式" : "切换深色模式",
  );
}

function initializeTheme() {
  const savedTheme = localStorage.getItem("typing-theme");
  const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  setTheme(savedTheme || preferredTheme);
}

elements.typingArea.addEventListener("click", focusInput);
elements.typingArea.addEventListener("focus", focusInput);
elements.typingInput.addEventListener("input", handleInput);
elements.resetButton.addEventListener("click", resetPractice);
elements.nextButton.addEventListener("click", nextPassage);
elements.themeButton.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
});

document.addEventListener("keydown", (event) => {
  if (isCalibrating) {
    handleCalibrationKey(event);
    return;
  }

  const isButton = event.target instanceof HTMLButtonElement;
  if (!isButton && event.key.length === 1) focusInput();
  if (event.key === "Escape") resetPractice();
});

initializeTheme();
createKeyboard();
resetPractice();
