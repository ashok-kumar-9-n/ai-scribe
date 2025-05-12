import React, { useState } from 'react';
import { BASE_URL } from '../config';

function ControlPanel({
    isRecording,
    isConnecting,
    onStartRecording,
    onStopRecording,
    audioUrl,
    onDownloadAudio,
}) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState('');

    const generateSoapNotes = async () => {
        const storedDoctorId = localStorage.getItem('doctorId');
        const storedPatientId = localStorage.getItem('patientId');

        if (!storedDoctorId) {
            setMessage('Doctor ID is not set. Please use the ID manager (👤) on the bottom right.');
            return;
        }
        if (!storedPatientId) {
            setMessage('Patient ID is not set. Please use the ID manager (👤) on the bottom right.');
            return;
        }

        if (!audioUrl) {
            setMessage("No audio recording to generate SOAP notes from.");
            return;
        }

        setIsGenerating(true);
        setMessage('Generating SOAP Notes...');
        try {
            const apiUrl = `${BASE_URL}/api/record/generate-soap`;

            // Fetch the audio file
            const response = await fetch(audioUrl);
            const blob = await response.blob();
            const file = new File([blob], "recording.webm", { type: "audio/webm" });

            const formData = new FormData();
            formData.append('file', file);
            formData.append('patient_id', storedPatientId);
            formData.append('doctor_id', storedDoctorId);

            const requestOptions = {
                method: 'POST',
                body: formData,
            };

            const apiResponse = await fetch(apiUrl, requestOptions);

            if (!apiResponse.ok) {
                let errorData;
                try {
                    errorData = await apiResponse.json();
                } catch (e) {
                    errorData = { message: await apiResponse.text() || 'Failed to parse error response and no text body' };
                }
                throw new Error(`API Error: ${apiResponse.status} ${apiResponse.statusText} - ${errorData.detail || errorData.message || 'Unknown error'}`);
            }

            await apiResponse.json();
            setMessage("SOAP Notes generated successfully!");

        } catch (err) {
            console.error('Error generating SOAP notes:', err);
            setMessage(`Failed to generate SOAP notes:\n\n${err.message || 'Check console for details.'}`);
        } finally {
            setIsGenerating(false);
        }
    }

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
                <div className="audio-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <audio src={audioUrl} controls className="audio-player" />
                    <button onClick={onDownloadAudio} className="download-btn">Download Recording</button>
                    <button
                        onClick={generateSoapNotes}
                        className="generate-soap-notes-btn"
                        disabled={isGenerating}
                    >
                        {isGenerating ? 'Generating...' : 'Generate SOAP Notes'}
                    </button>
                </div>
            )}
            {message && <div className="message">{message}</div>}
        </div>
    );
}

export default ControlPanel;
