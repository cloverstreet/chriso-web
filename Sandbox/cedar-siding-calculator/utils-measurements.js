// Measurement and formatting utilities for Cedar Siding Calculator

/**
 * Convert decimal inches to fractional representation (to 1/16")
 * Example: 5.625 → "5 5/8""
 */
export const toFraction = (decimal) => {
  const whole = Math.floor(decimal);
  const fraction = decimal - whole;
  const sixteenths = Math.round(fraction * 16);
  
  if (sixteenths === 0) return `${whole}"`;
  if (sixteenths === 16) return `${whole + 1}"`;
  
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(sixteenths, 16);
  const num = sixteenths / divisor;
  const den = 16 / divisor;
  
  return whole > 0 ? `${whole} ${num}/${den}"` : `${num}/${den}"`;
};

/**
 * Convert inches to feet and inches display
 * Example: 135 → "11' 3""
 */
export const toFeetInches = (totalInches) => {
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  
  if (feet === 0) return `${inches.toFixed(1)}"`;
  if (inches === 0) return `${feet}'`;
  return `${feet}' ${inches.toFixed(1)}"`;
};

/**
 * Format an angle to one decimal place
 */
export const formatAngle = (angle) => {
  return angle.toFixed(1);
};

/**
 * Calculate reveal (exposed board height) from overlap
 * Board height is fixed at 5.5"
 */
export const calculateRevealFromOverlap = (overlap) => {
  const BOARD_HEIGHT = 5.5;
  return BOARD_HEIGHT - overlap;
};

/**
 * Calculate overlap from reveal
 */
export const calculateOverlapFromReveal = (reveal) => {
  const BOARD_HEIGHT = 5.5;
  return BOARD_HEIGHT - reveal;
};

/**
 * Validate reveal value
 * Must be between 0 and board height (5.5")
 */
export const isValidReveal = (reveal) => {
  return reveal > 0 && reveal <= 5.5;
};

/**
 * Round to nearest 1/16"
 */
export const roundToSixteenth = (value) => {
  return Math.round(value * 16) / 16;
};

/**
 * Format decimal inches with fractional representation
 * Example: 96.625 → "96.625" (8' 0 5/8")"
 */
export const formatLength = (inches) => {
  return {
    decimal: inches.toFixed(3),
    fraction: toFraction(inches),
    feetInches: toFeetInches(inches)
  };
};
