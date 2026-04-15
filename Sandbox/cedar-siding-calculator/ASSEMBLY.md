# Assembly Instructions for Claude Code

This folder contains the Cedar Siding Calculator code split into logical modules. Here's how to assemble them into a working React application.

## File Structure

```
cedar-siding-calculator/
├── utils-geometry.js          # Geometric calculations (line intersections, angles)
├── utils-measurements.js      # Formatting (fractions, feet-inches conversion)
├── utils-boards.js            # Board calculation algorithms
├── component-part1.js         # React component: State & Controls
├── component-part2.js         # React component: Canvas Rendering
└── ASSEMBLY.md               # This file
```

## How Claude Code Should Assemble This

### Step 1: Create Project Structure

```
cedar-siding-calculator/
├── src/
│   ├── App.jsx                # Main entry point
│   ├── components/
│   │   ├── SidingCalculator.jsx
│   │   ├── ControlPanel.jsx
│   │   ├── BoardCanvas.jsx
│   │   └── BoardInfo.jsx
│   ├── utils/
│   │   ├── geometry.js
│   │   ├── measurements.js
│   │   └── boards.js
│   └── constants/
│       └── wallConfig.js
├── public/
├── package.json
├── vite.config.js
└── index.html
```

### Step 2: Map Files to New Structure

**From this folder → To new structure:**

- `utils-geometry.js` → `src/utils/geometry.js`
- `utils-measurements.js` → `src/utils/measurements.js`
- `utils-boards.js` → `src/utils/boards.js`
- `component-part1.js` + `component-part2.js` → Merge into `src/components/SidingCalculator.jsx`

### Step 3: Merge Component Parts

The component is split into two files for size reasons. To merge:

**File: `src/components/SidingCalculator.jsx`**

```jsx
import React, { useState } from 'react';
import { Ruler, Scissors, Eye, Settings, Lock, Unlock } from 'lucide-react';
import { 
  calculateSingleBoundaryBoards, 
  calculateDualBoundaryBoards, 
  getDCLineInfo,
  WALL_CONFIG 
} from '../utils/boards';
import { toFraction, toFeetInches } from '../utils/measurements';

const SidingCalculator = () => {
  // PASTE ALL STATE AND HANDLERS FROM component-part1.js HERE
  
  // PASTE renderControls() function FROM component-part1.js HERE
  
  // PASTE renderCanvas() function FROM component-part2.js HERE
  
  // PASTE renderBoardInfo() function FROM component-part2.js HERE
  
  // Main render
  return (
    <div className="flex h-screen">
      {renderControls()}
      {renderCanvas({
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
      })}
      {renderBoardInfo(selectedBoard)}
    </div>
  );
};

export default SidingCalculator;
```

### Step 4: Create App Entry Point

**File: `src/App.jsx`**

```jsx
import React from 'react';
import SidingCalculator from './components/SidingCalculator';

function App() {
  return <SidingCalculator />;
}

export default App;
```

### Step 5: Set Up Dependencies

**File: `package.json`**

```json
{
  "name": "cedar-siding-calculator",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.3.2",
    "vite": "^4.3.9"
  }
}
```

### Step 6: Configure Build Tools

**File: `vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
});
```

**File: `tailwind.config.js`**

```js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**File: `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Step 7: Create HTML Entry Point

**File: `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cedar Siding Calculator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**File: `src/main.jsx`**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**File: `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}
```

## Installation & Running

```bash
cd cedar-siding-calculator
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

## Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

## Important Notes for Claude Code

1. **Export statements**: The utility files use ES6 `export` statements. Make sure your build tool supports this.

2. **Import paths**: Update import paths to match your actual file structure.

3. **Component merging**: When merging `component-part1.js` and `component-part2.js`, keep all the state at the top, then the helper functions, then the main return statement.

4. **Known issues**: See `TODO.md` for bugs to fix during migration.

5. **Test cases**: See `TODO.md` for test scenarios to validate.

## Quick Validation

After assembly, test that:
- [ ] App loads without errors
- [ ] Wall trapezoid displays
- [ ] Single boundary mode generates boards
- [ ] Dual boundary mode generates boards
- [ ] Clicking boards shows info panel
- [ ] Pan and zoom work
- [ ] Changing reveals updates the pattern

---

*This assembly guide prepared for Claude Code migration, January 2025*
