import React, { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { updateDarkMode, updateTimerEnabled } from "../services/api";
import { Settings as SettingsIcon, X } from "lucide-react";
import "../styles/Settings.css";

// Discrete font-scale steps (mirrors Apple's Dynamic Type sizes concept)
const FONT_SCALE_STEPS = [0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.75];
const FONT_SCALE_LABELS = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

const Settings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const darkMode = useAppStore(state => state.darkMode);
  const timerEnabled = useAppStore(state => state.timerEnabled);
  const fontScale = useAppStore(state => state.fontScale);
  const setFontScale = useAppStore(state => state.setFontScale);

  const toggleModal = () => setIsOpen((prev) => !prev);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  // Find the closest step index for current scale
  const currentStepIndex = FONT_SCALE_STEPS.reduce(
    (best, step, i) =>
      Math.abs(step - fontScale) < Math.abs(FONT_SCALE_STEPS[best] - fontScale) ? i : best,
    0
  );

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    setFontScale(FONT_SCALE_STEPS[idx]);
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
                    onChange={() => updateDarkMode(!darkMode)}
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
                    onChange={() => updateTimerEnabled(!timerEnabled)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {/* Font Size Slider */}
              <div className="settings-option settings-option--column">
                <div className="settings-option-info">
                  <h4>Text Size</h4>
                  <p>Adjust font size for readability and projection</p>
                </div>
                <div className="font-size-slider-wrap">
                  <span className="font-size-label-sm" aria-hidden="true">A</span>
                  <div className="font-size-track-wrap">
                    <input
                      id="font-scale-slider"
                      type="range"
                      className="font-size-slider"
                      min={0}
                      max={FONT_SCALE_STEPS.length - 1}
                      step={1}
                      value={currentStepIndex}
                      onChange={handleSliderChange}
                      aria-label="Text size"
                      aria-valuetext={FONT_SCALE_LABELS[currentStepIndex]}
                      style={{
                        ["--pct" as string]: `${(currentStepIndex / (FONT_SCALE_STEPS.length - 1)) * 100}%`
                      }}
                    />
                    {/* Tick marks */}
                    <div className="font-size-ticks" aria-hidden="true">
                      {FONT_SCALE_STEPS.map((_, i) => (
                        <span
                          key={i}
                          className={`font-size-tick${i === currentStepIndex ? " font-size-tick--active" : ""}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="font-size-label-lg" aria-hidden="true">A</span>
                </div>
                <div className="font-size-step-label">{FONT_SCALE_LABELS[currentStepIndex]}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;
