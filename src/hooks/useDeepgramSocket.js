import { useRef, useState, useCallback } from 'react';

const DEEPGRAM_URL = 'wss://api.deepgram.com/v1/listen?diarize=true&model=nova-3';

export const useDeepgramSocket = (
    onOpen,
    onMessage,
    onClose,
    onError,
    onConnectionChange // Callback for isConnecting state
) => {
    const socketRef = useRef(null);
    const [isSocketConnecting, setIsSocketConnecting] = useState(false);
    const [socketError, setSocketError] = useState(null);

    const connect = useCallback((apiKey) => {
        if (!apiKey) {
            const error = new Error("Deepgram API key is missing.");
            setSocketError(error);
            if (onError) onError(error);
            onConnectionChange(false);
            return;
        }

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            console.log('Socket already open.');
            if (onOpen) onOpen();
            onConnectionChange(false);
            return;
        }

        console.log('Attempting to connect to Deepgram...');
        setIsSocketConnecting(true);
        setSocketError(null);
        if (onConnectionChange) onConnectionChange(true);

        const socket = new WebSocket(DEEPGRAM_URL, ['token', apiKey]);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log('Deepgram connection opened');
            setIsSocketConnecting(false);
            if (onConnectionChange) onConnectionChange(false);
            if (onOpen) onOpen();
        };

        socket.onmessage = (message) => {
            if (onMessage) onMessage(message);
        };

        socket.onclose = (event) => {
            console.log('Deepgram connection closed:', event.code, event.reason);
            setIsSocketConnecting(false);
            if (onConnectionChange) onConnectionChange(false);
            if (socketRef.current) { // Check if it was intentionally closed
                if (onClose) onClose(event);
            }
            socketRef.current = null; // Clear the ref after closing
        };

        socket.onerror = (errorEvent) => {
            console.error('Deepgram WebSocket error:', errorEvent);
            const err = new Error('WebSocket error with Deepgram. Check console.');
            setSocketError(err);
            setIsSocketConnecting(false);
            if (onConnectionChange) onConnectionChange(false);
            if (onError) onError(err);
            socketRef.current = null; // Clear the ref on error
        };
    }, [onOpen, onMessage, onClose, onError, onConnectionChange]);

    const disconnect = useCallback((code = 1000, reason = "User initiated disconnect") => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            console.log('Closing Deepgram connection');
            socketRef.current.close(code, reason);
        }
        // The onclose handler will set socketRef.current to null
    }, []);

    const send = useCallback((data) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(data);
        } else {
            console.warn('Socket not open. Cannot send data.');
        }
    }, []);

    const getSocketState = () => {
        return socketRef.current ? socketRef.current.readyState : WebSocket.CLOSED + 1; // Return a distinct value for "not connected"
    }

    return {
        connectDeepgram: connect,
        disconnectDeepgram: disconnect,
        sendAudioData: send,
        isSocketConnecting,
        socketError,
        getSocketState, // Expose readyState or a similar indicator
        socketRef, // Exposing for direct access if needed, e.g., for readyState in App.jsx debug panel
    };
};