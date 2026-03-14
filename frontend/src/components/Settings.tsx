import React, { useState } from "react";
import { useSettings } from "../context/SettingsContext";
import "../styles/Settings.css";

const Settings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { darkMode, setDarkMode, timerEnabled, setTimerEnabled } = useSettings();

  const toggleModal = () => setIsOpen((prev) => !prev);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        className="settings-button"
        onClick={toggleModal}
        aria-label="Open Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="24"
          height="24"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {isOpen && (
        <div className="settings-overlay" onClick={handleOverlayClick}>
          <div className="settings-modal">
            <div className="settings-header">
              <h2>Settings</h2>
              <button
                className="settings-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close Settings"
              >
                &times;
              </button>
            </div>
            <div className="settings-content">
              <div className="settings-option">
                <div className="settings-option-info">
                  <h4>Dark Mode</h4>
                  <p>Switch between light and dark themes</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={() => setDarkMode((prev) => !prev)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="settings-option">
                <div className="settings-option-info">
                  <h4>30-Second Timer</h4>
                  <p>Count down when a question is displayed</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={timerEnabled}
                    onChange={() => setTimerEnabled((prev) => !prev)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;
