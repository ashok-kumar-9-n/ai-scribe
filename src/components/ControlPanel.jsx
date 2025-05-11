import React from 'react';

function ControlPanel({
    isRecording,
    isConnecting,
    onStartRecording,
    onStopRecording,
    audioUrl,
    onDownloadAudio,
}) {
    return (
        <div className="control-panel">
            <button
                onClick={isRecording ? onStopRecording : onStartRecording}
                className={isRecording ? "stop-btn" : "start-btn"}
                disabled={isConnecting}
            >
                {isConnecting ? 'Connecting...' : isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>

            {audioUrl && (
                <div className="audio-controls">
                    <audio src={audioUrl} controls className="audio-player" />
                    <button onClick={onDownloadAudio} className="download-btn">Download Recording</button>
                </div>
            )}
        </div>
    );
}

export default ControlPanel;