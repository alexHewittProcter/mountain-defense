// Deterministic PRNG so map decoration is stable per map seed
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

export function distToPath(px, py, points) {
  let m = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    m = Math.min(m, distToSegment(px, py, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y));
  }
  return m;
}

// Precompute segment lengths / cumulative distance for a waypoint list
export function buildPath(waypoints) {
  const points = waypoints.map((p) => ({ x: p.x, y: p.y }));
  const segLengths = [];
  const cum = [0];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const len = dist(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    segLengths.push(len);
    total += len;
    cum.push(total);
  }
  return { points, segLengths, cum, total };
}

// Point at a given distance along a built path
export function pointAtDistance(path, d) {
  const dd = clamp(d, 0, path.total);
  for (let i = 0; i < path.segLengths.length; i++) {
    if (dd <= path.cum[i + 1] || i === path.segLengths.length - 1) {
      const segLen = path.segLengths[i] || 1;
      const t = clamp((dd - path.cum[i]) / segLen, 0, 1);
      const a = path.points[i];
      const b = path.points[i + 1];
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return { ...path.points[path.points.length - 1] };
}
