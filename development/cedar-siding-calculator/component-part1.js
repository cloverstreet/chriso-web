// Main React Component - Part 1: State and Controls
// This file contains the component setup, state management, and control panel UI

import React, { useState } from 'react';
import { Ruler, Scissors, Eye, Settings, Lock, Unlock } from 'lucide-react';
import { 
  calculateSingleBoundaryBoards, 
  calculateDualBoundaryBoards, 
  getDCLineInfo,
  WALL_CONFIG 
} from './utils-boards.js';
import { toFraction, toFeetInches } from './utils-measurements.js';

const SidingCalculator = () => {
  // ===== STATE MANAGEMENT =====
  
  // Board selection and display
  const [selectedBoard, setSelectedBoard] = useState(null);
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
  
  // Board angle and spacing controls
  const [topBoardAngle, setTopBoardAngle] = useState(null); // null = auto-calculate
  const [bottomBoardAngle, setBottomBoardAngle] = useState(0);
  const [boardCount, setBoardCount] = useState(45);
  const [leftReveal, setLeftReveal] = useState(3);
  const [rightReveal, setRightReveal] = useState(4);
  
  // ===== COMPUTED VALUES =====
  
  const dcInfo = getDCLineInfo();
  
  // Calculate boards based on current mode
  const boards = patternMode === 'single' 
    ? calculateSingleBoundaryBoards(leftReveal, rightReveal, topBoardAngle)
    : calculateDualBoundaryBoards({
        topAngle: topBoardAngle,
        bottomAngle: bottomBoardAngle,
        mode: dualBoundarySubMode,
        leftReveal,
        rightReveal,
        boardCount
      });
  
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
    setSelectedBoard(board);
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
            
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Top Angle</label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setTopBoardAngle(null)}
                  className={`px-3 py-1 rounded text-sm ${
                    topBoardAngle === null ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}
                >
                  Auto
                </button>
                <button
                  onClick={() => setTopBoardAngle(dcInfo.angle)}
                  className={`px-3 py-1 rounded text-sm ${
                    topBoardAngle === dcInfo.angle ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}
                >
                  DC ({dcInfo.angle.toFixed(1)}°)
                </button>
              </div>
              {topBoardAngle !== null && (
                <input
                  type="number"
                  value={topBoardAngle}
                  onChange={(e) => setTopBoardAngle(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              )}
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
          </div>
        )}
        
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
      </div>
    </div>
  );
  
  // NOTE: Canvas rendering code in component-part2.js
  
  return { 
    renderControls,
    // Export state and handlers for Part 2
    boards,
    selectedBoard,
    showLines,
    zoom,
    pan,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleBoardClick,
    setHoveringBoard
  };
};

export default SidingCalculator;
