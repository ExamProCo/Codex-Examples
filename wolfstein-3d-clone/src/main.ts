import "./style.css";

function requiredSelector<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing element: ${selector}`);
  }
  return element;
}

function requireWebGl2(target: HTMLCanvasElement): WebGL2RenderingContext {
  const context = target.getContext("webgl2", { antialias: false });
  if (!context) {
    throw new Error("WebGL2 not available");
  }
  return context;
}

const canvas = requiredSelector<HTMLCanvasElement>("#game");
const screen = requiredSelector<HTMLDivElement>("#screen");
const healthLabel = requiredSelector<HTMLSpanElement>("#health");
const ammoLabel = requiredSelector<HTMLSpanElement>("#ammo");
const objectiveLabel = requiredSelector<HTMLSpanElement>("#objective");
const messageLabel = requiredSelector<HTMLDivElement>("#message");
const gl = requireWebGl2(canvas);

type Tile = 0 | 1 | 2 | 3 | 4;
type PickupKind = "ammo" | "health";
type EnemyState = "idle" | "chase" | "attack" | "dead";
type GameMode = "title" | "playing" | "paused" | "victory" | "dead";

interface DoorState {
  x: number;
  y: number;
  open: number;
  opening: boolean;
}

interface Pickup {
  x: number;
  y: number;
  kind: PickupKind;
  amount: number;
  active: boolean;
}

interface Enemy {
  x: number;
  y: number;
  health: number;
  state: EnemyState;
  attackCooldown: number;
  hurtFlash: number;
}

interface Player {
  x: number;
  y: number;
  angle: number;
  health: number;
  ammo: number;
  fireCooldown: number;
}

interface RayHit {
  depth: number;
  type: Tile;
  side: 0 | 1;
}

interface SpriteDraw {
  x: number;
  y: number;
  width: number;
  height: number;
  color: [number, number, number, number];
  depth: number;
}

const mapWidth = 16;
const mapHeight = 16;
const map: Tile[] = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 1,
  1, 0, 1, 1, 1, 0, 2, 2, 2, 0, 1, 1, 1, 0, 0, 1,
  1, 0, 1, 0, 0, 0, 0, 0, 2, 0, 1, 0, 1, 0, 0, 1,
  1, 0, 1, 0, 1, 1, 4, 0, 2, 0, 1, 0, 1, 1, 0, 1,
  1, 0, 1, 0, 0, 0, 4, 0, 0, 0, 1, 0, 0, 0, 0, 1,
  1, 0, 1, 1, 1, 0, 4, 1, 1, 0, 1, 1, 1, 1, 0, 1,
  1, 0, 0, 0, 1, 0, 4, 0, 0, 0, 0, 0, 0, 1, 0, 1,
  1, 1, 1, 0, 1, 0, 4, 0, 1, 1, 1, 1, 0, 1, 0, 1,
  1, 0, 0, 0, 1, 0, 4, 0, 1, 0, 0, 1, 0, 1, 0, 1,
  1, 0, 1, 1, 1, 0, 4, 0, 1, 0, 0, 1, 0, 1, 0, 1,
  1, 0, 0, 0, 0, 0, 4, 0, 1, 2, 2, 2, 0, 1, 0, 1,
  1, 0, 1, 1, 1, 1, 4, 0, 1, 2, 1, 0, 0, 1, 0, 1,
  1, 0, 0, 0, 0, 0, 4, 0, 1, 2, 1, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
];

const initialDoors: DoorState[] = [
  { x: 6, y: 4, open: 0, opening: false },
  { x: 6, y: 5, open: 0, opening: false },
  { x: 6, y: 6, open: 0, opening: false },
  { x: 6, y: 7, open: 0, opening: false },
  { x: 6, y: 8, open: 0, opening: false },
  { x: 6, y: 9, open: 0, opening: false },
  { x: 6, y: 10, open: 0, opening: false },
  { x: 6, y: 11, open: 0, opening: false },
  { x: 6, y: 12, open: 0, opening: false },
  { x: 6, y: 13, open: 0, opening: false }
];

const initialPickups: Pickup[] = [
  { x: 2.5, y: 1.5, kind: "ammo", amount: 4, active: true },
  { x: 11.5, y: 3.5, kind: "health", amount: 30, active: true },
  { x: 13.5, y: 13.5, kind: "ammo", amount: 6, active: true }
];

const initialEnemies: Enemy[] = [
  { x: 8.5, y: 5.5, health: 45, state: "idle", attackCooldown: 0, hurtFlash: 0 },
  { x: 10.5, y: 11.5, health: 45, state: "idle", attackCooldown: 0, hurtFlash: 0 },
  { x: 13.5, y: 2.5, health: 45, state: "idle", attackCooldown: 0, hurtFlash: 0 }
];

const player: Player = {
  x: 1.5,
  y: 1.5,
  angle: 0,
  health: 100,
  ammo: 8,
  fireCooldown: 0
};

let mode: GameMode = "title";
let pointerLocked = false;
let flashTimer = 0;
let messageTimer = 0;
let victoryPulse = 0;
let lastTimestamp = 0;

const doors = structuredClone(initialDoors);
const pickups = structuredClone(initialPickups);
const enemies = structuredClone(initialEnemies);

const pressed = new Set<string>();
const rayCount = 320;
const fov = Math.PI / 3;
const moveSpeed = 2.8;
const turnSpeed = 2.4;
const maxDelta = 0.05;

const vertexShaderSource = `#version 300 es
in vec2 a_position;
in vec4 a_color;
out vec4 v_color;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_color = a_color;
}
`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 outColor;
void main() {
  outColor = v_color;
}
`;

