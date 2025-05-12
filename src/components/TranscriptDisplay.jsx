import React from 'react';

// Function to color-code different speakers (can be moved to a utils file if used elsewhere)
const getSpeakerColor = (speakerId) => {
    const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#8F00FF', '#FF6D01'];
    if (speakerId === 'unknown') return '#757575';
    const index = typeof speakerId === 'number' ? speakerId % colors.length : 0;
    return colors[index];
};

// Helper function to format seconds into MM:SS.mmm
const formatTimestamp = (seconds) => {
    if (seconds === null || seconds === undefined) return '00:00.000';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const millis = Math.floor((remainingSeconds - Math.floor(remainingSeconds)) * 1000);
    return `${String(minutes).padStart(2, '0')}:${String(Math.floor(remainingSeconds)).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
};

function TranscriptDisplay({ transcript, onClearTranscript }) {
    return (
        <div className="transcript-container">
            <h2>Live Transcript</h2>
            <div className="transcript-controls">
                <button
                    onClick={onClearTranscript}
                    className="clear-btn"
                    disabled={transcript.length === 0}
                >
                    Clear Transcript
                </button>
            </div>
            <div className="transcript-content">
                {transcript.length > 0 ? (
                    <div className="transcript-conversation">
                        {transcript.map((segment, index) => {
                            // Use segment.startTime, segment.endTime, and segment.words for more detailed display if needed
                            const displayTimestamp = segment.startTime !== undefined ? formatTimestamp(segment.startTime) : 'N/A';
                            return (
                                <div key={index} className="transcript-segment">
                                    <div className="segment-header">
                                        <span
                                            className="speaker-label"
                                            style={{ backgroundColor: getSpeakerColor(segment.speaker) }}
                                        >
                                            Speaker {segment.speaker !== 'unknown' ? segment.speaker : '?'}
                                        </span>
                                        <span className="timestamp">{displayTimestamp}</span>
                                    </div>
                                    <div className="segment-text">{segment.text}</div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="empty-transcript">Transcript will appear here...</p>
                )}
            </div>
        </div>
    );
}

export default TranscriptDisplay;