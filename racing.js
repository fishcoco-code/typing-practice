const canvas = document.querySelector("#raceCanvas");
const context = canvas.getContext("2d");
const stage = document.querySelector("#gameStage");
const speedValue = document.querySelector("#speedValue");
const driveState = document.querySelector("#driveState");
const controlCard = document.querySelector("#controlCard");
const mapSelector = document.querySelector("#mapSelector");
const mapToggle = document.querySelector("#mapToggle");
const mapMenu = document.querySelector("#mapMenu");
const currentMapName = document.querySelector("#currentMapName");
const TOP_SPEED_KMH = 639;
const SPEED_MULTIPLIER = 15.64;
const WORLD_LIGHT_ANGLE = -2.2;
const MAX_MOTION_TRAIL_FRAMES = 6;
const MAX_WORLD_TRAIL_FRAMES = 2;
const MAX_RENDER_SCALE = 2.25;
const MAX_TRAIL_RENDER_SCALE = 0.85;
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const controls = {
  up: false,
  down: false,
  left: false,
  right: false,
};

const MAPS = {
  meadow: {
    name: "绿野大奖赛",
    description: "8弯 · 连续高速大弯",
    bendCount: 8,
    bendType: "高速大弯",
    pattern: "stripes",
    palette: {
      terrain: "#78945e",
      terrainLine: "#263d28",
      terrainDot: "rgba(31, 58, 31, 0.23)",
      roadBorder: "#191c19",
      roadEdge: "#efe4c8",
      road: "#424641",
      roadLight: "rgba(255,255,255,0.055)",
      curbA: "#f4ecda",
      curbB: "#e45536",
      route: "rgba(18, 20, 18, 0.44)",
    },
    shape: [
      [0.16, 0.78], [0.08, 0.48], [0.2, 0.16], [0.48, 0.1],
      [0.78, 0.16], [0.92, 0.46], [0.8, 0.8], [0.48, 0.9], [0.25, 0.84],
    ],
  },
  coast: {
    name: "海岸公路",
    description: "6弯 · 双长直道",
    bendCount: 6,
    bendType: "长直道与高速弯",
    pattern: "waves",
    palette: {
      terrain: "#c5a665",
      terrainLine: "#477f99",
      terrainDot: "rgba(74, 112, 126, 0.22)",
      roadBorder: "#232729",
      roadEdge: "#f1dfba",
      road: "#4b5153",
      roadLight: "rgba(166, 223, 232, 0.075)",
      curbA: "#f6e2b6",
      curbB: "#2d8fa8",
      route: "rgba(25, 43, 47, 0.42)",
    },
    shape: [
      [0.12, 0.72], [0.1, 0.28], [0.25, 0.1], [0.76, 0.1],
      [0.91, 0.3], [0.9, 0.73], [0.75, 0.9], [0.25, 0.9],
    ],
  },
  neon: {
    name: "霓虹都市",
    description: "18弯 · 连续S弯",
    bendCount: 18,
    bendType: "技术S弯",
    pattern: "grid",
    palette: {
      terrain: "#17232b",
      terrainLine: "#2b7180",
      terrainDot: "rgba(232, 69, 151, 0.34)",
      roadBorder: "#05070a",
      roadEdge: "#55dce9",
      road: "#282b35",
      roadLight: "rgba(234, 69, 151, 0.09)",
      curbA: "#60e7ef",
      curbB: "#ed4e98",
      route: "rgba(106, 229, 240, 0.42)",
    },
    shape: [
      [0.12, 0.8], [0.08, 0.58], [0.19, 0.42], [0.09, 0.2],
      [0.26, 0.08], [0.4, 0.24], [0.52, 0.08], [0.66, 0.22],
      [0.82, 0.08], [0.93, 0.25], [0.82, 0.42], [0.93, 0.57],
      [0.81, 0.72], [0.9, 0.88], [0.66, 0.92], [0.55, 0.72],
      [0.42, 0.92], [0.27, 0.74],
    ],
  },
  canyon: {
    name: "沙漠峡谷",
    description: "17弯 · 发卡回头弯",
    bendCount: 17,
    bendType: "连续发卡弯",
    pattern: "rocks",
    palette: {
      terrain: "#b87843",
      terrainLine: "#704129",
      terrainDot: "rgba(91, 48, 29, 0.34)",
      roadBorder: "#2d241f",
      roadEdge: "#e8c58f",
      road: "#5a5048",
      roadLight: "rgba(255, 222, 168, 0.065)",
      curbA: "#f1d09a",
      curbB: "#a43f2d",
      route: "rgba(41, 31, 25, 0.46)",
    },
    shape: [
      [0.13, 0.82], [0.07, 0.63], [0.27, 0.53], [0.08, 0.4],
      [0.28, 0.29], [0.12, 0.12], [0.42, 0.08], [0.57, 0.23],
      [0.73, 0.08], [0.92, 0.22], [0.76, 0.38], [0.92, 0.52],
      [0.75, 0.67], [0.9, 0.84], [0.59, 0.92], [0.43, 0.77], [0.28, 0.92],
    ],
  },
  alpine: {
    name: "雪山发卡",
    description: "14弯 · 上山发卡",
    bendCount: 14,
    bendType: "窄角发卡弯",
    pattern: "stripes",
    palette: {
      terrain: "#aebfc2",
      terrainLine: "#627b80",
      terrainDot: "rgba(55, 76, 80, 0.25)",
      roadBorder: "#23292b",
      roadEdge: "#edf4ef",
      road: "#485156",
      roadLight: "rgba(225, 245, 248, 0.08)",
      curbA: "#f4f7f3",
      curbB: "#de5944",
      route: "rgba(30, 40, 43, 0.44)",
    },
    shape: [
      [0.1, 0.84], [0.28, 0.74], [0.1, 0.63], [0.3, 0.52],
      [0.11, 0.4], [0.32, 0.29], [0.16, 0.12], [0.48, 0.08],
      [0.67, 0.2], [0.87, 0.1], [0.93, 0.38], [0.76, 0.5],
      [0.92, 0.65], [0.72, 0.77], [0.88, 0.9], [0.48, 0.92], [0.3, 0.82],
    ],
  },
  harbor: {
    name: "港湾街区",
    description: "12弯 · 直角减速弯",
    bendCount: 12,
    bendType: "直角弯与减速弯",
    pattern: "grid",
    palette: {
      terrain: "#356f73",
      terrainLine: "#173d42",
      terrainDot: "rgba(233, 190, 90, 0.3)",
      roadBorder: "#151c1e",
      roadEdge: "#eadba8",
      road: "#3f484a",
      roadLight: "rgba(127, 217, 222, 0.08)",
      curbA: "#f1dea9",
      curbB: "#df8d32",
      route: "rgba(22, 37, 39, 0.46)",
    },
    shape: [
      [0.12, 0.82], [0.08, 0.5], [0.2, 0.5], [0.1, 0.18],
      [0.36, 0.1], [0.36, 0.28], [0.62, 0.1], [0.9, 0.18],
      [0.82, 0.4], [0.93, 0.55], [0.81, 0.82], [0.57, 0.9],
      [0.57, 0.72], [0.3, 0.9],
    ],
  },
  oval: {
    name: "极速椭圆",
    description: "4弯 · 双高速直道",
    bendCount: 4,
    bendType: "椭圆高速弯",
    pattern: "stripes",
    palette: {
      terrain: "#687d4f",
      terrainLine: "#35452f",
      terrainDot: "rgba(54, 66, 44, 0.25)",
      roadBorder: "#1c201c",
      roadEdge: "#ece2c7",
      road: "#454945",
      roadLight: "rgba(255, 244, 213, 0.06)",
      curbA: "#f4ead2",
      curbB: "#d94a35",
      route: "rgba(20, 24, 20, 0.43)",
    },
    shape: [
      [0.17, 0.78], [0.07, 0.5], [0.17, 0.22], [0.36, 0.12],
      [0.72, 0.12], [0.91, 0.3], [0.93, 0.62], [0.78, 0.86], [0.36, 0.88],
    ],
  },
  crossing: {
    name: "交叉八字",
    description: "10弯 · 交叉复合弯",
    bendCount: 10,
    bendType: "交叉复合弯",
    pattern: "grid",
    palette: {
      terrain: "#4c3c5f",
      terrainLine: "#251e34",
      terrainDot: "rgba(107, 219, 211, 0.28)",
      roadBorder: "#111015",
      roadEdge: "#7dd7d2",
      road: "#35343d",
      roadLight: "rgba(232, 118, 195, 0.08)",
      curbA: "#7de0da",
      curbB: "#da68ae",
      route: "rgba(21, 18, 28, 0.48)",
    },
    shape: [
      [0.5, 0.5], [0.32, 0.17], [0.12, 0.22], [0.07, 0.5], [0.3, 0.82],
      [0.5, 0.5], [0.7, 0.18], [0.92, 0.25], [0.92, 0.62], [0.7, 0.84],
    ],
  },
  straight: {
    name: "直道",
    description: "0弯 · 纯直线加速",
    bendCount: 0,
    bendType: "无弯道",
    closed: false,
    pathType: "straight",
    startProgress: 0.06,
    pattern: "stripes",
    palette: {
      terrain: "#557250",
      terrainLine: "#263e29",
      terrainDot: "rgba(27, 49, 29, 0.24)",
      roadBorder: "#171a17",
      roadEdge: "#f2e8cf",
      road: "#424743",
      roadLight: "rgba(255, 255, 255, 0.06)",
      curbA: "#f1ead9",
      curbB: "#dd4d36",
      route: "rgba(18, 21, 18, 0.43)",
    },
    shape: [[0.02, 0.5], [0.98, 0.5]],
  },
};

