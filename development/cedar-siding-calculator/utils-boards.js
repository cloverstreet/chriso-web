// Board calculation logic for Cedar Siding Calculator
// Handles both Single Boundary and Dual Boundary pattern modes

import { lineIntersection, extendLine, angleBetweenPoints, distance, pointAtAngleThroughPoint } from './utils-geometry.js';
import { formatAngle, roundToSixteenth } from './utils-measurements.js';

/**
 * Wall configuration constants
 * Can be made editable in future versions
 */
export const WALL_CONFIG = {
  A: { x: 0, y: 0 },      // Bottom left
  B: { x: 96, y: 0 },     // Bottom right
  C: { x: 96, y: 183 },   // Top right
  D: { x: 0, y: 135 }     // Top left
};

export const BOARD_HEIGHT = 5.5;

/**
 * Calculate DC line properties (top edge of trapezoid)
 */
export const getDCLineInfo = () => {
  const { C, D } = WALL_CONFIG;
  const angle = Math.atan2(C.y - D.y, C.x - D.x) * (180 / Math.PI);
  const length = Math.sqrt(Math.pow(C.x - D.x, 2) + Math.pow(C.y - D.y, 2));
  return { angle, length };
};

/**
 * Find all intersection points between a line and the trapezoid
 * Returns sorted intersections from left to right
 */
const findBoardIntersections = (lineStart, lineEnd) => {
  const { A, B, C, D } = WALL_CONFIG;
  const edges = [
    { name: 'AB', p1: A, p2: B },
    { name: 'BC', p1: B, p2: C },
    { name: 'CD', p1: C, p2: D },
    { name: 'DA', p1: D, p2: A }
  ];
  
  const intersections = [];
  edges.forEach(edge => {
    const intersection = lineIntersection(lineStart, lineEnd, edge.p1, edge.p2);
    if (intersection) {
      intersections.push({
        point: intersection,
        edge: edge.name
      });
    }
  });
  
  // Sort by x-coordinate (left to right)
  return intersections.sort((a, b) => a.point.x - b.point.x);
};

/**
 * Determine board type based on which edges it intersects
 */
const determineBoardType = (intersections) => {
  if (intersections.length < 2) return { isPartial: false, isFullWidth: false };
  
  const edges = intersections.map(i => i.edge);
  const isFullWidth = edges.includes('DA') && edges.includes('BC');
  const isPartial = !isFullWidth;
  
  return { isPartial, isFullWidth };
};

/**
 * Calculate boards for Single Boundary mode
 * Boards have constant reveal spacing, angles auto-calculate
 */
export const calculateSingleBoundaryBoards = (leftReveal, rightReveal, topAngle = null) => {
  const { A, B, C, D } = WALL_CONFIG;
  const boards = [];
  
  // Calculate number of boards needed (with buffer for partials)
  const maxBoards = Math.ceil(Math.max(D.y, C.y) / Math.min(leftReveal, rightReveal)) + 5;
  
  for (let i = 0; i < maxBoards; i++) {
    const leftY = A.y + (i * leftReveal);
    const rightY = B.y + (i * rightReveal);
    
    // If topAngle is specified, adjust the right point to match that angle
    let p1 = { x: A.x, y: leftY };
    let p2;
    
    if (topAngle !== null) {
      // Calculate right point to achieve the specified top angle
      const angleRad = topAngle * (Math.PI / 180);
      const run = B.x - A.x; // 96 inches
      const rise = Math.tan(angleRad) * run;
      p2 = { x: B.x, y: leftY + rise };
    } else {
      p2 = { x: B.x, y: rightY };
    }
    
    // Extend the line and find intersections
    const extended = extendLine(p1, p2);
    const intersections = findBoardIntersections(extended.start, extended.end);
    
    if (intersections.length >= 2) {
      const leftmost = intersections[0].point;
      const rightmost = intersections[intersections.length - 1].point;
      
      const boardLength = distance(leftmost, rightmost);
      const boardAngle = angleBetweenPoints(leftmost, rightmost);
      const { isPartial, isFullWidth } = determineBoardType(intersections);
      
      // Calculate cut angles (90° - board angle for perpendicular cuts)
      const leftCutAngle = 90 - boardAngle;
      const rightCutAngle = 90 + boardAngle;
      
      boards.push({
        boardNum: i + 1,
        length: boardLength.toFixed(3),
        leftPoint: leftmost,
        rightPoint: rightmost,
        leftAngle: formatAngle(leftCutAngle),
        rightAngle: formatAngle(rightCutAngle),
        boardAngle: formatAngle(boardAngle),
        leftReveal: leftReveal.toFixed(2),
        rightReveal: topAngle !== null ? ((p2.y - (i > 0 ? (A.y + ((i-1) * leftReveal) + Math.tan(angleRad) * (B.x - A.x)) : B.y)) || rightReveal).toFixed(2) : rightReveal.toFixed(2),
        overlap: (BOARD_HEIGHT - leftReveal).toFixed(2),
        isPartial,
        isFullWidth,
        isMidArc: false
      });
    }
    
    // Stop if we're well past the top of the wall
    if (leftY > D.y + 20 && rightY > C.y + 20) break;
  }
  
  return boards;
};

