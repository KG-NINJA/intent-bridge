const steps = [
  {
    key: "goal",
    title: "まず、何を実現したいですか？",
    help: "一番ほしい成果を短く言葉にします。",
    choices: ["企画書を作る", "メールを書く", "プレゼン構成を作る", "依頼文を整理する"],
    placeholder: "例: 営業向けの提案資料を作りたい",
  },
  {
    key: "audience",
    title: "それは誰に向けたものですか？",
    help: "受け手が違うと、AIが選ぶ言葉も変わります。",
    choices: ["社内メンバー", "顧客", "上司", "不特定多数"],
    placeholder: "例: 社内の営業チーム",
  },
  {
    key: "tone",
    title: "どんな雰囲気で伝えたいですか？",
    help: "堅めか、やさしいか、簡潔かを決めます。",
    choices: ["やさしい", "信頼感重視", "簡潔", "熱量高め"],
    placeholder: "例: やさしく親しみやすく",
  },
  {
    key: "constraints",
    title: "外せない条件はありますか？",
    help: "文字数、禁止事項、読み手への配慮などを書きます。",
    choices: ["専門用語を減らす", "短くまとめる", "数字を入れる", "丁寧語にする"],
    placeholder: "例: 5分で読める長さ、専門用語は少なめ",
  },
  {
    key: "deadline",
    title: "いつまでに必要ですか？",
    help: "日付があると、出力の粒度を調整できます。",
    choices: ["今日中", "今週中", "今月中", "未定"],
    placeholder: "例: 2026-04-25",
  },
  {
    key: "output_format",
    title: "最終的にどんな形で出したいですか？",
    help: "AIに作らせる最終成果物を指定します。",
    choices: ["slides", "email", "document", "task_request"],
    placeholder: "例: slides",
  },
];

const state = {
  stepIndex: 0,
  answers: {
    goal: "",
    audience: "",
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
  questionTitle.textContent = step.title;
  questionHelp.textContent = step.help;
  progressLabel.textContent = `${state.stepIndex + 1} / ${steps.length}`;
  freeText.placeholder = step.placeholder;

  const existing = state.answers[step.key];
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
    tone: state.answers.tone,
    constraints: state.answers.constraints,
    deadline: state.answers.deadline,
    output_format: state.answers.output_format,
  };
}

function getMissingFields(payload) {
  const required = ["goal", "audience", "tone", "deadline", "output_format"];
  return required.filter((key) => !payload[key] || (Array.isArray(payload[key]) && payload[key].length === 0));
}

function renderJson() {
  const payload = buildPayload();
  jsonOutput.textContent = JSON.stringify(payload, null, 2);

  const validations = [
    ["goal", "目的"],
    ["audience", "対象"],
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
  return [
    "You are an expert assistant.",
    "Create a high-quality output based on the following user intent.",
    "",
    "Requirements:",
    `- Goal: ${payload.goal}`,
    `- Audience: ${payload.audience}`,
    `- Tone: ${payload.tone}`,
    `- Constraints: ${payload.constraints.length ? payload.constraints.join(", ") : "None"}`,
    `- Deadline: ${payload.deadline}`,
    `- Output format: ${payload.output_format}`,
    "",
    "Instructions:",
    "- Produce an immediately usable first draft.",
    "- Respect all constraints.",
    "- Use the specified tone for the specified audience.",
    "- If details are missing, make reasonable assumptions and keep moving.",
    "",
    "Structured payload:",
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
  resultStatus.textContent = "他のAIにそのまま貼れる共有文を作成しました。";
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
