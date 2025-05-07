import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { BoardProvider } from "./context/BoardContext";
import { QuestionsProvider } from "./context/QuestionsContext";
import { ScoreProvider } from "./context/ScoreContext";
import { SessionProvider } from "./context/SessionContext";
import "./styles/App.css";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <ScoreProvider>
          <QuestionsProvider>
            <BoardProvider>
              <App />
            </BoardProvider>
          </QuestionsProvider>
        </ScoreProvider>
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>
);
