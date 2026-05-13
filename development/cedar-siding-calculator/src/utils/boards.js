// Board calculation logic for Cedar Siding Calculator
// Handles both Single Boundary and Dual Boundary pattern modes

import { lineIntersection, extendLine, angleBetweenPoints, distance, pointAtAngleThroughPoint } from './geometry';
import { formatAngle, roundToSixteenth } from './measurements';

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

/**
 * Board configuration constants
 * - BOARD_WIDTH: The actual width of the siding board material (e.g., 5.5" for 1x6 cedar)
 * - MIN_CUT_HEIGHT: Minimum usable height for partial boards at edges (for nailing)
 * - MIN_OVERLAP: Minimum overlap needed for water shedding
 */
export const BOARD_WIDTH = 5.5;
export const MIN_CUT_HEIGHT = 2.0;
export const MIN_OVERLAP = 1.0;

// Max reveal = board width - min overlap (e.g., 5.5 - 1.0 = 4.5")
export const MAX_REVEAL = BOARD_WIDTH - MIN_OVERLAP;

// Legacy alias for compatibility
export const BOARD_HEIGHT = BOARD_WIDTH;

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
  if (intersections.length < 2) return { isPartial: false, isFullWidth: false, edges: [] };

  const edges = intersections.map(i => i.edge);
  const isFullWidth = edges.includes('DA') && edges.includes('BC');
  const isPartial = !isFullWidth;

  return { isPartial, isFullWidth, edges };
};

/**
 * Calculate the "cut height" for a partial board
 * This is the usable portion of the board at the wall edge - how much of the
 * board's width is actually inside the wall boundary.
 *
 * For bottom partials (intersecting AB): The board's bottom extends below the wall.
 *   Cut height = how much of the board is above the AB line.
 *
 * For top partials (intersecting CD): The board's top extends above the wall.
 *   Cut height = how much of the board is below the CD line.
 *
 * Full boards always have cut height = BOARD_WIDTH (5.5")
 *
 * @param {object} leftPoint - Left intersection point with wall
 * @param {object} rightPoint - Right intersection point with wall
 * @param {string[]} edges - Which wall edges the board intersects
 * @param {number} boardBottomLeftY - Y position of board's bottom edge at left side
 * @param {number} boardBottomRightY - Y position of board's bottom edge at right side
 * @returns {object} { leftCutHeight, rightCutHeight, isBottomPartial, isTopPartial }
 */
const calculateCutHeights = (leftPoint, rightPoint, edges, boardBottomLeftY, boardBottomRightY) => {
  const { A, B, C, D } = WALL_CONFIG;

  // Default to full board width (not a partial)
  let leftCutHeight = BOARD_WIDTH;
  let rightCutHeight = BOARD_WIDTH;
  let isBottomPartial = false;
  let isTopPartial = false;

  // Bottom partial: board intersects AB (bottom edge)
  // The board's bottom edge is below y=0, so we only use the portion above AB
  if (edges.includes('AB')) {
    isBottomPartial = true;
    // Cut height at each end = how much of the board is above y=0
    // Board bottom is at boardBottomY, board top is at boardBottomY + BOARD_WIDTH
    // The usable portion is from y=0 up to the board's top
    leftCutHeight = Math.min(BOARD_WIDTH, Math.max(0, boardBottomLeftY + BOARD_WIDTH));
    rightCutHeight = Math.min(BOARD_WIDTH, Math.max(0, boardBottomRightY + BOARD_WIDTH));
  }

  // Top partial: board intersects CD (top sloped edge)
  // The board extends above the CD line, so we only use the portion below CD
  if (edges.includes('CD')) {
    isTopPartial = true;

    // Calculate where the CD line is at each x position
    // CD goes from D(0, 135) to C(96, 183)
    const dcSlope = (C.y - D.y) / (C.x - D.x);

    // Y value of CD line at the left and right edges of the board
    const cdYAtLeft = D.y + dcSlope * (leftPoint.x - D.x);
    const cdYAtRight = D.y + dcSlope * (rightPoint.x - D.x);

    // Board top edge Y at each point
    const boardTopLeftY = boardBottomLeftY + BOARD_WIDTH;
    const boardTopRightY = boardBottomRightY + BOARD_WIDTH;

    // If board top extends above CD, cut height is the portion below CD
    if (boardTopLeftY > cdYAtLeft) {
      leftCutHeight = Math.min(BOARD_WIDTH, Math.max(0, cdYAtLeft - boardBottomLeftY));
    }
    if (boardTopRightY > cdYAtRight) {
      rightCutHeight = Math.min(BOARD_WIDTH, Math.max(0, cdYAtRight - boardBottomRightY));
    }
  }

  return {
    leftCutHeight: Math.max(0, leftCutHeight),
    rightCutHeight: Math.max(0, rightCutHeight),
    isBottomPartial,
    isTopPartial
  };
};

