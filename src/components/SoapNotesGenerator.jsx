import React, { useState } from 'react';
import { BASE_URL } from '../config';

function SoapNotesGenerator() {
    const [mediaLink, setMediaLink] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [soapNotesResult, setSoapNotesResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setMediaLink(''); // Clear media link if a file is selected
        setError('');
    };

    const handleLinkChange = (event) => {
        setMediaLink(event.target.value);
        setSelectedFile(null); // Clear file if a link is entered
        setError('');
    };

    const handleSubmit = async () => {
        const storedDoctorId = localStorage.getItem('doctorId');
        const storedPatientId = localStorage.getItem('patientId');

        if (!storedDoctorId) {
            setError('Doctor ID is not set. Please use the ID manager (👤) on the bottom right.');
            setIsLoading(false);
            return;
        }
        if (!storedPatientId) {
            setError('Patient ID is not set. Please use the ID manager (👤) on the bottom right.');
            setIsLoading(false);
            return;
        }
        if (!mediaLink.trim() && !selectedFile) {
            setError('Please provide a media link or upload a file.');
            return;
        }
        setIsLoading(true);
        setError('');
        setSoapNotesResult('');

        const apiUrl = `${BASE_URL}/api/record/generate-soap`;

        let requestOptions;

        if (selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);
            // Ensure IDs are sent as integers if the backend expects them
            // For FormData, values are typically converted to strings, but if your backend
            // specifically parses them as integers from string FormData, this is fine.
            // If it expects actual number types in a JSON payload, that's different.
            // For now, assuming backend handles string-to-int for FormData.
            // If strict integer type is needed even for FormData, this might require backend adjustment
            // or a different way of sending data if the API is rigid.
            formData.append('patient_id', storedPatientId); // FormData usually sends as string
            formData.append('doctor_id', storedDoctorId);   // FormData usually sends as string

            requestOptions = {
                method: 'POST',
                body: formData,
            };
            console.log('Preparing to send file:', selectedFile.name, 'for Doctor:', storedDoctorId, 'Patient:', storedPatientId);
        } else if (mediaLink.trim()) {
            requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    media_url: mediaLink.trim(),
                    patient_id: parseInt(storedPatientId, 10), // Convert to integer
                    doctor_id: parseInt(storedDoctorId, 10),   // Convert to integer
                }),
            };
            console.log('Preparing to send media link:', mediaLink.trim(), 'for Doctor:', parseInt(storedDoctorId, 10), 'Patient:', parseInt(storedPatientId, 10));
        } else {
            // This case should ideally be caught by the initial check,
            // but as a fallback:
            setError('No media link or file provided.');
            setIsLoading(false);
            return;
        }

        try {
            console.log('Sending request to:', apiUrl, 'with options:', requestOptions);
            const response = await fetch(apiUrl, requestOptions);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { message: await response.text() || 'Failed to parse error response and no text body' };
                }
                throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData.detail || errorData.message || 'Unknown error'}`);
            }

            const result = await response.json();
            setSoapNotesResult(JSON.stringify(result, null, 2));

        } catch (err) {
            console.error('Error generating SOAP notes:', err);
            setError(err.message || 'Failed to generate SOAP notes. Check console for details.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="soap-notes-generator card-content">
            <h2>Generate SOAP Notes</h2>
            <p>Provide a media link or upload an audio/video file to generate SOAP notes.</p>

            <div className="input-group">
                <label htmlFor="media-link">Media Link:</label>
                <input
                    type="text"
                    id="media-link"
                    value={mediaLink}
                    onChange={handleLinkChange}
                    placeholder="https://example.com/media.mp3"
                    disabled={isLoading || selectedFile}
                />
            </div>

            <div className="or-divider">
                <span>OR</span>
            </div>

            <div className="input-group">
                <label htmlFor="media-file">Upload Media File:</label>
                <input
                    type="file"
                    id="media-file"
                    accept="audio/*,video/*"
                    onChange={handleFileChange}
                    disabled={isLoading || !!mediaLink.trim()}
                />
                {selectedFile && <p className="file-info">Selected file: {selectedFile.name}</p>}
            </div>

            <button
                onClick={handleSubmit}
                disabled={isLoading || (!mediaLink.trim() && !selectedFile)}
                className="action-button"
            >
                {isLoading ? 'Generating...' : 'Generate SOAP Notes'}
            </button>

            {error && <p className="error-message">{error}</p>}

            {soapNotesResult && (
                <div className="results-output">
                    <h3>SOAP Notes Result:</h3>
                    <pre>{soapNotesResult}</pre>
                </div>
            )}
        </div>
    );
}

export default SoapNotesGenerator;