# Design Decisions & Technical Notes

## Architecture Decisions

### Why React?
- Started as a React artifact in Claude.ai for rapid prototyping
- Component-based structure makes it easy to add features
- State management with hooks works well for interactive controls
- Consider migrating to vanilla JS or a lighter framework for production

### Calculation Approach: Line Intersection

**Why we chose this method:**
- Handles arbitrary wall shapes (not just trapezoids)
- Correctly clips boards that extend beyond polygon boundaries
- Naturally identifies partial vs full-width boards
- Easy to extend for multiple wall sections

**How it works:**
1. For each board index, calculate Y-position on left and right sides
2. Create a line connecting these points (extended far beyond wall)
3. Find all intersections with the 4 trapezoid edges
4. Take leftmost and rightmost intersections as board endpoints
5. Check which edges were hit to determine board type

### Pattern Modes: Why Two Modes?

**Single Boundary Mode** (constant reveals)
- Most common use case: traditional tapered siding
- User sets reveals, angles are calculated from geometry
- Mathematically deterministic - one solution

**Dual Boundary Mode** (angle-based fan)
- For decorative sunray/fan patterns
- User sets angles, reveals must adjust to fit
- Multiple degrees of freedom - need constraints (fix count OR fix one reveal)

**Why not one unified mode?**
- Tried it - the UX was confusing
- Users think in terms of either "reveals" OR "angles", not both
- Mode toggle makes the mental model clear

## Key Technical Challenges

### Problem 1: Partial Boards Not Appearing
**Symptom:** Boards that should be clipped by top or bottom edges weren't showing up

**Root cause:** Not generating enough boards - only using `floor()` instead of `ceil()`

**Solution:** Use `Math.max(Math.ceil(leftHeight/leftReveal), Math.ceil(rightHeight/rightReveal))` to ensure both sides fully covered

### Problem 2: Mid-Arc Board at Wrong Location
**Symptom:** Green "mid-arc" line was always at the bottom

**Root cause:** Comparing slopes with `board[0]` as baseline - if first board was near horizontal, all others were "farther"

**Solution:** Find board with slope closest to absolute 0°, not relative to first board

### Problem 3: Dual Boundary Angles Not Matching
**Symptom:** Setting top angle to 26.6° didn't make boards parallel to DC line

**Root cause:** Used center-point offset method which didn't respect reveal spacing

**Solution:** Position boards using actual Y-coordinates from reveal calculation, then rotate to target angle

### Problem 4: Left Reveal Not Working in Dual Mode
**Symptom:** Changing left reveal had no effect; right reveal value was shown for both

**Root cause:** Calculation used wrong variable (always used `rightReveal` in both cases)

**Solution:** Separate `actualLeftReveal` and `actualRightReveal` variables calculated based on selected sub-mode

## Coordinate System

**Origin:** Bottom-left corner (point A)
- X increases to the right
- Y increases upward
- SVG rendering flips Y-axis: `toSvgY = (300 - y) * scale + offset`

**Wall points (current test case):**
```
D (0, 135) -------- C (96, 183)
    |                   |
    |                   |  
A (0, 0) ---------- B (96, 0)
```

## Board Numbering
- Board 0: First board at bottom (starts at AB line)
- Board N: Last board at top (ends at or near DC line)
- Negative board numbers in dual mode: Extra boards generated outside polygon for edge cases

## Angle Conventions
- All angles measured from horizontal (0° = flat/level)
- Positive angles: upward slope (left to right)
- Negative angles: downward slope
- Cut angles: measured from vertical (90° - slope angle)

## Future Considerations

### Performance
- Current approach recalculates all boards on every render
- Consider memoization for board calculations
- SVG rendering is fast enough for <200 boards

### Scalability
- Line intersection is O(n×e) where n=boards, e=edges
- For complex multi-wall designs, may need spatial indexing
- Current performance is fine for single walls

### Code Organization for Claude Code Migration
Suggested structure:
```
src/
  components/
    SidingCalculator.jsx (main component)
    BoardCanvas.jsx (SVG rendering)
    ControlPanel.jsx (mode toggles, inputs)
    BoardInfo.jsx (selected board details)
  utils/
    geometry.js (lineIntersection, angleCalculations)
    measurements.js (toFraction, toFeetInches)
    boardCalculation.js (main algorithm)
  constants/
    wallConfig.js (wall dimensions)
```

## Known Quirks

1. **Fractional inches**: Rounded to nearest 1/16" - good enough for carpentry
2. **Board numbering**: Not sequential in dual mode due to extra boards
3. **Zoom sensitivity**: Set to 0.99/1.01 delta - very gentle for trackpad users
4. **Line extensions**: Extended 500px beyond polygon - arbitrary but works
5. **Mid-arc highlighting**: Stroke width 2 instead of 1.2 - needed for visibility

## Browser Compatibility
- Requires modern browser (ES6+, SVG2, CSS Grid)
- Tested in Safari and Chrome
- React loaded via CDN - requires internet connection
- No localStorage used (artifact limitation)

## Copyright & Measurement Notes
- DC angle shows 26.6° - user measured 12.5° in reality
- Need to verify actual wall measurements before using for real installation
- All measurements assume perfectly flat wall - real walls have variations
