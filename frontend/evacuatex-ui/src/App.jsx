import { useState } from "react";
import "./index.css";

const ROWS = 5;
const COLS = 5;

function createEmptyGrid() {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => 0)
  );
}

function App() {
  const [grid, setGrid] = useState(createEmptyGrid());
  const [mode, setMode] = useState("wall");
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [goal, setGoal] = useState({ x: 4, y: 4 });
  const [path, setPath] = useState([]);

  const handleCellClick = (row, col) => {
    if (mode === "wall"){
      if ((start.x === col && start.y === row) || (goal.x === col && goal.y === row)){
        return;
      }

      const newGrid = grid.map((r) => [...r]);
      newGrid[row][col] = newGrid[row][col] === 1 ? 0 : 1;
      setGrid(newGrid);
    }

    if (mode === "start")
    {
      if (goal.x === col && goal.y === row) return;
      const newGrid = grid.map((r) => [...r]);
      newGrid[row][col] = 0;
      setGrid(newGrid);
      setStart({ x: col, y: row });
    }

    if (mode === "goal")
    {
      if (start.x === col && start.y === row) return;
      const newGrid = grid.map((r) => [...r]);
      newGrid[row][col] = 0;
      setGrid(newGrid);
      setGoal({ x: col, y: row });
    }
  };

  const flattenGrid = () => {
    return grid.flat();
  };

  const findPath = async () => {
    try {
      const response = await fetch("http://localhost:5105/api/path/grid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          width: COLS,
          height: ROWS,
          cells: flattenGrid(),
          start,
          goal
        })
      });
      if (!response.ok) {
        throw new Error("API request failed");
      }
      const data = await response.json();
      setPath(data.path || []);
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
    setGoal({ x: 4, y: 4 });
    setPath([]);
  };

  const isPathCell = (row, col) => {
    return path.some((p) => p.x === col && p.y === row);
  };

  //UI
  return (
    <div className="app">
      <h1>EvacuateX Path Planner</h1>
      <div className="controls">
        <button onClick={() => setMode("wall")}>Wall Mode</button>
        <button onClick={() => setMode("start")}>Set Start</button>
        <button onClick={() => setMode("goal")}>Set Goal</button>
        <button onClick={findPath}>Find Path</button>
        <button onClick={clearPath}>Clear Path</button>
        <button onClick={resetGrid}>Reset Grid</button>
      </div>
      <p>
        Current mode: <strong>{mode}</strong>
      </p>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 50px)`
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            let className = "cell";
            if (cell === 1) className += " wall";
            if (start.x === colIndex && start.y === rowIndex) className += " start";
            if (goal.x === colIndex && goal.y === rowIndex) className += " goal";
            if (
              isPathCell(rowIndex, colIndex) &&
              !(start.x === colIndex && start.y === rowIndex) &&
              !(goal.x === colIndex && goal.y === rowIndex)
            ) {
              className += " path";
            }
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={className}
                onClick={() => handleCellClick(rowIndex, colIndex)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

export default App;