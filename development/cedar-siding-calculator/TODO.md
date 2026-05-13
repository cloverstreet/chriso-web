# TODO & Known Issues

## Critical Issues to Fix

### Dual Boundary Mode Issues
- [ ] **Partial boards missing at bottom** - Extra boards (-5 to 0) not rendering properly
- [ ] **Angle accuracy** - Need to verify why DC angle requires ~30° instead of 26.6° 
- [ ] **Fill gaps** - Some configurations don't generate enough boards to fully cover polygon

### Single Boundary Mode Issues  
- [ ] **Inconsistent fill** - In some reveal combinations, not enough boards generated
- [ ] **Top angle integration** - Top angle control added but needs testing across all scenarios

### General Issues
- [ ] **Mid-arc visibility** - Green line is thicker now (width 2) but still hard to see on busy patterns
- [ ] **Measurement verification** - Wall dimensions need to be re-measured (DC angle discrepancy)

## High Priority Features

### 3D Visualization
- [ ] Restore 3D view toggle
- [ ] Render beveled boards showing thickness
  - Top edge: 1/8" thick
  - Bottom edge: 5/8" thick  
  - Board height: 5.5"
- [ ] Add proper shading/lighting
- [ ] Show overlap in 3D view

### Board Angle Controls
- [ ] Add bottom angle control to Single Boundary mode
- [ ] Add "snap to parallel" buttons (AB, DC)
- [ ] Visual preview of angle constraints
- [ ] Validate angle combinations that create impossible geometry

### Pattern Offset
- [ ] Offset slider to move pattern up/down
- [ ] Keep angles constant while sliding
- [ ] Show which boards are visible vs cropped

## Medium Priority Features

### Multiple Wall Sections
- [ ] Add/remove wall segments
- [ ] Connect walls at corners
- [ ] Handle boards that span multiple walls
- [ ] Calculate board counts across all walls

### Wall Dimension Editor
- [ ] Make wall points draggable
- [ ] Input fields for each corner
- [ ] Validate wall geometry (no self-intersections)
- [ ] Save/load wall configurations

### Export & Sharing
- [ ] Export cut list to CSV
- [ ] PDF report with measurements and diagram
- [ ] Save design to file (JSON)
- [ ] Load saved designs
- [ ] Share link functionality

### Siding Types
- [ ] Tongue & groove (no overlap, different reveal calc)
- [ ] Shiplap (different overlap pattern)
- [ ] Board & batten
- [ ] Custom board dimensions

## Low Priority / Nice to Have

### UX Improvements
- [ ] Keyboard shortcuts (arrow keys to adjust reveals, +/- for zoom)
- [ ] Touch gestures for mobile (pinch zoom, pan)
- [ ] Undo/redo functionality
- [ ] Preset patterns (parallel, fan, sunray)
- [ ] Board highlighting on hover (show measurements in tooltip)

### Visual Enhancements
- [ ] Wood grain texture
- [ ] Color picker for siding
- [ ] Shadow effects
- [ ] Background image upload (house photo)
- [ ] Multiple color zones

### Advanced Calculations
- [ ] Material quantity calculator (based on actual board sizes)
- [ ] Waste factor calculation
- [ ] Cost estimator
- [ ] Installation time estimate
- [ ] Nail spacing calculator

### Collaboration
- [ ] Multiple wall sections with names
- [ ] Notes/comments on specific boards
- [ ] Print-friendly view
- [ ] Mobile app version

## Technical Debt

### Code Quality
- [ ] Extract board calculation to separate module
- [ ] Add TypeScript types
- [ ] Unit tests for geometry functions
- [ ] Integration tests for pattern modes
- [ ] Proper error handling for invalid inputs

### Performance
- [ ] Memoize board calculations
- [ ] Virtual scrolling for large board lists
- [ ] WebGL rendering for 3D view
- [ ] Worker thread for heavy calculations

### Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] High contrast mode
- [ ] Proper ARIA labels

## Test Cases Defined

### Test 1: Parallel Diagonal Siding
- Mode: Single Boundary
- Left reveal: 4", Right reveal: 4"
- Expected: All boards parallel ~26.6°, partials in bottom-right corner
- Status: ⚠️ Mostly working, verify partial placement

### Test 2: Traditional Tapered
- Mode: Single Boundary  
- Left reveal: 3", Right reveal: 4"
- Expected: Boards gradually steepen from bottom to top
- Status: ✅ Working

### Test 3: Symmetric Fan
- Mode: Dual Boundary, Fix Board Count
- Top: 20°, Bottom: -20°, Count: 40
- Expected: Perfect fan radiating -20° to +20°
- Status: ❌ Needs fixing (partials missing)

### Test 4: Asymmetric Fan
- Mode: Dual Boundary, Fix Left Reveal
- Top: 30°, Bottom: 10°, Left: 3"
- Expected: Fan pattern, right reveal varies per board  
- Status: ⚠️ Partials missing, angle accuracy issues

## Ideas for Future Exploration

- AR visualization (point phone camera at wall)
- AI-powered pattern suggestions based on wall shape
- Integration with home design software
- Contractor mode (material orders, labor estimates)
- Historical siding pattern library
- Weather exposure calculator (which boards get most sun/rain)
- Maintenance schedule generator

## Questions to Resolve

1. Should we support curved walls? (requires different math)
2. What's the maximum practical number of boards to render?
3. Should we add metric units support?
4. Do we need offline functionality?
5. Should patterns be shareable via URL params?
