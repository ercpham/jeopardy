import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { BoardProvider } from "./context/BoardContext";
import { QuestionsProvider } from "./context/QuestionsContext";
import { TeamProvider } from "./context/TeamContext";
import { SessionProvider } from "./context/SessionContext";
import { SettingsProvider } from "./context/SettingsContext";
import "./styles/App.css";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <SessionProvider>
          <TeamProvider>
            <QuestionsProvider>
              <BoardProvider>
                <App />
              </BoardProvider>
            </QuestionsProvider>
          </TeamProvider>
        </SessionProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
