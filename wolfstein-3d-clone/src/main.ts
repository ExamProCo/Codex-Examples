import "./style.css";
import wallTextureUrl from "../output/imagegen/generated-set/wall-stone-seamless.png";
import floorTextureUrl from "../output/imagegen/generated-set/floor-stone-seamless.png";
import doorTextureUrl from "../output/imagegen/generated-set/door-blast-front.png";
import ammoTextureUrl from "../output/imagegen/generated-set/pickup-ammo-icon-transparent.png";
import healthTextureUrl from "../output/imagegen/generated-set/pickup-health-icon-transparent.png";
import enemyTextureUrl from "../output/imagegen/generated-set/enemy-guard-portrait.png";

function requiredSelector<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing element: ${selector}`);
  }
  return element;
}

function requireCanvas2D(target: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = target.getContext("2d", { alpha: false });
  if (!context) {
    throw new Error("2D canvas not available");
  }
  context.imageSmoothingEnabled = false;
  return context;
}

type Tile = 0 | 1 | 2 | 3 | 4;
type PickupKind = "ammo" | "health";
type EnemyState = "idle" | "chase" | "attack" | "dead";
type GameMode = "title" | "playing" | "paused" | "victory" | "dead";
type SpriteKind = PickupKind | "enemy";

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
  textureX: number;
}

interface Texture {
  image: HTMLImageElement;
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

interface Textures {
  wall: Texture;
  floor: Texture;
  door: Texture;
  ammo: Texture;
  health: Texture;
  enemy: Texture;
}

interface SpriteDraw {
  screenX: number;
  screenY: number;
  width: number;
  height: number;
  texture: Texture;
  depth: number;
  hurt: boolean;
}

const canvas = requiredSelector<HTMLCanvasElement>("#game");
const screen = requiredSelector<HTMLDivElement>("#screen");
const healthLabel = requiredSelector<HTMLSpanElement>("#health");
const ammoLabel = requiredSelector<HTMLSpanElement>("#ammo");
const objectiveLabel = requiredSelector<HTMLSpanElement>("#objective");
const messageLabel = requiredSelector<HTMLDivElement>("#message");
const ctx = requireCanvas2D(canvas);

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
let textures: Textures | null = null;
let textureLoadError: string | null = null;

const doors = structuredClone(initialDoors);
const pickups = structuredClone(initialPickups);
const enemies = structuredClone(initialEnemies);

const pressed = new Set<string>();
const rayCount = 320;
const fov = Math.PI / 3;
const moveSpeed = 2.8;
const turnSpeed = 2.4;
const maxDelta = 0.05;

void loadTextures()
  .then((loaded) => {
    textures = loaded;
  })
  .catch((error: unknown) => {
    textureLoadError = error instanceof Error ? error.message : "Unknown texture loading error";
  });

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

    const stepX = dirX < 0 ? -1 : 1;
    const stepY = dirY < 0 ? -1 : 1;
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

    let wallX = side === 0 ? player.y + rawDepth * dirY : player.x + rawDepth * dirX;
    wallX -= Math.floor(wallX);
    if ((side === 0 && dirX > 0) || (side === 1 && dirY < 0)) {
      wallX = 1 - wallX;
    }

    hits.push({
      depth: Math.max(0.001, rawDepth * Math.cos(rayAngle - player.angle)),
      type: tile,
      side,
      textureX: wallX
    });
  }

  return hits;
}

function render(): void {
  resizeCanvas();
  const width = canvas.width;
  const height = canvas.height;

  if (!textures) {
    renderLoadingFrame(width, height);
    updateHud();
    return;
  }

  const rays = castRays();
  const frame = ctx.createImageData(width, height);
  drawCeiling(frame);
  drawFloor(frame, textures.floor);
  drawWalls(frame, rays, textures);
  ctx.putImageData(frame, 0, 0);

  const sprites = collectSprites(rays, textures);
  sprites.sort((left, right) => right.depth - left.depth);
  for (const sprite of sprites) {
    drawSprite(sprite);
  }

  drawWeapon();

  if (flashTimer > 0) {
    const alpha = (flashTimer / 0.18) * 0.28;
    ctx.fillStyle = `rgba(179, 26, 20, ${alpha})`;
    ctx.fillRect(0, 0, width, height);
  }

  if (mode === "victory") {
    const pulse = 0.08 + Math.sin(victoryPulse * 6) * 0.04;
    ctx.fillStyle = `rgba(242, 212, 82, ${pulse})`;
    ctx.fillRect(0, 0, width, height);
  }

  drawCrosshair(width, height);
  updateHud();
}

function drawCeiling(frame: ImageData): void {
  const { data, width, height } = frame;
  const horizon = Math.floor(height * 0.46);

  for (let y = 0; y < horizon; y += 1) {
    const shade = y / Math.max(1, horizon - 1);
    const r = Math.round(16 + shade * 34);
    const g = Math.round(18 + shade * 22);
    const b = Math.round(24 + shade * 12);
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = 255;
    }
  }
}

function drawFloor(frame: ImageData, floorTexture: Texture): void {
  const { data, width, height } = frame;
  const rayDirX0 = Math.cos(player.angle - fov / 2);
  const rayDirY0 = Math.sin(player.angle - fov / 2);
  const rayDirX1 = Math.cos(player.angle + fov / 2);
  const rayDirY1 = Math.sin(player.angle + fov / 2);
  const horizon = Math.floor(height * 0.46);
  const posZ = height * 0.5;

  for (let y = horizon; y < height; y += 1) {
    const p = y - height / 2;
    const rowDistance = posZ / Math.max(p, 1);
    let floorX = player.x + rowDistance * rayDirX0;
    let floorY = player.y + rowDistance * rayDirY0;
    const stepX = (rowDistance * (rayDirX1 - rayDirX0)) / width;
    const stepY = (rowDistance * (rayDirY1 - rayDirY0)) / width;
    const fog = Math.max(0.24, 1 - rowDistance / 12);

    for (let x = 0; x < width; x += 1) {
      const sample = sampleTexture(floorTexture, floorX, floorY);
      const index = (y * width + x) * 4;
      data[index] = Math.round(sample[0] * fog);
      data[index + 1] = Math.round(sample[1] * fog);
      data[index + 2] = Math.round(sample[2] * fog);
      data[index + 3] = 255;
      floorX += stepX;
      floorY += stepY;
    }
  }
}

function drawWalls(frame: ImageData, rays: RayHit[], loadedTextures: Textures): void {
  const { data, width, height } = frame;
  const projection = height * 0.9;
  const columnWidth = width / rays.length;

  for (let column = 0; column < rays.length; column += 1) {
    const hit = rays[column];
    const sliceHeight = Math.min(height * 0.92, projection / hit.depth);
    const startY = Math.max(0, Math.floor(height / 2 - sliceHeight / 2));
    const endY = Math.min(height, Math.floor(height / 2 + sliceHeight / 2));
    const startX = Math.floor(column * columnWidth);
    const endX = Math.min(width, Math.ceil((column + 1) * columnWidth));
    const texture = textureForTile(hit.type, loadedTextures);
    const tint = tintForTile(hit.type);
    const texX = Math.min(texture.width - 1, Math.floor(hit.textureX * texture.width));
    const fog = Math.max(0.2, 1 - hit.depth / 10);
    const sideShade = hit.side === 1 ? 0.74 : 1;

    for (let y = startY; y < endY; y += 1) {
      const v = (y - startY) / Math.max(1, endY - startY - 1);
      const texY = Math.min(texture.height - 1, Math.floor(v * texture.height));
      const sampleIndex = (texY * texture.width + texX) * 4;
      const r = texture.data[sampleIndex] * tint[0] * fog * sideShade;
      const g = texture.data[sampleIndex + 1] * tint[1] * fog * sideShade;
      const b = texture.data[sampleIndex + 2] * tint[2] * fog * sideShade;
      for (let x = startX; x < endX; x += 1) {
        const index = (y * width + x) * 4;
        data[index] = Math.min(255, Math.round(r));
        data[index + 1] = Math.min(255, Math.round(g));
        data[index + 2] = Math.min(255, Math.round(b));
        data[index + 3] = 255;
      }
    }
  }
}

function collectSprites(rays: RayHit[], loadedTextures: Textures): SpriteDraw[] {
  const depthBuffer = rays.map((ray) => ray.depth);
  const draws: SpriteDraw[] = [];
  const projectionPlane = canvas.width / (2 * Math.tan(fov / 2));

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

    const screenX = canvas.width / 2 + Math.tan(angle) * projectionPlane;
    const screenColumn = Math.max(0, Math.min(depthBuffer.length - 1, Math.floor((screenX / canvas.width) * depthBuffer.length)));
    if (distance > depthBuffer[screenColumn]) {
      continue;
    }

    const spriteScale = entity.kind === "enemy" ? 0.95 : 0.42;
    const spriteHeight = Math.min(canvas.height * 0.78, (projectionPlane * spriteScale) / Math.max(distance, 0.001));
    const texture = textureForSprite(entity.kind, loadedTextures);
    const spriteWidth = spriteHeight * (texture.width / texture.height);

    draws.push({
      screenX: screenX - spriteWidth / 2,
      screenY: canvas.height / 2 - spriteHeight * (entity.kind === "enemy" ? 0.62 : 0.18),
      width: spriteWidth,
      height: spriteHeight,
      texture,
      depth: distance,
      hurt: entity.hurt
    });
  }

  return draws;
}

function drawSprite(sprite: SpriteDraw): void {
  const alpha = Math.max(0.36, 1 - sprite.depth / 14);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite.texture.image, sprite.screenX, sprite.screenY, sprite.width, sprite.height);
  if (sprite.hurt) {
    ctx.fillStyle = "rgba(255, 72, 72, 0.32)";
    ctx.fillRect(sprite.screenX, sprite.screenY, sprite.width, sprite.height);
  }
  ctx.restore();
}

function drawWeapon(): void {
  const bob = Math.sin(performance.now() * 0.008) * 2;
  const weaponWidth = canvas.width * 0.18;
  const weaponHeight = canvas.height * 0.16;
  const x = canvas.width / 2 - weaponWidth / 2;
  const y = canvas.height - weaponHeight * 0.82 + bob;

  ctx.fillStyle = "rgba(18, 16, 16, 0.86)";
  ctx.fillRect(x, y, weaponWidth, weaponHeight);
  ctx.fillStyle = "#6f7077";
  ctx.fillRect(x + weaponWidth * 0.26, y + weaponHeight * 0.12, weaponWidth * 0.48, weaponHeight * 0.22);
  ctx.fillStyle = "#24282c";
  ctx.fillRect(x + weaponWidth * 0.4, y - weaponHeight * 0.04, weaponWidth * 0.2, weaponHeight * 0.18);
  ctx.fillStyle = "#2f2318";
  ctx.fillRect(x + weaponWidth * 0.16, y + weaponHeight * 0.36, weaponWidth * 0.68, weaponHeight * 0.52);
}

function drawCrosshair(width: number, height: number): void {
  const cx = width / 2;
  const cy = height / 2;
  ctx.strokeStyle = "rgba(240, 230, 196, 0.7)";
  ctx.lineWidth = Math.max(1, Math.floor(width / 420));
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy);
  ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx, cy + 8);
  ctx.stroke();
}

function renderLoadingFrame(width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0d1118");
  gradient.addColorStop(1, "#23160f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#f6ebcc";
  ctx.font = `${Math.max(18, Math.floor(width * 0.035))}px Trebuchet MS`;
  ctx.textAlign = "center";
  ctx.fillText(textureLoadError ? "Texture load failed" : "Loading bunker textures...", width / 2, height / 2);
  if (textureLoadError) {
    ctx.font = `${Math.max(12, Math.floor(width * 0.016))}px Trebuchet MS`;
    ctx.fillText(textureLoadError, width / 2, height / 2 + 24);
  }
}

function updateHud(): void {
  healthLabel.textContent = `HP ${player.health}`;
  ammoLabel.textContent = `AMMO ${player.ammo}`;
  if (mode === "playing") {
    objectiveLabel.textContent = enemies.every((enemy) => enemy.state === "dead")
      ? "Head for the exit"
      : "Find the exit";
  }
}

function textureForTile(tile: Tile, loadedTextures: Textures): Texture {
  return tile === 4 ? loadedTextures.door : loadedTextures.wall;
}

function tintForTile(tile: Tile): [number, number, number] {
  switch (tile) {
    case 2:
      return [1, 0.68, 0.68];
    case 3:
      return [0.65, 1, 0.72];
    default:
      return [1, 1, 1];
  }
}

function textureForSprite(kind: SpriteKind, loadedTextures: Textures): Texture {
  switch (kind) {
    case "ammo":
      return loadedTextures.ammo;
    case "health":
      return loadedTextures.health;
    default:
      return loadedTextures.enemy;
  }
}

function sampleTexture(texture: Texture, u: number, v: number): [number, number, number] {
  const texX = mod(Math.floor((u - Math.floor(u)) * texture.width), texture.width);
  const texY = mod(Math.floor((v - Math.floor(v)) * texture.height), texture.height);
  const index = (texY * texture.width + texX) * 4;
  return [texture.data[index], texture.data[index + 1], texture.data[index + 2]];
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
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

function tileAt(x: number, y: number): Tile {
  if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) {
    return 1;
  }

  return map[y * mapWidth + x];
}

function resizeCanvas(): void {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.floor(canvas.clientWidth * ratio);
  const height = Math.floor(canvas.clientHeight * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = false;
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${url}`));
    image.src = url;
  });
}

