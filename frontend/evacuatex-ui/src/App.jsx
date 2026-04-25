import { useState, useEffect } from "react";
import "./index.css";
import blueprintImage from "./assets/FloorPlan1.jpg";

const ROWS = 20;
const COLS = 20;
const CELL_SIZE = 50;

function createEmptyGrid() {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => 0)
  );
}

function App() {
  const [grid, setGrid] = useState(createEmptyGrid());
  const [mode, setMode] = useState("wall");
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [goals, setGoals] = useState([{ x: 4, y: 4 }]);
  const [path, setPath] = useState([]);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [blueprintOpacity, setBlueprintOpacity] = useState(1.0);
  const [blueprintScale, setBlueprintScale] = useState(2.15);
  const [blueprintOffsetX, setBlueprintOffsetX] = useState(-15);
  const [blueprintOffsetY, setBlueprintOffsetY] = useState(-150);
  const [editEnabled, setEditEnabled] = useState(true);

  // Load settings
  useEffect(() => {
    const saved = localStorage.getItem("savedBlueprintAlignment");
    if (saved) {
      const s = JSON.parse(saved);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBlueprintScale(s.scale);
      setBlueprintOffsetX(s.offsetX);
      setBlueprintOffsetY(s.offsetY);
      setBlueprintOpacity(s.opacity);
    }
  }, []);

  const updateCell = (row, col) => {
    if (!editEnabled) return;
    if (mode === "wall") {
      if (
        (start.x === col && start.y === row) ||
        (goals.some((g) => g.x === col && g.y === row))
      ) {
        return;
      }

      const newGrid = grid.map((r) => [...r]);
      newGrid[row][col] = newGrid[row][col] === 1 ? 0 : 1;
      setGrid(newGrid);
    }

    if (mode === "start") {
      if (goals.some((g) => g.x === col && g.y === row)) return;
      const newGrid = grid.map((r) => [...r]);
      newGrid[row][col] = 0;
      setGrid(newGrid);
      setStart({ x: col, y: row });
    }

    if (mode === "goal") {
      if (start.x === col && start.y === row) return;

      const alreadyGoal = goals.some((g) => g.x === col && g.y === row);
      if (alreadyGoal) {
        setGoals(goals.filter((g) => !(g.x === col && g.y === row)));
      } else {
        const newGrid = grid.map((r) => [...r]);
        newGrid[row][col] = 0;
        setGrid(newGrid);
        setGoals([...goals, { x: col, y: row }]);
      }
    }
  };

  const saveAlignment = () => {
    localStorage.setItem(
      "savedBlueprintAlignment",
      JSON.stringify({
        scale: blueprintScale,
        offsetX: blueprintOffsetX,
        offsetY: blueprintOffsetY,
        opacity: blueprintOpacity
      })
    );
    alert("Alignment saved.");
  };

  const loadAlignment = () => {
    const saved = localStorage.getItem("savedBlueprintAlignment");
    if (!saved) {
      alert("No saved alignment found.");
      return;
    }
    const s = JSON.parse(saved);
    setBlueprintScale(s.scale);
    setBlueprintOffsetX(s.offsetX);
    setBlueprintOffsetY(s.offsetY);
    setBlueprintOpacity(s.opacity);
  };

  const animatePath = async (newPath) => {
    setPath([]);

    for (let i = 0; i < newPath.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      setPath((prev) => [...prev, newPath[i]]);
    }
  };

  const handleMouseDown = (row, col) => {
    setIsMouseDown(true);
    updateCell(row, col);
  };

  const handleMouseEnter = (row, col) => {
    if (!isMouseDown) return;
    if (mode !== "wall") return;

    if (
      (start.x === col && start.y === row) ||
      (goals.some((g) => g.x === col && g.y === row))
    ) {
      return;
    }

    const newGrid = grid.map((r) => [...r]);
    newGrid[row][col] = 1;
    setGrid(newGrid);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const flattenGrid = () => {
    return grid.flat();
  };

  const findPath = async () => {
    try {
      const response = await fetch("http://localhost:5105/api/path/multi-goal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          width: COLS,
          height: ROWS,
          cells: flattenGrid(),
          start,
          goals
        })
      });
      if (!response.ok) {
        throw new Error("API request failed");
      }
      const data = await response.json();
      animatePath(data.path || []);
    } 
    catch (error) {
      console.error("Error finding path:", error);
      alert("Failed to find path.");
    }
  };

  const clearPath = () => {
    setPath([]);
  };

  const resetGrid = () => {
    setGrid(createEmptyGrid());
    setStart({ x: 0, y: 0 });
    setGoals([{ x: 4, y: 4 }]);
    setPath([]);
  };

  const isPathCell = (row, col) => {
    return path.some((p) => p.x === col && p.y === row);
  };

  //UI
  return (
    <div className="app" onMouseUp={handleMouseUp}>
      <h1>EvacuateX Path Planner</h1>
      <div className="controls">
        <button onClick={() => setMode("wall")}>Wall Mode</button>
        <button onClick={() => setMode("start")}>Set Start</button>
        <button onClick={() => setMode("goal")}>Toggle Exit</button>
        <button onClick={saveAlignment}>Save Alignment</button>
        <button onClick={loadAlignment}>Load Alignment</button>
        <button onClick={findPath}>Find Path</button>
        <button onClick={clearPath}>Clear Path</button>
        <button onClick={() => setEditEnabled(!editEnabled)}>
          {editEnabled ? "Lock Grid" : "Unlock Grid"}
        </button>
        <button onClick={resetGrid}>Reset Grid</button>
      </div>

      <div className="slider-group">
        <label htmlFor="opacityRange">
          Blueprint Opacity: {blueprintOpacity.toFixed(2)}
        </label>
        <input
          id="opacityRange"
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={blueprintOpacity}
          onChange={(e) => setBlueprintOpacity(Number(e.target.value))}
        />
      </div>

      <div className="slider-group">
        <label htmlFor="scaleRange">
          Blueprint Scale: {blueprintScale.toFixed(2)}
        </label>
        <input
          id="scaleRange"
          type="range"
          min="0.5"
          max="2.5"
          step="0.05"
          value={blueprintScale}
          onChange={(e) => setBlueprintScale(Number(e.target.value))}
        />
      </div>

      <div className="slider-group">
        <label htmlFor="offsetXRange">
          Offset X: {blueprintOffsetX}px
        </label>
        <input
          id="offsetXRange"
          type="range"
          min="-300"
          max="300"
          step="5"
          value={blueprintOffsetX}
          onChange={(e) => setBlueprintOffsetX(Number(e.target.value))}
        />
      </div>

      <div className="slider-group">
        <label htmlFor="offsetYRange">
          Offset Y: {blueprintOffsetY}px
        </label>
        <input
          id="offsetYRange"
          type="range"
          min="-300"
          max="300"
          step="5"
          value={blueprintOffsetY}
          onChange={(e) => setBlueprintOffsetY(Number(e.target.value))}
        />
      </div>

      <p>
        Current mode: <strong>{mode}</strong>
      </p>
      <div
        className="grid-wrapper"
        style={{
          width: `${COLS * CELL_SIZE}px`,
          height: `${ROWS * CELL_SIZE}px`
        }}
      >
        <img
          src={blueprintImage}
          alt="Blueprint background"
          className="blueprint-image"
          style={{ opacity: blueprintOpacity, transform: `translate(${blueprintOffsetX}px, ${blueprintOffsetY}px) scale(${blueprintScale})`}}
        />
        <div
          className="grid overlay-grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`
          }}
        >
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              let className = "cell";
              if (cell === 1) className += " wall";
              if (start.x === colIndex && start.y === rowIndex) className += " start";
              if (goals.some((g) => g.x === colIndex && g.y === rowIndex)) className += " goal";
              if (
                isPathCell(rowIndex, colIndex) &&
                !(start.x === colIndex && start.y === rowIndex) &&
                !goals.some((g) => g.x === colIndex && g.y === rowIndex)
              ) {
                className += " path";
              }
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={className}
                  onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                  onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                  onMouseUp={handleMouseUp}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default App;