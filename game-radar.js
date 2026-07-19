const app = document.querySelector("#radarApp");
const updateState = document.querySelector("#updateState");
const gameGrid = document.querySelector("#gameGrid");
const emptyState = document.querySelector("#emptyState");
const loadMore = document.querySelector("#loadMore");
const searchInput = document.querySelector("#searchInput");
const platformSelect = document.querySelector("#platformSelect");
const genreSelect = document.querySelector("#genreSelect");
const sortSelect = document.querySelector("#sortSelect");
const curatedGrid = document.querySelector("#curatedGrid");
const watchFilter = document.querySelector("#watchFilter");
const watchCount = document.querySelector("#watchCount");
const gameDialog = document.querySelector("#gameDialog");
const dialogContent = document.querySelector("#dialogContent");
const dialogClose = document.querySelector("#dialogClose");

function loadWatchedGames() {
  try {
    return new Set(JSON.parse(localStorage.getItem("game-radar-watchlist") || "[]"));
  } catch {
    return new Set();
  }
}

const state = {
  data: null,
  status: "all",
  platform: "all",
  genre: "all",
  search: "",
  sort: "newest",
  visibleLimit: 24,
  onlyWatched: false,
  watched: loadWatchedGames(),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function dayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateValue, fallback = "日期待定") {
  if (!dateValue) return fallback;
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", year: "numeric" })
    .format(new Date(`${dateValue}T12:00:00`));
}

