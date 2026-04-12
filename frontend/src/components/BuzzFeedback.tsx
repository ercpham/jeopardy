import React from 'react';
import '../styles/BuzzFeedback.css';

interface Props {
  visible: boolean;
  message: string;
}

const BuzzFeedback: React.FC<Props> = ({ visible, message }) => {
  if (!visible) return null;
  return (
    <div className="buzz-feedback" role="alert">
      {message}
    </div>
  );
};

export default BuzzFeedback;