let width = 1000;
let height = 650;
let worldWidth = 2200;
let worldHeight = 1050;
let trackWidth = 126;
let trackSamples = [];
let trackLength = 0;
let cachedTrackPath = null;
let nearestTrackSampleIndex = 0;
let lastFrame = performance.now();
let elapsed = 0;
let hasDriven = false;
let onTrack = true;
let airWallImpact = 0;
let airWallHits = 0;
let cameraZoom = 1.65;
let worldTiltX = 0.22;
let worldTiltY = 0.7;
let currentSpeedRatio = 0;
let currentSteeringAmount = 0;
let currentSteeringDirection = 0;
let wheelRotation = 0;
let turnSlowdownAmount = 0;
let motionTrailFrames = [];
let motionCaptureAccumulator = 0;
let currentMapKey = "meadow";
let renderScale = 1;
let smoothedFps = 60;
const demoMode = new URLSearchParams(window.location.search).get("demo");

const car = {
  x: 0,
  y: 0,
  angle: 0,
  velocityX: 0,
  velocityY: 0,
  length: 72,
  width: 38,
};

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function mixRgb(dark, light, amount) {
  const mixAmount = clamp(amount, 0, 1);
  const channels = dark.map((channel, index) =>
    Math.round(channel + (light[index] - channel) * mixAmount));
  return `rgb(${channels.join(", ")})`;
}

function catmullRom(previous, start, end, next, amount) {
  const amount2 = amount * amount;
  const amount3 = amount2 * amount;
  return {
    x:
      0.5 *
      (2 * start.x +
        (-previous.x + end.x) * amount +
        (2 * previous.x - 5 * start.x + 4 * end.x - next.x) * amount2 +
        (-previous.x + 3 * start.x - 3 * end.x + next.x) * amount3),
    y:
      0.5 *
      (2 * start.y +
        (-previous.y + end.y) * amount +
        (2 * previous.y - 5 * start.y + 4 * end.y - next.y) * amount2 +
        (-previous.y + 3 * start.y - 3 * end.y + next.y) * amount3),
  };
}

function buildTrack() {
  const currentMap = MAPS[currentMapKey];
  const closedTrack = currentMap.closed !== false;
  const points = currentMap.shape.map(([x, y]) => ({
    x: x * worldWidth,
    y: y * worldHeight,
  }));
  const samples = [];

  if (currentMap.pathType === "straight") {
    const [start, end] = points;
    const sampleCount = 384;
    for (let step = 0; step < sampleCount; step += 1) {
      const amount = step / (sampleCount - 1);
      samples.push({
        x: start.x + (end.x - start.x) * amount,
        y: start.y + (end.y - start.y) * amount,
      });
    }
  } else {
    const segmentCount = closedTrack ? points.length : points.length - 1;
    for (let index = 0; index < segmentCount; index += 1) {
      const previous = closedTrack
        ? points[(index - 1 + points.length) % points.length]
        : points[Math.max(0, index - 1)];
      const start = points[index];
      const end = points[(index + 1) % points.length];
      const next = closedTrack
        ? points[(index + 2) % points.length]
        : points[Math.min(points.length - 1, index + 2)];

      for (let step = 0; step < 48; step += 1) {
        samples.push(catmullRom(previous, start, end, next, step / 48));
      }
    }
    if (!closedTrack) samples.push(points[points.length - 1]);
  }

  trackSamples = samples.map((point, index) => {
    const following = samples[index + 1];
    const previous = samples[index - 1];
    const directionPoint = following || point;
    const directionOrigin = following ? point : previous;
    const angle = Math.atan2(
      directionPoint.y - directionOrigin.y,
      directionPoint.x - directionOrigin.x,
    );
    return { ...point, angle };
  });
  trackLength = trackSamples.reduce((total, point, index) => {
    const following = trackSamples[index + 1];
    if (!following) {
      if (!closedTrack) return total;
      return total + Math.hypot(trackSamples[0].x - point.x, trackSamples[0].y - point.y);
    }
    return total + Math.hypot(following.x - point.x, following.y - point.y);
  }, 0);
  cachedTrackPath = new Path2D();
  trackSamples.forEach((point, index) => {
    if (index === 0) cachedTrackPath.moveTo(point.x, point.y);
    else cachedTrackPath.lineTo(point.x, point.y);
  });
  if (closedTrack) cachedTrackPath.closePath();
}

function resetCar() {
  const startIndex = Math.round(
    (trackSamples.length - 1) * (MAPS[currentMapKey].startProgress || 0),
  );
  const start = trackSamples[startIndex];
  car.x = start.x;
  car.y = start.y;
  car.angle = start.angle;
  car.velocityX = 0;
  car.velocityY = 0;
  onTrack = true;
  airWallImpact = 0;
  airWallHits = 0;
  hasDriven = false;
  currentSpeedRatio = 0;
  currentSteeringAmount = 0;
  currentSteeringDirection = 0;
  wheelRotation = 0;
  turnSlowdownAmount = 0;
  motionTrailFrames = [];
  motionCaptureAccumulator = 0;
  nearestTrackSampleIndex = startIndex;
}

function resizeCanvas() {
  const bounds = stage.getBoundingClientRect();
  const qualityCap = bounds.width < 600 ? 2.25 : MAX_RENDER_SCALE;
  const minimumQualityScale = bounds.width < 600 ? 1.65 : 2;
  const ratio = Math.min(
    Math.max(window.devicePixelRatio || 1, minimumQualityScale),
    qualityCap,
  );
  renderScale = ratio;
  width = Math.max(320, bounds.width);
  height = Math.max(420, bounds.height);
  // Double the complete circuit footprint again for a much longer lap.
  worldWidth = width * 18.8;
  worldHeight = height * 13.2;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  // Double the current road width while keeping it proportional on every screen.
  trackWidth = clamp(Math.min(width, height) * 1.32, 512, 840);
  // Pull the camera back so the larger circuit and upcoming bends stay visible.
  cameraZoom = width < 600 ? 0.78 : 0.9;
  worldTiltX = width < 600 ? 0.17 : 0.22;
  worldTiltY = width < 600 ? 0.78 : 0.7;
  car.length = clamp(Math.min(width, height) * 0.19, 94, 122);
  car.width = car.length * 0.72;
  buildTrack();
  resetCar();
}

function setMapMenuOpen(open) {
  mapMenu.hidden = !open;
  mapToggle.setAttribute("aria-expanded", String(open));
}

function selectMap(mapKey) {
  if (!MAPS[mapKey]) return;
  currentMapKey = mapKey;
  currentMapName.textContent = MAPS[mapKey].name;
  document.querySelectorAll("[data-map]").forEach((option) => {
    const selected = option.dataset.map === mapKey;
    option.classList.toggle("selected", selected);
    option.setAttribute("aria-pressed", String(selected));
  });
  buildTrack();
  resetCar();
  speedValue.textContent = "0";
  driveState.textContent = "待发车";
  setMapMenuOpen(false);
}

function isNearCamera(point, multiplier = 1.5) {
  const visibleSpan = Math.max(width, height) / cameraZoom * multiplier;
  return (
    Math.abs(point.x - car.x) <= visibleSpan &&
    Math.abs(point.y - car.y) <= visibleSpan
  );
}

