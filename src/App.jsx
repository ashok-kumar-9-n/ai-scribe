import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { useDeepgramSocket } from './hooks/useDeepgramSocket';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const [appError, setAppError] = useState(null); // Renamed to avoid conflict with hook's error
  const [isConnectingToSocket, setIsConnectingToSocket] = useState(false); // For UI feedback

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(null);

  const handleSocketOpen = useCallback(() => {
    console.log('App: Deepgram connection opened');
    // setIsConnectingToSocket(false); // Handled by onConnectionChange in hook
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.start(250); // Send chunks every 250ms
    }
  }, []);

  const handleSocketMessage = useCallback((message) => {
    try {
      const data = JSON.parse(message.data);

      if (data.type === 'Error') {
        console.error('App: Deepgram error message:', data);
        setAppError(`Deepgram error: ${data.reason || 'Unknown error'}`);
        return;
      }

      if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
        const receivedTranscript = data.channel.alternatives[0];

        if (receivedTranscript.words && receivedTranscript.words.length > 0) {
          const speakerSegments = [];
          let currentSpeaker = null;
          let currentText = '';

          receivedTranscript.words.forEach(word => {
            if (currentSpeaker !== word.speaker && word.speaker !== undefined) {
              if (currentSpeaker !== null && currentText.trim()) {
                speakerSegments.push({
                  speaker: currentSpeaker,
                  text: currentText.trim()
                });
              }
              currentSpeaker = word.speaker;
              currentText = word.word + ' ';
            } else {
              currentText += word.word + ' ';
            }
          });

          if (currentText.trim()) {
            speakerSegments.push({
              speaker: currentSpeaker !== null ? currentSpeaker : 0,
              text: currentText.trim()
            });
          }

          if (speakerSegments.length > 0) {
            setTranscript(prev => {
              const newTranscript = [...prev];
              speakerSegments.forEach(segment => {
                const lastSegment = newTranscript.length > 0 ? newTranscript[newTranscript.length - 1] : null;
                if (lastSegment && lastSegment.speaker === segment.speaker) {
                  lastSegment.text += ' ' + segment.text;
                } else {
                  newTranscript.push(segment);
                }
              });
              return newTranscript;
            });
          }
        } else if (receivedTranscript.transcript && receivedTranscript.transcript.trim()) {
          setTranscript(prev => {
            const newText = receivedTranscript.transcript.trim();
            const lastSegment = prev.length > 0 ? prev[prev.length - 1] : null;
            if (lastSegment && lastSegment.speaker === 'unknown') {
              return [
                ...prev.slice(0, -1),
                { ...lastSegment, text: lastSegment.text + ' ' + newText }
              ];
            } else {
              return [...prev, { speaker: 'unknown', text: newText }];
            }
          });
        }
      }
    } catch (error) {
      console.error('App: Error processing transcript:', error, message.data);
      setAppError('Error processing transcript data.');
    }
  }, []);

  const handleSocketClose = useCallback((event) => {
    console.log('App: Deepgram connection closed:', event.code, event.reason);
    // setIsConnectingToSocket(false); // Handled by onConnectionChange in hook
    if (isRecording && event.code !== 1000 && event.code !== 1005 /* Normal closure */) {
      setAppError(`Connection closed unexpectedly: ${event.reason || 'Unknown reason'}`);
      // stopRecording(); // stopRecording might try to close socket again, let's be careful
    }
  }, [isRecording]);

  const handleSocketError = useCallback((error) => {
    console.error('App: Deepgram WebSocket error:', error);
    // setIsConnectingToSocket(false); // Handled by onConnectionChange in hook
    setAppError(error.message || 'Connection error with Deepgram.');
    // stopRecording(); // stopRecording might try to close socket again
  }, []);

  const handleSocketConnectionChange = useCallback((isConnecting) => {
    setIsConnectingToSocket(isConnecting);
  }, []);


  const {
    connectDeepgram,
    disconnectDeepgram,
    sendAudioData,
    isSocketConnecting, // This is from the hook, reflects socket's own connecting state
    socketError,      // Error from the hook
    getSocketState,
    socketRef // For debug panel
  } = useDeepgramSocket(
    handleSocketOpen,
    handleSocketMessage,
    handleSocketClose,
    handleSocketError,
    handleSocketConnectionChange
  );

  useEffect(() => {
    if (socketError) {
      setAppError(socketError.message);
    }
  }, [socketError]);


  const startRecording = async () => {
    try {
      setAppError(null);
      // setIsConnectingToSocket(true); // This will be set by the hook via onConnectionChange
      chunksRef.current = [];
      setTranscript([]);
      setAudioUrl(null);
      startTimeRef.current = new Date();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const options = { mimeType: 'audio/webm' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      const deepgramApiKey = import.meta.env.VITE_DEEPGRAM_API_KEY; // Ensure VITE_ prefix for Vite
      if (!deepgramApiKey) {
        const err = new Error("Deepgram API key is missing. Please check your .env file (e.g. VITE_DEEPGRAM_API_KEY).");
        setAppError(err.message);
        // setIsConnectingToSocket(false);
        return;
      }

      connectDeepgram(deepgramApiKey); // Hook handles setIsConnectingToSocket via callback

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          event.data.arrayBuffer().then(buffer => {
            sendAudioData(buffer);
          });
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      // mediaRecorder.start() is now called in handleSocketOpen
      setIsRecording(true);

    } catch (error) {
      console.error('Error starting recording:', error);
      setAppError(error.message || 'Failed to start recording.');
      setIsConnectingToSocket(false); // Explicitly set if startRecording itself fails before socket connection attempt
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    disconnectDeepgram(1000, "User stopped recording");

    setIsRecording(false);
    // setIsConnectingToSocket(false); // Hook's onClose/onError will handle this via onConnectionChange

    if (startTimeRef.current) {
      const duration = Math.round((new Date() - startTimeRef.current) / 1000);
      console.log(`Recording stopped after ${duration} seconds`);
    }
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style = 'display: none';
      a.href = audioUrl;
      a.download = `conversation-${new Date().toISOString()}.webm`;
      a.click();
      window.URL.revokeObjectURL(audioUrl);
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      disconnectDeepgram(1005, "Component unmounting"); // Use a different code for unmount
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, disconnectDeepgram]); // Added disconnectDeepgram to dependencies

  const getSpeakerColor = (speakerId) => {
    const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#8F00FF', '#FF6D01'];
    if (speakerId === 'unknown') return '#757575';
    const index = typeof speakerId === 'number' ? speakerId % colors.length : 0;
    return colors[index];
  };

  const currentSocketState = getSocketState();
  const socketStateString = () => {
    switch (currentSocketState) {
      case WebSocket.CONNECTING: return 'Connecting';
      case WebSocket.OPEN: return 'Open';
      case WebSocket.CLOSING: return 'Closing';
      case WebSocket.CLOSED: return 'Closed';
      default: return 'Not Connected';
    }
  };


  return (
    <div className="app-container">
      <h1>Conversation Recorder</h1>

      {appError && (
        <div className="error-banner">
          <p>{appError}</p>
          <button onClick={() => setAppError(null)} className="error-close">×</button>
        </div>
      )}

      <div className="control-panel">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={isRecording ? "stop-btn" : "start-btn"}
          disabled={isConnectingToSocket || (isRecording && isSocketConnecting)} // Disable if socket is trying to connect
        >
          {isConnectingToSocket ? 'Connecting...' : isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>

        {audioUrl && (
          <div className="audio-controls">
            <audio src={audioUrl} controls className="audio-player" />
            <button onClick={downloadAudio} className="download-btn">Download Recording</button>
          </div>
        )}
      </div>

      <div className="transcript-container">
        <h2>Live Transcript</h2>
        <div className="transcript-controls">
          <button
            onClick={() => setTranscript([])}
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
                const timestamp = new Date().toLocaleTimeString();
                return (
                  <div key={index} className="transcript-segment">
                    <div className="segment-header">
                      <span
                        className="speaker-label"
                        style={{ backgroundColor: getSpeakerColor(segment.speaker) }}
                      >
                        Speaker {segment.speaker !== 'unknown' ? segment.speaker : '?'}
                      </span>
                      <span className="timestamp">{timestamp}</span>
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

      <div className="transcript-stats">
        <p>Total speakers: {Array.from(new Set(transcript.map(s => s.speaker))).length}</p>
        <p>Total segments: {transcript.length}</p>
      </div>

      <div className="debug-panel">
        <h3>Debug Info</h3>
        <p>Connection Status: {socketStateString()}</p>
        <p>Socket Hook Connecting: {isSocketConnecting ? 'Yes' : 'No'}</p>
        <p>App UI Connecting: {isConnectingToSocket ? 'Yes' : 'No'}</p>
        <p>Recording Status: {isRecording ? 'Recording' : 'Stopped'}</p>
        <p>Audio Chunks: {chunksRef.current.length}</p>
      </div>
    </div>
  );
}

export default App;
