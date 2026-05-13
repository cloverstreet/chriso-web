// Cedar Siding Calculator - Main Component
// Merged from component-part1.js and component-part2.js

import React, { useState } from 'react';
import { Ruler, Scissors } from 'lucide-react';
import {
  calculateSingleBoundaryBoards,
  calculateDualBoundaryBoards,
  getDCLineInfo,
  WALL_CONFIG,
  BOARD_WIDTH,
  MIN_CUT_HEIGHT,
  MAX_REVEAL
} from '../utils/boards';
import { toFraction, toFeetInches } from '../utils/measurements';

const SidingCalculator = () => {
  // ===== STATE MANAGEMENT =====

  // Board selection - store board number, not the board object
  const [selectedBoardNum, setSelectedBoardNum] = useState(null);
  const [showLines, setShowLines] = useState(true);

  // Canvas controls
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveringBoard, setHoveringBoard] = useState(false);

  // Pattern mode settings
  const [patternMode, setPatternMode] = useState('single'); // 'single' or 'dual'
  const [dualBoundarySubMode, setDualBoundarySubMode] = useState('count'); // 'left', 'right', 'count'

  // Single Boundary mode controls
  // Top board angle is user-controlled (master), right reveal is computed from it
  const dcAngleDefault = Math.atan2(183 - 135, 96) * (180 / Math.PI); // ~26.57°
  const [leftReveal, setLeftReveal] = useState(3);
  const [singleTopAngle, setSingleTopAngle] = useState(dcAngleDefault); // User-controlled top angle for Single mode

  // Right reveal state - only used in Dual Boundary mode (Single mode computes it)
  const [rightReveal, setRightReveal] = useState(3);

  // Dual Boundary mode controls
  const [topBoardAngle, setTopBoardAngle] = useState(0);
  const [bottomBoardAngle, setBottomBoardAngle] = useState(0);
  const [boardCount, setBoardCount] = useState(45);

  // Pattern offset (shared between modes)
  const [verticalOffset, setVerticalOffset] = useState(0);

  // ===== COMPUTED VALUES =====

  const dcInfo = getDCLineInfo();
  const { A, B, D, C } = WALL_CONFIG;
  const wallWidth = B.x - A.x; // 96"

  // In Single Boundary mode, compute right reveal from top angle and left reveal
  // The top board (at left edge height D.y) should have the user-specified angle.
  // Derivation: For the top board where leftY ≈ D.y, rightY = (D.y/leftReveal)*rightReveal
  // tan(topAngle) = (rightY - leftY) / wallWidth = D.y * (rightReveal/leftReveal - 1) / wallWidth
  // Solving: rightReveal = leftReveal * (1 + tan(topAngle) * wallWidth / D.y)
  const computedRightReveal = (() => {
    if (patternMode !== 'single') return leftReveal; // Not used in dual mode
    const topAngleRad = singleTopAngle * (Math.PI / 180);
    const rightRev = leftReveal * (1 + Math.tan(topAngleRad) * wallWidth / D.y);
    return Math.max(0.5, Math.min(MAX_REVEAL, rightRev));
  })();

  // Calculate reveals for dual boundary mode based on sub-mode
  // When top angle equals bottom angle (parallel boards), reveals must be equal
  const calculatedReveals = (() => {
    if (patternMode !== 'dual') return { left: leftReveal, right: computedRightReveal };

    const areParallel = Math.abs(topBoardAngle - bottomBoardAngle) < 0.01;

    if (dualBoundarySubMode === 'count') {
      let leftRev = D.y / boardCount;
      let rightRev = C.y / boardCount;
      if (areParallel) {
        const avgRev = (leftRev + rightRev) / 2;
        leftRev = avgRev;
        rightRev = avgRev;
      }
      return { left: leftRev, right: rightRev };
    } else if (dualBoundarySubMode === 'left') {
      const numBoards = Math.ceil(D.y / leftReveal);
      if (areParallel) {
        return { left: leftReveal, right: leftReveal };
      }
      return { left: leftReveal, right: C.y / numBoards };
    } else if (dualBoundarySubMode === 'right') {
      const numBoards = Math.ceil(C.y / rightReveal);
      if (areParallel) {
        return { left: rightReveal, right: rightReveal };
      }
      return { left: D.y / numBoards, right: rightReveal };
    }
    return { left: leftReveal, right: rightReveal };
  })();

  // Calculate boards based on current mode
  const boards = patternMode === 'single'
    ? calculateSingleBoundaryBoards(leftReveal, computedRightReveal, singleTopAngle, verticalOffset)
    : calculateDualBoundaryBoards({
        topAngle: topBoardAngle,
        bottomAngle: bottomBoardAngle,
        offset: verticalOffset,
        mode: dualBoundarySubMode,
        leftReveal,
        rightReveal,
        boardCount
      });

  // Get the currently selected board from the boards array (auto-updates when boards change)
  const selectedBoard = selectedBoardNum
    ? boards.find(b => b.boardNum === selectedBoardNum)
    : null;

  // Compute actual top and bottom board angles from the generated boards
  const firstBoard = boards[0];
  const lastBoard = boards[boards.length - 1];
  const bottomBoardAngleCalc = firstBoard ? parseFloat(firstBoard.boardAngle) : 0;
  const topBoardAngleCalc = lastBoard ? parseFloat(lastBoard.boardAngle) : 0;

  // ===== EVENT HANDLERS =====

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };

  const handleMouseDown = (e) => {
    if (e.button === 0 && !hoveringBoard) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleBoardClick = (board) => {
    setSelectedBoardNum(board.boardNum);
  };

  // ===== RENDER: CONTROL PANEL =====

  const renderControls = () => (
    <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cedar Siding Calculator</h1>
          <p className="text-sm text-gray-600 mt-1">Trapezoid wall pattern designer</p>
        </div>

        {/* Pattern Mode Selector */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Pattern Mode</label>
          <div className="flex gap-2">
            <button
              onClick={() => setPatternMode('single')}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                patternMode === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Single Boundary
            </button>
            <button
              onClick={() => setPatternMode('dual')}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                patternMode === 'dual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Dual Boundary
            </button>
          </div>
        </div>

        {/* Single Boundary Controls */}
        {patternMode === 'single' && (
          <div className="space-y-4">
            {/* Top Board Angle - User Controlled (Master) */}
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <label className="text-sm font-semibold text-blue-800 mb-2 block">Top Board Angle (master)</label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setSingleTopAngle(dcInfo.angle)}
                  className={`px-2 py-1 rounded text-xs ${
                    Math.abs(singleTopAngle - dcInfo.angle) < 0.1 ? 'bg-blue-600 text-white' : 'bg-white border border-blue-300'
                  }`}
                >
                  DC ({dcInfo.angle.toFixed(1)}°)
                </button>
                <button
                  onClick={() => setSingleTopAngle(0)}
                  className={`px-2 py-1 rounded text-xs ${
                    Math.abs(singleTopAngle) < 0.1 ? 'bg-blue-600 text-white' : 'bg-white border border-blue-300'
                  }`}
                >
                  0° (Horiz)
                </button>
              </div>
              <input
                type="number"
                value={singleTopAngle.toFixed(1)}
                onChange={(e) => setSingleTopAngle(parseFloat(e.target.value) || 0)}
                step="0.5"
                className="w-full px-3 py-2 border border-blue-300 rounded-md bg-white"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Left Reveal (inches)</label>
              <p className="text-xs text-gray-500 mb-1">Spacing on left edge (DA)</p>
              <input
                type="number"
                value={leftReveal}
                onChange={(e) => setLeftReveal(parseFloat(e.target.value) || 0.5)}
                step="0.25"
                min="0.5"
                max={MAX_REVEAL}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Right Reveal - Computed (read-only display) */}
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <label className="text-sm font-semibold text-gray-600">Right Reveal (computed)</label>
              <p className="text-xs text-gray-500 mb-1">Auto-calculated from top angle</p>
              <div className="text-lg font-mono font-semibold text-gray-800">
                {computedRightReveal.toFixed(2)}"
              </div>
            </div>

            {/* Computed Bottom Board Angle */}
            <div className="bg-amber-50 p-3 rounded border border-amber-200">
              <label className="text-sm font-semibold text-amber-800 mb-2 block">Bottom Board Angle (computed)</label>
              <div className="text-lg font-mono font-semibold text-amber-900">
                {bottomBoardAngleCalc.toFixed(1)}°
              </div>
              <p className="text-xs text-amber-600 mt-1">Changes based on reveals and top angle</p>
            </div>
          </div>
        )}

        {/* Dual Boundary Controls */}
        {patternMode === 'dual' && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Sub-Mode</label>
              <div className="space-y-2">
                <button
                  onClick={() => setDualBoundarySubMode('left')}
                  className={`w-full px-3 py-2 rounded text-sm ${
                    dualBoundarySubMode === 'left' ? 'bg-blue-600 text-white' : 'bg-white'
                  }`}
                >
                  Fix Left Reveal
                </button>
                <button
                  onClick={() => setDualBoundarySubMode('right')}
                  className={`w-full px-3 py-2 rounded text-sm ${
                    dualBoundarySubMode === 'right' ? 'bg-blue-600 text-white' : 'bg-white'
                  }`}
                >
                  Fix Right Reveal
                </button>
                <button
                  onClick={() => setDualBoundarySubMode('count')}
                  className={`w-full px-3 py-2 rounded text-sm ${
                    dualBoundarySubMode === 'count' ? 'bg-blue-600 text-white' : 'bg-white'
                  }`}
                >
                  Fix Board Count
                </button>
              </div>
            </div>

            {dualBoundarySubMode === 'count' && (
              <div>
                <label className="text-sm font-semibold text-gray-700">Board Count</label>
                <input
                  type="number"
                  value={boardCount}
                  onChange={(e) => setBoardCount(parseInt(e.target.value) || 1)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}

            {dualBoundarySubMode === 'left' && (
              <div>
                <label className="text-sm font-semibold text-gray-700">Left Reveal (inches)</label>
                <input
                  type="number"
                  value={leftReveal}
                  onChange={(e) => setLeftReveal(parseFloat(e.target.value) || 0)}
                  step="0.25"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}

            {dualBoundarySubMode === 'right' && (
              <div>
                <label className="text-sm font-semibold text-gray-700">Right Reveal (inches)</label>
                <input
                  type="number"
                  value={rightReveal}
                  onChange={(e) => setRightReveal(parseFloat(e.target.value) || 0)}
                  step="0.25"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}

            {/* Calculated Reveals Display */}
            <div className="bg-blue-50 p-3 rounded text-sm">
              <h4 className="font-semibold text-blue-800 mb-2">Calculated Reveals</h4>
              <div className="grid grid-cols-2 gap-2 text-blue-700">
                <div>
                  <div className="text-xs text-blue-500">Left</div>
                  <div className="font-mono">{calculatedReveals.left.toFixed(3)}"</div>
                </div>
                <div>
                  <div className="text-xs text-blue-500">Right</div>
                  <div className="font-mono">{calculatedReveals.right.toFixed(3)}"</div>
                </div>
              </div>
            </div>

            {/* Top Angle Control */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Top Board Angle</label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setTopBoardAngle(0)}
                  className={`px-2 py-1 rounded text-xs ${
                    topBoardAngle === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}
                >
                  0° (Horiz)
                </button>
                <button
                  onClick={() => setTopBoardAngle(dcInfo.angle)}
                  className={`px-2 py-1 rounded text-xs ${
                    topBoardAngle === dcInfo.angle ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}
                >
                  DC ({dcInfo.angle.toFixed(1)}°)
                </button>
              </div>
              <input
                type="number"
                value={topBoardAngle || 0}
                onChange={(e) => setTopBoardAngle(parseFloat(e.target.value) || 0)}
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Bottom Angle Control */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Bottom Board Angle</label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setBottomBoardAngle(0)}
                  className={`px-2 py-1 rounded text-xs ${
                    bottomBoardAngle === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}
                >
                  0° (Horiz)
                </button>
                <button
                  onClick={() => setBottomBoardAngle(-dcInfo.angle)}
                  className={`px-2 py-1 rounded text-xs ${
                    bottomBoardAngle === -dcInfo.angle ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}
                >
                  -{dcInfo.angle.toFixed(1)}°
                </button>
              </div>
              <input
                type="number"
                value={bottomBoardAngle}
                onChange={(e) => setBottomBoardAngle(parseFloat(e.target.value) || 0)}
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        )}

        {/* Vertical Offset Control */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Vertical Offset</label>
          <div className="flex gap-2 items-center">
            <input
              type="range"
              min={-150}
              max={150}
              step={0.5}
              value={verticalOffset}
              onChange={(e) => setVerticalOffset(parseFloat(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              value={verticalOffset}
              onChange={(e) => setVerticalOffset(parseFloat(e.target.value) || 0)}
              step="0.25"
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <span className="text-sm text-gray-500">"</span>
          </div>
          <button
            onClick={() => setVerticalOffset(0)}
            className="mt-1 text-xs text-blue-600 hover:underline"
          >
            Reset to 0
          </button>
        </div>

        {/* Wall Info */}
        <div className="bg-gray-50 p-3 rounded text-sm">
          <h3 className="font-semibold text-gray-700 mb-2">Wall Dimensions</h3>
          <div className="space-y-1 text-gray-600">
            <div>AB (bottom): 96" (8')</div>
            <div>AD (left): 135" (11' 3")</div>
            <div>BC (right): 183" (15' 3")</div>
            <div>DC: {dcInfo.length.toFixed(1)}" @ {dcInfo.angle.toFixed(1)}°</div>
          </div>
        </div>

        {/* Display Options */}
        <div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showLines}
              onChange={(e) => setShowLines(e.target.checked)}
              className="rounded"
            />
            <span>Show board lines</span>
          </label>
        </div>

        {/* Board Summary */}
        <div className="bg-amber-50 p-3 rounded text-sm border border-amber-200">
          <h3 className="font-semibold text-amber-800 mb-2">Board Summary</h3>
          <div className="space-y-2 text-amber-700">
            <div className="flex justify-between">
              <span>Total boards:</span>
              <span className="font-semibold">{boards.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Board width:</span>
              <span className="font-mono">{BOARD_WIDTH}"</span>
            </div>
            {boards.length > 0 && (
              <>
                {/* First board (bottom partial) */}
                {boards[0]?.isBottomPartial && (
                  <div className="p-2 rounded bg-purple-100 border border-purple-300">
                    <div className="text-xs font-semibold mb-1 text-purple-800">First Board (Bottom Partial)</div>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div>
                        <span className="text-purple-600">Left:</span>
                        <span className="font-mono ml-1">{boards[0].leftCutHeight}"</span>
                      </div>
                      <div>
                        <span className="text-purple-600">Right:</span>
                        <span className="font-mono ml-1">{boards[0].rightCutHeight}"</span>
                      </div>
                      <div>
                        <span className="text-purple-600">Angle:</span>
                        <span className="font-mono ml-1">{boards[0].boardAngle}°</span>
                      </div>
                    </div>
                    <div className="text-xs mt-1">
                      <span className="text-purple-600">Length:</span>
                      <span className="font-mono ml-1">{boards[0].length}"</span>
                    </div>
                  </div>
                )}

                {/* Last board (top partial) */}
                {boards[boards.length - 1]?.isTopPartial && (
                  <div className="p-2 rounded bg-orange-100 border border-orange-300">
                    <div className="text-xs font-semibold mb-1 text-orange-800">Last Board (Top Partial)</div>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div>
                        <span className="text-orange-600">Left:</span>
                        <span className="font-mono ml-1">{boards[boards.length - 1].leftCutHeight}"</span>
                      </div>
                      <div>
                        <span className="text-orange-600">Right:</span>
                        <span className="font-mono ml-1">{boards[boards.length - 1].rightCutHeight}"</span>
                      </div>
                      <div>
                        <span className="text-orange-600">Angle:</span>
                        <span className="font-mono ml-1">{boards[boards.length - 1].boardAngle}°</span>
                      </div>
                    </div>
                    <div className="text-xs mt-1">
                      <span className="text-orange-600">Length:</span>
                      <span className="font-mono ml-1">{boards[boards.length - 1].length}"</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ===== RENDER: CANVAS =====

  const renderCanvas = () => {
    const { A, B, C, D } = WALL_CONFIG;

    // SVG viewport setup
    const padding = 50;
    const viewBoxWidth = 200;
    const viewBoxHeight = 250;

    // Flip Y coordinates for proper orientation (bottom of wall at bottom of screen)
    const maxY = Math.max(C.y, D.y);
    const flipY = (y) => maxY - y;

    return (
      <div className="flex-1 bg-gray-100 relative overflow-hidden">
        <svg
          className="w-full h-full cursor-move"
          viewBox={`${-padding} ${-padding} ${viewBoxWidth} ${viewBoxHeight}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`
          }}
        >
          {/* Draw boards */}
          {showLines && boards.map((board, i) => (
            <line
              key={i}
              x1={board.leftPoint.x}
              y1={flipY(board.leftPoint.y)}
              x2={board.rightPoint.x}
              y2={flipY(board.rightPoint.y)}
              stroke={
                selectedBoard?.boardNum === board.boardNum
                  ? '#ef4444'
                  : board.isMidArc
                  ? '#22c55e'
                  : board.isPartial
                  ? '#a855f7'
                  : '#9ca3af'
              }
              strokeWidth={
                selectedBoard?.boardNum === board.boardNum
                  ? 2
                  : board.isMidArc
                  ? 3
                  : 1
              }
              className="cursor-pointer hover:stroke-blue-500"
              onMouseEnter={() => setHoveringBoard(true)}
              onMouseLeave={() => setHoveringBoard(false)}
              onClick={() => handleBoardClick(board)}
            />
          ))}

          {/* Draw wall outline */}
          <polygon
            points={`${A.x},${flipY(A.y)} ${B.x},${flipY(B.y)} ${C.x},${flipY(C.y)} ${D.x},${flipY(D.y)}`}
            fill="none"
            stroke="#1f2937"
            strokeWidth="2"
          />

          {/* Label corners */}
          <text x={A.x - 10} y={flipY(A.y) + 15} fontSize="12" fill="#1f2937">A</text>
          <text x={B.x + 5} y={flipY(B.y) + 15} fontSize="12" fill="#1f2937">B</text>
          <text x={C.x + 5} y={flipY(C.y) - 5} fontSize="12" fill="#1f2937">C</text>
          <text x={D.x - 10} y={flipY(D.y) - 5} fontSize="12" fill="#1f2937">D</text>
        </svg>

        {/* Zoom indicator */}
        <div className="absolute bottom-4 right-4 bg-white px-3 py-1 rounded shadow text-sm">
          Zoom: {(zoom * 100).toFixed(0)}%
        </div>
      </div>
    );
  };

  // ===== RENDER: BOARD INFO PANEL =====

  const renderBoardInfo = () => {
    if (!selectedBoard) {
      return (
        <div className="w-80 bg-white border-l border-gray-200 p-4">
          <div className="text-center text-gray-500 mt-8">
            Click a board to see details
          </div>
        </div>
      );
    }

    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Ruler size={20} />
            Board #{selectedBoard.boardNum}
          </h2>

          <div className="space-y-3">
            {/* Length */}
            <div className="bg-white rounded p-3">
              <div className="text-sm text-gray-600 mb-1">Length</div>
              <div className="text-2xl font-bold">{selectedBoard.length}"</div>
              <div className="text-sm text-gray-500">
                {toFeetInches(parseFloat(selectedBoard.length))}
              </div>
              <div className="text-sm text-gray-500">
                {toFraction(parseFloat(selectedBoard.length))}
              </div>
            </div>

            {/* Cut Angles */}
            <div className="bg-white rounded p-3">
              <div className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                <Scissors size={16} />
                Cut Angles
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-500">Left</div>
                  <div className="text-lg font-semibold">{selectedBoard.leftAngle}°</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Right</div>
                  <div className="text-lg font-semibold">{selectedBoard.rightAngle}°</div>
                </div>
              </div>
            </div>

            {/* Board Type */}
            <div className="bg-white rounded p-3">
              <div className="text-sm text-gray-600 mb-1">Type</div>
              <div className="text-sm font-semibold">
                {selectedBoard.isMidArc && <span className="text-green-600">Mid-Arc (Horizontal)</span>}
                {selectedBoard.isBottomPartial && !selectedBoard.isMidArc && <span className="text-purple-600">Bottom Partial</span>}
                {selectedBoard.isTopPartial && !selectedBoard.isMidArc && <span className="text-orange-600">Top Partial</span>}
                {selectedBoard.isFullWidth && !selectedBoard.isMidArc && !selectedBoard.isBottomPartial && !selectedBoard.isTopPartial && <span className="text-blue-600">Full Width</span>}
              </div>
            </div>

            {/* Partial Board Cut Dimensions */}
            {(selectedBoard.isBottomPartial || selectedBoard.isTopPartial) && (
              <div className={`rounded p-3 ${
                selectedBoard.isBottomPartial ? 'bg-purple-50 border border-purple-200' : 'bg-orange-50 border border-orange-200'
              }`}>
                <div className={`text-sm mb-2 font-semibold ${
                  selectedBoard.isBottomPartial ? 'text-purple-800' : 'text-orange-800'
                }`}>
                  Partial Board Cut
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className={`text-xs ${selectedBoard.isBottomPartial ? 'text-purple-500' : 'text-orange-500'}`}>Left Height</div>
                    <div className="font-semibold font-mono">
                      {selectedBoard.leftCutHeight}"
                      {parseFloat(selectedBoard.leftCutHeight) === 0 && <span className="text-xs ml-1">(point)</span>}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs ${selectedBoard.isBottomPartial ? 'text-purple-500' : 'text-orange-500'}`}>Right Height</div>
                    <div className="font-semibold font-mono">
                      {selectedBoard.rightCutHeight}"
                      {parseFloat(selectedBoard.rightCutHeight) === 0 && <span className="text-xs ml-1">(point)</span>}
                    </div>
                  </div>
                </div>
                {(parseFloat(selectedBoard.leftCutHeight) === 0 || parseFloat(selectedBoard.rightCutHeight) === 0) && (
                  <p className={`text-xs mt-2 ${selectedBoard.isBottomPartial ? 'text-purple-600' : 'text-orange-600'}`}>
                    Triangular piece - one edge comes to a point
                  </p>
                )}
              </div>
            )}

            {/* Reveal & Overlap */}
            <div className="bg-white rounded p-3">
              <div className="text-sm text-gray-600 mb-2">Spacing</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Left Reveal</div>
                  <div className="font-semibold">{selectedBoard.leftReveal}"</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Right Reveal</div>
                  <div className="font-semibold">{selectedBoard.rightReveal}"</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Left Overlap</div>
                  <div className="font-semibold">{selectedBoard.leftOverlap}"</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Right Overlap</div>
                  <div className="font-semibold">{selectedBoard.rightOverlap}"</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-500">Board Angle</div>
                  <div className="font-semibold">{selectedBoard.boardAngle}°</div>
                </div>
              </div>
            </div>

            {/* Construction Info */}
            <div className="bg-amber-50 rounded p-3 border border-amber-200">
              <div className="text-sm text-amber-800 mb-2 font-semibold">Construction Info</div>
              <div className="text-sm text-amber-700 space-y-1">
                <div className="flex justify-between">
                  <span>Board material:</span>
                  <span className="font-mono">{BOARD_WIDTH}" wide</span>
                </div>
                {!selectedBoard.isBottomPartial && !selectedBoard.isTopPartial && (
                  <div className="flex justify-between">
                    <span>Cut height:</span>
                    <span className="font-mono">{BOARD_WIDTH}" (full)</span>
                  </div>
                )}
                <p className="text-xs text-amber-600 mt-1">
                  Min overlap: 1" | Min cut height: {MIN_CUT_HEIGHT}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
          <div className="font-semibold mb-2">Legend</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-gray-400"></div>
              <span>Standard board</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-purple-500"></div>
              <span>Partial width</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-green-500"></div>
              <span>Mid-arc (most horizontal)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500"></div>
              <span>Selected</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===== MAIN RENDER =====

  return (
    <div className="flex h-screen">
      {renderControls()}
      {renderCanvas()}
      {renderBoardInfo()}
    </div>
  );
};

export default SidingCalculator;
