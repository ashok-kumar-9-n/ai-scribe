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
            mediaRecorderRef.current.start(2000);
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
                const receivedAlternative = data.channel.alternatives[0]; // Renamed for clarity
                if (receivedAlternative.words && receivedAlternative.words.length > 0) {
                    const newSpeakerSegmentsFromBatch = [];
                    let currentSpeakerInBatch = null;
                    let currentWordsForSegment = [];

                    receivedAlternative.words.forEach(word => {
                        const wordData = {
                            text: word.punctuated_word || word.word,
                            start: word.start,
                            end: word.end,
                            confidence: word.confidence,
                            // Ensure speaker is a number or a defined value, default to 0 if undefined
                            speaker: typeof word.speaker === 'number' ? word.speaker : 0
                        };

                        if (currentSpeakerInBatch !== wordData.speaker) { // Compare with wordData.speaker
                            if (currentSpeakerInBatch !== null && currentWordsForSegment.length > 0) {
                                newSpeakerSegmentsFromBatch.push({
                                    speaker: currentSpeakerInBatch,
                                    words: [...currentWordsForSegment],
                                    startTime: currentWordsForSegment[0].start,
                                    endTime: currentWordsForSegment[currentWordsForSegment.length - 1].end,
                                    text: currentWordsForSegment.map(w => w.text).join(' ')
                                });
                            }
                            currentSpeakerInBatch = wordData.speaker;
                            currentWordsForSegment = [wordData];
                        } else {
                            // If currentSpeakerInBatch is null (e.g. first word and speaker was undefined, now defaulted), set it.
                            if (currentSpeakerInBatch === null) {
                                currentSpeakerInBatch = wordData.speaker;
                            }
                            currentWordsForSegment.push(wordData);
                        }
                    });

                    if (currentWordsForSegment.length > 0) {
                        // Ensure currentSpeakerInBatch is not null before pushing
                        const finalSpeakerForBatch = currentSpeakerInBatch !== null ? currentSpeakerInBatch : (receivedAlternative.words[0].speaker !== undefined ? receivedAlternative.words[0].speaker : 0);
                        newSpeakerSegmentsFromBatch.push({
                            speaker: finalSpeakerForBatch,
                            words: [...currentWordsForSegment],
                            startTime: currentWordsForSegment[0].start,
                            endTime: currentWordsForSegment[currentWordsForSegment.length - 1].end,
                            text: currentWordsForSegment.map(w => w.text).join(' ')
                        });
                    }

                    if (newSpeakerSegmentsFromBatch.length > 0) {
                        setTranscript(prevTranscript => {
                            let updatedTranscript = [...prevTranscript];
                            newSpeakerSegmentsFromBatch.forEach(incomingSegment => {
                                let lastTranscriptSegment = updatedTranscript.length > 0 ? updatedTranscript[updatedTranscript.length - 1] : null;

                                if (lastTranscriptSegment && lastTranscriptSegment.speaker === incomingSegment.speaker) {
                                    // Merge with the last segment
                                    const existingWordKeys = new Set(lastTranscriptSegment.words.map(w => `${w.start}-${w.text}`));
                                    const wordsToAdd = incomingSegment.words.filter(w => !existingWordKeys.has(`${w.start}-${w.text}`));

                                    if (wordsToAdd.length > 0) {
                                        lastTranscriptSegment.words.push(...wordsToAdd);
                                        lastTranscriptSegment.words.sort((a, b) => a.start - b.start); // Keep words sorted
                                        lastTranscriptSegment.text = lastTranscriptSegment.words.map(w => w.text).join(' ');
                                        if (lastTranscriptSegment.words.length > 0) { // Recalculate bounds
                                            lastTranscriptSegment.startTime = lastTranscriptSegment.words[0].start;
                                            lastTranscriptSegment.endTime = lastTranscriptSegment.words[lastTranscriptSegment.words.length - 1].end;
                                        }
                                    }
                                } else {
                                    // Add as a new segment
                                    updatedTranscript.push(incomingSegment);
                                }
                            });
                            return updatedTranscript;
                        });
                    }
                } else if (receivedAlternative.transcript && receivedAlternative.transcript.trim()) {
                    // Fallback for simple transcripts (no word-level timestamps)
                    setTranscript(prev => {
                        const newText = receivedAlternative.transcript.trim();
                        const lastSegment = prev.length > 0 ? prev[prev.length - 1] : null;

                        if (lastSegment && lastSegment.speaker === 'unknown' && (!lastSegment.words || lastSegment.words.length === 0)) {
                            return [
                                ...prev.slice(0, -1),
                                { ...lastSegment, text: (lastSegment.text + ' ' + newText).trim() }
                            ];
                        } else {
                            return [
                                ...prev,
                                {
                                    speaker: 'unknown',
                                    text: newText,
                                    words: [], // Explicitly empty
                                    startTime: null, // Explicitly null
                                    endTime: null   // Explicitly null
                                }
                            ];
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-around', padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', width: '100%' }}>
                <div style={{ flex: '0.3', marginRight: '20px' }}>
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
                </div>
                <div style={{ flex: '0.7', height: '100%', overflowY: 'auto' }}>
                    <TranscriptDisplay
                        transcript={transcript}
                        onClearTranscript={() => setTranscript([])}
                    />
                </div>
            </div>
            <DebugPanel
                socketStateString={memoizedSocketStateString()}
                isSocketHookConnecting={isConnectingToSocket}
                isAppUiConnecting={isConnectingToSocket}
                isRecording={isRecording}
                audioChunksCount={chunksRef.current.length}
                transcript={transcript}
            />
        </div>
    );
}

export default ConversationRecorder;
