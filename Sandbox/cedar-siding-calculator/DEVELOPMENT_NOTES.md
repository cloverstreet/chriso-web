# Development Session Notes

## Project Context
A web-based calculator for designing beveled cedar siding layouts on trapezoid-shaped walls. Built collaboratively with Claude AI over multiple sessions.

## Session History

### Initial Development
- Started with basic trapezoid wall visualization
- Added line drawing for siding boards
- Implemented constant reveal spacing on both sides

### Pattern Modes Evolution
1. **First Attempt**: Single mode with variable reveals
   - Users could adjust left/right reveals independently
   - Boards auto-calculated based on geometry
   - Worked well for traditional siding

2. **Adding Fan Patterns**: Attempted to add angle controls
   - Tried to add top/bottom angle inputs while keeping reveals
   - Hit mathematical impossibility: can't have both fixed reveals AND fixed angles
   - Led to confusion in UI

3. **Mode Split**: Created two distinct modes
   - Single Boundary: Fix reveals, angles auto-calculate
   - Dual Boundary: Fix angles, reveals auto-calculate
   - Much clearer mental model

### Major Technical Hurdles

**The Partial Board Problem**
- Symptom: Boards that should be clipped weren't appearing
- Tried: Increasing line extension, adjusting intersection tolerance
- Root cause: Not generating enough boards (using floor instead of ceil)
- Solution: `Math.max(ceil(left), ceil(right))` ensures full coverage

**The Angle Mismatch Mystery**
- Symptom: Setting 26.6° didn't match DC line angle
- Tried: Various angle calculation methods, different reference points
- Root cause: Fan positioning used center-offset instead of reveal-based spacing
- Solution: Calculate Y positions from reveals first, then apply angle

**The Disappearing Reveals**
- Symptom: In dual mode, changing left reveal showed right reveal value
- Tried: Various state management approaches
- Root cause: Always using `rightReveal` variable in calculations
- Solution: Separate `actualLeftReveal` and `actualRightReveal` variables

**The Mid-Arc Hunt**
- Symptom: Mid-arc board (horizontal) was always at bottom
- Tried: Different comparison methods
- Root cause: Compared to first board instead of absolute 0°
- Solution: `Math.abs(slope)` and find true minimum

### UI/UX Iterations

**Reveal Adjustments**
- Started: 0.25" increments
- Changed to: 0.125" (1/8") increments - more practical for carpentry

**Zoom Behavior**
- Started: 0.9/1.1 delta (too aggressive)
- Tried: 0.95/1.05 (still too fast on trackpad)
- Final: 0.99/1.01 (gentle, precise control)

**Visual Indicators**
- Started: Dashed lines for partials
- Problem: Hard to see
- Changed to: Solid purple, thicker lines
- Mid-arc: Green, stroke width 2 for visibility

**Measurement Display**
- Started: Decimal inches only
- Added: Fractional inches (to nearest 1/16")
- Added: Feet-inches format
- Shows both for clarity

### Features Removed (Temporarily)
- 3D view: Complexity was interfering with core functionality
- Bottom angle control in single mode: Added back later
- Multiple wall sections: Deferred to future
- Advanced export: Not critical for MVP

## Current State (as of handoff to Claude Code)

**Working:**
- Single boundary mode with constant reveals
- Board calculation via line intersection
- Partial board identification
- Board selection and info display
- Pan and zoom
- Mid-arc highlighting
- Fractional inch display

**Partially Working:**
- Dual boundary mode (partials missing at bottom)
- Top angle control in single mode (needs testing)

**Not Working:**
- Dual boundary fill gaps in some configurations
- Angle accuracy (26.6° vs 30° discrepancy)

## Development Philosophy

**Iterative Refinement**
- Build basic feature → test → identify issues → fix → repeat
- Don't add new features until current ones work well
- Sometimes need to step back and simplify

**User-Centric Design**
- Mode split came from listening to confusion about "what does this control do?"
- Fractional inches because that's how carpenters think
- Visual indicators because math alone isn't intuitive

**Test-Driven Discovery**
- Defined test cases helped identify edge cases
- "Set both reveals to 4 and see what happens" revealed fundamental issues
- Real-world measurements (12.5° vs 26.6°) highlighted calculation problems

## Lessons Learned

1. **Geometry is hard**: What seems simple mathematically can be complex in code
2. **Constraints matter**: Can't have both fixed reveals AND fixed angles - pick one
3. **Edge cases are everywhere**: Partial boards, negative indices, division by zero
4. **UI reveals bugs**: Visual feedback made issues obvious that pure math didn't
5. **Iteration is essential**: First solution rarely works perfectly

## Next Steps for Claude Code

See TODO.md for detailed list, but priorities are:
1. Fix dual boundary partial board generation
2. Add comprehensive test suite
3. Refactor into proper component structure
4. Add 3D visualization back
5. Implement export functionality

## Notes for Future Sessions

- Always test with both equal and unequal reveals
- Verify both single and dual modes after any calculation changes
- Check edge cases: very small reveals, very large reveals, extreme angles
- Test that mid-arc actually highlights the most horizontal board
- Verify board count math: count × reveal should ≈ wall height

## Questions Still Unanswered

1. Why does DC line angle show 26.6° in code but measure 12.5° in reality?
2. Should we support arbitrary polygon shapes, or keep it to trapezoids?
3. What's the performance limit on board count before rendering slows?
4. How should we handle numerical precision errors in intersection calculations?

---

*These notes compiled from development session with Claude AI, January 2025*
