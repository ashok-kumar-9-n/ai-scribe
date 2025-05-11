import React from 'react';

function TranscriptStats({ transcript }) {
    const totalSpeakers = Array.from(new Set(transcript.map(s => s.speaker))).length;
    const totalSegments = transcript.length;

    return (
        <div className="transcript-stats">
            <p>Total speakers: {totalSpeakers}</p>
            <p>Total segments: {totalSegments}</p>
        </div>
    );
}

export default TranscriptStats;