function getNearestTrackPoint(x, y) {
  let nearest = trackSamples[nearestTrackSampleIndex] || trackSamples[0];
  let nearestIndex = nearestTrackSampleIndex;
  let shortestSquared = Number.POSITIVE_INFINITY;

  const inspectPoint = (index) => {
    const closedTrack = MAPS[currentMapKey].closed !== false;
    const inspectedIndex = closedTrack
      ? (index + trackSamples.length) % trackSamples.length
      : clamp(index, 0, trackSamples.length - 1);
    const point = trackSamples[inspectedIndex];
    const differenceX = x - point.x;
    const differenceY = y - point.y;
    const distanceSquared = differenceX * differenceX + differenceY * differenceY;
    if (distanceSquared < shortestSquared) {
      shortestSquared = distanceSquared;
      nearest = point;
      nearestIndex = inspectedIndex;
    }
  };

  // The car can only advance a few samples per frame, so search its local track section first.
  for (let offset = -64; offset <= 64; offset += 1) {
    inspectPoint(nearestTrackSampleIndex + offset);
  }

  // A full fallback keeps reset, resize and exceptional teleports robust.
  if (shortestSquared > trackWidth * trackWidth) {
    shortestSquared = Number.POSITIVE_INFINITY;
    for (let index = 0; index < trackSamples.length; index += 1) {
      inspectPoint(index);
    }
  }
  nearestTrackSampleIndex = nearestIndex;
  return { point: nearest, distance: Math.sqrt(shortestSquared) };
}