/**
 * Calculate boards for Single Boundary mode
 *
 * The key insight: The TOP board is always parallel to the top boundary (DC line).
 * The topBoardAngle parameter allows adjusting this (default = DC angle).
 *
 * Working backwards from the top:
 * - Top board sits just below DC line at the specified angle
 * - Each board below has its left edge spaced by leftReveal
 * - Each board below has its right edge spaced by rightReveal
 * - This means board angles gradually change as we go down
 *
 * @param {number} leftReveal - Vertical spacing between boards on left edge (DA)
 * @param {number} rightReveal - Vertical spacing between boards on right edge (BC)
 * @param {number} topBoardAngle - Angle of the topmost board (default = DC line angle)
 * @param {number} offset - Vertical offset to shift the entire pattern up/down
 */
export const calculateSingleBoundaryBoards = (leftReveal, rightReveal, topBoardAngle = null, offset = 0) => {
  const { A, B, C, D } = WALL_CONFIG;
  const boards = [];
  const wallWidth = B.x - A.x;

  // Default top board angle is the DC line angle
  const dcAngle = Math.atan2(C.y - D.y, C.x - D.x) * (180 / Math.PI);
  const actualTopAngle = topBoardAngle !== null ? topBoardAngle : dcAngle;
  const topAngleRad = actualTopAngle * (Math.PI / 180);

  // Calculate where the top board sits
  // The top board's left edge touches D, right edge touches C (or close to it)
  // But with different reveals, we need to think about this differently:

  // Number of boards needed on each side
  const numBoardsLeft = Math.ceil(D.y / leftReveal);
  const numBoardsRight = Math.ceil(C.y / rightReveal);

  // Use the larger number to ensure full coverage
  const numBoards = Math.max(numBoardsLeft, numBoardsRight);

  // Calculate extra buffer needed for offset
  // When offset is positive, we need more boards at the top
  // When offset is negative, we need more boards at the bottom
  const offsetBuffer = Math.ceil(Math.abs(offset) / Math.min(leftReveal, rightReveal)) + 5;

  // Start with extra boards below to catch partials and handle negative offset
  const startIndex = -10 - offsetBuffer;
  const endIndex = numBoards + 10 + offsetBuffer;

  let boardIndex = 0;
  let missedIntersections = 0;

  for (let i = startIndex; i <= endIndex; i++) {
    // Left edge Y position for this board
    const leftY = (i * leftReveal) + offset;

    // Right edge Y position for this board
    const rightY = (i * rightReveal) + offset;

    // Create line through these points
    const p1 = { x: A.x, y: leftY };
    const p2 = { x: B.x, y: rightY };

    // Extend the line and find intersections
    const extended = extendLine(p1, p2);
    const intersections = findBoardIntersections(extended.start, extended.end);

    if (intersections.length >= 2) {
      missedIntersections = 0;

      const leftmost = intersections[0].point;
      const rightmost = intersections[intersections.length - 1].point;

      const boardLength = distance(leftmost, rightmost);
      const boardAngle = angleBetweenPoints(leftmost, rightmost);
      const { isPartial, isFullWidth, edges } = determineBoardType(intersections);

      // Calculate cut angles (perpendicular to board)
      const leftCutAngle = 90 - boardAngle;
      const rightCutAngle = 90 + boardAngle;

      // Board bottom edge positions
      const boardBottomLeftY = leftY;
      const boardBottomRightY = rightY;

      // Calculate cut heights for partial boards
      const cutHeights = calculateCutHeights(
        leftmost,
        rightmost,
        edges,
        boardBottomLeftY,
        boardBottomRightY
      );

      // Calculate actual reveals for this board
      // (they match the input reveals for full boards)
      const actualLeftReveal = leftReveal;
      const actualRightReveal = rightReveal;

      boards.push({
        boardNum: boardIndex + 1,
        length: boardLength.toFixed(3),
        leftPoint: leftmost,
        rightPoint: rightmost,
        leftAngle: formatAngle(leftCutAngle),
        rightAngle: formatAngle(rightCutAngle),
        boardAngle: formatAngle(boardAngle),
        leftReveal: actualLeftReveal.toFixed(2),
        rightReveal: actualRightReveal.toFixed(2),
        leftOverlap: (BOARD_WIDTH - actualLeftReveal).toFixed(2),
        rightOverlap: (BOARD_WIDTH - actualRightReveal).toFixed(2),
        leftCutHeight: cutHeights.leftCutHeight.toFixed(2),
        rightCutHeight: cutHeights.rightCutHeight.toFixed(2),
        isPartial,
        isFullWidth,
        isBottomPartial: cutHeights.isBottomPartial,
        isTopPartial: cutHeights.isTopPartial,
        isMidArc: false
      });
      boardIndex++;
    } else {
      missedIntersections++;
    }

    // Stop after several consecutive misses when we're past the wall
    if (missedIntersections > 10 && leftY > C.y) break;
  }

  return boards;
};

