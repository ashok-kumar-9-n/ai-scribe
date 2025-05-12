import React, { useState } from 'react';

function DebugPanel({
    socketStateString,
    isSocketHookConnecting,
    isAppUiConnecting,
    isRecording,
    audioChunksCount,
    transcript
}) {
    const [showInfo, setShowInfo] = useState(false);

    return (
        <div className="debug-panel" onMouseEnter={() => setShowInfo(true)} onMouseLeave={() => setShowInfo(false)}>

            <span style={{ cursor: 'pointer' }}>ℹ️</span>

            {showInfo && (
                <div>
                    <p>Connection Status: {socketStateString}</p>
                    <p>Socket Hook Connecting: {isSocketHookConnecting ? 'Yes' : 'No'}</p>
                    <p>App UI Connecting: {isAppUiConnecting ? 'Yes' : 'No'}</p>
                    <p>Recording Status: {isRecording ? 'Recording' : 'Stopped'}</p>
                    <p>Audio Chunks: {audioChunksCount}</p>
                    <p>Total speakers: {transcript ? Array.from(new Set(transcript.map(s => s.speaker))).length : 0}</p>
                    <p>Total segments: {transcript ? transcript.length : 0}</p>
                </div>
            )}
        </div>
    );
}

export default DebugPanel;
