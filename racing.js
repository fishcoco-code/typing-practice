const canvas = document.querySelector("#raceCanvas");
const context = canvas.getContext("2d");
const stage = document.querySelector("#gameStage");
const speedValue = document.querySelector("#speedValue");
const driveState = document.querySelector("#driveState");
const controlCard = document.querySelector("#controlCard");

const controls = {
  up: false,
  down: false,
  left: false,
  right: false,
  drift: false,
};

const trackShape = [
  [0.18, 0.78],
  [0.08, 0.53],
  [0.16, 0.21],
  [0.37, 0.12],
  [0.55, 0.24],
  [0.78, 0.11],
  [0.91, 0.31],
  [0.78, 0.53],
  [0.88, 0.79],
  [0.66, 0.89],
  [0.47, 0.72],
  [0.28, 0.9],
];

let width = 1000;
let height = 650;
let trackWidth = 126;
let trackSamples = [];
let tireMarks = [];
let smokeParticles = [];
let previousRearWheels = null;
let smokeAccumulator = 0;
let lastFrame = performance.now();
let elapsed = 0;
let hasDriven = false;
let isDrifting = false;
let onTrack = true;
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
  const points = trackShape.map(([x, y]) => ({ x: x * width, y: y * height }));
  const samples = [];

  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length];
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const next = points[(index + 2) % points.length];

    for (let step = 0; step < 18; step += 1) {
      samples.push(catmullRom(previous, start, end, next, step / 18));
    }
  }

  trackSamples = samples.map((point, index) => {
    const following = samples[(index + 1) % samples.length];
    const angle = Math.atan2(following.y - point.y, following.x - point.x);
    return { ...point, angle };
  });
}

function resetCar() {
  const start = trackSamples[0];
  car.x = start.x;
  car.y = start.y;
  car.angle = start.angle;
  car.velocityX = 0;
  car.velocityY = 0;
  previousRearWheels = null;
  isDrifting = false;
  onTrack = true;
}

function resizeCanvas() {
  const bounds = stage.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(320, bounds.width);
  height = Math.max(420, bounds.height);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  trackWidth = clamp(Math.min(width, height) * 0.205, 78, 142);
  car.length = trackWidth * 0.56;
  car.width = car.length * 0.51;
  buildTrack();
  tireMarks = [];
  smokeParticles = [];
  resetCar();
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

function distanceToTrack(x, y) {
  let shortest = Number.POSITIVE_INFINITY;
  for (let index = 0; index < trackSamples.length; index += 2) {
    const point = trackSamples[index];
    shortest = Math.min(shortest, Math.hypot(x - point.x, y - point.y));
  }
  return shortest;
}

function drawGrass() {
  context.fillStyle = "#78945e";
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.16;
  context.strokeStyle = "#263d28";
  context.lineWidth = 1;
  const gap = Math.max(22, Math.min(width, height) * 0.045);
  for (let x = -height; x < width + height; x += gap) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + height, height);
    context.stroke();
  }
  context.restore();

  context.fillStyle = "rgba(31, 58, 31, 0.23)";
  for (let index = 0; index < 44; index += 1) {
    const x = ((index * 173) % 997) / 997 * width;
    const y = ((index * 277) % 643) / 643 * height;
    context.beginPath();
    context.arc(x, y, 2 + (index % 4), 0, Math.PI * 2);
    context.fill();
  }
}

