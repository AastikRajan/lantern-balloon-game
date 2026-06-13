export const GUST_RADIUS = 4.5;
export const GUST_STRENGTH = 1.6;
export const GUST_MAX_IMPULSE = 60;
export const LANTERN_FACTOR = 0.12;

export interface SwipeSegment { ax: number; ay: number; bx: number; by: number; speed: number; }
export interface Impulse { x: number; y: number; }

/** Distance from point P to segment AB. */
function distToSegment(seg: SwipeSegment, px: number, py: number): number {
  const dx = seg.bx - seg.ax, dy = seg.by - seg.ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - seg.ax) * dx + (py - seg.ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (seg.ax + t * dx), py - (seg.ay + t * dy));
}

export function gustImpulse(seg: SwipeSegment, px: number, py: number): Impulse | null {
  const d = distToSegment(seg, px, py);
  if (d > GUST_RADIUS) return null;
  const dx = seg.bx - seg.ax, dy = seg.by - seg.ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  const falloff = 1 - d / GUST_RADIUS;
  const mag = Math.min(GUST_MAX_IMPULSE, seg.speed * GUST_STRENGTH * falloff);
  return { x: (dx / len) * mag, y: (dy / len) * mag };
}
