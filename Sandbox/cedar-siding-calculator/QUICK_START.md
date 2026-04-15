# Quick Start Guide for Claude Code

## What You're Getting

A React-based web app for designing cedar siding patterns on trapezoid walls. The code is **split into modules** because the original file was too large (200k+ characters) to export as one file.

## Files in This Folder

**Documentation:**
- `README.md` - Project overview, features, wall dimensions
- `TODO.md` - Known bugs, feature roadmap, test cases
- `DESIGN_DECISIONS.md` - Why we made certain technical choices
- `DEVELOPMENT_NOTES.md` - Session history, lessons learned
- `PROJECT_BRIEF.md` - Comprehensive project context
- `HOW_TO_GET_CODE.md` - Original instructions (now obsolete since code is here)

**Code Modules:**
- `utils-geometry.js` - Line intersections, angles, coordinate math
- `utils-measurements.js` - Fraction formatting, unit conversions
- `utils-boards.js` - Main board calculation algorithms
- `component-part1.js` - React state management & control panel
- `component-part2.js` - Canvas rendering & board info panel

**Assembly Instructions:**
- `ASSEMBLY.md` - **START HERE** - Step-by-step guide to build the app

## Your Mission

1. **Read ASSEMBLY.md** - It has the complete step-by-step instructions
2. **Set up a Vite + React project** with the structure shown in ASSEMBLY.md
3. **Copy the utility files** to `src/utils/`
4. **Merge component-part1.js + component-part2.js** into `src/components/SidingCalculator.jsx`
5. **Test the app** - Run `npm run dev` and verify it works
6. **Fix critical bugs** - See TODO.md for the priority list
7. **Add test cases** - Implement the 4 test scenarios in TODO.md

## Critical Bugs to Fix (Priority Order)

From `TODO.md`:

1. **Dual boundary partials missing** - Boards at bottom edge not rendering
2. **Fill gaps** - Some reveal combinations don't generate enough boards  
3. **Angle accuracy** - DC angle requires 30° instead of expected 26.6°
4. **Left reveal in dual mode** - Shows wrong value in some cases

## Test Scenarios

After setup, the app should pass these 4 tests (defined in TODO.md):

1. **Parallel diagonal siding** - All boards at same angle
2. **Traditional tapered** - Bottom horizontal, boards progressively angled
3. **Symmetric fan** - Equal fan from center
4. **Asymmetric fan** - Offset fan pattern

## Technology Stack

**Current (what you're getting):**
- React 18 (functional components with hooks)
- Inline Tailwind CSS classes
- Lucide React icons
- Pure JavaScript (no TypeScript)

**Recommended Additions:**
- TypeScript (for type safety)
- Vitest (for testing)
- ESLint + Prettier (code quality)

## Project Architecture

```
User sets reveals/angles
    ↓
calculateSingleBoundaryBoards() or calculateDualBoundaryBoards()
    ↓
For each board position:
  - Calculate left & right Y coordinates
  - Create line through these points
  - Extend line beyond wall
  - Find intersections with trapezoid edges
    ↓
findBoardIntersections() → Uses lineIntersection() from utils-geometry
    ↓
Use leftmost & rightmost intersections as board endpoints
    ↓
Calculate: length, angles, type (full/partial)
    ↓
Return array of board objects
    ↓
Render to SVG canvas
```

## File Size Context

The original component was ~800 lines and couldn't be exported as a single file due to character limits. It's now split into logical modules which will be **easier to maintain** and **better structured** anyway.

## Next Steps After Initial Setup

See PROJECT_BRIEF.md for the full vision, but immediate priorities:

1. ✅ Get it running
2. 🐛 Fix the 4 critical bugs
3. ✅ Implement test cases
4. 🎨 Refactor into cleaner components
5. ⚡ Add 3D visualization (was removed due to bugs)
6. 📊 Add export to CSV functionality
7. 🎯 Polish UX/UI

## Need Context?

- **What is this for?** Real construction project - calculating cuts for beveled cedar siding on a non-rectangular wall
- **Why the complexity?** Boards must overlap correctly, angles must be precise for cuts, and partial boards appear at edges
- **Why split code?** Original React component was 200k+ characters, exceeded export limits

## Questions?

Refer to:
- Technical choices → `DESIGN_DECISIONS.md`
- Feature roadmap → `TODO.md`  
- Comprehensive context → `PROJECT_BRIEF.md`
- Assembly steps → `ASSEMBLY.md`

---

**TL;DR:** Read ASSEMBLY.md, set up Vite + React project, merge the code files, fix the bugs in TODO.md. You've got this! 🚀
