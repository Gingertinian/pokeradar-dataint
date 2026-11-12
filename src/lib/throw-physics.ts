export type Vector2 = { x: number; y: number };
export type Flight = {
  points: Vector2[];
  impact: Vector2;
  hit: boolean;
  duration: number;
  spin: number;
  missReason?: "weak" | "short" | "wide";
};
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export function isThrowGesture(displacement: Vector2): boolean {
  return displacement.y <= -16 && Math.hypot(displacement.x, displacement.y) >= 22;
}

export function assistedThrowVelocity(direction: number, power: number, height: number): Vector2 {
  const angle = ((direction - 50) / 50) * Math.PI * 0.36;
  const speed = ((230 + (power / 100) * 750) * height) / 330;
  return { x: Math.sin(angle) * speed, y: -Math.cos(angle) * speed };
}

export function closestApproach(points: Vector2[], target: Vector2): Vector2 {
  return points.reduce((closest, point) =>
    Math.hypot(point.x - target.x, point.y - target.y) <
    Math.hypot(closest.x - target.x, closest.y - target.y)
      ? point
      : closest,
  );
}

export function gestureVelocity(displacement: Vector2, velocity: Vector2, height: number): Vector2 {
  if (!isThrowGesture(displacement)) return { x: velocity.x * 0.2, y: -height * 0.15 };
  const speed = Math.hypot(velocity.x, velocity.y) / Math.max(1, height);
  const power = 0.78 + 0.35 * (1 - Math.exp(-speed / 1.8));
  const direction = clamp(displacement.x / Math.max(55, -displacement.y), -1.1, 1.1);
  return { x: direction * height * 0.74, y: -height * 1.52 * power };
}

export function accumulateSpin(
  spin: number,
  previous: Vector2,
  next: Vector2,
  elapsedMs: number,
): number {
  const decay = Math.exp(-Math.max(0, elapsedMs) / 1500);
  if (Math.hypot(previous.x, previous.y) < 1 || Math.hypot(next.x, next.y) < 1) return spin * decay;
  const turn = Math.atan2(
    previous.x * next.y - previous.y * next.x,
    previous.x * next.x + previous.y * next.y,
  );
  return clamp(spin * decay + (turn / (Math.PI * 2)) * 1.7, -1.25, 1.25);
}

export function simulateThrow({
  start,
  velocity,
  spin,
  target,
  radius,
  width,
  height,
}: {
  start: Vector2;
  velocity: Vector2;
  spin: number;
  target: Vector2;
  radius: number;
  width: number;
  height: number;
}): Flight {
  const scale = height / 330;
  const speed = Math.hypot(velocity.x, velocity.y),
    cap = Math.min(1, (1300 * scale) / Math.max(1, speed));
  let vx = velocity.x * cap,
    vy = velocity.y * cap;
  let x = start.x,
    y = start.y,
    time = 0;
  const points: Vector2[] = [{ x, y }],
    launchUp = vy < -120 * scale;
  let bestDistance = Infinity,
    bestIndex = 0,
    checked = false;
  const dt = 1 / 60;
  for (let frame = 0; frame < 84; frame++) {
    const ax = -spin * vy * 1.05;
    vx += ax * dt;
    vy += 620 * scale * dt;
    x += vx * dt;
    y += vy * dt;
    time += dt;
    points.push({ x, y });
    const distance = Math.hypot(x - target.x, y - target.y);
    if (launchUp && time > 0.07 && distance < bestDistance) {
      bestDistance = distance;
      bestIndex = points.length - 1;
    }
    if (!checked && launchUp && time > 0.08 && (y <= target.y || vy >= 0)) {
      checked = true;
      if (bestDistance <= radius) {
        const path = points.slice(0, bestIndex + 1);
        return {
          points: path,
          impact: path[path.length - 1]!,
          hit: true,
          duration: clamp(bestIndex * dt, 0.42, 0.95),
          spin,
        };
      }
    }
    if (time > 0.15 && (y > height + 70 || x < -90 || x > width + 90)) break;
  }
  return {
    points,
    impact: points[points.length - 1]!,
    hit: false,
    missReason: !launchUp
      ? "weak"
      : Math.min(...points.map((p) => p.y)) > target.y + radius
        ? "short"
        : "wide",
    duration: clamp(time, 0.48, 1.25),
    spin,
  };
}
