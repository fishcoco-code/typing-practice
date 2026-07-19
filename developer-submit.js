const submissionApp = document.querySelector("#submissionApp");
const submissionForm = document.querySelector("#submissionForm");
const submissionReady = document.querySelector("#submissionReady");
const issueLink = document.querySelector("#issueLink");

submissionForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.querySelector("#submitName").value.trim();
  const storeUrl = document.querySelector("#submitUrl").value.trim();
  const stage = document.querySelector("#submitStage").value;
  const servicePackage = document.querySelector("#submitPackage").value;
  const contact = document.querySelector("#submitContact").value.trim();
  const intro = document.querySelector("#submitIntro").value.trim();
  const title = `[游戏提交] ${name}`;
  const body = [
    "## 游戏资料",
    "",
    `- 游戏名称：${name}`,
    `- 商店/官网：${storeUrl}`,
    `- 上线阶段：${stage}`,
    `- 服务意向：${servicePackage}`,
    `- 联系方式：${contact}`,
    "",
    "## 游戏介绍",
    "",
    intro,
  ].join("\n");
  const issueUrl = new URL("https://github.com/fishcoco-code/typing-practice/issues/new");
  issueUrl.searchParams.set("title", title);
  issueUrl.searchParams.set("body", body);

  submissionApp.dataset.submitState = "ready";
  submissionApp.dataset.issueTitle = title;
  issueLink.href = issueUrl.toString();
  submissionReady.hidden = false;
  issueLink.focus();
});