const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
const positionLocation = gl.getAttribLocation(program, "a_position");
const colorLocation = gl.getAttribLocation(program, "a_color");
const vao = gl.createVertexArray();
const buffer = gl.createBuffer();

if (!vao || !buffer) {
  throw new Error("Unable to create renderer resources");
}

gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 24, 0);
gl.enableVertexAttribArray(colorLocation);
gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 24, 8);
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.bindVertexArray(null);

function createShader(context: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = context.createShader(type);
  if (!shader) {
    throw new Error("Failed to create shader");
  }

  context.shaderSource(shader, source);
  context.compileShader(shader);
  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    const log = context.getShaderInfoLog(shader);
    context.deleteShader(shader);
    throw new Error(log ?? "Unknown shader error");
  }

  return shader;
}

function createProgram(context: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
  const vertex = createShader(context, context.VERTEX_SHADER, vertexSource);
  const fragment = createShader(context, context.FRAGMENT_SHADER, fragmentSource);
  const nextProgram = context.createProgram();
  if (!nextProgram) {
    throw new Error("Failed to create program");
  }

  context.attachShader(nextProgram, vertex);
  context.attachShader(nextProgram, fragment);
  context.linkProgram(nextProgram);
  context.deleteShader(vertex);
  context.deleteShader(fragment);

  if (!context.getProgramParameter(nextProgram, context.LINK_STATUS)) {
    const log = context.getProgramInfoLog(nextProgram);
    context.deleteProgram(nextProgram);
    throw new Error(log ?? "Unknown program link error");
  }

  return nextProgram;
}

function tileAt(x: number, y: number): Tile {
  if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) {
    return 1;
  }

  return map[y * mapWidth + x];
}

function doorAt(x: number, y: number): DoorState | undefined {
  return doors.find((door) => door.x === x && door.y === y);
}

function isSolid(x: number, y: number): boolean {
  const tile = tileAt(Math.floor(x), Math.floor(y));
  if (tile === 1 || tile === 2) {
    return true;
  }

  const door = doorAt(Math.floor(x), Math.floor(y));
  return door ? door.open < 0.96 : false;
}

