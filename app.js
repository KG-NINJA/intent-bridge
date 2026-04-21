const steps = [
  {
    key: "goal",
    title: "まず、何を実現したいですか？",
    help: "最終的にほしい成果を短く書きます。",
    choices: ["企画書を作りたい", "メールを書きたい", "プレゼンを作りたい", "依頼文を整理したい"],
    placeholder: "例: 営業向けの提案資料を作りたい",
  },
  {
    key: "audience",
    title: "それは誰に向けたものですか？",
    help: "相手が変わると、言葉づかいと構成が変わります。",
    choices: ["社内メンバー", "顧客", "上司", "不特定多数"],
    placeholder: "例: 社内の営業チーム",
  },
  {
    key: "context",
    title: "背景や状況を教えてください",
    help: "なぜ必要か、今どんな状況かを書くと出力が強くなります。",
    choices: ["初回提案", "既存案件の改善", "急ぎ対応", "情報整理から始めたい"],
    placeholder: "例: 来週の営業会議で使う。相手は新規見込み客で、専門知識はあまりない。",
  },
  {
    key: "tone",
    title: "どんな雰囲気で伝えたいですか？",
    help: "やさしい、簡潔、信頼感重視などを決めます。",
    choices: ["やさしい", "信頼感重視", "簡潔", "熱量高め"],
    placeholder: "例: やさしく親しみやすく",
  },
  {
    key: "constraints",
    title: "外せない条件はありますか？",
    help: "禁止事項、文字数、含めるべき要素などを書きます。",
    choices: ["専門用語を減らす", "短くまとめる", "数字を入れる", "丁寧語にする"],
    placeholder: "例: 5分で読める長さ、専門用語は少なめ",
  },
  {
    key: "deadline",
    title: "いつまでに必要ですか？",
    help: "締切があると出力の粒度を調整できます。",
    choices: ["今日中", "今週中", "今月中", "未定"],
    placeholder: "例: 2026-04-25",
  },
  {
    key: "output_format",
    title: "最終的にどんな形で出したいですか？",
    help: "他AIに何を作らせたいかを選びます。",
    choices: ["slides", "email", "document", "task_request"],
    placeholder: "例: slides",
  },
];

const TEMPLATE_MAP = {
  slides: {
    label: "プレゼン用",
    instructions: [
      "見出し構成から作ること",
      "各スライドに要点と話す内容を分けて書くこと",
      "相手が理解しやすい順序にすること",
    ],
  },
  email: {
    label: "メール用",
    instructions: [
      "件名から作ること",
      "最初の3行で要件が伝わるようにすること",
      "そのまま送れる自然な文面にすること",
    ],
  },
  document: {
    label: "文書用",
    instructions: [
      "見出し付きの本文にすること",
      "背景、要点、次の行動を明確にすること",
      "そのまま下書きとして使える密度にすること",
    ],
  },
  task_request: {
    label: "依頼文用",
    instructions: [
      "依頼内容、目的、期限、期待成果を明記すること",
      "相手が動きやすい順番で整理すること",
      "曖昧な表現を減らすこと",
    ],
  },
};

const state = {
  stepIndex: 0,
  answers: {
    goal: "",
    audience: "",
    context: "",
    tone: "",
    constraints: [],
    deadline: "",
    output_format: "",
  },
  lastPrompt: "",
};

const questionTitle = document.getElementById("questionTitle");
const questionHelp = document.getElementById("questionHelp");
const choiceList = document.getElementById("choiceList");
const freeText = document.getElementById("freeText");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const jsonOutput = document.getElementById("jsonOutput");
const validationList = document.getElementById("validationList");
const progressLabel = document.getElementById("progressLabel");
const copyBtn = document.getElementById("copyBtn");
const generateBtn = document.getElementById("generateBtn");
const copyPromptBtn = document.getElementById("copyPromptBtn");
const resultStatus = document.getElementById("resultStatus");
const resultOutput = document.getElementById("resultOutput");

function normalizeValue(stepKey, value) {
  if (stepKey === "constraints") {
    return value
      .split(/[\n,、]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value.trim();
}

function currentStep() {
  return steps[state.stepIndex];
}

function renderStep() {
  const step = currentStep();
  const existing = state.answers[step.key];

  questionTitle.textContent = step.title;
  questionHelp.textContent = step.help;
  progressLabel.textContent = `${state.stepIndex + 1} / ${steps.length}`;
  freeText.placeholder = step.placeholder;
  freeText.value = Array.isArray(existing) ? existing.join("、") : existing;

  choiceList.innerHTML = "";
  step.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";

    const currentValue = Array.isArray(existing) ? existing.join(" ") : existing;
    if (currentValue.includes(choice)) {
      button.classList.add("active");
    }

    button.textContent = choice;
    button.addEventListener("click", () => {
      if (step.key === "constraints") {
        const current = Array.isArray(state.answers.constraints) ? [...state.answers.constraints] : [];
        state.answers.constraints = current.includes(choice)
          ? current.filter((item) => item !== choice)
          : [...current, choice];
        freeText.value = state.answers.constraints.join("、");
      } else {
        state.answers[step.key] = choice;
        freeText.value = choice;
      }

      renderStep();
      renderJson();
    });

    choiceList.appendChild(button);
  });

  prevBtn.disabled = state.stepIndex === 0;
  nextBtn.textContent = state.stepIndex === steps.length - 1 ? "確認" : "次へ";
}

