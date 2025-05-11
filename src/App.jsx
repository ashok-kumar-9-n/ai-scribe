import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const socketRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(null);

  const startRecording = async () => {
    try {
      // Reset state
      setError(null);
      setIsConnecting(true);
      chunksRef.current = [];
      setTranscript([]);
      setAudioUrl(null);
      startTimeRef.current = new Date();

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Set up MediaRecorder with higher quality
      const options = { mimeType: 'audio/webm' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Connect to Deepgram
      const deepgramApiKey = import.meta.env.DEEPGRAM_API_KEY;
      if (!deepgramApiKey) {
        throw new Error("Deepgram API key is missing. Please check your .env file.");
      }

      const socket = new WebSocket('wss://api.deepgram.com/v1/listen?diarize=true&model=nova-3', [
        'token',
        deepgramApiKey,
      ]);

      socketRef.current = socket;

      socket.onopen = () => {
        console.log('Connection opened');
        setIsConnecting(false);

        // // Configure Deepgram - fix the schema by adding type field
        // const deepgramParams = {
        //   type: "ClusterConfig",
        //   punctuate: true,
        //   diarize: true,
        //   encoding: 'linear16',
        //   sample_rate: 16000,
        //   channels: 1,
        //   language: 'en-US',
        //   model: "nova-2",
        //   smart_format: true,
        //   interim_results: true
        // };

        // socket.send(JSON.stringify(deepgramParams));

        // Start recording
        mediaRecorder.start(250); // Send chunks every 250ms
      };

      socket.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data);

          // Check if this is an error message
          if (data.type === 'Error') {
            console.error('Deepgram error:', data);
            return;
          }

          // Process transcript data
          if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
            const receivedTranscript = data.channel.alternatives[0];

            // Check for speaker information
            if (receivedTranscript.words && receivedTranscript.words.length > 0) {
              // Group words by speaker
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

              // Add the last segment
              if (currentText.trim()) {
                speakerSegments.push({
                  speaker: currentSpeaker !== null ? currentSpeaker : 0,
                  text: currentText.trim()
                });
              }

              // Update transcript with speaker information
              if (speakerSegments.length > 0) {
                setTranscript(prev => {
                  // Create a new array to avoid modifying the previous state directly
                  const newTranscript = [...prev];

                  // For each new segment, check if we can merge with the last segment
                  speakerSegments.forEach(segment => {
                    const lastSegment = newTranscript.length > 0 ? newTranscript[newTranscript.length - 1] : null;

                    // If the last segment has the same speaker, merge the text
                    if (lastSegment && lastSegment.speaker === segment.speaker) {
                      lastSegment.text += ' ' + segment.text;
                    } else {
                      // Otherwise add as a new segment
                      newTranscript.push(segment);
                    }
                  });

                  return newTranscript;
                });
              }
            }
            // Fallback if no word-level speaker info
            else if (receivedTranscript.transcript && receivedTranscript.transcript.trim()) {
              setTranscript(prev => {
                const newText = receivedTranscript.transcript.trim();
                const lastSegment = prev.length > 0 ? prev[prev.length - 1] : null;

                // If the last segment is from an unknown speaker, append to it
                if (lastSegment && lastSegment.speaker === 'unknown') {
                  return [
                    ...prev.slice(0, -1),
                    { ...lastSegment, text: lastSegment.text + ' ' + newText }
                  ];
                } else {
                  // Otherwise add as a new segment
                  return [...prev, { speaker: 'unknown', text: newText }];
                }
              });
            }
          }
        } catch (error) {
          console.error('Error processing transcript:', error, message.data);
        }
      };

      socket.onclose = (event) => {
        console.log('Connection closed:', event.code, event.reason);
        setIsConnecting(false);

        // Only show error if we're not manually closing the connection
        if (isRecording && event.code !== 1000) {
          setError(`Connection closed: ${event.reason || 'Unknown reason'}`);
          stopRecording();
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnecting(false);
        setError('Connection error with Deepgram. Check console for details.');
        stopRecording();
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);

          // Send to Deepgram if connection is open
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            // Clone the blob to avoid issues
            event.data.arrayBuffer().then(buffer => {
              socketRef.current.send(buffer);
            });
          }
        }
      };

      mediaRecorder.onstop = () => {
        // Create audio blob and URL
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    // Stop recording and close connections
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close(1000, "User stopped recording");
    }

    setIsRecording(false);
    setIsConnecting(false);

    // Calculate recording duration
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
    // Cleanup function
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }

      // Clean up audio URL if it exists
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Function to color-code different speakers
  const getSpeakerColor = (speakerId) => {
    const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#8F00FF', '#FF6D01'];

    if (speakerId === 'unknown') return '#757575';

    // Ensure we always get a valid index
    const index = typeof speakerId === 'number' ? speakerId % colors.length : 0;
    return colors[index];
  };

  return (
    <div className="app-container">
      <h1>Conversation Recorder</h1>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      <div className="control-panel">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={isRecording ? "stop-btn" : "start-btn"}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : isRecording ? 'Stop Recording' : 'Start Recording'}
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
                // Add timestamp to each segment
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
        <p>Connection Status: {socketRef.current ?
          (socketRef.current.readyState === WebSocket.OPEN ? 'Open' :
            socketRef.current.readyState === WebSocket.CONNECTING ? 'Connecting' :
              socketRef.current.readyState === WebSocket.CLOSED ? 'Closed' : 'Closing')
          : 'Not Connected'}</p>
        <p>Recording Status: {isRecording ? 'Recording' : 'Stopped'}</p>
        <p>Audio Chunks: {chunksRef.current.length}</p>
      </div>
    </div>
  );
}

export default App;