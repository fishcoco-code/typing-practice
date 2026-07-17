const starterPassages = [
  "small steps every day can lead to remarkable progress over time",
  "focus on accuracy first and your typing speed will naturally follow",
  "the quick brown fox jumps over the lazy dog near the quiet river",
  "practice makes each movement feel easier calmer and more natural",
  "keep your eyes on the screen and let your fingers learn the way",
];

const practiceOpeners = [
  "during a quiet morning session",
  "before the first task of the day",
  "when the room feels calm",
  "at the start of each short lesson",
  "while your shoulders stay relaxed",
  "as the next line appears",
  "during a focused afternoon break",
  "when your hands return to the home row",
  "before you try to type faster",
  "as you settle into a steady pace",
  "during a simple daily routine",
  "when a difficult word appears",
  "after a brief pause to breathe",
  "while you keep your eyes on the screen",
  "at the beginning of a fresh exercise",
  "as both hands find their places",
  "during a careful accuracy drill",
  "when each key feels more familiar",
  "before you begin a longer paragraph",
  "as your confidence slowly grows",
  "during a gentle warm up round",
  "when you notice tension in your hands",
  "after you correct a small mistake",
  "while the rhythm remains even",
  "at the end of a patient practice day",
];

const practiceActions = [
  "keep both hands close to the home row",
  "let each finger move only when needed",
  "press every key with a light touch",
  "return each finger to its starting place",
  "choose accuracy before extra speed",
  "keep your wrists level and comfortable",
  "use the correct finger for every letter",
  "read a few characters ahead",
  "allow a natural rhythm to develop",
  "slow down when a pattern feels uncertain",
  "notice which hand should move next",
  "give every space the same gentle timing",
  "keep your breathing easy and regular",
  "trust the small bumps on the f and j keys",
  "avoid looking down at the keyboard",
  "finish each word before thinking about speed",
  "let the thumb rest lightly near the space bar",
  "guide the index fingers back to f and j",
  "repeat hard combinations without rushing",
  "pause briefly after several clean lines",
  "keep the elbows loose beside the body",
  "listen for an even pattern of keystrokes",
  "correct errors with patience and attention",
  "move from one word to the next smoothly",
  "end the line with the same careful control",
];

const practiceBenefits = [
  "accuracy grows before speed",
  "good habits become automatic",
  "the hands learn a reliable path",
  "difficult letters begin to feel easier",
  "each clean line builds confidence",
  "the eyes can remain on the text",
  "small errors become less frequent",
  "the next session starts more comfortably",
  "every finger gains a clearer role",
  "longer passages feel less tiring",
  "steady timing replaces sudden rushing",
  "the keyboard becomes easier to navigate",
  "common words begin to flow naturally",
  "careful movement protects good posture",
  "a relaxed pace supports better control",
  "repetition turns effort into memory",
  "the mind can focus on meaning",
  "new patterns become easier to remember",
  "consistent practice creates visible progress",
  "calm attention improves every result",
];

const closingStyles = [
  "calm",
  "steady",
  "patient",
  "clear",
  "gentle",
  "careful",
  "focused",
  "balanced",
  "relaxed",
  "smooth",
  "even",
  "quiet",
  "mindful",
  "deliberate",
  "precise",
  "confident",
  "natural",
  "flexible",
  "consistent",
  "measured",
];

const closingGoals = [
  "focus",
  "rhythm",
  "control",
  "attention",
  "accuracy",
  "timing",
  "movement",
  "balance",
  "patience",
  "energy",
  "purpose",
  "awareness",
  "discipline",
  "confidence",
  "comfort",
  "flow",
  "coordination",
  "precision",
  "ease",
  "endurance",
  "curiosity",
  "care",
  "intent",
  "progress",
  "skill",
];

function buildPracticePassage(index) {
  const opener = practiceOpeners[index % practiceOpeners.length];
  const action = practiceActions[(index * 7) % practiceActions.length];
  const benefit = practiceBenefits[(index * 11) % practiceBenefits.length];
  const style = closingStyles[index % closingStyles.length];
  const goal = closingGoals[Math.floor(index / closingStyles.length)];
  const ending = `with ${style} ${goal}`;

  const templates = [
    `${opener}, ${action}; ${benefit}, ${ending}`,
    `${action} ${opener}, and remember that ${benefit}; continue ${ending}`,
    `${opener}, ${benefit} when you ${action}; practice ${ending}`,
    `${benefit} ${opener}; ${action}, then finish ${ending}`,
    `${opener}, take your time and ${action}; ${benefit} through ${ending}`,
    `${action}; ${opener}, this simple choice means ${benefit} with ${ending}`,
    `${opener}, notice how ${benefit}; ${action} and continue ${ending}`,
    `${benefit} when you ${action}; ${opener}, keep working ${ending}`,
    `${opener}, remember to ${action}; over time ${benefit} through ${ending}`,
    `${action} ${opener}; let the lesson show that ${benefit}, always ${ending}`,
  ];

  return templates[index % templates.length];
}

window.typingPassages = [
  ...starterPassages,
  ...Array.from({ length: 500 }, (_, index) => buildPracticePassage(index)),
];
