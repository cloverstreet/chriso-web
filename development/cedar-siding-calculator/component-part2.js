// Main React Component - Part 2: Canvas Rendering
// This file contains the SVG rendering logic for the siding visualization

import React from 'react';
import { Ruler, Scissors } from 'lucide-react';
import { WALL_CONFIG } from './utils-boards.js';
import { toFraction, toFeetInches } from './utils-measurements.js';

/**
 * Render the complete canvas with boards and wall outline
 * This should be combined with Part 1's state management
 */
export const renderCanvas = (props) => {
  const {
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
  } = props;
  
  const { A, B, C, D } = WALL_CONFIG;
  
  // SVG viewport setup
  const padding = 50;
  const viewBoxWidth = 400;
  const viewBoxHeight = 400;
  
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
            y1={board.leftPoint.y}
            x2={board.rightPoint.x}
            y2={board.rightPoint.y}
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
          points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y} ${D.x},${D.y}`}
          fill="none"
          stroke="#1f2937"
          strokeWidth="2"
        />
        
        {/* Label corners */}
        <text x={A.x - 10} y={A.y + 5} fontSize="12" fill="#1f2937">A</text>
        <text x={B.x + 5} y={B.y + 5} fontSize="12" fill="#1f2937">B</text>
        <text x={C.x + 5} y={C.y} fontSize="12" fill="#1f2937">C</text>
        <text x={D.x - 10} y={D.y} fontSize="12" fill="#1f2937">D</text>
      </svg>
      
      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-white px-3 py-1 rounded shadow text-sm">
        Zoom: {(zoom * 100).toFixed(0)}%
      </div>
    </div>
  );
};

/**
 * Render the board info panel (right sidebar)
 */
export const renderBoardInfo = (selectedBoard) => {
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
              {selectedBoard.isPartial && !selectedBoard.isMidArc && <span className="text-purple-600">Partial Width</span>}
              {selectedBoard.isFullWidth && !selectedBoard.isMidArc && <span className="text-blue-600">Full Width</span>}
            </div>
          </div>
          
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
                <div className="text-xs text-gray-500">Overlap</div>
                <div className="font-semibold">{selectedBoard.overlap}"</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Slope</div>
                <div className="font-semibold">{selectedBoard.boardAngle}°</div>
              </div>
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

/**
 * Complete layout combining all three panels
 * This is what the main App component should render
 */
export const SidingCalculatorLayout = (componentProps) => {
  const { renderControls, ...canvasProps } = componentProps;
  
  return (
    <div className="flex h-screen">
      {/* Left panel: Controls */}
      {renderControls()}
      
      {/* Center panel: Canvas */}
      {renderCanvas(canvasProps)}
      
      {/* Right panel: Board Info */}
      {renderBoardInfo(canvasProps.selectedBoard)}
    </div>
  );
};