function resetGame(): void {
  player.x = 1.5;
  player.y = 1.5;
  player.angle = 0;
  player.health = 100;
  player.ammo = 8;
  player.fireCooldown = 0;
  for (const door of doors) {
    door.open = 0;
    door.opening = false;
  }
  for (const pickup of pickups) {
    pickup.active = true;
  }
  for (const enemy of enemies) {
    enemy.health = 45;
    enemy.state = "idle";
    enemy.attackCooldown = 0;
    enemy.hurtFlash = 0;
  }
  mode = "playing";
  flashTimer = 0;
  victoryPulse = 0;
  setMessage("Find the exit", 2.4);
  objectiveLabel.textContent = "Find the exit";
  hidePanel();
}

function showPanel(title: string, body: string, buttonLabel: string): void {
  screen.innerHTML = `
    <h1>${title}</h1>
    <p>${body}</p>
    <p class="controls">WASD move, arrow keys or mouse turn, Space interact, Enter fire</p>
    <button id="start">${buttonLabel}</button>
  `;
  screen.classList.remove("hidden");
  const nextButton = screen.querySelector<HTMLButtonElement>("#start");
  nextButton?.addEventListener("click", startRun, { once: true });
}

function hidePanel(): void {
  screen.classList.add("hidden");
}

function setMessage(text: string, seconds: number): void {
  messageTimer = seconds;
  messageLabel.textContent = text;
  messageLabel.classList.add("visible");
}

function startRun(): void {
  if (mode === "paused") {
    mode = "playing";
    hidePanel();
    setMessage("Back in the fight", 0.8);
  } else {
    resetGame();
  }
  canvas.requestPointerLock?.();
}

function update(dt: number): void {
  if (mode !== "playing") {
    if (mode === "victory") {
      victoryPulse += dt;
    }
    return;
  }

  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  flashTimer = Math.max(0, flashTimer - dt);
  if (messageTimer > 0) {
    messageTimer = Math.max(0, messageTimer - dt);
    if (messageTimer === 0) {
      messageLabel.classList.remove("visible");
    }
  }

  for (const door of doors) {
    if (door.opening) {
      door.open = Math.min(1, door.open + dt * 0.9);
    }
  }

  for (const enemy of enemies) {
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.hurtFlash = Math.max(0, enemy.hurtFlash - dt);
  }

  const turnInput = (pressed.has("ArrowLeft") ? -1 : 0) + (pressed.has("ArrowRight") ? 1 : 0);
  player.angle += turnInput * turnSpeed * dt;

  const forward = (pressed.has("KeyW") ? 1 : 0) + (pressed.has("KeyS") ? -1 : 0);
  const strafe = (pressed.has("KeyD") ? 1 : 0) + (pressed.has("KeyA") ? -1 : 0);
  const moveX = Math.cos(player.angle) * forward - Math.sin(player.angle) * strafe;
  const moveY = Math.sin(player.angle) * forward + Math.cos(player.angle) * strafe;
  movePlayer(moveX, moveY, dt);

  updateEnemies(dt);
  collectPickups();
  checkExit();

  if (pressed.has("Enter")) {
    pressed.delete("Enter");
    fireWeapon();
  }

  if (pressed.has("Space")) {
    pressed.delete("Space");
    interact();
  }
}

function movePlayer(intentX: number, intentY: number, dt: number): void {
  const magnitude = Math.hypot(intentX, intentY);
  if (magnitude < 0.001) {
    return;
  }

  const step = (moveSpeed * dt) / magnitude;
  const nextX = player.x + intentX * step;
  const nextY = player.y + intentY * step;

  if (!isSolid(nextX, player.y)) {
    player.x = nextX;
  }

  if (!isSolid(player.x, nextY)) {
    player.y = nextY;
  }
}

function interact(): void {
  const targetX = Math.floor(player.x + Math.cos(player.angle) * 1.1);
  const targetY = Math.floor(player.y + Math.sin(player.angle) * 1.1);
  const door = doorAt(targetX, targetY);
  if (door && !door.opening) {
    door.opening = true;
    setMessage("Door opening", 1.2);
  }
}

