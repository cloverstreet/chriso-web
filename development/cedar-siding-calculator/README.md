# Cedar Siding Design Calculator

A web-based tool for designing and calculating beveled cedar siding layouts on trapezoid-shaped walls.

## Overview

This project helps visualize and calculate measurements for installing beveled cedar siding on non-rectangular walls. It handles complex geometry including:
- Trapezoid wall shapes
- Variable reveal spacing (left vs right side)
- Board angle calculations
- Partial board identification
- Cut angle calculations for each board

## Current Features

### Pattern Modes

**Single Boundary Mode**
- Set independent left and right reveal spacing
- Optional top angle control (auto-calculate or manual)
- Generates boards with constant reveal spacing
- Identifies full-width and partial boards

**Dual Boundary Mode** 
- Set both top and bottom board angles
- Creates fan/sunray siding patterns
- Three sub-modes:
  - Fix Left Reveal (right auto-calculates)
  - Fix Right Reveal (left auto-calculates)
  - Fix Board Count (both reveals auto-calculate)

### Interactive Features
- Click boards to see detailed measurements
- Pan and zoom canvas
- Visual indicators:
  - Purple: Partial width boards
  - Green (thick): Mid-arc board (closest to horizontal)
  - Red: Selected board
  - Gray: Standard boards

### Measurements Provided
- Board length (decimal and fractional inches)
- Left and right cut angles
- Board slope
- Reveal and overlap values
- Board type (full-width, partial, mid-arc)

## Wall Dimensions (Current Test Wall)
- Bottom width (AB): 96" (8')
- Left height (AD): 135" (11' 3")
- Right height (BC): 183" (15' 3")
- Top edge (DC): ~111.8" with angle of 26.6° from horizontal

## Getting the Code

The working application code is in the Claude artifact in our conversation. To use it:

1. Copy the code from the artifact (click "Copy" button)
2. Save as `index.html` in this folder
3. Open in a web browser

Note: The artifact uses React via CDN, so it requires an internet connection to run.

## Technical Details

### Board Calculation Algorithm
- Uses line-segment intersection to clip boards against trapezoid edges
- Generates boards from bottom (AB) upward
- Ensures full polygon coverage by calculating max boards needed on either side
- Identifies board types by checking which edges they intersect

### Future Enhancements (see TODO.md)
- 3D visualization with beveled board rendering
- Multiple wall sections
- Export cut lists to CSV/PDF
- Wall dimension editor
- Different siding types (tongue & groove, shiplap)
- Pattern offset control
- Save/load designs

## Development Notes

See DESIGN_DECISIONS.md for detailed technical choices and rationale.
See TODO.md for planned features and known issues.

## Contact
Christopher Overstreet - 2025
