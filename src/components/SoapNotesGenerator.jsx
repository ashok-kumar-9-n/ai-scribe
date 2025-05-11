import React, { useState } from 'react';

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
        if (!mediaLink.trim() && !selectedFile) {
            setError('Please provide a media link or upload a file.');
            return;
        }
        setIsLoading(true);
        setError('');
        setSoapNotesResult('');

        // TODO: Replace these with actual patient and doctor IDs
        const patientId = selectedFile ? "23" : "39";
        const doctorId = selectedFile ? "34" : "35";
        const apiUrl = 'http://13.49.223.112:8000/api/record/generate-soap';

        let requestOptions;

        if (selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('patient_id', patientId);
            formData.append('doctor_id', doctorId);

            requestOptions = {
                method: 'POST',
                body: formData,
                // 'Content-Type' header is automatically set by the browser for FormData
            };
            console.log('Preparing to send file:', selectedFile.name);
        } else if (mediaLink.trim()) {
            requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    media_url: mediaLink.trim(),
                    patient_id: parseInt(patientId), // Assuming API expects integer
                    doctor_id: parseInt(doctorId),   // Assuming API expects integer
                }),
            };
            console.log('Preparing to send media link:', mediaLink.trim());
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