function fireWeapon(): void {
  if (player.fireCooldown > 0 || player.ammo <= 0 || mode !== "playing") {
    return;
  }

  player.ammo -= 1;
  player.fireCooldown = 0.32;
  setMessage("Shot fired", 0.35);

  let bestEnemy: Enemy | null = null;
  let bestDistance = Infinity;

  for (const enemy of enemies) {
    if (enemy.state === "dead") {
      continue;
    }

    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy);
    const angle = normalizeAngle(Math.atan2(dy, dx) - player.angle);
    if (Math.abs(angle) > 0.18) {
      continue;
    }
    if (!hasLineOfSight(player.x, player.y, enemy.x, enemy.y)) {
      continue;
    }
    if (distance < bestDistance) {
      bestDistance = distance;
      bestEnemy = enemy;
    }
  }

  if (!bestEnemy) {
    return;
  }

  bestEnemy.health -= 24;
  bestEnemy.hurtFlash = 0.22;
  if (bestEnemy.health <= 0) {
    bestEnemy.state = "dead";
    setMessage("Target down", 0.8);
  }
}

function updateEnemies(dt: number): void {
  for (const enemy of enemies) {
    if (enemy.state === "dead") {
      continue;
    }

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy);
    const visible = distance < 8.5 && hasLineOfSight(enemy.x, enemy.y, player.x, player.y);

    if (visible) {
      enemy.state = distance < 1.8 ? "attack" : "chase";
    } else if (enemy.state !== "attack") {
      enemy.state = "idle";
    }

    if (enemy.state === "chase") {
      const speed = dt * 1.3;
      const dirX = dx / Math.max(distance, 0.001);
      const dirY = dy / Math.max(distance, 0.001);
      const nextX = enemy.x + dirX * speed;
      const nextY = enemy.y + dirY * speed;
      if (!isSolid(nextX, enemy.y)) {
        enemy.x = nextX;
      }
      if (!isSolid(enemy.x, nextY)) {
        enemy.y = nextY;
      }
    }

    if (enemy.state === "attack" && enemy.attackCooldown === 0) {
      enemy.attackCooldown = 1.15;
      player.health = Math.max(0, player.health - 10);
      flashTimer = 0.18;
      setMessage("You were hit", 0.5);
      if (player.health <= 0) {
        mode = "dead";
        showPanel("Defeated", "The bunker got you first.", "Try again");
      }
    }
  }
}

function hasLineOfSight(ax: number, ay: number, bx: number, by: number): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const distance = Math.hypot(dx, dy);
  const steps = Math.ceil(distance * 8);
  for (let index = 1; index < steps; index += 1) {
    const t = index / steps;
    const x = ax + dx * t;
    const y = ay + dy * t;
    if (isSolid(x, y)) {
      return false;
    }
  }

  return true;
}

function collectPickups(): void {
  for (const pickup of pickups) {
    if (!pickup.active) {
      continue;
    }
    if (Math.hypot(pickup.x - player.x, pickup.y - player.y) > 0.65) {
      continue;
    }

    pickup.active = false;
    if (pickup.kind === "ammo") {
      player.ammo += pickup.amount;
      setMessage(`Ammo +${pickup.amount}`, 1.2);
    } else {
      player.health = Math.min(100, player.health + pickup.amount);
      setMessage(`Health +${pickup.amount}`, 1.2);
    }
  }
}

function checkExit(): void {
  if (tileAt(Math.floor(player.x), Math.floor(player.y)) === 3 && enemies.every((enemy) => enemy.state === "dead")) {
    mode = "victory";
    objectiveLabel.textContent = "Escape complete";
    showPanel("Victory", "You cleared the bunker and reached the exit.", "Run again");
  } else if (tileAt(Math.floor(player.x), Math.floor(player.y)) === 3) {
    setMessage("Eliminate all guards first", 1.2);
  }
}

