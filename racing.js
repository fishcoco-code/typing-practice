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
const MAX_MOTION_TRAIL_FRAMES = 6;

const controls = {
  up: false,
  down: false,
  left: false,
  right: false,
};

const MAPS = {
  meadow: {
    name: "绿野大奖赛",
    description: "开阔草坪 · 连续高速弯",
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
      [0.18, 0.78], [0.08, 0.53], [0.16, 0.21], [0.37, 0.12],
      [0.55, 0.24], [0.78, 0.11], [0.91, 0.31], [0.78, 0.53],
      [0.88, 0.79], [0.66, 0.89], [0.47, 0.72], [0.28, 0.9],
    ],
  },
  coast: {
    name: "海岸公路",
    description: "金色海岸 · 长直道",
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
      [0.12, 0.75], [0.08, 0.38], [0.2, 0.12], [0.48, 0.1],
      [0.76, 0.16], [0.91, 0.39], [0.82, 0.61], [0.93, 0.83],
      [0.62, 0.9], [0.42, 0.82], [0.25, 0.9],
    ],
  },
  neon: {
    name: "霓虹都市",
    description: "夜间街区 · 技术弯道",
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
      [0.16, 0.8], [0.08, 0.55], [0.13, 0.2], [0.36, 0.09],
      [0.5, 0.31], [0.67, 0.1], [0.9, 0.2], [0.82, 0.46],
      [0.93, 0.72], [0.73, 0.9], [0.52, 0.68], [0.34, 0.92],
    ],
  },
  canyon: {
    name: "沙漠峡谷",
    description: "赤色荒漠 · 大回环",
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
      [0.14, 0.72], [0.07, 0.42], [0.2, 0.14], [0.42, 0.08],
      [0.6, 0.2], [0.78, 0.1], [0.93, 0.3], [0.83, 0.49],
      [0.92, 0.76], [0.7, 0.92], [0.49, 0.8], [0.31, 0.93],
      [0.22, 0.78],
    ],
  },
};

let width = 1000;
let height = 650;
let worldWidth = 2200;
let worldHeight = 1050;
let trackWidth = 126;
let trackSamples = [];
let trackLength = 0;
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
let turnSlowdownAmount = 0;
let motionTrailFrames = [];
let motionCaptureAccumulator = 0;
let currentMapKey = "meadow";
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
  const points = MAPS[currentMapKey].shape.map(([x, y]) => ({
    x: x * worldWidth,
    y: y * worldHeight,
  }));
  const samples = [];

  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length];
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const next = points[(index + 2) % points.length];

    for (let step = 0; step < 64; step += 1) {
      samples.push(catmullRom(previous, start, end, next, step / 64));
    }
  }

  trackSamples = samples.map((point, index) => {
    const following = samples[(index + 1) % samples.length];
    const angle = Math.atan2(following.y - point.y, following.x - point.x);
    return { ...point, angle };
  });
  trackLength = trackSamples.reduce((total, point, index) => {
    const following = trackSamples[(index + 1) % trackSamples.length];
    return total + Math.hypot(following.x - point.x, following.y - point.y);
  }, 0);
}

function resetCar() {
  const start = trackSamples[0];
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
  turnSlowdownAmount = 0;
  motionTrailFrames = [];
  motionCaptureAccumulator = 0;
}

