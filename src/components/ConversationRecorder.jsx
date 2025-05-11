import { useState, useEffect, useRef, useCallback } from 'react';
import '../App.css'; // Assuming styles from App.css are still relevant
import { useDeepgramSocket } from '../hooks/useDeepgramSocket';
import ErrorBanner from './ErrorBanner';
import ControlPanel from './ControlPanel';
import TranscriptDisplay from './TranscriptDisplay';
import TranscriptStats from './TranscriptStats';
import DebugPanel from './DebugPanel';

function ConversationRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState([]);
    const [audioUrl, setAudioUrl] = useState(null);
    const [appError, setAppError] = useState(null);
    const [isConnectingToSocket, setIsConnectingToSocket] = useState(false);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const startTimeRef = useRef(null);

    const handleSocketOpen = useCallback(() => {
        console.log('Recorder: Deepgram connection opened');
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.start(250);
        }
    }, []);

    const handleSocketMessage = useCallback((message) => {
        try {
            const data = JSON.parse(message.data);
            if (data.type === 'Error') {
                console.error('Recorder: Deepgram error message:', data);
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
                                speakerSegments.push({ speaker: currentSpeaker, text: currentText.trim() });
                            }
                            currentSpeaker = word.speaker;
                            currentText = word.word + ' ';
                        } else {
                            currentText += word.word + ' ';
                        }
                    });
                    if (currentText.trim()) {
                        speakerSegments.push({ speaker: currentSpeaker !== null ? currentSpeaker : 0, text: currentText.trim() });
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
                            return [...prev.slice(0, -1), { ...lastSegment, text: lastSegment.text + ' ' + newText }];
                        } else {
                            return [...prev, { speaker: 'unknown', text: newText }];
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Recorder: Error processing transcript:', error, message.data);
            setAppError('Error processing transcript data.');
        }
    }, []);

    const handleSocketClose = useCallback((event) => {
        console.log('Recorder: Deepgram connection closed:', event.code, event.reason);
        if (isRecording && event.code !== 1000 && event.code !== 1005) {
            setAppError(`Connection closed unexpectedly: ${event.reason || 'Unknown reason'}`);
        }
    }, [isRecording]);

    const handleSocketError = useCallback((error) => {
        console.error('Recorder: Deepgram WebSocket error:', error);
        setAppError(error.message || 'Connection error with Deepgram.');
    }, []);

    const handleSocketConnectionChange = useCallback((isConnecting) => {
        setIsConnectingToSocket(isConnecting);
    }, []);

    const {
        connectDeepgram,
        disconnectDeepgram,
        sendAudioData,
        isSocketConnecting,
        socketError,
        getSocketState,
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
            chunksRef.current = [];
            setTranscript([]);
            setAudioUrl(null);
            startTimeRef.current = new Date();

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            const options = { mimeType: 'audio/webm' };
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;

            const deepgramApiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
            if (!deepgramApiKey) {
                setAppError("Deepgram API key is missing. Check .env (e.g. VITE_DEEPGRAM_API_KEY).");
                return;
            }
            connectDeepgram(deepgramApiKey);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                    event.data.arrayBuffer().then(buffer => sendAudioData(buffer));
                }
            };
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
            };
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            setAppError(error.message || 'Failed to start recording.');
            setIsConnectingToSocket(false);
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
            document.body.removeChild(a);
        }
    };

    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
            disconnectDeepgram(1005, "Component unmounting");
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl, disconnectDeepgram]);

    const currentSocketState = getSocketState();
    const memoizedSocketStateString = useCallback(() => {
        switch (currentSocketState) {
            case WebSocket.CONNECTING: return 'Connecting';
            case WebSocket.OPEN: return 'Open';
            case WebSocket.CLOSING: return 'Closing';
            case WebSocket.CLOSED: return 'Closed';
            default: return 'Not Connected';
        }
    }, [currentSocketState]);

    return (
        <>
            <h1>Conversation Recorder</h1>
            <ErrorBanner error={appError} onClose={() => setAppError(null)} />
            <ControlPanel
                isRecording={isRecording}
                isConnecting={isConnectingToSocket || (isRecording && isSocketConnecting)}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                audioUrl={audioUrl}
                onDownloadAudio={downloadAudio}
            />
            <TranscriptDisplay
                transcript={transcript}
                onClearTranscript={() => setTranscript([])}
            />
            <TranscriptStats transcript={transcript} />
            <DebugPanel
                socketStateString={memoizedSocketStateString()}
                isSocketHookConnecting={isSocketConnecting}
                isAppUiConnecting={isConnectingToSocket}
                isRecording={isRecording}
                audioChunksCount={chunksRef.current.length}
            />
        </>
    );
}

export default ConversationRecorder;