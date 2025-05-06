import React, { useState } from "react";

const Score: React.FC<{ score: number; modifyScore: (newScore: number) => void }> = ({ score, modifyScore }) => {
  const [inputValue, setInputValue] = useState<number>(0);

  const handleAdd = () => {
    modifyScore(score + inputValue);
  };

  const handleSubtract = () => {
    modifyScore(score - inputValue);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h2>Team Score: {score}</h2>
      <div>
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(Number(e.target.value))}
          style={{ marginRight: "10px" }}
        />
        <button onClick={handleAdd}>Add</button>
        <button onClick={handleSubtract} style={{ marginLeft: "10px" }}>
          Subtract
        </button>
      </div>
    </div>
  );
};

export default Score;