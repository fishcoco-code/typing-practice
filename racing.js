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
let worldWidth = 2200;
let worldHeight = 1050;
let trackWidth = 126;
let trackSamples = [];
let trackLength = 0;
let tireMarks = [];
let smokeParticles = [];
let previousRearWheels = null;
let smokeAccumulator = 0;
let lastFrame = performance.now();
let elapsed = 0;
let hasDriven = false;
let isDrifting = false;
let onTrack = true;
let fenceImpact = 0;
let fenceHits = 0;
let cameraZoom = 1.65;
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
  const points = trackShape.map(([x, y]) => ({ x: x * worldWidth, y: y * worldHeight }));
  const samples = [];

  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length];
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const next = points[(index + 2) % points.length];

    for (let step = 0; step < 32; step += 1) {
      samples.push(catmullRom(previous, start, end, next, step / 32));
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
  previousRearWheels = null;
  isDrifting = false;
  onTrack = true;
  fenceImpact = 0;
  fenceHits = 0;
}

function resizeCanvas() {
  const bounds = stage.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(320, bounds.width);
  height = Math.max(420, bounds.height);
  worldWidth = width * 2.35;
  worldHeight = height * 1.65;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  trackWidth = clamp(Math.min(width, height) * 0.33, 128, 210);
  cameraZoom = width < 600 ? 1.42 : 1.65;
  car.length = trackWidth * 0.58;
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
  context.fillStyle = "#78945e";
  context.fillRect(-worldWidth, -worldHeight, worldWidth * 3, worldHeight * 3);

  context.save();
  context.globalAlpha = 0.16;
  context.strokeStyle = "#263d28";
  context.lineWidth = 1;
  const gap = Math.max(22, Math.min(width, height) * 0.045);
  for (let x = -worldWidth - worldHeight; x < worldWidth * 2 + worldHeight; x += gap) {
    context.beginPath();
    context.moveTo(x, -worldHeight);
    context.lineTo(x + worldHeight * 3, worldHeight * 2);
    context.stroke();
  }
  context.restore();

  context.fillStyle = "rgba(31, 58, 31, 0.23)";
  for (let index = 0; index < 120; index += 1) {
    const x = ((index * 173) % 997) / 997 * worldWidth;
    const y = ((index * 277) % 643) / 643 * worldHeight;
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

function createFencePath(side) {
  const path = new Path2D();
  const offset = trackWidth / 2 + trackWidth * 0.105;
  trackSamples.forEach((point, index) => {
    const x = point.x - Math.sin(point.angle) * offset * side;
    const y = point.y + Math.cos(point.angle) * offset * side;
    if (index === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
  path.closePath();
  return path;
}

function drawFences() {
  const fenceOffset = trackWidth / 2 + trackWidth * 0.105;
  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";

  [-1, 1].forEach((side) => {
    const path = createFencePath(side);
    context.strokeStyle = "rgba(11, 14, 12, 0.58)";
    context.lineWidth = 10;
    context.stroke(path);
    context.strokeStyle = "#b9c0ba";
    context.lineWidth = 5.5;
    context.stroke(path);
    context.strokeStyle = "#f2f1e9";
    context.lineWidth = 1.4;
    context.stroke(path);

    for (let index = 0; index < trackSamples.length; index += 7) {
      const point = trackSamples[index];
      const x = point.x - Math.sin(point.angle) * fenceOffset * side;
      const y = point.y + Math.cos(point.angle) * fenceOffset * side;
      context.fillStyle = "#dfe2dc";
      context.strokeStyle = "#161a17";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(x, y, clamp(trackWidth * 0.035, 4, 6), 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
  });
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
  drawFences();
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
      life: 4,
      maximumLife: 4,
      size: car.width * (0.42 + Math.random() * 0.2),
    });
  });
  if (smokeParticles.length > 520) smokeParticles.splice(0, smokeParticles.length - 520);
}

function updateParticles(deltaTime) {
  smokeParticles.forEach((particle) => {
    particle.life -= deltaTime;
    particle.x += particle.velocityX * deltaTime;
    particle.y += particle.velocityY * deltaTime;
    particle.velocityX *= 0.985;
    particle.velocityY *= 0.985;
    particle.size += deltaTime * car.width * 0.48;
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

  fenceImpact = Math.max(0, fenceImpact - deltaTime);
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
    fenceImpact = 0.34;
    fenceHits += 1;
    onTrack = true;
  }

  const margin = car.length;
  car.x = clamp(car.x, -margin, worldWidth + margin);
  car.y = clamp(car.y, -margin, worldHeight + margin);

  const wheels = getRearWheels();
  if (isDrifting) {
    addTireMarks(wheels);
    smokeAccumulator += deltaTime;
    while (smokeAccumulator >= 0.025) {
      spawnSmoke(wheels);
      smokeAccumulator -= 0.025;
    }
  } else {
    previousRearWheels = null;
    smokeAccumulator = 0;
  }

  const speed = Math.round(Math.abs(forwardSpeed) / maximumSpeed * 188);
  speedValue.textContent = String(speed);
  driveState.textContent = !hasDriven
    ? "待发车"
    : fenceImpact > 0
      ? "撞到围栏"
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
    context.globalAlpha = Math.min(0.78, progress * 0.86);
    context.fillStyle = "#f4f0e7";
    context.strokeStyle = "rgba(40, 43, 39, 0.45)";
    context.lineWidth = 2;
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
  const outlineWidth = clamp(carWidth * 0.055, 2.6, 4.2);
  context.save();
  context.translate(car.x, car.y);
  context.rotate(car.angle);

  // Soft ground shadow keeps the slightly tilted top view readable.
  context.save();
  context.translate(carWidth * 0.11, carWidth * 0.14);
  context.fillStyle = "rgba(10, 12, 10, 0.4)";
  roundedRectangle(-length * 0.51, -carWidth * 0.47, length * 1.04, carWidth * 0.96, carWidth * 0.25);
  context.fill();
  context.restore();

  // Four exposed wheels.
  context.fillStyle = "#151815";
  context.strokeStyle = "#080a08";
  context.lineWidth = outlineWidth * 0.55;
  const wheelLength = length * 0.19;
  const wheelWidth = carWidth * 0.19;
  [-0.3, 0.3].forEach((frontBack) => {
    [-1, 1].forEach((side) => {
      roundedRectangle(
        frontBack * length - wheelLength / 2,
        side * carWidth * 0.5 - wheelWidth / 2,
        wheelLength,
        wheelWidth,
        wheelWidth * 0.3,
      );
      context.fill();
      context.stroke();
    });
  });

  // RX-7 FD inspired low, rounded silhouette with a long nose.
  context.fillStyle = "#d94c32";
  context.strokeStyle = "#141714";
  context.lineWidth = outlineWidth;
  context.beginPath();
  context.moveTo(-length * 0.5, -carWidth * 0.21);
  context.bezierCurveTo(-length * 0.47, -carWidth * 0.4, -length * 0.28, -carWidth * 0.48, -length * 0.06, -carWidth * 0.47);
  context.bezierCurveTo(length * 0.2, -carWidth * 0.46, length * 0.43, -carWidth * 0.36, length * 0.52, -carWidth * 0.15);
  context.bezierCurveTo(length * 0.56, -carWidth * 0.04, length * 0.55, carWidth * 0.17, length * 0.48, carWidth * 0.28);
  context.bezierCurveTo(length * 0.25, carWidth * 0.48, -length * 0.25, carWidth * 0.5, -length * 0.48, carWidth * 0.31);
  context.bezierCurveTo(-length * 0.53, carWidth * 0.17, -length * 0.53, -carWidth * 0.08, -length * 0.5, -carWidth * 0.21);
  context.closePath();
  context.fill();
  context.stroke();

  // Dark lower side panel makes the body look slightly tilted toward the viewer.
  context.fillStyle = "#9f2e20";
  context.beginPath();
  context.moveTo(-length * 0.48, carWidth * 0.2);
  context.bezierCurveTo(-length * 0.15, carWidth * 0.33, length * 0.22, carWidth * 0.3, length * 0.49, carWidth * 0.18);
  context.bezierCurveTo(length * 0.48, carWidth * 0.33, length * 0.21, carWidth * 0.48, -length * 0.35, carWidth * 0.43);
  context.bezierCurveTo(-length * 0.43, carWidth * 0.4, -length * 0.47, carWidth * 0.31, -length * 0.48, carWidth * 0.2);
  context.closePath();
  context.fill();
  context.stroke();

  // Rear-biased teardrop cabin.
  context.fillStyle = "#ef704e";
  context.beginPath();
  context.moveTo(-length * 0.3, -carWidth * 0.3);
  context.bezierCurveTo(-length * 0.22, -carWidth * 0.4, length * 0.01, -carWidth * 0.41, length * 0.14, -carWidth * 0.29);
  context.lineTo(length * 0.24, carWidth * 0.07);
  context.bezierCurveTo(length * 0.05, carWidth * 0.17, -length * 0.16, carWidth * 0.18, -length * 0.34, carWidth * 0.08);
  context.closePath();
  context.fill();
  context.stroke();

  // Front windshield and rear glass are separated by a clean roof bar.
  context.fillStyle = "#a7d2d1";
  context.beginPath();
  context.moveTo(-length * 0.02, -carWidth * 0.32);
  context.lineTo(length * 0.1, -carWidth * 0.27);
  context.lineTo(length * 0.19, carWidth * 0.04);
  context.lineTo(-length * 0.01, carWidth * 0.04);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#74999a";
  context.beginPath();
  context.moveTo(-length * 0.26, -carWidth * 0.25);
  context.lineTo(-length * 0.06, -carWidth * 0.31);
  context.lineTo(-length * 0.05, carWidth * 0.04);
  context.lineTo(-length * 0.29, carWidth * 0.07);
  context.closePath();
  context.fill();
  context.stroke();

  // Hood creases and iconic pop-up headlamp covers.
  context.strokeStyle = "rgba(255, 181, 139, 0.82)";
  context.lineWidth = outlineWidth * 0.58;
  context.beginPath();
  context.moveTo(length * 0.15, -carWidth * 0.28);
  context.bezierCurveTo(length * 0.3, -carWidth * 0.3, length * 0.42, -carWidth * 0.23, length * 0.48, -carWidth * 0.11);
  context.moveTo(length * 0.18, carWidth * 0.13);
  context.bezierCurveTo(length * 0.31, carWidth * 0.12, length * 0.43, carWidth * 0.09, length * 0.49, carWidth * 0.03);
  context.stroke();

  context.fillStyle = "#c9402c";
  context.strokeStyle = "#171a17";
  context.lineWidth = outlineWidth * 0.72;
  [-0.2, 0.12].forEach((side) => {
    roundedRectangle(length * 0.27, carWidth * side, length * 0.13, carWidth * 0.1, carWidth * 0.035);
    context.fill();
    context.stroke();
  });

  // Nose lamps, rear lamps and a slim rear wing.
  context.fillStyle = "#ffe58e";
  context.strokeStyle = "#171a17";
  context.lineWidth = outlineWidth * 0.6;
  [-0.2, 0.14].forEach((side) => {
    context.beginPath();
    context.ellipse(length * 0.49, carWidth * side, carWidth * 0.075, carWidth * 0.045, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  });

  context.fillStyle = "#6f1818";
  [-0.2, 0.15].forEach((side) => {
    context.beginPath();
    context.ellipse(-length * 0.46, carWidth * side, carWidth * 0.065, carWidth * 0.045, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  });

  context.strokeStyle = "#141714";
  context.lineWidth = outlineWidth;
  context.beginPath();
  context.moveTo(-length * 0.43, -carWidth * 0.42);
  context.lineTo(-length * 0.43, carWidth * 0.4);
  context.stroke();
  context.strokeStyle = "#d94c32";
  context.lineWidth = outlineWidth * 1.1;
  context.beginPath();
  context.moveTo(-length * 0.46, -carWidth * 0.38);
  context.lineTo(-length * 0.46, carWidth * 0.36);
  context.stroke();

  // Door seam, side intake and a restrained highlight.
  context.strokeStyle = "rgba(35, 29, 25, 0.72)";
  context.lineWidth = outlineWidth * 0.55;
  context.beginPath();
  context.moveTo(-length * 0.09, carWidth * 0.17);
  context.lineTo(-length * 0.07, carWidth * 0.36);
  context.moveTo(length * 0.05, carWidth * 0.32);
  context.quadraticCurveTo(length * 0.16, carWidth * 0.29, length * 0.22, carWidth * 0.23);
  context.stroke();

  if (isDrifting) {
    context.strokeStyle = "rgba(255, 236, 176, 0.6)";
    context.lineWidth = outlineWidth * 0.7;
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
  context.save();
  context.translate(width / 2, height / 2);
  context.scale(cameraZoom, cameraZoom);
  context.translate(-car.x, -car.y);
  drawGrass();
  drawTrack();
  drawTireMarks();
  drawSmoke();
  drawCar();
  context.restore();
}

function updateDemoControls() {
  if (!demoMode) return;
  if (demoMode === "smoke-test") {
    controls.up = elapsed < 6;
    controls.left = false;
    controls.right = elapsed > 0.8 && elapsed < 6;
    controls.drift = elapsed > 1 && elapsed < 6;
    return;
  }
  if (demoMode === "continuous") {
    controls.up = true;
    controls.left = false;
    controls.right = elapsed > 0.6;
    controls.drift = elapsed > 0.9;
    return;
  }
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
  stage.dataset.fenceImpact = String(fenceImpact > 0);
  stage.dataset.fenceHits = String(fenceHits);
  stage.dataset.cameraZoom = String(cameraZoom);
  stage.dataset.carScreenX = String(Math.round(width / 2));
  stage.dataset.carScreenY = String(Math.round(height / 2));
  stage.dataset.trackLength = String(Math.round(trackLength));
  stage.dataset.trackWidth = String(Math.round(trackWidth));
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