function resizeCanvas() {
  const bounds = stage.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(320, bounds.width);
  height = Math.max(420, bounds.height);
  // Double the complete circuit footprint again for a much longer lap.
  worldWidth = width * 18.8;
  worldHeight = height * 13.2;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  // Double the current road width while keeping it proportional on every screen.
  trackWidth = clamp(Math.min(width, height) * 1.32, 512, 840);
  // Pull the camera back so the larger circuit and upcoming bends stay visible.
  cameraZoom = width < 600 ? 0.96 : 1.12;
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

function createTrackPath() {
  const path = new Path2D();
  trackSamples.forEach((point, index) => {
    if (index === 0) path.moveTo(point.x, point.y);
    else path.lineTo(point.x, point.y);
  });
  path.closePath();
  return path;
}

function getNearestTrackPoint(x, y) {
  let nearest = trackSamples[0];
  let shortest = Number.POSITIVE_INFINITY;
  for (let index = 0; index < trackSamples.length; index += 1) {
    const point = trackSamples[index];
    const distance = Math.hypot(x - point.x, y - point.y);
    if (distance < shortest) {
      shortest = distance;
      nearest = point;
    }
  }
  return { point: nearest, distance: shortest };
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

function drawTrack() {
  const { palette } = MAPS[currentMapKey];
  const path = createTrackPath();
  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";

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

function drawCar() {
  const length = car.length;
  const carWidth = car.width;
  const outlineWidth = clamp(carWidth * 0.055, 3.4, 5.4);
  context.save();
  context.translate(car.x, car.y);
  context.rotate(car.angle);

  // Broad ground shadow anchors the open-wheel silhouette.
  context.save();
  context.translate(carWidth * 0.08, carWidth * 0.12);
  context.fillStyle = "rgba(10, 12, 10, 0.38)";
  roundedRectangle(-length * 0.54, -carWidth * 0.53, length * 1.1, carWidth * 1.06, carWidth * 0.15);
  context.fill();
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
  context.fillStyle = "#232623";
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

  // Four large exposed F1 tyres make the car substantially wider.
  context.fillStyle = "#151815";
  context.strokeStyle = "#080a08";
  context.lineWidth = outlineWidth * 0.65;
  const wheelLength = length * 0.21;
  const wheelWidth = carWidth * 0.23;
  [-0.31, 0.31].forEach((frontBack) => {
    [-1, 1].forEach((side) => {
      roundedRectangle(
        frontBack * length - wheelLength / 2,
        side * carWidth * 0.43 - wheelWidth / 2,
        wheelLength,
        wheelWidth,
        wheelWidth * 0.24,
      );
      context.fill();
      context.stroke();

      context.strokeStyle = "#59605a";
      context.lineWidth = outlineWidth * 0.28;
      context.beginPath();
      context.moveTo(frontBack * length - wheelLength * 0.22, side * carWidth * 0.43);
      context.lineTo(frontBack * length + wheelLength * 0.22, side * carWidth * 0.43);
      context.stroke();
      context.strokeStyle = "#080a08";
      context.lineWidth = outlineWidth * 0.65;
    });
  });

  // Central monocoque with a long tapered F1 nose.
  context.fillStyle = "#df4931";
  context.strokeStyle = "#141714";
  context.lineWidth = outlineWidth;
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
  context.fill();
  context.stroke();

  // Sculpted sidepods widen the body without hiding the suspension.
  [-1, 1].forEach((side) => {
    context.fillStyle = side > 0 ? "#a92d22" : "#f06b45";
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
  });

  // Open cockpit, driver helmet and protective halo.
  context.fillStyle = "#171b19";
  context.strokeStyle = "#171a17";
  context.lineWidth = outlineWidth * 0.82;
  context.beginPath();
  context.ellipse(-length * 0.08, 0, length * 0.18, carWidth * 0.17, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = "#f1c447";
  context.beginPath();
  context.arc(-length * 0.05, 0, carWidth * 0.09, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = "#58a3bb";
  context.beginPath();
  context.arc(-length * 0.025, 0, carWidth * 0.045, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#262a27";
  context.lineWidth = outlineWidth * 0.72;
  context.beginPath();
  context.moveTo(-length * 0.15, -carWidth * 0.18);
  context.lineTo(length * 0.06, 0);
  context.lineTo(-length * 0.15, carWidth * 0.18);
  context.moveTo(length * 0.06, 0);
  context.lineTo(length * 0.13, 0);
  context.stroke();

  // Nose stripe, number and crisp body highlights.
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

  context.strokeStyle = "rgba(255, 185, 139, 0.86)";
  context.lineWidth = outlineWidth * 0.42;
  context.beginPath();
  context.moveTo(-length * 0.39, -carWidth * 0.1);
  context.lineTo(-length * 0.2, -carWidth * 0.22);
  context.moveTo(-length * 0.39, carWidth * 0.1);
  context.lineTo(-length * 0.2, carWidth * 0.22);
  context.stroke();
  context.restore();
}

function drawCarAfterimages() {
  if (currentSpeedRatio < 0.08 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
    drawCar();
    context.restore();
  }
}

function captureWorldMotionFrame(deltaTime) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (currentSpeedRatio < 0.04) {
    motionCaptureAccumulator = 0;
    if (currentSpeedRatio < 0.015) motionTrailFrames = [];
    return;
  }

  motionCaptureAccumulator += deltaTime;
  const captureInterval = 0.12 - currentSpeedRatio * 0.07;
  if (motionCaptureAccumulator < captureInterval) return;
  motionCaptureAccumulator = 0;

  const frame = motionTrailFrames.length < MAX_MOTION_TRAIL_FRAMES
    ? document.createElement("canvas")
    : motionTrailFrames.pop();
  if (frame.width !== canvas.width || frame.height !== canvas.height) {
    frame.width = canvas.width;
    frame.height = canvas.height;
  }
  const frameContext = frame.getContext("2d");
  frameContext.setTransform(1, 0, 0, 1, 0, 0);
  frameContext.clearRect(0, 0, frame.width, frame.height);
  frameContext.drawImage(canvas, 0, 0);
  motionTrailFrames.unshift(frame);
}

function drawWorldAfterimages() {
  if (motionTrailFrames.length === 0 || currentSpeedRatio < 0.08) return;
  const layerCount = Math.min(
    motionTrailFrames.length,
    Math.ceil(currentSpeedRatio * MAX_MOTION_TRAIL_FRAMES),
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
  stage.dataset.availableMaps = String(Object.keys(MAPS).length);
  stage.dataset.cameraZoom = String(cameraZoom);
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
  const deltaTime = Math.min(0.033, (timestamp - lastFrame) / 1000 || 0);
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
    availableMaps: Object.keys(MAPS).length,
    trackSamples: trackSamples.length,
  }),
};