function drawGrass() {
  const currentMap = MAPS[currentMapKey];
  const { palette } = currentMap;
  context.fillStyle = palette.terrain;
  context.fillRect(-worldWidth, -worldHeight, worldWidth * 3, worldHeight * 3);

  context.save();
  context.globalAlpha = currentMap.pattern === "grid" ? 0.34 : 0.2;
  context.strokeStyle = palette.terrainLine;
  context.lineWidth = 1;
  const gap = Math.max(22, Math.min(width, height) * 0.045);
  const visibleSpan = Math.max(width, height) / cameraZoom * 1.8;
  const minimumX = car.x - visibleSpan;
  const maximumX = car.x + visibleSpan;
  const minimumY = car.y - visibleSpan;
  const maximumY = car.y + visibleSpan;

  if (currentMap.pattern === "grid") {
    const gridGap = gap * 3.2;
    const firstX = Math.floor(minimumX / gridGap) * gridGap;
    const firstY = Math.floor(minimumY / gridGap) * gridGap;
    for (let x = firstX; x < maximumX; x += gridGap) {
      context.beginPath();
      context.moveTo(x, minimumY);
      context.lineTo(x, maximumY);
      context.stroke();
    }
    for (let y = firstY; y < maximumY; y += gridGap) {
      context.beginPath();
      context.moveTo(minimumX, y);
      context.lineTo(maximumX, y);
      context.stroke();
    }
  } else if (currentMap.pattern === "waves") {
    const waveGap = gap * 2.8;
    const firstY = Math.floor(minimumY / waveGap) * waveGap;
    for (let y = firstY; y < maximumY; y += waveGap) {
      context.beginPath();
      for (let x = minimumX; x <= maximumX; x += gap * 1.5) {
        const waveY = y + Math.sin(x / (gap * 2.6)) * gap * 0.18;
        if (x === minimumX) context.moveTo(x, waveY);
        else context.lineTo(x, waveY);
      }
      context.stroke();
    }
  } else {
    // World-anchored diagonal markings suit meadow stripes and canyon strata.
    const minimumOffset = car.x - car.y - visibleSpan * 2;
    const maximumOffset = car.x - car.y + visibleSpan * 2;
    const firstOffset = Math.floor(minimumOffset / gap) * gap;
    for (let offset = firstOffset; offset < maximumOffset; offset += gap) {
      context.beginPath();
      context.moveTo(offset + minimumY, minimumY);
      context.lineTo(offset + maximumY, maximumY);
      context.stroke();
    }
  }
  context.restore();

  context.fillStyle = palette.terrainDot;
  const markerGap = currentMap.pattern === "rocks" ? gap * 5.5 : gap * 7;
  const firstMarkerX = Math.floor(minimumX / markerGap) * markerGap;
  const firstMarkerY = Math.floor(minimumY / markerGap) * markerGap;
  for (let x = firstMarkerX; x < maximumX; x += markerGap) {
    for (let y = firstMarkerY; y < maximumY; y += markerGap) {
      const gridX = Math.round(x / markerGap);
      const gridY = Math.round(y / markerGap);
      const hash = Math.abs((gridX * 73856093) ^ (gridY * 19349663));
      if (hash % 5 !== 0) continue;
      const radius = currentMap.pattern === "rocks" ? 5 + hash % 8 : 2 + hash % 4;
      context.beginPath();
      context.arc(x + hash % 29, y + hash % 17, radius, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function drawCurbs() {
  const { palette } = MAPS[currentMapKey];
  const offset = trackWidth / 2 + 1;
  const curbLength = Math.max(12, trackWidth * 0.13);
  const curbDepth = Math.max(7, trackWidth * 0.075);

  for (let index = 0; index < trackSamples.length; index += 5) {
    const point = trackSamples[index];
    if (!isNearCamera(point, 1.55)) continue;
    context.save();
    context.translate(point.x, point.y);
    context.rotate(point.angle);
    context.fillStyle = index % 10 === 0 ? palette.curbA : palette.curbB;
    context.strokeStyle = "rgba(20, 22, 19, 0.48)";
    context.lineWidth = 1.2;
    [-1, 1].forEach((side) => {
      context.beginPath();
      context.rect(-curbLength / 2, side * offset - (side < 0 ? 0 : curbDepth), curbLength, curbDepth);
      context.fill();
      context.stroke();
    });
    context.restore();
  }
}

function drawRouteTirePrints() {
  const { palette } = MAPS[currentMapKey];
  context.save();
  context.strokeStyle = palette.route;
  context.lineWidth = clamp(trackWidth * 0.035, 2, 4.5);
  context.lineCap = "round";

  for (let index = 0; index < trackSamples.length; index += 7) {
    const point = trackSamples[index];
    if (!isNearCamera(point, 1.5)) continue;
    const length = trackWidth * 0.14;
    const spacing = trackWidth * 0.085;
    const cosine = Math.cos(point.angle);
    const sine = Math.sin(point.angle);
    const normalX = -sine;
    const normalY = cosine;

    [-spacing, spacing].forEach((side) => {
      context.beginPath();
      context.moveTo(
        point.x - cosine * length / 2 + normalX * side,
        point.y - sine * length / 2 + normalY * side,
      );
      context.lineTo(
        point.x + cosine * length / 2 + normalX * side,
        point.y + sine * length / 2 + normalY * side,
      );
      context.stroke();
    });
  }
  context.restore();
}

function drawRoadTexture() {
  const { palette } = MAPS[currentMapKey];
  const visibleSpan = Math.max(width, height) / cameraZoom * 1.45;
  context.save();
  context.lineCap = "round";

  for (let index = 0; index < trackSamples.length; index += 2) {
    const point = trackSamples[index];
    if (Math.abs(point.x - car.x) > visibleSpan || Math.abs(point.y - car.y) > visibleSpan) {
      continue;
    }
    const hash = Math.abs((index * 2654435761) | 0);
    const tangentX = Math.cos(point.angle);
    const tangentY = Math.sin(point.angle);
    const normalX = -tangentY;
    const normalY = tangentX;
    const offset = ((hash % 1000) / 999 - 0.5) * trackWidth * 0.72;
    const markLength = 3 + hash % 9;
    const x = point.x + normalX * offset;
    const y = point.y + normalY * offset;

    context.globalAlpha = index % 4 === 0 ? 0.42 : 0.22;
    context.strokeStyle = index % 4 === 0 ? palette.roadLight : palette.route;
    context.lineWidth = 0.7 + hash % 2;
    context.beginPath();
    context.moveTo(x - tangentX * markLength, y - tangentY * markLength);
    context.lineTo(x + tangentX * markLength, y + tangentY * markLength);
    context.stroke();

    if (hash % 3 === 0) {
      context.fillStyle = palette.roadLight;
      context.beginPath();
      context.arc(x + normalX * 8, y + normalY * 8, 0.8 + hash % 2, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

function drawTrack() {
  const { palette } = MAPS[currentMapKey];
  const closedTrack = MAPS[currentMapKey].closed !== false;
  const path = cachedTrackPath;
  context.save();
  context.lineJoin = "round";
  context.lineCap = closedTrack ? "round" : "butt";

  context.strokeStyle = palette.roadBorder;
  context.lineWidth = trackWidth + 20;
  context.stroke(path);

  context.strokeStyle = palette.roadEdge;
  context.lineWidth = trackWidth + 14;
  context.stroke(path);

  context.strokeStyle = palette.road;
  context.lineWidth = trackWidth;
  context.stroke(path);

  context.strokeStyle = palette.roadLight;
  context.lineWidth = trackWidth * 0.62;
  context.stroke(path);
  context.restore();

  drawRoadTexture();
  drawCurbs();
  drawRouteTirePrints();
}

function updateCar(deltaTime) {
  const maximumSpeed = car.length * SPEED_MULTIPLIER;
  const cosine = Math.cos(car.angle);
  const sine = Math.sin(car.angle);
  let forwardSpeed = car.velocityX * cosine + car.velocityY * sine;
  let lateralSpeed = -car.velocityX * sine + car.velocityY * cosine;
  const steering = Number(controls.right) - Number(controls.left);
  const throttle = Number(controls.up) - Number(controls.down);

  if (throttle !== 0) {
    const speedRatio = clamp(Math.abs(forwardSpeed) / maximumSpeed, 0, 1);
    // Strong but progressive acceleration: quick launch, then a smooth approach to top speed.
    const acceleration = maximumSpeed * 0.48 * (1 - speedRatio * 0.72);
    forwardSpeed += throttle * acceleration * deltaTime;
    hasDriven = true;
  }

  forwardSpeed = clamp(forwardSpeed, -maximumSpeed * 0.34, maximumSpeed);
  const speedRatioBeforeTurn = clamp(Math.abs(forwardSpeed) / maximumSpeed, 0, 1);
  currentSteeringAmount = Math.abs(steering);
  currentSteeringDirection = steering;
  const steeringPower = 0.4 + speedRatioBeforeTurn * 1.28;
  if (Math.abs(forwardSpeed) > 4) {
    car.angle +=
      steering *
      steeringPower *
      deltaTime *
      (forwardSpeed >= 0 ? 1 : -1);
  }

  // Steering scrubs speed progressively; high-speed bends lose substantially more momentum.
  const turningResistance =
    currentSteeringAmount * (0.18 + speedRatioBeforeTurn * 0.46);
  forwardSpeed *= Math.max(0, 1 - turningResistance * deltaTime);
  turnSlowdownAmount = currentSteeringAmount * speedRatioBeforeTurn;

  const grip = 6.8;
  lateralSpeed *= Math.max(0, 1 - grip * deltaTime);
  const rollingResistance = throttle === 0 ? 0.72 : 0.14;
  forwardSpeed *= Math.max(0, 1 - rollingResistance * deltaTime);

  const updatedCosine = Math.cos(car.angle);
  const updatedSine = Math.sin(car.angle);
  const wheelCircumference = Math.max(1, car.length * 0.18 * Math.PI);
  wheelRotation = (
    wheelRotation + forwardSpeed * deltaTime / wheelCircumference * Math.PI * 2
  ) % (Math.PI * 2);
  car.velocityX = updatedCosine * forwardSpeed - updatedSine * lateralSpeed;
  car.velocityY = updatedSine * forwardSpeed + updatedCosine * lateralSpeed;
  car.x += car.velocityX * deltaTime;
  car.y += car.velocityY * deltaTime;

  airWallImpact = Math.max(0, airWallImpact - deltaTime);
  const nearest = getNearestTrackPoint(car.x, car.y);
  const maximumDistance = trackWidth / 2 - car.width * 0.56;
  onTrack = nearest.distance <= maximumDistance;
  if (!onTrack) {
    const differenceX = car.x - nearest.point.x;
    const differenceY = car.y - nearest.point.y;
    const safeDistance = Math.max(0.001, nearest.distance);
    const normalX = differenceX / safeDistance;
    const normalY = differenceY / safeDistance;
    car.x = nearest.point.x + normalX * maximumDistance;
    car.y = nearest.point.y + normalY * maximumDistance;
    const outwardVelocity = car.velocityX * normalX + car.velocityY * normalY;
    if (outwardVelocity > 0) {
      car.velocityX -= normalX * outwardVelocity * 1.45;
      car.velocityY -= normalY * outwardVelocity * 1.45;
    }
    car.velocityX *= 0.72;
    car.velocityY *= 0.72;
    airWallImpact = 0.34;
    airWallHits += 1;
    onTrack = true;
  }

  const margin = car.length;
  car.x = clamp(car.x, -margin, worldWidth + margin);
  car.y = clamp(car.y, -margin, worldHeight + margin);

  currentSpeedRatio = clamp(
    Math.hypot(car.velocityX, car.velocityY) / maximumSpeed,
    0,
    1,
  );
  const speed = Math.round(currentSpeedRatio * TOP_SPEED_KMH);
  speedValue.textContent = String(speed);
  driveState.textContent = !hasDriven
    ? "待发车"
    : airWallImpact > 0
      ? "碰到空气墙"
      : turnSlowdownAmount > 0.12 && speed > 5
        ? "弯道减速"
        : speed > 5
          ? "行驶中"
          : "已停车";
}

function roundedRectangle(x, y, rectangleWidth, rectangleHeight, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + rectangleWidth - radius, y);
  context.quadraticCurveTo(x + rectangleWidth, y, x + rectangleWidth, y + radius);
  context.lineTo(x + rectangleWidth, y + rectangleHeight - radius);
  context.quadraticCurveTo(
    x + rectangleWidth,
    y + rectangleHeight,
    x + rectangleWidth - radius,
    y + rectangleHeight,
  );
  context.lineTo(x + radius, y + rectangleHeight);
  context.quadraticCurveTo(x, y + rectangleHeight, x, y + rectangleHeight - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function traceF1Body(length, carWidth) {
  context.beginPath();
  context.moveTo(-length * 0.47, -carWidth * 0.15);
  context.lineTo(-length * 0.3, -carWidth * 0.23);
  context.lineTo(-length * 0.15, -carWidth * 0.32);
  context.lineTo(length * 0.17, -carWidth * 0.28);
  context.lineTo(length * 0.27, -carWidth * 0.12);
  context.lineTo(length * 0.49, -carWidth * 0.055);
  context.lineTo(length * 0.56, 0);
  context.lineTo(length * 0.49, carWidth * 0.055);
  context.lineTo(length * 0.27, carWidth * 0.12);
  context.lineTo(length * 0.17, carWidth * 0.28);
  context.lineTo(-length * 0.15, carWidth * 0.32);
  context.lineTo(-length * 0.3, carWidth * 0.23);
  context.lineTo(-length * 0.47, carWidth * 0.15);
  context.closePath();
}

function traceF1Crown(length, carWidth) {
  context.beginPath();
  context.moveTo(-length * 0.37, -carWidth * 0.085);
  context.lineTo(-length * 0.2, -carWidth * 0.14);
  context.lineTo(length * 0.13, -carWidth * 0.115);
  context.lineTo(length * 0.43, -carWidth * 0.035);
  context.lineTo(length * 0.5, 0);
  context.lineTo(length * 0.43, carWidth * 0.035);
  context.lineTo(length * 0.13, carWidth * 0.115);
  context.lineTo(-length * 0.2, carWidth * 0.14);
  context.lineTo(-length * 0.37, carWidth * 0.085);
  context.closePath();
}

function drawCar() {
  const length = car.length;
  const carWidth = car.width;
  const outlineWidth = clamp(carWidth * 0.055, 3.4, 5.4);
  const relativeLight = WORLD_LIGHT_ANGLE - car.angle;
  const lightLocalX = Math.cos(relativeLight);
  const lightLocalY = Math.sin(relativeLight);
  const lightAcrossBody = Math.sin(relativeLight);
  const bodyLift = carWidth * (0.14 + currentSpeedRatio * 0.02);
  const steeringLean = currentSteeringDirection * currentSpeedRatio * carWidth * 0.018;
  context.save();
  context.translate(car.x, car.y);
  context.rotate(car.angle);

  // The projected shadow moves against the fixed world light and stretches with speed.
  context.save();
  const shadowDistance = carWidth * (0.18 + currentSpeedRatio * 0.035);
  context.translate(
    -lightLocalX * shadowDistance - currentSpeedRatio * length * 0.025,
    -lightLocalY * shadowDistance + steeringLean,
  );
  context.filter = `blur(${Math.max(2, carWidth * 0.055)}px)`;
  context.fillStyle = `rgba(7, 9, 8, ${0.43 - currentSpeedRatio * 0.1})`;
  context.beginPath();
  context.ellipse(
    -currentSpeedRatio * length * 0.025,
    0,
    length * (0.56 + currentSpeedRatio * 0.045),
    carWidth * 0.48,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();

  // Four stepped silhouettes create a continuous body wall instead of a flat decal edge.
  const depthColors = ["#3b1211", "#511716", "#681d19", "#81251e"];
  for (let layer = depthColors.length; layer >= 1; layer -= 1) {
    const progress = layer / depthColors.length;
    context.save();
    context.translate(-bodyLift * progress * 0.12, bodyLift * progress + steeringLean * progress);
    context.fillStyle = depthColors[layer - 1];
    context.strokeStyle = "#0a0c0a";
    context.lineWidth = outlineWidth * 0.8;
    traceF1Body(length, carWidth);
    context.fill();
    if (layer === depthColors.length) context.stroke();
    context.restore();
  }

  // Dark lower layer gives the body, wings and tyres visible physical thickness.
  context.save();
  context.translate(-bodyLift * 0.08, bodyLift * 0.92 + steeringLean);
  context.fillStyle = "#651c19";
  context.strokeStyle = "#0b0d0b";
  context.lineWidth = outlineWidth * 0.9;
  traceF1Body(length, carWidth);
  context.fill();
  context.stroke();

  context.fillStyle = "#101310";
  roundedRectangle(length * 0.45, -carWidth * 0.53, length * 0.1, carWidth * 1.06, length * 0.025);
  context.fill();
  context.stroke();
  roundedRectangle(-length * 0.54, -carWidth * 0.48, length * 0.09, carWidth * 0.96, length * 0.022);
  context.fill();
  context.stroke();

  const depthWheelLength = length * 0.21;
  const depthWheelWidth = carWidth * 0.23;
  [-0.31, 0.31].forEach((frontBack) => {
    [-1, 1].forEach((side) => {
      roundedRectangle(
        frontBack * length - depthWheelLength / 2,
        side * carWidth * 0.43 - depthWheelWidth / 2,
        depthWheelLength,
        depthWheelWidth,
        depthWheelWidth * 0.24,
      );
      context.fill();
      context.stroke();
    });
  });
  context.restore();

  // Suspension arms sit behind the body and exposed tyres.
  context.strokeStyle = "#161916";
  context.lineWidth = outlineWidth * 0.62;
  context.lineCap = "round";
  [-1, 1].forEach((side) => {
    context.beginPath();
    context.moveTo(length * 0.17, side * carWidth * 0.16);
    context.lineTo(length * 0.31, side * carWidth * 0.42);
    context.moveTo(length * 0.37, side * carWidth * 0.1);
    context.lineTo(length * 0.31, side * carWidth * 0.42);
    context.moveTo(-length * 0.2, side * carWidth * 0.2);
    context.lineTo(-length * 0.31, side * carWidth * 0.42);
    context.moveTo(-length * 0.39, side * carWidth * 0.13);
    context.lineTo(-length * 0.31, side * carWidth * 0.42);
    context.stroke();
  });

  // Wide front and rear aero wings.
  const wingGradient = context.createLinearGradient(
    -lightLocalX * length * 0.25,
    -lightLocalY * carWidth * 0.58,
    lightLocalX * length * 0.25,
    lightLocalY * carWidth * 0.58,
  );
  wingGradient.addColorStop(0, "#0d100e");
  wingGradient.addColorStop(0.42, "#252925");
  wingGradient.addColorStop(1, "#626a63");
  context.fillStyle = wingGradient;
  context.strokeStyle = "#080a08";
  context.lineWidth = outlineWidth * 0.72;
  roundedRectangle(length * 0.45, -carWidth * 0.53, length * 0.1, carWidth * 1.06, length * 0.025);
  context.fill();
  context.stroke();
  roundedRectangle(-length * 0.54, -carWidth * 0.48, length * 0.09, carWidth * 0.96, length * 0.022);
  context.fill();
  context.stroke();

  context.fillStyle = "#e24c32";
  context.fillRect(length * 0.475, -carWidth * 0.46, length * 0.035, carWidth * 0.92);
  context.fillRect(-length * 0.515, -carWidth * 0.4, length * 0.028, carWidth * 0.8);

  context.strokeStyle = "rgba(223, 232, 224, 0.62)";
  context.lineWidth = outlineWidth * 0.28;
  context.beginPath();
  context.moveTo(length * 0.47, -carWidth * 0.47);
  context.lineTo(length * 0.47, carWidth * 0.38);
  context.moveTo(-length * 0.52, -carWidth * 0.41);
  context.lineTo(-length * 0.52, carWidth * 0.32);
  context.stroke();

  // Raised endplates make both aerodynamic wings read as solid components.
  context.fillStyle = "#111411";
  context.strokeStyle = "#050705";
  context.lineWidth = outlineWidth * 0.42;
  [-1, 1].forEach((side) => {
    roundedRectangle(
      length * 0.435,
      side * carWidth * 0.51 - carWidth * 0.035,
      length * 0.13,
      carWidth * 0.07,
      carWidth * 0.018,
    );
    context.fill();
    context.stroke();
    roundedRectangle(
      -length * 0.555,
      side * carWidth * 0.46 - carWidth * 0.032,
      length * 0.11,
      carWidth * 0.064,
      carWidth * 0.018,
    );
    context.fill();
    context.stroke();
  });

  // Four large exposed F1 tyres make the car substantially wider.
  const wheelLength = length * 0.21;
  const wheelWidth = carWidth * 0.23;
  const tyreGradient = context.createLinearGradient(
    -lightLocalX * wheelLength * 0.5,
    -lightLocalY * wheelWidth * 0.7,
    lightLocalX * wheelLength * 0.5,
    lightLocalY * wheelWidth * 0.7,
  );
  tyreGradient.addColorStop(0, "#070907");
  tyreGradient.addColorStop(0.42, "#171a17");
  tyreGradient.addColorStop(1, "#4b534c");
  context.fillStyle = tyreGradient;
  context.strokeStyle = "#080a08";
  context.lineWidth = outlineWidth * 0.65;
  [-0.31, 0.31].forEach((frontBack) => {
    [-1, 1].forEach((side) => {
      const frontWheelSteer = frontBack > 0 ? currentSteeringDirection * 0.13 : 0;
      const spinProgress = ((wheelRotation / (Math.PI * 2)) % 1 + 1) % 1;
      context.save();
      context.translate(frontBack * length, side * carWidth * 0.43);
      context.rotate(frontWheelSteer);

      roundedRectangle(
        -wheelLength / 2,
        -wheelWidth / 2,
        wheelLength,
        wheelWidth,
        wheelWidth * 0.24,
      );
      context.fill();
      context.stroke();

      // A separate near sidewall makes each tyre read as a thick rubber cylinder.
      context.fillStyle = side > 0 ? "rgba(4, 6, 5, 0.84)" : "rgba(104, 113, 106, 0.42)";
      roundedRectangle(
        -wheelLength * 0.46,
        side > 0 ? wheelWidth * 0.24 : -wheelWidth * 0.38,
        wheelLength * 0.92,
        wheelWidth * 0.14,
        wheelWidth * 0.05,
      );
      context.fill();

      // Tread bands travel along the tyre surface, matching actual forward or reverse motion.
      context.strokeStyle = `rgba(164, 174, 166, ${0.38 + currentSpeedRatio * 0.28})`;
      context.lineWidth = outlineWidth * 0.2;
      for (let tread = 0; tread < 5; tread += 1) {
        const treadX = (((tread / 5 + spinProgress) % 1) - 0.5) * wheelLength * 0.82;
        context.beginPath();
        context.moveTo(treadX - wheelLength * 0.025, -wheelWidth * 0.34);
        context.lineTo(treadX + wheelLength * 0.025, wheelWidth * 0.34);
        context.stroke();
      }

      if (currentSpeedRatio > 0.18) {
        context.strokeStyle = `rgba(205, 216, 207, ${currentSpeedRatio * 0.16})`;
        context.lineWidth = wheelWidth * 0.12;
        context.beginPath();
        context.moveTo(-wheelLength * 0.38, -wheelWidth * 0.18);
        context.lineTo(wheelLength * 0.38, -wheelWidth * 0.18);
        context.moveTo(-wheelLength * 0.38, wheelWidth * 0.18);
        context.lineTo(wheelLength * 0.38, wheelWidth * 0.18);
        context.stroke();
      }

      const wheelFaceLight = clamp(0.42 + side * lightLocalY * 0.42 + lightLocalX * 0.12, 0, 1);
      context.fillStyle = mixRgb([33, 38, 34], [119, 130, 121], wheelFaceLight);
      context.strokeStyle = "#0c0f0d";
      context.lineWidth = outlineWidth * 0.3;
      roundedRectangle(
        -wheelLength * 0.22,
        -wheelWidth * 0.11,
        wheelLength * 0.44,
        wheelWidth * 0.22,
        wheelWidth * 0.08,
      );
      context.fill();
      context.stroke();

      // A rotating hub highlight reinforces wheel rotation at lower speeds.
      context.save();
      context.rotate(wheelRotation);
      context.strokeStyle = "rgba(225, 231, 225, 0.76)";
      context.lineWidth = outlineWidth * 0.19;
      context.beginPath();
      context.moveTo(-wheelWidth * 0.1, 0);
      context.lineTo(wheelWidth * 0.1, 0);
      context.moveTo(0, -wheelWidth * 0.1);
      context.lineTo(0, wheelWidth * 0.1);
      context.stroke();
      context.restore();

      context.fillStyle = tyreGradient;
      context.strokeStyle = "#080a08";
      context.lineWidth = outlineWidth * 0.65;
      context.restore();
    });
  });

  // Central monocoque uses a cross-body gradient to show a raised crown and shaded flank.
  const bodyGradient = context.createLinearGradient(
    -lightLocalX * length * 0.34,
    -lightLocalY * carWidth * 0.42,
    lightLocalX * length * 0.34,
    lightLocalY * carWidth * 0.42,
  );
  bodyGradient.addColorStop(0, "#6f1b19");
  bodyGradient.addColorStop(0.38, "#e34d33");
  bodyGradient.addColorStop(0.72, "#ee6546");
  bodyGradient.addColorStop(1, "#ffad7b");
  context.fillStyle = bodyGradient;
  context.strokeStyle = "#141714";
  context.lineWidth = outlineWidth;
  traceF1Body(length, carWidth);
  context.fill();
  context.stroke();

  // A world-anchored light pool travels around the body as the car rotates beneath it.
  context.save();
  traceF1Body(length, carWidth);
  context.clip();
  const bodyLightPool = context.createRadialGradient(
    lightLocalX * length * 0.3,
    lightLocalY * carWidth * 0.3,
    carWidth * 0.02,
    lightLocalX * length * 0.18,
    lightLocalY * carWidth * 0.18,
    length * 0.48,
  );
  bodyLightPool.addColorStop(0, "rgba(255, 232, 205, 0.42)");
  bodyLightPool.addColorStop(0.45, "rgba(255, 156, 111, 0.11)");
  bodyLightPool.addColorStop(1, "rgba(39, 8, 10, 0.22)");
  context.fillStyle = bodyLightPool;
  context.fillRect(-length * 0.62, -carWidth * 0.55, length * 1.24, carWidth * 1.1);
  context.restore();

  // A raised centre spine adds a second top plane with its own highlight and side face.
  context.save();
  context.translate(-bodyLift * 0.08, bodyLift * 0.22 + steeringLean * 0.45);
  context.fillStyle = "rgba(77, 18, 17, 0.86)";
  context.strokeStyle = "#151715";
  context.lineWidth = outlineWidth * 0.48;
  traceF1Crown(length, carWidth);
  context.fill();
  context.stroke();
  context.restore();

  context.save();
  context.translate(-bodyLift * 0.14, -bodyLift * 0.18 + steeringLean * 0.2);
  const crownGradient = context.createLinearGradient(
    -lightLocalX * length * 0.28,
    -lightLocalY * carWidth * 0.18,
    lightLocalX * length * 0.28,
    lightLocalY * carWidth * 0.18,
  );
  crownGradient.addColorStop(0, "#741e1b");
  crownGradient.addColorStop(0.48, "#e34e34");
  crownGradient.addColorStop(1, "#ffb083");
  context.fillStyle = crownGradient;
  context.strokeStyle = "#171917";
  context.lineWidth = outlineWidth * 0.7;
  traceF1Crown(length, carWidth);
  context.fill();
  context.stroke();
  context.restore();

  // The near-side skirt is a visible side face beneath the top body plane.
  context.fillStyle = "rgba(92, 22, 20, 0.88)";
  context.strokeStyle = "#151715";
  context.lineWidth = outlineWidth * 0.55;
  context.beginPath();
  context.moveTo(-length * 0.46, carWidth * 0.15);
  context.lineTo(-length * 0.29, carWidth * 0.23);
  context.lineTo(-length * 0.14, carWidth * 0.32);
  context.lineTo(length * 0.17, carWidth * 0.28);
  context.lineTo(length * 0.27, carWidth * 0.12);
  context.lineTo(length * 0.49, carWidth * 0.055);
  context.lineTo(length * 0.46, carWidth * 0.13);
  context.lineTo(length * 0.18, carWidth * 0.35);
  context.lineTo(-length * 0.15, carWidth * 0.4);
  context.lineTo(-length * 0.48, carWidth * 0.22);
  context.closePath();
  context.fill();
  context.stroke();

  // Sculpted sidepods widen the body without hiding the suspension.
  [-1, 1].forEach((side) => {
    const sideLight = clamp(0.48 + side * lightLocalY * 0.46 + lightLocalX * 0.08, 0, 1);
    const podGradient = context.createLinearGradient(
      -lightLocalX * length * 0.16,
      -lightLocalY * carWidth * 0.34,
      lightLocalX * length * 0.16,
      lightLocalY * carWidth * 0.34,
    );
    podGradient.addColorStop(0, mixRgb([78, 18, 17], [203, 56, 39], sideLight * 0.5));
    podGradient.addColorStop(1, mixRgb([111, 25, 21], [255, 143, 97], sideLight));
    context.fillStyle = podGradient;
    context.strokeStyle = "#141714";
    context.lineWidth = outlineWidth * 0.72;
    context.beginPath();
    context.moveTo(-length * 0.25, side * carWidth * 0.18);
    context.lineTo(-length * 0.14, side * carWidth * 0.35);
    context.lineTo(length * 0.15, side * carWidth * 0.32);
    context.lineTo(length * 0.22, side * carWidth * 0.17);
    context.closePath();
    context.fill();
    context.stroke();

    // Dark intake cavities break up the sidepods and reveal their depth.
    context.fillStyle = "rgba(18, 20, 18, 0.9)";
    context.strokeStyle = side > 0 ? "rgba(255, 111, 78, 0.34)" : "rgba(255, 186, 145, 0.58)";
    context.lineWidth = outlineWidth * 0.28;
    context.beginPath();
    context.moveTo(-length * 0.21, side * carWidth * 0.215);
    context.lineTo(-length * 0.12, side * carWidth * 0.285);
    context.lineTo(-length * 0.035, side * carWidth * 0.27);
    context.lineTo(-length * 0.08, side * carWidth * 0.205);
    context.closePath();
    context.fill();
    context.stroke();
  });

  // Fine panel seams and fasteners remain visible at the higher render scale.
  context.strokeStyle = "rgba(73, 20, 17, 0.72)";
  context.lineWidth = outlineWidth * 0.28;
  context.beginPath();
  context.moveTo(-length * 0.31, 0);
  context.lineTo(-length * 0.16, 0);
  context.moveTo(length * 0.16, -carWidth * 0.23);
  context.lineTo(length * 0.16, carWidth * 0.23);
  context.moveTo(length * 0.28, -carWidth * 0.1);
  context.lineTo(length * 0.28, carWidth * 0.1);
  context.stroke();

  context.fillStyle = "rgba(235, 174, 139, 0.82)";
  [-1, 1].forEach((side) => {
    context.beginPath();
    context.arc(-length * 0.22, side * carWidth * 0.16, carWidth * 0.014, 0, Math.PI * 2);
    context.fill();
  });

  // The cockpit has its own lower shell, then the driver assembly sits on a raised plane.
  context.save();
  context.translate(-bodyLift * 0.04, bodyLift * 0.22 + steeringLean * 0.25);
  context.fillStyle = "rgba(7, 9, 8, 0.88)";
  context.beginPath();
  context.ellipse(-length * 0.08, 0, length * 0.19, carWidth * 0.18, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.save();
  context.translate(-bodyLift * 0.1, -bodyLift * 0.17 + steeringLean * 0.12);
  // Open cockpit, driver helmet and protective halo.
  context.fillStyle = "#171b19";
  context.strokeStyle = "#171a17";
  context.lineWidth = outlineWidth * 0.82;
  context.beginPath();
  context.ellipse(-length * 0.08, 0, length * 0.18, carWidth * 0.17, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  const cockpitGradient = context.createRadialGradient(
    -length * 0.11,
    -carWidth * 0.07,
    carWidth * 0.02,
    -length * 0.08,
    0,
    carWidth * 0.17,
  );
  cockpitGradient.addColorStop(0, "#59635c");
  cockpitGradient.addColorStop(0.45, "#202521");
  cockpitGradient.addColorStop(1, "#080a08");
  context.fillStyle = cockpitGradient;
  context.beginPath();
  context.ellipse(-length * 0.08, 0, length * 0.145, carWidth * 0.13, 0, 0, Math.PI * 2);
  context.fill();

  const helmetGradient = context.createRadialGradient(
    -length * 0.075,
    -carWidth * 0.045,
    carWidth * 0.012,
    -length * 0.05,
    0,
    carWidth * 0.1,
  );
  helmetGradient.addColorStop(0, "#fff2a0");
  helmetGradient.addColorStop(0.42, "#f1c447");
  helmetGradient.addColorStop(1, "#9b6720");
  context.fillStyle = helmetGradient;
  context.beginPath();
  context.arc(-length * 0.05, 0, carWidth * 0.09, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = "#58a3bb";
  context.beginPath();
  context.arc(-length * 0.025, 0, carWidth * 0.045, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "rgba(226, 244, 244, 0.72)";
  context.lineWidth = outlineWidth * 0.28;
  context.beginPath();
  context.arc(-length * 0.06, -carWidth * 0.005, carWidth * 0.062, Math.PI * 1.1, Math.PI * 1.75);
  context.stroke();

  context.strokeStyle = "#262a27";
  context.lineWidth = outlineWidth * 0.72;
  context.beginPath();
  context.moveTo(-length * 0.15, -carWidth * 0.18);
  context.lineTo(length * 0.06, 0);
  context.lineTo(-length * 0.15, carWidth * 0.18);
  context.moveTo(length * 0.06, 0);
  context.lineTo(length * 0.13, 0);
  context.stroke();
  context.restore();

  // Nose stripe, number and crisp body highlights.
  context.save();
  context.translate(0, carWidth * 0.035);
  context.fillStyle = "rgba(66, 17, 15, 0.56)";
  context.beginPath();
  context.moveTo(length * 0.14, -carWidth * 0.075);
  context.lineTo(length * 0.48, -carWidth * 0.03);
  context.lineTo(length * 0.48, carWidth * 0.03);
  context.lineTo(length * 0.14, carWidth * 0.075);
  context.closePath();
  context.fill();
  context.restore();

  context.fillStyle = "#f2e9d8";
  context.beginPath();
  context.moveTo(length * 0.14, -carWidth * 0.075);
  context.lineTo(length * 0.48, -carWidth * 0.03);
  context.lineTo(length * 0.48, carWidth * 0.03);
  context.lineTo(length * 0.14, carWidth * 0.075);
  context.closePath();
  context.fill();

  context.fillStyle = "#171a17";
  context.font = `900 ${Math.round(length * 0.11)}px ui-sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("7", length * 0.27, 0);

  const litSide = lightLocalY >= 0 ? 1 : -1;
  const highlightStrength = clamp(0.45 + Math.abs(lightLocalY) * 0.36, 0.35, 0.86);
  context.strokeStyle = `rgba(255, 218, 190, ${highlightStrength})`;
  context.lineWidth = outlineWidth * 0.42;
  context.beginPath();
  context.moveTo(-length * 0.39, litSide * carWidth * 0.1);
  context.lineTo(-length * 0.16, litSide * carWidth * 0.24);
  context.lineTo(length * 0.15, litSide * carWidth * 0.21);
  context.lineTo(length * 0.42, litSide * carWidth * 0.07);
  context.stroke();

  // A short moving specular stroke makes the paint react as the car changes heading.
  const highlightPosition = clamp(lightLocalY * carWidth * 0.14, -carWidth * 0.12, carWidth * 0.12);
  context.strokeStyle = `rgba(255, 239, 218, ${0.2 + Math.abs(lightAcrossBody) * 0.38})`;
  context.lineWidth = outlineWidth * 0.3;
  context.beginPath();
  context.moveTo(-length * 0.22 + lightLocalX * length * 0.05, highlightPosition);
  context.quadraticCurveTo(length * 0.04, highlightPosition * 1.25, length * 0.34 + lightLocalX * length * 0.04, highlightPosition * 0.4);
  context.stroke();
  context.restore();
}

function drawCarAfterimages() {
  if (currentSpeedRatio < 0.08 || reducedMotionQuery.matches) {
    return;
  }

  const layerCount = Math.ceil(currentSpeedRatio * MAX_MOTION_TRAIL_FRAMES);
  const directionX = Math.cos(car.angle);
  const directionY = Math.sin(car.angle);

  for (let layer = layerCount; layer >= 1; layer -= 1) {
    const layerProgress = layer / (layerCount + 1);
    const trailDistance =
      car.length * layer * (0.08 + currentSpeedRatio * 0.055);
    context.save();
    context.globalAlpha =
      (0.035 + currentSpeedRatio * 0.065) * (1 - layerProgress * 0.68);
    context.translate(-directionX * trailDistance, -directionY * trailDistance);
    drawCarGhost();
    context.restore();
  }
}

function drawCarGhost() {
  const length = car.length;
  const carWidth = car.width;
  context.save();
  context.translate(car.x, car.y);
  context.rotate(car.angle);

  context.fillStyle = "#191c19";
  [-1, 1].forEach((side) => {
    roundedRectangle(-length * 0.3, side * carWidth * 0.31 - carWidth * 0.11, length * 0.2, carWidth * 0.22, carWidth * 0.04);
    context.fill();
    roundedRectangle(length * 0.1, side * carWidth * 0.32 - carWidth * 0.105, length * 0.18, carWidth * 0.21, carWidth * 0.04);
    context.fill();
  });
  context.fillRect(-length * 0.48, -carWidth * 0.38, length * 0.15, carWidth * 0.76);
  context.fillRect(length * 0.38, -carWidth * 0.34, length * 0.1, carWidth * 0.68);

  context.fillStyle = "#d94c32";
  traceF1Body(length, carWidth);
  context.fill();
  context.restore();
}

function captureWorldMotionFrame(deltaTime) {
  if (reducedMotionQuery.matches) return;
  if (currentSpeedRatio < 0.04) {
    motionCaptureAccumulator = 0;
    if (currentSpeedRatio < 0.015) motionTrailFrames = [];
    return;
  }

  motionCaptureAccumulator += deltaTime;
  const captureInterval = 0.12 - currentSpeedRatio * 0.07;
  if (motionCaptureAccumulator < captureInterval) return;
  motionCaptureAccumulator = 0;

  const frame = motionTrailFrames.length < MAX_WORLD_TRAIL_FRAMES
    ? document.createElement("canvas")
    : motionTrailFrames.pop();
  const trailScale = Math.min(renderScale, MAX_TRAIL_RENDER_SCALE);
  const trailWidth = Math.round(width * trailScale);
  const trailHeight = Math.round(height * trailScale);
  if (frame.width !== trailWidth || frame.height !== trailHeight) {
    frame.width = trailWidth;
    frame.height = trailHeight;
  }
  const frameContext = frame.getContext("2d");
  frameContext.setTransform(1, 0, 0, 1, 0, 0);
  frameContext.imageSmoothingEnabled = true;
  frameContext.imageSmoothingQuality = "high";
  frameContext.clearRect(0, 0, frame.width, frame.height);
  frameContext.drawImage(canvas, 0, 0, frame.width, frame.height);
  motionTrailFrames.unshift(frame);
}

function drawWorldAfterimages() {
  if (motionTrailFrames.length === 0 || currentSpeedRatio < 0.08) return;
  const layerCount = Math.min(
    motionTrailFrames.length,
    Math.ceil(currentSpeedRatio * MAX_WORLD_TRAIL_FRAMES),
  );

  context.save();
  context.globalCompositeOperation = "screen";
  for (let layer = layerCount - 1; layer >= 0; layer -= 1) {
    const layerProgress = (layer + 1) / (layerCount + 1);
    context.globalAlpha =
      (0.012 + currentSpeedRatio * 0.022) * (1 - layerProgress * 0.5);
    context.drawImage(motionTrailFrames[layer], 0, 0, width, height);
  }
  context.restore();
}

function drawScreenLighting() {
  context.save();
  const vignette = context.createRadialGradient(
    width * 0.5,
    height * 0.46,
    Math.min(width, height) * 0.22,
    width * 0.5,
    height * 0.48,
    Math.max(width, height) * 0.72,
  );
  vignette.addColorStop(0, "rgba(5, 8, 6, 0)");
  vignette.addColorStop(0.72, "rgba(5, 8, 6, 0.035)");
  vignette.addColorStop(1, "rgba(5, 8, 6, 0.2)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  const light = context.createLinearGradient(0, 0, width * 0.7, height * 0.8);
  light.addColorStop(0, "rgba(255, 244, 218, 0.055)");
  light.addColorStop(0.48, "rgba(255, 244, 218, 0)");
  context.fillStyle = light;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function applyWorldCamera() {
  context.translate(width / 2, height / 2);
  context.transform(1, -0.08, worldTiltX, worldTiltY, 0, 0);
  context.scale(cameraZoom, cameraZoom);
  context.translate(-car.x, -car.y);
}

function drawScene(deltaTime) {
  context.clearRect(0, 0, width, height);

  // Draw and capture the moving world separately so the road and grass gain speed echoes.
  context.save();
  applyWorldCamera();
  drawGrass();
  drawTrack();
  context.restore();

  captureWorldMotionFrame(deltaTime);
  drawWorldAfterimages();

  // Keep the current F1 crisp while stacking speed-dependent ghosts behind it.
  context.save();
  applyWorldCamera();
  drawCarAfterimages();
  drawCar();
  context.restore();
  drawScreenLighting();
}

function updateDemoControls() {
  if (!demoMode) return;
  if (demoMode === "speed-test") {
    controls.up = true;
    controls.left = false;
    controls.right = false;
    return;
  }
  if (demoMode === "turn-test") {
    controls.up = true;
    controls.left = false;
    controls.right = elapsed > 2.5 && elapsed < 4.8;
    return;
  }
  if (demoMode === "continuous") {
    controls.up = true;
    controls.left = false;
    controls.right = elapsed > 0.6;
    return;
  }
  controls.up = elapsed < 2.8;
  controls.left = false;
  controls.right = elapsed > 0.75 && elapsed < 2.8;
}

function publishDiagnostics() {
  stage.dataset.driveState = driveState.textContent;
  stage.dataset.onTrack = String(onTrack);
  stage.dataset.airWallImpact = String(airWallImpact > 0);
  stage.dataset.airWallHits = String(airWallHits);
  stage.dataset.vehicle = "f1";
  stage.dataset.vehicleDepth = "multi-plane-3d";
  stage.dataset.vehicleDepthLayers = "6";
  stage.dataset.dynamicCarLighting = "true";
  stage.dataset.worldLightAngle = WORLD_LIGHT_ANGLE.toFixed(3);
  stage.dataset.carLightLocalX = Math.cos(WORLD_LIGHT_ANGLE - car.angle).toFixed(3);
  stage.dataset.carLightLocalY = Math.sin(WORLD_LIGHT_ANGLE - car.angle).toFixed(3);
  stage.dataset.projectedCarShadow = "true";
  stage.dataset.wheelSidewalls = "true";
  stage.dataset.wheelSpin = Math.abs(currentSpeedRatio) > 0.008 ? "active" : "stopped";
  stage.dataset.wheelRotation = wheelRotation.toFixed(3);
  stage.dataset.frontWheelSteer = (currentSteeringDirection * 0.13).toFixed(3);
  stage.dataset.steeringLean = currentSteeringDirection.toFixed(2);
  stage.dataset.renderQuality = "high";
  stage.dataset.performanceMode = "optimized";
  stage.dataset.fps = String(Math.round(smoothedFps));
  stage.dataset.renderScale = renderScale.toFixed(2);
  stage.dataset.imageSmoothing = context.imageSmoothingQuality;
  stage.dataset.roadTexture = "detailed";
  stage.dataset.driftEnabled = "false";
  stage.dataset.visibleFences = "false";
  stage.dataset.topSpeedKmh = String(TOP_SPEED_KMH);
  stage.dataset.speedMultiplier = String(SPEED_MULTIPLIER);
  stage.dataset.accelerationProfile = "progressive";
  stage.dataset.turnSlowdown = turnSlowdownAmount.toFixed(3);
  stage.dataset.ghostLayers = String(
    currentSpeedRatio < 0.08 ? 0 : Math.ceil(currentSpeedRatio * MAX_MOTION_TRAIL_FRAMES),
  );
  stage.dataset.worldGhostFrames = String(motionTrailFrames.length);
  stage.dataset.speedRatio = currentSpeedRatio.toFixed(3);
  stage.dataset.currentMap = currentMapKey;
  stage.dataset.currentMapName = MAPS[currentMapKey].name;
  stage.dataset.bendCount = String(MAPS[currentMapKey].bendCount);
  stage.dataset.bendType = MAPS[currentMapKey].bendType;
  stage.dataset.trackClosed = String(MAPS[currentMapKey].closed !== false);
  stage.dataset.trackPathType = MAPS[currentMapKey].pathType || "circuit";
  stage.dataset.availableMaps = String(Object.keys(MAPS).length);
  stage.dataset.cameraZoom = String(cameraZoom);
  stage.dataset.cameraView = "wide";
  stage.dataset.worldTiltX = String(worldTiltX);
  stage.dataset.worldTiltY = String(worldTiltY);
  stage.dataset.carScreenX = String(Math.round(width / 2));
  stage.dataset.carScreenY = String(Math.round(height / 2));
  stage.dataset.trackLength = String(Math.round(trackLength));
  stage.dataset.trackWidth = String(Math.round(trackWidth));
  stage.dataset.worldWidth = String(Math.round(worldWidth));
  stage.dataset.worldHeight = String(Math.round(worldHeight));
}

function gameLoop(timestamp) {
  const rawDeltaTime = (timestamp - lastFrame) / 1000 || 1 / 60;
  const instantaneousFps = 1 / Math.max(rawDeltaTime, 1 / 240);
  smoothedFps += (instantaneousFps - smoothedFps) * 0.08;
  const deltaTime = Math.min(0.033, rawDeltaTime);
  lastFrame = timestamp;
  elapsed += deltaTime;
  updateDemoControls();
  updateCar(deltaTime);
  publishDiagnostics();
  drawScene(deltaTime);
  window.requestAnimationFrame(gameLoop);
}

function updateKeyboardControl(event, pressed) {
  const keyMap = {
    ArrowUp: "up",
    w: "up",
    W: "up",
    ArrowDown: "down",
    s: "down",
    S: "down",
    ArrowLeft: "left",
    a: "left",
    A: "left",
    ArrowRight: "right",
    d: "right",
    D: "right",
  };
  const control = keyMap[event.key];
  if (!control) return;
  event.preventDefault();
  controls[control] = pressed;
  if (pressed) controlCard.classList.add("faded");
}

document.addEventListener("keydown", (event) => {
  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    resetCar();
    return;
  }
  updateKeyboardControl(event, true);
});

document.addEventListener("keyup", (event) => updateKeyboardControl(event, false));
window.addEventListener("blur", () => Object.keys(controls).forEach((key) => { controls[key] = false; }));

document.querySelectorAll("[data-control]").forEach((button) => {
  const control = button.dataset.control;
  const setPressed = (pressed) => {
    controls[control] = pressed;
    button.classList.toggle("pressed", pressed);
    if (pressed) controlCard.classList.add("faded");
  };
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    setPressed(true);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
    button.addEventListener(eventName, () => setPressed(false));
  });
});

mapToggle.addEventListener("click", () => {
  setMapMenuOpen(mapMenu.hidden);
});

document.querySelectorAll("[data-map]").forEach((option) => {
  option.addEventListener("click", () => selectMap(option.dataset.map));
});

document.addEventListener("click", (event) => {
  if (!mapSelector.contains(event.target)) setMapMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMapMenuOpen(false);
});

const resizeObserver = new ResizeObserver(resizeCanvas);
resizeObserver.observe(stage);
resizeCanvas();
window.requestAnimationFrame(gameLoop);

window.raceDebug = {
  snapshot: () => ({
    speed: Number(speedValue.textContent),
    state: driveState.textContent,
    onTrack,
    vehicle: "f1",
    vehicleDepth: "multi-plane-3d",
    vehicleDepthLayers: 6,
    dynamicCarLighting: true,
    worldLightAngle: WORLD_LIGHT_ANGLE,
    carLightLocalX: Math.cos(WORLD_LIGHT_ANGLE - car.angle),
    carLightLocalY: Math.sin(WORLD_LIGHT_ANGLE - car.angle),
    projectedCarShadow: true,
    wheelSidewalls: true,
    wheelSpin: Math.abs(currentSpeedRatio) > 0.008 ? "active" : "stopped",
    wheelRotation,
    frontWheelSteer: currentSteeringDirection * 0.13,
    renderQuality: "high",
    performanceMode: "optimized",
    fps: Math.round(smoothedFps),
    renderScale,
    imageSmoothing: context.imageSmoothingQuality,
    roadTexture: "detailed",
    driftEnabled: false,
    airWallHits,
    topSpeedKmh: TOP_SPEED_KMH,
    speedMultiplier: SPEED_MULTIPLIER,
    accelerationProfile: "progressive",
    turnSlowdown: turnSlowdownAmount,
    ghostLayers:
      currentSpeedRatio < 0.08 ? 0 : Math.ceil(currentSpeedRatio * MAX_MOTION_TRAIL_FRAMES),
    worldGhostFrames: motionTrailFrames.length,
    speedRatio: currentSpeedRatio,
    currentMap: currentMapKey,
    currentMapName: MAPS[currentMapKey].name,
    bendCount: MAPS[currentMapKey].bendCount,
    bendType: MAPS[currentMapKey].bendType,
    trackClosed: MAPS[currentMapKey].closed !== false,
    trackPathType: MAPS[currentMapKey].pathType || "circuit",
    availableMaps: Object.keys(MAPS).length,
    cameraZoom,
    cameraView: "wide",
    trackSamples: trackSamples.length,
  }),
};
