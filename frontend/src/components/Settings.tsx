import React, { useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { Settings as SettingsIcon, X } from "lucide-react";
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
        <SettingsIcon size={24} />
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
                <X size={20} />
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
