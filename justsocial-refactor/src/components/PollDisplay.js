import React, { useState } from 'react';
import './PollDisplay.css';

const PollDisplay = ({ poll, currentUserId, onVote }) => {
  const [isVoting, setIsVoting] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);

  console.log('PollDisplay - Received poll data:', poll);
  console.log('PollDisplay - Poll question:', poll?.question);
  console.log('PollDisplay - Poll choices:', poll?.choices);
  console.log('PollDisplay - Current user ID:', currentUserId);

  // Safety check - don't render if poll data is incomplete
  if (!poll || !poll.question || !poll.choices || !Array.isArray(poll.choices)) {
    console.log('PollDisplay - Invalid poll data, not rendering');
    return null;
  }

  const isCreator = poll.author && poll.author._id === currentUserId;
  const hasVoted = poll.hasUserVoted;
  const isExpired = !poll.isActive;

  const handleVote = async (choiceIndex) => {
    if (hasVoted || isExpired || isCreator || isVoting) return;

    setIsVoting(true);
    setSelectedChoice(choiceIndex);

    try {
      await onVote(poll._id, choiceIndex);
    } catch (error) {
      console.error('Error voting:', error);
      setSelectedChoice(null);
    } finally {
      setIsVoting(false);
    }
  };

  const getChoiceWidth = (choiceIndex) => {
    if (poll.totalVotes === 0) return '0%';
    const percentage = poll.votePercentages[choiceIndex] || 0;
    return `${percentage}%`;
  };

  const formatTimeLeft = (timeLeft) => {
    if (timeLeft === 'Poll ended') return 'Poll ended';
    return timeLeft;
  };

  return (
    <div className="poll-display">
      <div className="poll-question">
        {poll.question}
      </div>

      <div className="poll-choices">
        {poll.choices.map((choice, index) => {
          const isSelected = poll.userVote === index;
          const percentage = poll.votePercentages[index] || 0;
          const canVote = !hasVoted && !isExpired && !isCreator && !isVoting;
          const isVoteButton = !hasVoted && !isExpired && !isCreator;

          return (
            <div 
              key={index} 
              className={`poll-choice ${isSelected ? 'selected' : ''} ${isVoteButton ? 'vote-button' : ''}`}
              onClick={() => handleVote(index)}
              style={{ cursor: canVote ? 'pointer' : 'default' }}
            >
              <div className="poll-choice-content">
                <div className="poll-choice-text">
                  {choice.text}
                </div>
                {(hasVoted || isExpired || isCreator) && (
                  <div className="poll-choice-stats">
                    <span className="poll-choice-percentage">
                      {percentage}%
                    </span>
                    <span className="poll-choice-votes">
                      {choice.votes} vote{choice.votes !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
              
              {(hasVoted || isExpired || isCreator) && (
                <div className="poll-choice-bar">
                  <div 
                    className="poll-choice-fill"
                    style={{ width: getChoiceWidth(index) }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="poll-footer">
        <div className="poll-stats">
          <span className="poll-total-votes">
            {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}
          </span>
          <span className="poll-separator">•</span>
          <span className="poll-time-left">
            {formatTimeLeft(poll.timeLeft)}
          </span>
        </div>
        
        {isCreator && (
          <div className="poll-creator-badge">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M9.5 7h5l-2.5 3 2.5 3h-5l2.5-3L9.5 7z"/>
            </svg>
            You created this poll
          </div>
        )}
      </div>

      {isVoting && (
        <div className="poll-voting-overlay">
          <div className="poll-voting-spinner"></div>
          <span>Recording your vote...</span>
        </div>
      )}
    </div>
  );
};

export default PollDisplay;
