# Cedar Siding Calculator - Project Brief for Claude Code

## What This Project Is

A web-based tool for visualizing and calculating measurements for installing beveled cedar siding on non-rectangular walls (specifically trapezoid-shaped). Think of it as a "planning calculator" for a construction project.

## Current Status

**Working prototype** built as a React artifact in Claude.ai. The core functionality works but needs:
- Migration to proper development environment
- Bug fixes in dual boundary mode  
- Refactoring into clean component structure
- Addition of deferred features (3D view, export, etc.)

## The Code

The current working code is in a React artifact. To get it:
1. Look in our conversation history for the "Cedar Siding Design Calculator" artifact
2. Click "Copy" to get the full code
3. Save as a standalone HTML file to test locally

Alternatively, I can provide the code in pieces if needed.

## Key Features (Current)

**Two Pattern Modes:**
1. **Single Boundary**: Set left/right reveals (spacing), angles auto-calculate
2. **Dual Boundary**: Set top/bottom angles, reveals auto-calculate (3 sub-modes)

**Interactive Controls:**
- Pan and zoom canvas
- Click boards for detailed measurements
- Visual indicators for different board types
- Fractional inch measurements (1/16" precision)

**Calculations Provided:**
- Board length
- Left/right cut angles  
- Reveal and overlap values
- Board type (full-width, partial, mid-arc)

## Architecture

**Current (Artifact):**
- Single React component (~800 lines)
- Inline styles with Tailwind
- CDN-loaded dependencies
- No build process

**Recommended (For Claude Code Migration):**
```
cedar-siding-calculator/
├── src/
│   ├── components/
│   │   ├── SidingCalculator.jsx (main)
│   │   ├── BoardCanvas.jsx (SVG rendering)
│   │   ├── ControlPanel.jsx (mode toggles, inputs)
│   │   └── BoardInfo.jsx (selected board details)
│   ├── utils/
│   │   ├── geometry.js (line intersection, angles)
│   │   ├── measurements.js (fractions, conversions)
│   │   └── boardCalculation.js (main algorithm)
│   └── constants/
│       └── wallConfig.js
├── tests/
├── public/
└── package.json
```

## Core Algorithm

**Board Calculation via Line Intersection:**
1. For each board index, calculate Y-position on left and right sides
2. Create a line connecting these points (extended beyond wall)
3. Find intersections with trapezoid's 4 edges
4. Use leftmost and rightmost intersections as board endpoints
5. Determine board type based on which edges were intersected

See DESIGN_DECISIONS.md for detailed explanation of why this approach was chosen.

## Known Issues (Priority Order)

1. **Dual boundary partials missing** - Boards at bottom edge not rendering
2. **Fill gaps** - Some reveal combinations don't generate enough boards
3. **Angle accuracy** - DC angle requires 30° instead of expected 26.6°
4. **Left reveal in dual mode** - Shows wrong value in some cases

See TODO.md for complete list.

## Dependencies

**Current:**
- React 18 (via CDN)
- Tailwind CSS (via CDN)
- Lucide React icons (via CDN)

**Recommended additions:**
- TypeScript (type safety)
- Vite or similar (build tool)
- Vitest (testing)
- Three.js (for 3D view restoration)

## Test Cases

Four main test scenarios defined in TODO.md:
1. Parallel diagonal siding
2. Traditional tapered
3. Symmetric fan
4. Asymmetric fan  

These should pass after bug fixes.

## Documentation Files

- **README.md**: Project overview, features, usage
- **DESIGN_DECISIONS.md**: Technical choices and rationale
- **DEVELOPMENT_NOTES.md**: Session history, lessons learned
- **TODO.md**: Feature roadmap, known issues, test cases

## What Claude Code Should Do

1. **Setup development environment**
   - Initialize npm/package.json
   - Set up build tools (Vite recommended)
   - Configure TypeScript
   - Set up testing framework

2. **Migrate code**
   - Extract the artifact code
   - Break into logical components
   - Add proper module structure
   - Set up imports/exports

3. **Fix critical bugs**
   - Dual boundary partial board generation
   - Fill gap issues
   - Angle accuracy

4. **Add testing**
   - Unit tests for geometry functions
   - Integration tests for pattern modes
   - Implement defined test cases

5. **Enhance**
   - Restore 3D visualization
   - Add export functionality
   - Improve UX/visual design

## Design Constraints

1. **Beveled cedar siding specs:**
   - Board height: 5.5"
   - Top edge thickness: 1/8"
   - Bottom edge thickness: 5/8"
   - Overlap = board height - reveal

2. **Wall geometry:**
   - Currently hardcoded trapezoid
   - Should remain editable in future
   - Current test: 96"W × 135"L (left) × 183"H (right)

3. **Precision:**
   - Fractional inches to 1/16"
   - Angles to 0.1°
   - Good enough for real construction use

## User Experience Goals

- **Intuitive**: Mode split makes mental model clear
- **Visual**: See the pattern before cutting any wood
- **Precise**: Measurements accurate enough for real installation
- **Fast**: Interactive performance even with 100+ boards
- **Exportable**: Can print cut list for job site

## Success Criteria

After Claude Code migration, the app should:
1. ✅ Pass all 4 defined test cases
2. ✅ Have working 3D visualization toggle
3. ✅ Export cut list to CSV
4. ✅ Have proper component structure
5. ✅ Include comprehensive tests
6. ✅ Run locally without internet (for job site use)

## Questions for Claude Code

1. **Build tool preference?** Vite, Webpack, or other?
2. **State management?** Zustand, Context, or keep useState?
3. **Styling approach?** Keep Tailwind, switch to CSS modules, or styled-components?
4. **3D library?** Three.js (large) or lighter alternative?
5. **Deploy target?** Netlify, Vercel, GitHub Pages?

## Resources

- All code currently in Claude.ai artifact (see conversation)
- Design docs in this folder
- Christopher (project owner) available for questions about real-world usage

---

*Prepared for migration from Claude.ai to Claude Code*
*January 2025*