/**
 * Calculate boards for Dual Boundary mode
 * Boards interpolate between specified top and bottom angles
 * @param {number} params.offset - Vertical offset to shift the entire pattern up/down
 */
export const calculateDualBoundaryBoards = (params) => {
  const { topAngle, bottomAngle, mode, leftReveal, rightReveal, boardCount, offset = 0 } = params;
  const { A, B, C, D } = WALL_CONFIG;
  const boards = [];

  // Wall dimensions
  const wallWidth = B.x - A.x;
  const maxWallHeight = Math.max(D.y, C.y);

  // Determine number of boards and reveals based on mode
  let numBoards;
  let actualLeftReveal;
  let actualRightReveal;

  // Check if boards are parallel (same top and bottom angle)
  const areParallel = Math.abs(topAngle - bottomAngle) < 0.01;

  if (mode === 'count') {
    numBoards = boardCount;
    actualLeftReveal = D.y / boardCount;
    actualRightReveal = C.y / boardCount;

    // For parallel boards, ensure equal reveals
    if (areParallel) {
      // Use average reveal for both sides
      const avgReveal = (actualLeftReveal + actualRightReveal) / 2;
      actualLeftReveal = avgReveal;
      actualRightReveal = avgReveal;
    }
  } else if (mode === 'left') {
    actualLeftReveal = leftReveal;
    numBoards = Math.ceil(D.y / leftReveal);

    // For parallel boards, right reveal must equal left reveal
    if (areParallel) {
      actualRightReveal = actualLeftReveal;
    } else {
      actualRightReveal = C.y / numBoards;
    }
  } else if (mode === 'right') {
    actualRightReveal = rightReveal;
    numBoards = Math.ceil(C.y / rightReveal);

    // For parallel boards, left reveal must equal right reveal
    if (areParallel) {
      actualLeftReveal = actualRightReveal;
    } else {
      actualLeftReveal = D.y / numBoards;
    }
  }

  // Calculate how many extra boards we need based on angle range
  // More extreme angles need more buffer boards
  const maxAngleRad = Math.max(Math.abs(topAngle), Math.abs(bottomAngle)) * Math.PI / 180;
  const angleBuffer = Math.ceil(Math.abs(Math.tan(maxAngleRad) * wallWidth) / Math.min(actualLeftReveal, actualRightReveal)) + 10;

  const startIndex = -angleBuffer - 10;
  const totalBoards = numBoards + angleBuffer + 20;

  let midArcIndex = -1;
  let minAngleDiff = Infinity;
  let boardIndex = 0;
  let missedIntersections = 0;

  for (let i = startIndex; i < totalBoards; i++) {
    // Calculate position along the wall (0 = bottom, 1 = top)
    // Allow t to go slightly beyond 0-1 for partial boards
    const t = i / numBoards;

    // Interpolate angle between bottom and top
    const boardAngleTarget = bottomAngle + Math.max(0, Math.min(1, t)) * (topAngle - bottomAngle);
    const angleRad = boardAngleTarget * (Math.PI / 180);

    // Calculate left Y position based on reveal, with offset applied
    const leftY = A.y + (i * actualLeftReveal) + offset;

    // Calculate right Y to achieve the target angle
    const rise = Math.tan(angleRad) * wallWidth;
    const rightY = leftY + rise;

    // Create line through these points
    const leftPoint = { x: A.x, y: leftY };
    const rightPoint = { x: B.x, y: rightY };

    // Track which board is closest to horizontal (mid-arc)
    const angleDiff = Math.abs(boardAngleTarget);
    if (angleDiff < minAngleDiff && i >= 0 && i < numBoards) {
      minAngleDiff = angleDiff;
      midArcIndex = boards.length; // Use current boards length as index
    }

    // Extend the line and find intersections with wall
    const extended = extendLine(leftPoint, rightPoint);
    const intersections = findBoardIntersections(extended.start, extended.end);

    if (intersections.length >= 2) {
      missedIntersections = 0;

      const leftmost = intersections[0].point;
      const rightmost = intersections[intersections.length - 1].point;

      const boardLength = distance(leftmost, rightmost);
      const actualBoardAngle = angleBetweenPoints(leftmost, rightmost);
      const { isPartial, isFullWidth, edges } = determineBoardType(intersections);

      const leftCutAngle = 90 - actualBoardAngle;
      const rightCutAngle = 90 + actualBoardAngle;

      // Calculate board bottom edge positions
      const boardBottomLeftY = leftY;
      const boardBottomRightY = rightY;

      // Calculate cut heights for partial boards
      const cutHeights = calculateCutHeights(
        leftmost,
        rightmost,
        edges,
        boardBottomLeftY,
        boardBottomRightY
      );

      boards.push({
        boardNum: boardIndex + 1,
        length: boardLength.toFixed(3),
        leftPoint: leftmost,
        rightPoint: rightmost,
        leftAngle: formatAngle(leftCutAngle),
        rightAngle: formatAngle(rightCutAngle),
        boardAngle: formatAngle(actualBoardAngle),
        leftReveal: actualLeftReveal.toFixed(2),
        rightReveal: actualRightReveal.toFixed(2),
        leftOverlap: (BOARD_WIDTH - actualLeftReveal).toFixed(2),
        rightOverlap: (BOARD_WIDTH - actualRightReveal).toFixed(2),
        // Cut heights for partial boards (full boards = BOARD_WIDTH)
        leftCutHeight: cutHeights.leftCutHeight.toFixed(2),
        rightCutHeight: cutHeights.rightCutHeight.toFixed(2),
        isPartial,
        isFullWidth,
        isBottomPartial: cutHeights.isBottomPartial,
        isTopPartial: cutHeights.isTopPartial,
        isMidArc: false
      });
      boardIndex++;
    } else {
      missedIntersections++;
    }

    // Stop after several consecutive misses when we're past the wall
    if (missedIntersections > 10 && leftY > maxWallHeight) break;
  }

  // Mark mid-arc board
  if (midArcIndex >= 0 && midArcIndex < boards.length) {
    boards[midArcIndex].isMidArc = true;
  }

  return boards;
};