function toTexture(image: HTMLImageElement): Texture {
  const surface = document.createElement("canvas");
  surface.width = image.naturalWidth;
  surface.height = image.naturalHeight;
  const surfaceContext = surface.getContext("2d");
  if (!surfaceContext) {
    throw new Error("Unable to prepare texture surface");
  }
  surfaceContext.drawImage(image, 0, 0);
  const imageData = surfaceContext.getImageData(0, 0, surface.width, surface.height);
  return {
    image,
    data: imageData.data,
    width: surface.width,
    height: surface.height
  };
}

async function loadTextures(): Promise<Textures> {
  const [wall, floor, door, ammo, health, enemy] = await Promise.all([
    loadImage(wallTextureUrl),
    loadImage(floorTextureUrl),
    loadImage(doorTextureUrl),
    loadImage(ammoTextureUrl),
    loadImage(healthTextureUrl),
    loadImage(enemyTextureUrl)
  ]);

  return {
    wall: toTexture(wall),
    floor: toTexture(floor),
    door: toTexture(door),
    ammo: toTexture(ammo),
    health: toTexture(health),
    enemy: toTexture(enemy)
  };
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

showPanel("WOLFSTEIN", "Textured bunker raycaster", "Enter the bunker");
requestAnimationFrame(frame);
