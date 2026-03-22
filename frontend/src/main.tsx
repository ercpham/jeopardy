import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { BoardProvider } from "./context/BoardContext";
import { QuestionsProvider } from "./context/QuestionsContext";
import { TeamProvider } from "./context/TeamContext";
import { SessionProvider } from "./context/SessionContext";
import { SettingsProvider } from "./context/SettingsContext";
import { PageProvider } from "./context/PageContext";
import "./styles/App.css";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <PageProvider>
          <SettingsProvider>
            <TeamProvider>
              <QuestionsProvider>
                <BoardProvider>
                  <App />
                </BoardProvider>
              </QuestionsProvider>
            </TeamProvider>
          </SettingsProvider>
        </PageProvider>
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>
);
