import type { Coordinate } from "./geography";

type Point = { x: number; y: number };

export type RadarPlacement = { side: "left" | "right"; lift: number; shift: number };

export function radarPlacement(
  points: Point[],
  width: number,
  height: number,
  mobile = false,
  otherPoints: Point[] = [],
): RadarPlacement {
  const consoleWidth = mobile ? Math.max(0, width - 24) : Math.min(820, Math.max(0, width - 56));
  const railWidth = mobile
    ? Math.min(300, Math.max(0, consoleWidth - 68))
    : Math.min(320, Math.max(0, consoleWidth - 56));
  const left = (width - consoleWidth) / 2;
  const right = left + consoleWidth - railWidth - 56;
  const railHeight = mobile ? 168 : 120 + points.length * 70;
  const safeTop = mobile ? 70 : 20;
  const bottomTop = Math.max(safeTop, height - (mobile ? 112 : 122) - railHeight);
  const lift = Math.max(0, bottomTop - safeTop);
  const overlap = (
    a: { left: number; top: number; right: number; bottom: number },
    b: { left: number; top: number; right: number; bottom: number },
  ) =>
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const options = mobile
    ? [
        { side: "left" as const, x: left, lift: 0 },
        { side: "left" as const, x: left, lift },
      ]
    : [0, lift].flatMap((height) => [
        { side: "right" as const, x: right, lift: height },
        { side: "left" as const, x: left, lift: height },
        ...[64, 128].map((shift) => ({
          side: "right" as const,
          x: Math.max(12, Math.min(right + shift, width - railWidth - LABEL_RIGHT_INSET)),
          lift: height,
        })),
      ]);
  const nav = mobile
    ? { left: 12, top: 14, right: Math.min(width - 80, 310), bottom: 64 }
    : { left: 20, top: 20, right: 340, bottom: 85 };
  const score = (option: (typeof options)[number]) => {
    const box = {
      left: option.x,
      top: bottomTop - option.lift,
      right: option.x + railWidth,
      bottom: bottomTop - option.lift + railHeight,
    };
    const markerOverlap = (markers: Point[], radius: number) =>
      markers.reduce(
        (sum, point) =>
          sum +
          overlap(box, {
            left: point.x - radius,
            top: point.y - radius,
            right: point.x + radius,
            bottom: point.y + radius,
          }),
        0,
      );
    return overlap(box, nav) * 2 + markerOverlap(points, 38) * 4 + markerOverlap(otherPoints, 28);
  };
  const best = options.reduce((a, b) => (score(b) < score(a) ? b : a));
  return {
    side: best.side,
    lift: Math.round(best.lift),
    shift: mobile ? 0 : Math.round(best.x - (best.side === "right" ? right : left)),
  };
}

export const LABEL_RIGHT_INSET = 76;

export function destinationLabelOffsets(
  points: Point[],
  width: number,
  height: number,
): Coordinate[] {
  const labelWidth = width < 600 ? 145 : 174;
  const labelHeight = 58;
  const occupied: { left: number; top: number; right: number; bottom: number }[] = [];
  return points.map((point, index) => {
    const preferred: Coordinate = index === 0 ? [-195, -78] : index === 1 ? [24, 12] : [18, -28];
    if (point.x < -24 || point.y < -24 || point.x > width + 24 || point.y > height + 24)
      return preferred;
    const candidates: Coordinate[] = [
      preferred,
      [24, -78],
      [-labelWidth - 24, -78],
      [24, 12],
      [-labelWidth - 24, 12],
      [24, 82],
      [-labelWidth - 24, 82],
      [-labelWidth / 2, -150],
      [-labelWidth / 2, 82],
    ];
    const options = candidates.map(([x, y]) => {
      const left = Math.max(
        12 - point.x,
        Math.min(x, width - point.x - labelWidth - LABEL_RIGHT_INSET),
      );
      const top = Math.max(108 - point.y, Math.min(y, height - point.y - 135));
      const box = {
        left: point.x + left,
        top: point.y + top,
        right: point.x + left + labelWidth,
        bottom: point.y + top + labelHeight,
      };
      const overlap = occupied.reduce(
        (sum, other) =>
          sum +
          Math.max(0, Math.min(box.right, other.right) - Math.max(box.left, other.left) + 8) *
            Math.max(0, Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) + 8),
        0,
      );
      return {
        offset: [left, top] as Coordinate,
        box,
        score: overlap * 1000 + Math.hypot(left - preferred[0], top - preferred[1]),
      };
    });
    const best = options.reduce((a, b) => (b.score < a.score ? b : a));
    occupied.push(best.box);
    return best.offset;
  });
}
