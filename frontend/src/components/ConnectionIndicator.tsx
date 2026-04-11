import React from 'react';
import { useSession } from '../context/SessionContext';

const ConnectionIndicator: React.FC = () => {
  const { connectionState, pingLatency, sessionId } = useSession();

  // Don't show indicator if there's no session
  if (!sessionId) {
    return null;
  }

  const getIndicatorColor = () => {
    switch (connectionState) {
      case 'connected':
        return '#10B981'; // Green
      case 'connecting':
      case 'reconnecting':
        return '#F59E0B'; // Yellow
      case 'disconnected':
      case 'degraded':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const getTooltipText = () => {
    switch (connectionState) {
      case 'connected':
        return pingLatency 
          ? `Connected (${pingLatency}ms)` 
          : 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'degraded':
        return pingLatency 
          ? `Poor connection (${pingLatency}ms)` 
          : 'Poor connection';
      default:
        return 'Unknown';
    }
  };

  const shouldPulse = connectionState === 'reconnecting';
  const showPing = connectionState === 'connected' || connectionState === 'degraded';

  return (
    <div className="connection-indicator-container" title={getTooltipText()}>
      <div 
        className="connection-indicator"
        style={{
          backgroundColor: getIndicatorColor(),
          animation: shouldPulse ? 'pulse 1.5s infinite' : 'none',
        }}
      />
      {showPing && (
        <span className="ping-display">
          {pingLatency !== null ? `${pingLatency}ms` : '...'}
        </span>
      )}
    </div>
  );
};

export default ConnectionIndicator;