import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_FILE = path.join(ROOT, "game-radar-data.json");
const SEARCH_BASE = "https://store.steampowered.com/search/results/";

const TAG_NAMES = new Map([
  [19, "动作"],
  [21, "冒险"],
  [9, "策略"],
  [122, "角色扮演"],
  [599, "模拟"],
  [597, "休闲"],
  [699, "竞速"],
  [1662, "生存"],
  [1773, "街机"],
  [113, "免费游玩"],
  [3871, "合作"],
  [1775, "PvP"],
]);

function decodeHtml(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseDate(label) {
  const timestamp = Date.parse(`${label} 12:00:00 UTC`);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function extractAll(row, expression) {
  return [...row.matchAll(expression)].map((match) => decodeHtml(match[1]));
}

function parseSearchRows(html, status) {
  const rows = html.match(/<a href="[^"]+"[\s\S]*?class="search_result_row[^"]*"[\s\S]*?<\/a>/g) || [];

  return rows.flatMap((row) => {
    const appId = row.match(/data-ds-appid="(\d+)"/)?.[1];
    const name = decodeHtml(row.match(/<span class="title">([\s\S]*?)<\/span>/)?.[1]);
    const cover = row.match(/<div class="search_capsule"><img src="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
    const releaseLabel = decodeHtml(row.match(/class="search_released responsive_secondrow">([\s\S]*?)<\/div>/)?.[1]);
    const priceLabels = extractAll(row, /class="discount_final_price[^"]*">([\s\S]*?)<\/div>/g);
    const discount = Number(row.match(/data-discount="(\d+)"/)?.[1] || 0);
    const tagIds = JSON.parse(row.match(/data-ds-tagids="(\[[^"]*\])"/)?.[1] || "[]");
    const decodedRow = decodeHtml(row);
    const reviewMatch = decodedRow.match(/(\d+)% of the ([\d,]+) user reviews/i);
    const storeUrl = row.match(/href="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&").replace(/\?.*$/, "");

    if (!appId || !name || !cover) return [];

    const platforms = [];
    if (/platform_img win/.test(row)) platforms.push("Windows");
    if (/platform_img mac/.test(row)) platforms.push("macOS");
    if (/platform_img linux/.test(row)) platforms.push("Linux");
    if (/vr_required/.test(row)) platforms.push("VR");

    const genre = tagIds.map((id) => TAG_NAMES.get(id)).find(Boolean) || "其他";
    const reviewPercent = Number(reviewMatch?.[1] || 0);
    const reviewCount = Number((reviewMatch?.[2] || "0").replaceAll(",", ""));
    const releaseDate = normaliseDate(releaseLabel);
    const ageInDays = releaseDate
      ? Math.max(0, (Date.now() - Date.parse(`${releaseDate}T12:00:00Z`)) / 86400000)
      : 30;
    const heatScore = status === "upcoming"
      ? 48
      : Math.round(Math.min(99, 62 + Math.max(0, 14 - ageInDays * 2) + Math.log10(reviewCount + 1) * 8 + reviewPercent * 0.08));

    return [{
      id: `steam-${appId}`,
      appId: Number(appId),
      name,
      source: "Steam",
      sourceRegion: "全球商店",
      status,
      releaseDate,
      releaseLabel,
      platforms: platforms.length ? platforms : ["PC"],
      genre,
      price: priceLabels.at(-1) || "价格待定",
      discount,
      reviewPercent,
      reviewCount,
      heatScore,
      cover,
      storeUrl,
    }];
  });
}

async function fetchSearch(filter, sortBy, count) {
  const url = new URL(SEARCH_BASE);
  url.searchParams.set("query", "");
  url.searchParams.set("start", "0");
  url.searchParams.set("count", String(count));
  url.searchParams.set("sort_by", sortBy);
  url.searchParams.set("category1", "998");
  url.searchParams.set("infinite", "1");
  url.searchParams.set("cc", "us");
  url.searchParams.set("l", "english");
  if (filter) url.searchParams.set("filter", filter);

  const response = await fetch(url, {
    headers: { "user-agent": "GameRadarMVP/1.0 (+https://shuaiqibirendiaozhatian.online/)" },
  });
  if (!response.ok) throw new Error(`Steam search returned ${response.status}`);
  const payload = await response.json();
  if (!payload.success || typeof payload.results_html !== "string") {
    throw new Error("Steam search returned an unexpected response");
  }
  return payload.results_html;
}

async function main() {
  const sourceStartedAt = Date.now();
  const [releasedResult, upcomingResult] = await Promise.allSettled([
    fetchSearch(null, "Released_DESC", 36),
    fetchSearch("comingsoon", "Released_ASC", 16),
  ]);

  const released = releasedResult.status === "fulfilled"
    ? parseSearchRows(releasedResult.value, "released")
    : [];
  const upcoming = upcomingResult.status === "fulfilled"
    ? parseSearchRows(upcomingResult.value, "upcoming")
    : [];
  const games = [...released, ...upcoming]
    .filter((game, index, list) => list.findIndex((candidate) => candidate.id === game.id) === index);

  if (games.length === 0) {
    throw new Error(`No games parsed. Released: ${releasedResult.status}; upcoming: ${upcomingResult.status}`);
  }

  const payload = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    refreshIntervalHours: 6,
    coverage: "Steam PC new releases",
    sources: [{
      id: "steam-store",
      name: "Steam 全球商店",
      status: released.length ? "online" : "partial",
      games: games.length,
      latencyMs: Date.now() - sourceStartedAt,
      note: upcoming.length ? "新品与即将上线数据正常" : "新品正常，即将上线数据暂不可用",
    }],
    games,
  };

  await writeFile(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${games.length} games to ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