function formatUpdatedAt(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function populateSelect(select, values, label) {
  select.innerHTML = `<option value="all">全部${label}</option>`;
  [...values].sort((a, b) => a.localeCompare(b, "zh-CN")).forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function renderStats() {
  const today = dayKey(new Date());
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setHours(0, 0, 0, 0);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const released = state.data.games.filter((game) => game.status === "released");
  const todayCount = released.filter((game) => game.releaseDate === today).length;
  const weekCount = released.filter((game) => game.releaseDate && new Date(`${game.releaseDate}T12:00:00`) >= sevenDaysAgo).length;
  const upcomingCount = state.data.games.filter((game) => game.status === "upcoming").length;

  document.querySelector("#todayCount").textContent = String(todayCount);
  document.querySelector("#weekCount").textContent = String(weekCount);
  document.querySelector("#upcomingCount").textContent = String(upcomingCount);
  document.querySelector("#sourceCount").textContent = `${state.data.sources.length}/${state.data.sources.length}`;
  document.querySelector("#sourceSummary").textContent = "数据源在线";
}

function renderPulse() {
  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = dayKey(date);
    const count = state.data.games.filter((game) => game.status === "released" && game.releaseDate === key).length;
    days.push({ key, count, label: `${date.getMonth() + 1}/${date.getDate()}` });
  }
  const maximum = Math.max(1, ...days.map((day) => day.count));
  document.querySelector("#pulseChart").innerHTML = days.map((day) => `
    <div class="pulse-day" aria-label="${day.label} 上线 ${day.count} 款游戏">
      <div class="pulse-track"><i class="pulse-bar" data-count="${day.count}" style="height:${Math.max(3, day.count / maximum * 100)}%"></i></div>
      <small>${day.label}</small>
    </div>
  `).join("");
}

function renderSources() {
  document.querySelector("#sourceList").innerHTML = state.data.sources.map((source) => `
    <div class="source-row">
      <i aria-hidden="true"></i>
      <span><strong>${escapeHtml(source.name)}</strong><small>${escapeHtml(source.note)}</small></span>
      <span>${source.games}</span>
    </div>
  `).join("");
}

function pickReason(game) {
  if (game.status === "upcoming") return "即将上线 · 可以提前关注";
  if (game.price.toLowerCase() === "free") return "免费上线 · 适合快速试玩";
  if (game.discount) return `首发优惠 ${game.discount}% · 正在折扣`;
  if (game.reviewCount) return `${game.reviewPercent}% 好评 · 已有首批评价`;
  return "刚刚上线 · 等待首批玩家";
}

function renderCurated() {
  const picks = [];
  const genres = new Set();
  [...state.data.games]
    .sort((first, second) => second.heatScore - first.heatScore || Number(second.discount) - Number(first.discount))
    .forEach((game) => {
      if (picks.length >= 3 || genres.has(game.genre)) return;
      genres.add(game.genre);
      picks.push(game);
    });

  curatedGrid.innerHTML = picks.map((game, index) => `
    <button class="curated-card" type="button" data-open-game="${escapeHtml(game.id)}" style="--cover:url('${escapeHtml(game.cover)}')">
      <small>0${index + 1} · ${escapeHtml(game.genre)}</small>
      <h3>${escapeHtml(game.name)}</h3>
      <p>${escapeHtml(pickReason(game))}</p>
    </button>
  `).join("");
}

function filteredGames() {
  const query = state.search.trim().toLocaleLowerCase();
  const games = state.data.games.filter((game) => {
    if (state.onlyWatched && !state.watched.has(game.id)) return false;
    if (state.status !== "all" && game.status !== state.status) return false;
    if (state.platform !== "all" && !game.platforms.includes(state.platform)) return false;
    if (state.genre !== "all" && game.genre !== state.genre) return false;
    if (query && !game.name.toLocaleLowerCase().includes(query)) return false;
    return true;
  });

  return games.sort((first, second) => {
    if (state.sort === "heat") return second.heatScore - first.heatScore;
    if (state.sort === "name") return first.name.localeCompare(second.name);
    const firstDate = first.releaseDate ? Date.parse(first.releaseDate) : Number.POSITIVE_INFINITY;
    const secondDate = second.releaseDate ? Date.parse(second.releaseDate) : Number.POSITIVE_INFINITY;
    if (first.status === "upcoming" && second.status !== "upcoming") return 1;
    if (second.status === "upcoming" && first.status !== "upcoming") return -1;
    return secondDate - firstDate;
  });
}

function saveWatchedGames() {
  try {
    localStorage.setItem("game-radar-watchlist", JSON.stringify([...state.watched]));
  } catch {
    // The watchlist still works for the current session when storage is unavailable.
  }
}

function renderWatchState() {
  watchCount.textContent = String(state.watched.size);
  watchFilter.setAttribute("aria-pressed", String(state.onlyWatched));
  watchFilter.title = state.onlyWatched ? "显示全部游戏" : "只看我关注的游戏";
}

function toggleWatch(gameId) {
  if (state.watched.has(gameId)) state.watched.delete(gameId);
  else state.watched.add(gameId);
  saveWatchedGames();
  renderWatchState();
  renderGames();

  const dialogWatch = gameDialog.querySelector("[data-dialog-watch]");
  if (dialogWatch?.dataset.dialogWatch === gameId) {
    const watched = state.watched.has(gameId);
    dialogWatch.setAttribute("aria-pressed", String(watched));
    dialogWatch.textContent = watched ? "★ 已关注" : "☆ 加入关注";
  }
}

function openGame(gameId) {
  const game = state.data.games.find((item) => item.id === gameId);
  if (!game) return;
  const watched = state.watched.has(game.id);
  dialogContent.innerHTML = `
    <img class="dialog-cover" src="${escapeHtml(game.cover)}" alt="${escapeHtml(game.name)} 游戏封面" />
    <div class="dialog-body">
      <span class="dialog-kicker">${game.status === "upcoming" ? "UPCOMING" : "NEW RELEASE"} · ${escapeHtml(game.genre)}</span>
      <h2 id="dialogGameTitle">${escapeHtml(game.name)}</h2>
      <div class="dialog-meta"><span>${escapeHtml(game.platforms.join(" / "))}</span><span>·</span><span>${formatDate(game.releaseDate, game.releaseLabel)}</span></div>
      <div class="dialog-summary">
        <span>价格<b>${escapeHtml(game.price)}</b></span>
        <span>雷达热度<b>${game.heatScore}</b></span>
        <span>玩家评价<b>${game.reviewCount ? `${game.reviewPercent}% · ${game.reviewCount} 条` : "等待评价"}</b></span>
      </div>
      <div class="dialog-actions">
        <button class="dialog-watch" type="button" data-dialog-watch="${escapeHtml(game.id)}" aria-pressed="${watched}">${watched ? "★ 已关注" : "☆ 加入关注"}</button>
        <a href="${escapeHtml(game.storeUrl)}" target="_blank" rel="noopener noreferrer">前往 Steam →</a>
      </div>
    </div>
  `;
  if (typeof gameDialog.showModal === "function") gameDialog.showModal();
  else gameDialog.setAttribute("open", "");
  app.dataset.openGameId = game.id;
}

function gameCard(game) {
  const releaseText = game.status === "upcoming" ? "即将上线" : "已上线";
  const reviewText = game.reviewCount
    ? `${game.reviewPercent}% 好评 · ${game.reviewCount} 条`
    : "等待首批评价";
  return `
    <article class="game-card">
      <button class="game-card-main" type="button" data-open-game="${escapeHtml(game.id)}">
        <div class="cover-wrap">
          <img src="${escapeHtml(game.cover)}" alt="${escapeHtml(game.name)} 游戏封面" loading="lazy" />
          <span class="release-badge ${game.status === "upcoming" ? "upcoming" : ""}">${releaseText}</span>
          ${game.discount ? `<span class="discount-badge">-${game.discount}%</span>` : ""}
        </div>
        <div class="game-body">
          <div class="game-meta"><span>${escapeHtml(game.genre)}</span><i></i><span>${escapeHtml(game.platforms.join(" / "))}</span></div>
          <h3>${escapeHtml(game.name)}</h3>
          <div class="game-footer">
            <div class="price-block"><span>${escapeHtml(game.price)}</span><small>${formatDate(game.releaseDate, game.releaseLabel)}</small></div>
            <div class="heat-block"><span>热度 ${game.heatScore} · ${reviewText}</span><div class="heat-meter"><i style="width:${game.heatScore}%"></i></div></div>
          </div>
        </div>
      </button>
      <button class="quick-watch" type="button" data-watch-id="${escapeHtml(game.id)}" aria-label="${state.watched.has(game.id) ? "取消关注" : "关注"} ${escapeHtml(game.name)}" aria-pressed="${state.watched.has(game.id)}">${state.watched.has(game.id) ? "★" : "☆"}</button>
    </article>
  `;
}

function renderGames() {
  const games = filteredGames();
  const visible = games.slice(0, state.visibleLimit);
  document.querySelector("#resultCount").textContent = `${games.length} 款`;
  gameGrid.innerHTML = visible.map(gameCard).join("");
  gameGrid.querySelectorAll("img").forEach((image) => image.addEventListener("error", () => image.classList.add("failed")));
  emptyState.hidden = games.length !== 0;
  loadMore.hidden = visible.length >= games.length;

  app.dataset.visibleGames = String(visible.length);
  app.dataset.filteredGames = String(games.length);
  app.dataset.statusFilter = state.status;
  app.dataset.platformFilter = state.platform;
  app.dataset.genreFilter = state.genre;
  app.dataset.watchFilter = String(state.onlyWatched);
  app.dataset.watchCount = String(state.watched.size);
}

function resetAndRender() {
  state.visibleLimit = 24;
  renderGames();
}

document.querySelectorAll("[data-status]").forEach((button) => {
  button.addEventListener("click", () => {
    state.status = button.dataset.status;
    document.querySelectorAll("[data-status]").forEach((option) => {
      option.setAttribute("aria-pressed", String(option === button));
    });
    resetAndRender();
  });
});

searchInput.addEventListener("input", () => { state.search = searchInput.value; resetAndRender(); });
platformSelect.addEventListener("change", () => { state.platform = platformSelect.value; resetAndRender(); });
genreSelect.addEventListener("change", () => { state.genre = genreSelect.value; resetAndRender(); });
sortSelect.addEventListener("change", () => { state.sort = sortSelect.value; resetAndRender(); });
loadMore.addEventListener("click", () => { state.visibleLimit += 24; renderGames(); });
watchFilter.addEventListener("click", () => {
  state.onlyWatched = !state.onlyWatched;
  renderWatchState();
  resetAndRender();
});
dialogClose.addEventListener("click", () => gameDialog.close());
gameDialog.addEventListener("click", (event) => {
  if (event.target === gameDialog) gameDialog.close();
});
document.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-open-game]");
  if (openButton) openGame(openButton.dataset.openGame);
  const watchButton = event.target.closest("[data-watch-id]");
  if (watchButton) toggleWatch(watchButton.dataset.watchId);
  const dialogWatch = event.target.closest("[data-dialog-watch]");
  if (dialogWatch) toggleWatch(dialogWatch.dataset.dialogWatch);
});

async function loadData() {
  try {
    const response = await fetch(`game-radar-data.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`数据文件返回 ${response.status}`);
    state.data = await response.json();

    populateSelect(platformSelect, new Set(state.data.games.flatMap((game) => game.platforms)), "平台");
    populateSelect(genreSelect, new Set(state.data.games.map((game) => game.genre)), "类型");
    renderStats();
    renderPulse();
    renderSources();
    renderCurated();
    renderWatchState();
    renderGames();

    app.dataset.loadState = "ready";
    app.dataset.gameCount = String(state.data.games.length);
    app.dataset.sourceCount = String(state.data.sources.length);
    app.dataset.updatedAt = state.data.updatedAt;
    updateState.classList.add("online");
    updateState.querySelector("span").textContent = `更新于 ${formatUpdatedAt(state.data.updatedAt)}`;
  } catch (error) {
    app.dataset.loadState = "error";
    updateState.classList.add("error");
    updateState.querySelector("span").textContent = "数据读取失败";
    emptyState.hidden = false;
    emptyState.textContent = "暂时无法读取游戏数据，请稍后刷新。";
    console.error(error);
  }
}

loadData();
