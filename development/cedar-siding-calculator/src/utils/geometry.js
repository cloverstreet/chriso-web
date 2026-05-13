// Geometry utility functions for Cedar Siding Calculator
// These functions handle line intersections, angle calculations, and coordinate math

/**
 * Calculate intersection point of two lines
 * Each line defined by two points
 */
export const lineIntersection = (p1, p2, p3, p4) => {
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const x4 = p4.x, y4 = p4.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.0001) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }
  return null;
};

/**
 * Extend a line segment far beyond the wall boundaries
 * Used to ensure we catch all intersections
 */
export const extendLine = (p1, p2, extension = 1000) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;

  return {
    start: {
      x: p1.x - ux * extension,
      y: p1.y - uy * extension
    },
    end: {
      x: p2.x + ux * extension,
      y: p2.y + uy * extension
    }
  };
};

/**
 * Calculate angle between two points in degrees
 * Returns angle from horizontal (0° = horizontal right, 90° = vertical up)
 */
export const angleBetweenPoints = (p1, p2) => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
};

/**
 * Calculate distance between two points
 */
export const distance = (p1, p2) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Find a point along a line at a specific angle through a given point
 * Used for dual boundary mode to position boards at specific angles
 */
export const pointAtAngleThroughPoint = (throughPoint, angle, distance, direction = 'right') => {
  const radians = angle * (Math.PI / 180);
  const dx = Math.cos(radians) * distance;
  const dy = Math.sin(radians) * distance;

  if (direction === 'right') {
    return { x: throughPoint.x + dx, y: throughPoint.y + dy };
  } else {
    return { x: throughPoint.x - dx, y: throughPoint.y - dy };
  }
};

/**
 * Calculate slope (rise/run) between two points
 */
export const calculateSlope = (p1, p2) => {
  const run = p2.x - p1.x;
  if (Math.abs(run) < 0.0001) return Infinity;
  return (p2.y - p1.y) / run;
};

/**
 * Normalize an angle to 0-360 range
 */
export const normalizeAngle = (angle) => {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
};

/**
 * Check if a point is inside a polygon (trapezoid)
 * Uses ray casting algorithm
 */
export const isPointInPolygon = (point, vertices) => {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};