function commitStep() {
  const step = currentStep();
  state.answers[step.key] = normalizeValue(step.key, freeText.value);
}

function buildPayload() {
  return {
    goal: state.answers.goal,
    audience: state.answers.audience,
    context: state.answers.context,
    tone: state.answers.tone,
    constraints: state.answers.constraints,
    deadline: state.answers.deadline,
    output_format: state.answers.output_format,
  };
}

function getMissingFields(payload) {
  const required = ["goal", "audience", "context", "tone", "deadline", "output_format"];
  return required.filter((key) => !payload[key] || (Array.isArray(payload[key]) && payload[key].length === 0));
}

function renderJson() {
  const payload = buildPayload();
  jsonOutput.textContent = JSON.stringify(payload, null, 2);

  const validations = [
    ["goal", "目的"],
    ["audience", "対象"],
    ["context", "背景"],
    ["tone", "トーン"],
    ["deadline", "期限"],
    ["output_format", "出力形式"],
  ];

  validationList.innerHTML = "";
  validations.forEach(([key, label]) => {
    const li = document.createElement("li");
    const ok = Array.isArray(payload[key]) ? payload[key].length > 0 : Boolean(payload[key]);
    li.className = ok ? "ok" : "warn";
    li.textContent = ok ? `${label}: 入力済み` : `${label}: 未入力`;
    validationList.appendChild(li);
  });

  const constraintsLi = document.createElement("li");
  constraintsLi.className = payload.constraints.length > 0 ? "ok" : "warn";
  constraintsLi.textContent = payload.constraints.length > 0
    ? `制約: ${payload.constraints.length}件`
    : "制約: 任意";
  validationList.appendChild(constraintsLi);
}

function buildSharePrompt(payload) {
  const template = TEMPLATE_MAP[payload.output_format] || TEMPLATE_MAP.document;
  const constraintText = payload.constraints.length ? payload.constraints.join(", ") : "特になし";

  return [
    `あなたは${template.label}の作成が得意なプロのアシスタントです。`,
    "以下の条件に基づいて、すぐ使える完成度の高い初稿を日本語で作成してください。",
    "",
    "固定ルール:",
    ...template.instructions.map((item) => `- ${item}`),
    "- 情報が不足していても、妥当な前提を置いて止まらずに出力すること",
    "- 受け手に伝わりやすい順番で整理すること",
    "",
    "依頼内容:",
    `- 目的: ${payload.goal}`,
    `- 対象: ${payload.audience}`,
    `- 背景: ${payload.context}`,
    `- トーン: ${payload.tone}`,
    `- 制約: ${constraintText}`,
    `- 期限: ${payload.deadline}`,
    `- 出力形式: ${payload.output_format}`,
    "",
    "構造化データ:",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

function renderGeneratedPrompt(prompt) {
  resultOutput.innerHTML = "";
  const pre = document.createElement("pre");
  pre.textContent = prompt;
  resultOutput.appendChild(pre);
}

function generateSharePackage() {
  commitStep();
  const payload = buildPayload();
  const missing = getMissingFields(payload);

  if (missing.length > 0) {
    resultStatus.textContent = `未入力があります: ${missing.join(", ")}`;
    resultOutput.innerHTML = "";
    state.lastPrompt = "";
    return;
  }

  const prompt = buildSharePrompt(payload);
  state.lastPrompt = prompt;
  resultStatus.textContent = "背景込みの共有用プロンプトを作成しました。別のAIへそのまま貼れます。";
  renderGeneratedPrompt(prompt);
}

prevBtn.addEventListener("click", () => {
  commitStep();
  state.stepIndex = Math.max(0, state.stepIndex - 1);
  renderStep();
  renderJson();
});

nextBtn.addEventListener("click", () => {
  commitStep();
  state.stepIndex = Math.min(steps.length - 1, state.stepIndex + 1);
  renderStep();
  renderJson();
});

copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(jsonOutput.textContent);
  copyBtn.textContent = "コピー済み";
  setTimeout(() => {
    copyBtn.textContent = "JSONをコピー";
  }, 1200);
});

generateBtn.addEventListener("click", () => {
  generateBtn.disabled = true;
  generateBtn.textContent = "作成中...";
  try {
    generateSharePackage();
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "共有文を作る";
  }
});

copyPromptBtn.addEventListener("click", async () => {
  if (!state.lastPrompt) {
    resultStatus.textContent = "先に共有文を作ってください。";
    return;
  }

  await navigator.clipboard.writeText(state.lastPrompt);
  copyPromptBtn.textContent = "コピー済み";
  setTimeout(() => {
    copyPromptBtn.textContent = "共有文をコピー";
  }, 1200);
});

renderStep();
renderJson();
