import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import { useTeam } from "../context/TeamContext";
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
  const { resetBuzzedTeams, releaseBuzzLock, teams } = useTeam();
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [timerExpired, setTimerExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const teamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [teamTimeLeft, setTeamTimeLeft] = useState<number | null>(null);

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

  // Tick the timer — does NOT pause when buzzLock is true
  useEffect(() => {
    if (!timerEnabled || revealed || timerExpired) return;

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
  }, [timerEnabled, revealed, timerExpired]);

  // 15-second timer for buzzing team (only when on question page, timer enabled, and question not revealed)
  useEffect(() => {
    if (!timerEnabled || revealed || !buzzLock) {
      // Clear team timer if conditions not met
      if (teamTimerRef.current) {
        clearInterval(teamTimerRef.current);
        teamTimerRef.current = null;
        setTeamTimeLeft(null);
      }
      return;
    }

    // Start 15-second timer for buzzing team
    setTeamTimeLeft(15);
    teamTimerRef.current = setInterval(() => {
      setTeamTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (teamTimerRef.current) {
            clearInterval(teamTimerRef.current);
            teamTimerRef.current = null;
          }
          // Auto-release buzz lock after 15 seconds
          releaseBuzzLock();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (teamTimerRef.current) {
        clearInterval(teamTimerRef.current);
        teamTimerRef.current = null;
        setTeamTimeLeft(null);
      }
    };
  }, [timerEnabled, revealed, buzzLock, releaseBuzzLock]);

  const handleGoHome = () => {
    // Clear team timer
    if (teamTimerRef.current) {
      clearInterval(teamTimerRef.current);
      teamTimerRef.current = null;
    }
    // Reset buzzed teams when leaving question
    resetBuzzedTeams();
    // Release buzz lock when leaving question
    releaseBuzzLock();
    navigate("/");
  };

  const handleRevealAnswer = () => {
    // Clear team timer
    if (teamTimerRef.current) {
      clearInterval(teamTimerRef.current);
      teamTimerRef.current = null;
    }
    onRevealAnswer();
    // Reset buzzed teams when answer is revealed
    resetBuzzedTeams();
    // Release buzz lock when answer is revealed
    releaseBuzzLock();
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

  // Find which team is currently buzzing
  const buzzingTeam = teams.find((team) => team.buzz_lock_owned);

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
            {buzzLock && !timerExpired && buzzingTeam && teamTimeLeft !== null && (
              <span className="timer-paused">
                {buzzingTeam.team_name}: {teamTimeLeft}s to answer
              </span>
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
            <button className="reveal-button" onClick={handleRevealAnswer}>
              Reveal Answer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Question;
