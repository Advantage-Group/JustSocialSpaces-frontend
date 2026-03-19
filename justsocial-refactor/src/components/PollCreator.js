import React, { useState, useEffect } from 'react';
import './PollCreator.css';

const PollCreator = ({ onPollCreate, onCancel }) => {
  const [choices, setChoices] = useState([
    { text: '', id: 1 },
    { text: '', id: 2 }
  ]);
  const [duration, setDuration] = useState({ days: 1, hours: 0, minutes: 0 });

  const addChoice = () => {
    if (choices.length < 4) {
      setChoices([...choices, { text: '', id: Date.now() }]);
    }
  };

  const removeChoice = (id) => {
    if (choices.length > 2) {
      setChoices(choices.filter(choice => choice.id !== id));
    }
  };

  const updateChoice = (id, text) => {
    if (text.length <= 30) {
      setChoices(choices.map(choice => 
        choice.id === id ? { ...choice, text } : choice
      ));
    }
  };

  // Auto-create poll data when user fills in the form
  useEffect(() => {
    console.log('PollCreator - useEffect triggered:', { choices, duration });
    
    if (choices.filter(choice => choice.text.trim()).length >= 2) {
      const validChoices = choices.filter(choice => choice.text.trim());
      const totalMinutes = (duration.days * 24 * 60) + (duration.hours * 60) + duration.minutes;
      
      console.log('PollCreator - Valid poll data:', { validChoices, totalMinutes });
      
      if (totalMinutes >= 5) {
        const pollData = {
          choices: validChoices.map(choice => ({ text: choice.text.trim() })),
          duration: totalMinutes
        };

        console.log('PollCreator - Auto-creating poll with data:', pollData);
        onPollCreate(pollData);
      } else {
        console.log('PollCreator - Duration too short:', totalMinutes);
        onPollCreate(null);
      }
    } else {
      console.log('PollCreator - Form incomplete, clearing poll data');
      // Clear poll data if form is incomplete
      onPollCreate(null);
    }
  }, [choices, duration, onPollCreate]);

  const removePoll = () => {
    onCancel();
  };

  console.log('PollCreator - Rendering with state:', { choices, duration });
  console.log('PollCreator - Choices:', choices);
  
  return (
    <div className="poll-creator">
      <div style={{ color: '#1d9bf0', marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
        Poll Creator
      </div>


      <div className="poll-choices">
        {choices.map((choice, index) => (
          <div key={choice.id} className="poll-choice">
            <input
              type="text"
              placeholder={`Choice ${index + 1}`}
              value={choice.text}
              onChange={(e) => {
                console.log(`Choice ${index + 1} input changed:`, e.target.value);
                updateChoice(choice.id, e.target.value);
              }}
              maxLength={25}
              className="poll-choice-input"
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '1px solid #2f3336', 
                borderRadius: '8px', 
                background: '#000', 
                color: '#fff',
                fontSize: '16px'
              }}
            />
            <div className="poll-choice-counter">
              {choice.text.length}/25
            </div>
            {choices.length > 2 && (
              <button 
                className="poll-choice-remove"
                onClick={() => removeChoice(choice.id)}
              >
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {choices.length < 4 && (
        <button className="poll-add-choice" onClick={addChoice}>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Add a choice
        </button>
      )}

      <div className="poll-duration">
        <h4>Poll length</h4>
        <div className="poll-duration-controls">
          <div className="poll-duration-group">
            <label>DAYS</label>
            <select 
              value={duration.days} 
              onChange={(e) => setDuration({...duration, days: parseInt(e.target.value)})}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7].map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
          <div className="poll-duration-group">
            <label>HOURS</label>
            <select 
              value={duration.hours} 
              onChange={(e) => setDuration({...duration, hours: parseInt(e.target.value)})}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(hour => (
                <option key={hour} value={hour}>{hour}</option>
              ))}
            </select>
          </div>
          <div className="poll-duration-group">
            <label>MINUTES</label>
            <select 
              value={duration.minutes} 
              onChange={(e) => setDuration({...duration, minutes: parseInt(e.target.value)})}
            >
              {[0, 5, 10, 15, 30, 45].map(minute => (
                <option key={minute} value={minute}>{minute}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="poll-actions">
        <button className="poll-remove-btn" onClick={removePoll}>
          Remove poll
        </button>
      </div>
    </div>
  );
};

export default PollCreator;