function drawCurbs() {
  const offset = trackWidth / 2 + 1;
  const curbLength = Math.max(12, trackWidth * 0.13);
  const curbDepth = Math.max(7, trackWidth * 0.075);

  for (let index = 0; index < trackSamples.length; index += 5) {
    const point = trackSamples[index];
    context.save();
    context.translate(point.x, point.y);
    context.rotate(point.angle);
    context.fillStyle = index % 10 === 0 ? "#f4ecda" : "#e45536";
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
  context.save();
  context.strokeStyle = "rgba(18, 20, 18, 0.44)";
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
  const path = createTrackPath();
  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";

  context.strokeStyle = "#191c19";
  context.lineWidth = trackWidth + 20;
  context.stroke(path);

  context.strokeStyle = "#efe4c8";
  context.lineWidth = trackWidth + 14;
  context.stroke(path);

  context.strokeStyle = "#424641";
  context.lineWidth = trackWidth;
  context.stroke(path);

  context.strokeStyle = "rgba(255,255,255,0.055)";
  context.lineWidth = trackWidth * 0.62;
  context.stroke(path);
  context.restore();

  drawCurbs();
  drawRouteTirePrints();
}

function getRearWheels() {
  const rear = -car.length * 0.34;
  const side = car.width * 0.42;
  const cosine = Math.cos(car.angle);
  const sine = Math.sin(car.angle);
  return [-side, side].map((offset) => ({
    x: car.x + cosine * rear - sine * offset,
    y: car.y + sine * rear + cosine * offset,
  }));
}

function addTireMarks(wheels) {
  if (previousRearWheels) {
    wheels.forEach((wheel, index) => {
      const previous = previousRearWheels[index];
      if (Math.hypot(wheel.x - previous.x, wheel.y - previous.y) < trackWidth * 0.22) {
        tireMarks.push({ start: previous, end: { ...wheel } });
      }
    });
  }
  previousRearWheels = wheels.map((wheel) => ({ ...wheel }));
  if (tireMarks.length > 1800) tireMarks.splice(0, tireMarks.length - 1800);
}

function spawnSmoke(wheels) {
  wheels.forEach((wheel) => {
    smokeParticles.push({
      x: wheel.x + (Math.random() - 0.5) * 6,
      y: wheel.y + (Math.random() - 0.5) * 6,
      velocityX: -car.velocityX * 0.08 + (Math.random() - 0.5) * 18,
      velocityY: -car.velocityY * 0.08 + (Math.random() - 0.5) * 18,
      life: 2,
      maximumLife: 2,
      size: car.width * (0.18 + Math.random() * 0.12),
    });
  });
  if (smokeParticles.length > 240) smokeParticles.splice(0, smokeParticles.length - 240);
}

function updateParticles(deltaTime) {
  smokeParticles.forEach((particle) => {
    particle.life -= deltaTime;
    particle.x += particle.velocityX * deltaTime;
    particle.y += particle.velocityY * deltaTime;
    particle.velocityX *= 0.985;
    particle.velocityY *= 0.985;
    particle.size += deltaTime * car.width * 0.22;
  });
  smokeParticles = smokeParticles.filter((particle) => particle.life > 0);
}

function updateCar(deltaTime) {
  const maximumSpeed = trackWidth * 2.65;
  const acceleration = maximumSpeed * 0.92;
  const cosine = Math.cos(car.angle);
  const sine = Math.sin(car.angle);
  let forwardSpeed = car.velocityX * cosine + car.velocityY * sine;
  let lateralSpeed = -car.velocityX * sine + car.velocityY * cosine;
  const steering = Number(controls.right) - Number(controls.left);
  const throttle = Number(controls.up) - Number(controls.down);

  if (throttle !== 0) {
    forwardSpeed += throttle * acceleration * deltaTime;
    hasDriven = true;
  }

  forwardSpeed = clamp(forwardSpeed, -maximumSpeed * 0.34, maximumSpeed);
  const steeringPower = 0.72 + Math.min(1, Math.abs(forwardSpeed) / maximumSpeed) * 2.25;
  if (Math.abs(forwardSpeed) > 4) {
    car.angle +=
      steering *
      steeringPower *
      deltaTime *
      (forwardSpeed >= 0 ? 1 : -1) *
      (controls.drift ? 1.18 : 1);
  }

  isDrifting =
    controls.drift &&
    Math.abs(steering) > 0.1 &&
    Math.abs(forwardSpeed) > maximumSpeed * 0.22;

  const grip = isDrifting ? 0.72 : 5.8;
  lateralSpeed *= Math.max(0, 1 - grip * deltaTime);
  const rollingResistance = throttle === 0 ? 0.72 : 0.14;
  forwardSpeed *= Math.max(0, 1 - rollingResistance * deltaTime);

  const updatedCosine = Math.cos(car.angle);
  const updatedSine = Math.sin(car.angle);
  car.velocityX = updatedCosine * forwardSpeed - updatedSine * lateralSpeed;
  car.velocityY = updatedSine * forwardSpeed + updatedCosine * lateralSpeed;
  car.x += car.velocityX * deltaTime;
  car.y += car.velocityY * deltaTime;

  onTrack = distanceToTrack(car.x, car.y) <= trackWidth * 0.56;
  if (!onTrack) {
    car.velocityX *= Math.max(0, 1 - 2.4 * deltaTime);
    car.velocityY *= Math.max(0, 1 - 2.4 * deltaTime);
  }

  const margin = car.length;
  car.x = clamp(car.x, -margin, width + margin);
  car.y = clamp(car.y, -margin, height + margin);

  const wheels = getRearWheels();
  if (isDrifting) {
    addTireMarks(wheels);
    smokeAccumulator += deltaTime;
    while (smokeAccumulator >= 0.045) {
      spawnSmoke(wheels);
      smokeAccumulator -= 0.045;
    }
  } else {
    previousRearWheels = null;
    smokeAccumulator = 0;
  }

  const speed = Math.round(Math.abs(forwardSpeed) / maximumSpeed * 188);
  speedValue.textContent = String(speed);
  driveState.textContent = !hasDriven
    ? "待发车"
    : !onTrack
      ? "草地减速"
      : isDrifting
        ? "漂移！"
        : speed > 5
          ? "行驶中"
          : "已停车";
}

function drawTireMarks() {
  context.save();
  context.strokeStyle = "rgba(12, 13, 12, 0.72)";
  context.lineWidth = clamp(car.width * 0.095, 2.4, 5);
  context.lineCap = "round";
  tireMarks.forEach((mark) => {
    context.beginPath();
    context.moveTo(mark.start.x, mark.start.y);
    context.lineTo(mark.end.x, mark.end.y);
    context.stroke();
  });
  context.restore();
}

function drawSmoke() {
  smokeParticles.forEach((particle) => {
    const progress = particle.life / particle.maximumLife;
    context.save();
    context.globalAlpha = Math.min(0.66, progress * 0.72);
    context.fillStyle = "#f4f0e7";
    context.strokeStyle = "rgba(40, 43, 39, 0.45)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  });
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
  context.save();
  context.translate(car.x, car.y);
  context.rotate(car.angle);

  context.save();
  context.translate(5, 7);
  context.fillStyle = "rgba(10, 12, 10, 0.42)";
  roundedRectangle(-length / 2, -carWidth / 2, length, carWidth, carWidth * 0.25);
  context.fill();
  context.restore();

  context.fillStyle = "#151815";
  const wheelLength = length * 0.2;
  const wheelWidth = carWidth * 0.2;
  [-1, 1].forEach((frontBack) => {
    [-1, 1].forEach((side) => {
      roundedRectangle(
        frontBack * length * 0.25 - wheelLength / 2,
        side * carWidth * 0.49 - wheelWidth / 2,
        wheelLength,
        wheelWidth,
        2,
      );
      context.fill();
    });
  });

  context.fillStyle = "#db4d28";
  context.strokeStyle = "#141714";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(-length * 0.48, -carWidth * 0.31);
  context.quadraticCurveTo(-length * 0.34, -carWidth * 0.5, 0, -carWidth * 0.46);
  context.quadraticCurveTo(length * 0.38, -carWidth * 0.43, length * 0.5, -carWidth * 0.12);
  context.lineTo(length * 0.48, carWidth * 0.28);
  context.quadraticCurveTo(length * 0.13, carWidth * 0.5, -length * 0.42, carWidth * 0.4);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#a9341d";
  context.beginPath();
  context.moveTo(-length * 0.44, carWidth * 0.19);
  context.lineTo(length * 0.45, carWidth * 0.16);
  context.lineTo(length * 0.48, carWidth * 0.31);
  context.quadraticCurveTo(0, carWidth * 0.53, -length * 0.43, carWidth * 0.39);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#f17a4e";
  context.beginPath();
  context.moveTo(-length * 0.2, -carWidth * 0.35);
  context.lineTo(length * 0.15, -carWidth * 0.36);
  context.lineTo(length * 0.29, carWidth * 0.09);
  context.lineTo(-length * 0.23, carWidth * 0.12);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#a7d2d1";
  context.beginPath();
  context.moveTo(-length * 0.14, -carWidth * 0.29);
  context.lineTo(length * 0.1, -carWidth * 0.3);
  context.lineTo(length * 0.18, -carWidth * 0.04);
  context.lineTo(-length * 0.17, -carWidth * 0.03);
  context.closePath();
  context.fill();
  context.stroke();

  context.strokeStyle = "rgba(255, 227, 174, 0.8)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(length * 0.25, -carWidth * 0.25);
  context.lineTo(length * 0.4, -carWidth * 0.16);
  context.stroke();

  context.fillStyle = "#ffe58e";
  [-0.19, 0.14].forEach((side) => {
    context.beginPath();
    context.arc(length * 0.43, carWidth * side, carWidth * 0.07, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  });

  if (isDrifting) {
    context.strokeStyle = "rgba(255, 236, 176, 0.6)";
    context.lineWidth = 2;
    [-1, 1].forEach((side) => {
      context.beginPath();
      context.moveTo(-length * 0.55, side * carWidth * 0.28);
      context.lineTo(-length * 0.82, side * carWidth * 0.38);
      context.stroke();
    });
  }
  context.restore();
}

function drawScene() {
  context.clearRect(0, 0, width, height);
  drawGrass();
  drawTrack();
  drawTireMarks();
  drawSmoke();
  drawCar();
}

function updateDemoControls() {
  if (!demoMode) return;
  controls.up = elapsed < 2.8;
  controls.left = false;
  controls.right = elapsed > 0.75 && elapsed < 2.8;
  controls.drift = elapsed > 1.1 && elapsed < 2.8;
}

function publishDiagnostics() {
  stage.dataset.tireMarks = String(tireMarks.length);
  stage.dataset.smokeParticles = String(smokeParticles.length);
  stage.dataset.maximumSmokeLife = String(
    smokeParticles.reduce((maximum, particle) => Math.max(maximum, particle.life), 0).toFixed(2),
  );
  stage.dataset.driveState = driveState.textContent;
  stage.dataset.onTrack = String(onTrack);
  stage.dataset.drifting = String(isDrifting);
}

function gameLoop(timestamp) {
  const deltaTime = Math.min(0.033, (timestamp - lastFrame) / 1000 || 0);
  lastFrame = timestamp;
  elapsed += deltaTime;
  updateDemoControls();
  updateCar(deltaTime);
  updateParticles(deltaTime);
  publishDiagnostics();
  drawScene();
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
    " ": "drift",
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

const resizeObserver = new ResizeObserver(resizeCanvas);
resizeObserver.observe(stage);
resizeCanvas();
window.requestAnimationFrame(gameLoop);

window.raceDebug = {
  snapshot: () => ({
    speed: Number(speedValue.textContent),
    state: driveState.textContent,
    onTrack,
    isDrifting,
    tireMarks: tireMarks.length,
    smokeParticles: smokeParticles.length,
    trackSamples: trackSamples.length,
  }),
};