/**
 * Calculate boards for Dual Boundary mode
 * Boards align to specified top and bottom angles
 */
export const calculateDualBoundaryBoards = (params) => {
  const { topAngle, bottomAngle, mode, leftReveal, rightReveal, boardCount } = params;
  const { A, B, C, D } = WALL_CONFIG;
  const boards = [];
  
  // Determine reveals based on mode
  let actualLeftReveal = leftReveal;
  let actualRightReveal = rightReveal;
  
  if (mode === 'count') {
    // Calculate reveals to fit exact board count
    actualLeftReveal = D.y / boardCount;
    actualRightReveal = C.y / boardCount;
  } else if (mode === 'left') {
    // Fix left reveal, calculate right
    actualRightReveal = (C.y / D.y) * leftReveal;
  } else if (mode === 'right') {
    // Fix right reveal, calculate left
    actualLeftReveal = (D.y / C.y) * rightReveal;
  }
  
  const numBoards = mode === 'count' ? boardCount : Math.ceil(Math.max(D.y / actualLeftReveal, C.y / actualRightReveal)) + 5;
  
  let midArcIndex = -1;
  let minAngleDiff = Infinity;
  
  for (let i = 0; i < numBoards; i++) {
    const leftY = A.y + (i * actualLeftReveal);
    const rightY = B.y + (i * actualRightReveal);
    
    // Create line at the appropriate angle through these points
    const leftPoint = { x: A.x, y: leftY };
    const rightPoint = { x: B.x, y: rightY };
    
    // Calculate the natural angle between these points
    const naturalAngle = angleBetweenPoints(leftPoint, rightPoint);
    
    // Track which board is closest to horizontal (mid-arc)
    const angleDiff = Math.abs(naturalAngle);
    if (angleDiff < minAngleDiff) {
      minAngleDiff = angleDiff;
      midArcIndex = i;
    }
    
    // Use natural angle for board positioning
    const extended = extendLine(leftPoint, rightPoint);
    const intersections = findBoardIntersections(extended.start, extended.end);
    
    if (intersections.length >= 2) {
      const leftmost = intersections[0].point;
      const rightmost = intersections[intersections.length - 1].point;
      
      const boardLength = distance(leftmost, rightmost);
      const boardAngle = angleBetweenPoints(leftmost, rightmost);
      const { isPartial, isFullWidth } = determineBoardType(intersections);
      
      const leftCutAngle = 90 - boardAngle;
      const rightCutAngle = 90 + boardAngle;
      
      boards.push({
        boardNum: i + 1,
        length: boardLength.toFixed(3),
        leftPoint: leftmost,
        rightPoint: rightmost,
        leftAngle: formatAngle(leftCutAngle),
        rightAngle: formatAngle(rightCutAngle),
        boardAngle: formatAngle(boardAngle),
        leftReveal: actualLeftReveal.toFixed(2),
        rightReveal: actualRightReveal.toFixed(2),
        overlap: (BOARD_HEIGHT - actualLeftReveal).toFixed(2),
        isPartial,
        isFullWidth,
        isMidArc: false
      });
    }
    
    if (leftY > D.y + 20 && rightY > C.y + 20) break;
  }
  
  // Mark mid-arc board
  if (midArcIndex >= 0 && boards[midArcIndex]) {
    boards[midArcIndex].isMidArc = true;
  }
  
  return boards;
};