function castRays(): RayHit[] {
  const hits: RayHit[] = [];

  for (let column = 0; column < rayCount; column += 1) {
    const cameraX = column / rayCount - 0.5;
    const rayAngle = player.angle + cameraX * fov;
    const dirX = Math.cos(rayAngle);
    const dirY = Math.sin(rayAngle);
    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);

    const deltaDistX = Math.abs(1 / (dirX || 0.0001));
    const deltaDistY = Math.abs(1 / (dirY || 0.0001));

    let sideDistX = dirX < 0 ? (player.x - mapX) * deltaDistX : (mapX + 1 - player.x) * deltaDistX;
    let sideDistY = dirY < 0 ? (player.y - mapY) * deltaDistY : (mapY + 1 - player.y) * deltaDistY;

    let stepX = dirX < 0 ? -1 : 1;
    let stepY = dirY < 0 ? -1 : 1;
    let side: 0 | 1 = 0;
    let tile: Tile = 1;

    while (true) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }

      tile = tileAt(mapX, mapY);
      const door = doorAt(mapX, mapY);
      if (tile === 1 || tile === 2 || tile === 3 || (door && door.open < 0.96)) {
        if (door && door.open < 0.96) {
          tile = 4;
        }
        break;
      }
    }

    const rawDepth = side === 0
      ? (mapX - player.x + (1 - stepX) / 2) / dirX
      : (mapY - player.y + (1 - stepY) / 2) / dirY;

    hits.push({
      depth: Math.max(0.001, rawDepth * Math.cos(rayAngle - player.angle)),
      type: tile,
      side
    });
  }

  return hits;
}

function render(): void {
  resizeCanvas();
  const rays = castRays();
  const vertices: number[] = [];
  pushRect(vertices, -1, 0, 2, 1, [0.16, 0.12, 0.1, 1]);
  pushRect(vertices, -1, -1, 2, 1, [0.05, 0.05, 0.06, 1]);

  for (let column = 0; column < rays.length; column += 1) {
    const hit = rays[column];
    const wallHeight = Math.min(1.6, 1 / hit.depth);
    const width = 2 / rays.length;
    const x = -1 + column * width;
    const y = -wallHeight;
    const height = wallHeight * 2;
    const base = colorForTile(hit.type);
    const fog = Math.max(0.22, 1 - hit.depth / 9.5);
    const shade = hit.side === 1 ? 0.82 : 1;
    const color: [number, number, number, number] = [
      base[0] * fog * shade,
      base[1] * fog * shade,
      base[2] * fog * shade,
      1
    ];
    pushRect(vertices, x, y, width + 0.002, height, color);
  }

  const sprites = collectSprites(rays);
  sprites.sort((left, right) => right.depth - left.depth);
  for (const sprite of sprites) {
    pushRect(vertices, sprite.x, sprite.y, sprite.width, sprite.height, sprite.color);
  }

  if (flashTimer > 0) {
    const alpha = flashTimer / 0.18 * 0.28;
    pushRect(vertices, -1, -1, 2, 2, [0.7, 0.1, 0.08, alpha]);
  }

  if (mode === "victory") {
    const pulse = 0.08 + Math.sin(victoryPulse * 6) * 0.04;
    pushRect(vertices, -1, -1, 2, 2, [0.95, 0.83, 0.32, pulse]);
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 6);
  gl.bindVertexArray(null);

  healthLabel.textContent = `HP ${player.health}`;
  ammoLabel.textContent = `AMMO ${player.ammo}`;
  if (mode === "playing") {
    objectiveLabel.textContent = enemies.every((enemy) => enemy.state === "dead")
      ? "Head for the exit"
      : "Find the exit";
  }
}

