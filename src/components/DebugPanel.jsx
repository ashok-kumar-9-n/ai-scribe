import React from 'react';

function DebugPanel({
    socketStateString,
    isSocketHookConnecting,
    isAppUiConnecting,
    isRecording,
    audioChunksCount,
}) {
    return (
        <div className="debug-panel">
            <h3>Debug Info</h3>
            <p>Connection Status: {socketStateString}</p>
            <p>Socket Hook Connecting: {isSocketHookConnecting ? 'Yes' : 'No'}</p>
            <p>App UI Connecting: {isAppUiConnecting ? 'Yes' : 'No'}</p>
            <p>Recording Status: {isRecording ? 'Recording' : 'Stopped'}</p>
            <p>Audio Chunks: {audioChunksCount}</p>
        </div>
    );
}

export default DebugPanel;