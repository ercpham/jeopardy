import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import "../styles/Question.css";

const TIMER_DURATION = 30;

const Question: React.FC<{
  questionText: string;
  answerText: string;
  referenceText: string;
  revealed: boolean;
  buzzLock: boolean;
  onRevealAnswer: () => void;
  onTimerExpired?: () => void;
}> = ({
  questionText,
  answerText,
  referenceText,
  revealed,
  buzzLock,
  onRevealAnswer,
  onTimerExpired,
}) => {
  const navigate = useNavigate();
  const { timerEnabled } = useSettings();
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [timerExpired, setTimerExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep a stable ref to onTimerExpired so it never triggers a timer restart
  const onTimerExpiredRef = useRef(onTimerExpired);
  useEffect(() => {
    onTimerExpiredRef.current = onTimerExpired;
  }, [onTimerExpired]);

  // Reset timer state when a new question is shown or timer toggled
  useEffect(() => {
    if (timerEnabled && !revealed) {
      setTimeLeft(TIMER_DURATION);
      setTimerExpired(false);
    }
  }, [timerEnabled, revealed]);

  // Tick the timer — pauses when buzzLock is true
  useEffect(() => {
    if (!timerEnabled || revealed || timerExpired) return;
    if (buzzLock) {
      // Paused — clear any running interval and do nothing
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimerExpired(true);
          onTimerExpiredRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerEnabled, revealed, timerExpired, buzzLock]);

  const handleGoHome = () => {
    navigate("/");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerClass = () => {
    if (timerExpired) return "timer-critical";
    if (timeLeft <= 5) return "timer-critical";
    if (timeLeft <= 10) return "timer-warning";
    return "";
  };

  return (
    <div className="question-wrapper">
      <div className="question-container">
        <button
          className="back-button"
          onClick={handleGoHome}
          aria-label="Go back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="20"
            height="20"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Back</span>
        </button>
        {timerEnabled && !revealed && (
          <div className={`timer-display ${getTimerClass()}`}>
            <span className="timer-icon">⏱</span>
            <span className="timer-text">
              {timerExpired ? "Time's up!" : formatTime(timeLeft)}
            </span>
            {buzzLock && !timerExpired && (
              <span className="timer-paused">Paused</span>
            )}
          </div>
        )}
        <div className="question-content">
          <h2 className="question-text">{questionText}</h2>
          {revealed ? (
            <>
              <h3 className="answer fade-in">{answerText}</h3>
              <h4 className="reference fade-in">{referenceText}</h4>
            </>
          ) : (
            <button className="reveal-button" onClick={onRevealAnswer}>
              Reveal Answer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Question;