function collectSprites(rays: RayHit[]): SpriteDraw[] {
  const depthBuffer = rays.map((ray) => ray.depth);
  const draws: SpriteDraw[] = [];

  const entities = [
    ...pickups.filter((pickup) => pickup.active).map((pickup) => ({ x: pickup.x, y: pickup.y, kind: pickup.kind, hurt: false })),
    ...enemies.filter((enemy) => enemy.state !== "dead").map((enemy) => ({
      x: enemy.x,
      y: enemy.y,
      kind: "enemy" as const,
      hurt: enemy.hurtFlash > 0
    }))
  ];

  for (const entity of entities) {
    const dx = entity.x - player.x;
    const dy = entity.y - player.y;
    const distance = Math.hypot(dx, dy);
    const angle = normalizeAngle(Math.atan2(dy, dx) - player.angle);
    if (Math.abs(angle) > fov * 0.65) {
      continue;
    }

    const projected = angle / (fov / 2);
    const spriteHeight = Math.min(1.45, 1.15 / Math.max(distance, 0.001));
    const spriteWidth = spriteHeight * (entity.kind === "enemy" ? 0.56 : 0.42);
    const centerX = projected;
    const screenColumn = Math.floor(((centerX + 1) / 2) * depthBuffer.length);
    if (screenColumn < 0 || screenColumn >= depthBuffer.length) {
      continue;
    }
    if (distance > depthBuffer[screenColumn]) {
      continue;
    }

    draws.push({
      x: centerX - spriteWidth / 2,
      y: -spriteHeight * 0.6,
      width: spriteWidth,
      height: spriteHeight,
      color: colorForSprite(entity.kind, entity.hurt),
      depth: distance
    });
  }

  return draws;
}

function colorForTile(tile: Tile): [number, number, number] {
  switch (tile) {
    case 2:
      return [0.63, 0.24, 0.2];
    case 3:
      return [0.1, 0.52, 0.24];
    case 4:
      return [0.79, 0.68, 0.24];
    default:
      return [0.35, 0.37, 0.45];
  }
}

function colorForSprite(kind: PickupKind | "enemy", hurt: boolean): [number, number, number, number] {
  if (kind === "ammo") {
    return [0.24, 0.72, 0.93, 1];
  }
  if (kind === "health") {
    return [0.24, 0.86, 0.42, 1];
  }
  return hurt ? [1, 0.42, 0.42, 1] : [0.9, 0.88, 0.82, 1];
}

function pushRect(
  output: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  color: [number, number, number, number]
): void {
  const x2 = x + width;
  const y2 = y + height;
  output.push(
    x, y, color[0], color[1], color[2], color[3],
    x2, y, color[0], color[1], color[2], color[3],
    x, y2, color[0], color[1], color[2], color[3],
    x, y2, color[0], color[1], color[2], color[3],
    x2, y, color[0], color[1], color[2], color[3],
    x2, y2, color[0], color[1], color[2], color[3]
  );
}

function normalizeAngle(angle: number): number {
  let next = angle;
  while (next < -Math.PI) {
    next += Math.PI * 2;
  }
  while (next > Math.PI) {
    next -= Math.PI * 2;
  }
  return next;
}

function resizeCanvas(): void {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.floor(canvas.clientWidth * ratio);
  const height = Math.floor(canvas.clientHeight * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

document.addEventListener("keydown", (event) => {
  pressed.add(event.code);
  if (event.code === "Escape" && mode === "playing") {
    document.exitPointerLock?.();
    showPanel("Paused", "Regroup and head back in when ready.", "Resume");
    mode = "paused";
  }
});

document.addEventListener("keyup", (event) => {
  pressed.delete(event.code);
});

document.addEventListener("mousemove", (event) => {
  if (!pointerLocked || mode !== "playing") {
    return;
  }
  player.angle += event.movementX * 0.0028;
});

document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === canvas;
  if (!pointerLocked && mode === "playing") {
    showPanel("Paused", "Pointer lock was released.", "Resume");
    mode = "paused";
  }
});

document.addEventListener("click", () => {
  if (mode === "playing" && pointerLocked) {
    fireWeapon();
  }
});

window.addEventListener("resize", resizeCanvas);

function frame(timestamp: number): void {
  const dt = Math.min(maxDelta, (timestamp - lastTimestamp) / 1000 || 0);
  lastTimestamp = timestamp;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

showPanel("WOLFSTEIN", "Experimental WebGL raycaster", "Enter the bunker");
requestAnimationFrame(frame);
