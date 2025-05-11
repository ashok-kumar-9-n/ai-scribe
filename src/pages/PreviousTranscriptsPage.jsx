import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { Link } from 'react-router-dom'; // For a "Back to Home" link

function PreviousTranscriptsPage() {
    const [transcripts, setTranscripts] = useState([]);
    const [selectedTranscript, setSelectedTranscript] = useState(null); // To store the selected transcript
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const initialized = useRef(false); // Ref to track if initialization has occurred

    const handleSelectTranscript = (record) => {
        setSelectedTranscript(record);
    };

    const handleCloseDetails = () => {
        setSelectedTranscript(null);
    };

    useEffect(() => {
        // Only run the fetch logic if not already initialized and no transcript is selected
        if (!initialized.current && !selectedTranscript) {
            initialized.current = true; // Mark as initialized

            const fetchTranscripts = async () => {
                setIsLoading(true);
                setError('');
                setTranscripts([]);

                // TODO: Replace with dynamic doctor_id from context or props
                const doctorId = 34; // Keeping this as 34 from your current file
                const apiUrl = 'http://13.49.223.112:8000/api/record/fetch-record'; // Keeping this from your current file

                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ doctor_id: doctorId }),
                    });

                    if (!response.ok) {
                        let errorData;
                        try {
                            errorData = await response.json();
                        } catch (e) {
                            errorData = { message: await response.text() || 'Failed to parse error response' };
                        }
                        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData.detail || errorData.message || 'Unknown error'}`);
                    }

                    const result = await response.json();
                    if (result.data && Array.isArray(result.data)) {
                        setTranscripts(result.data);
                    } else {
                        console.warn('API response did not contain a data array:', result);
                        setTranscripts([]);
                        setError('Received unexpected data format from server.');
                    }

                } catch (err) {
                    console.error('Error fetching transcripts:', err);
                    setError(err.message || 'Failed to fetch transcripts.');
                } finally {
                    setIsLoading(false);
                }
            };

            fetchTranscripts();
        }
    }, [selectedTranscript]); // Re-run if selectedTranscript changes (to re-fetch if needed, or adjust logic)

    return (
        <div className="previous-transcripts-page card-content">
            <h2>Previous Transcripts</h2>
            <Link to="/" className="back-link">← Back to Home</Link>

            {/* List of Transcripts */}
            {isLoading && <p>Loading transcripts...</p>}
            {error && <p className="error-message">Error: {error}</p>}

            {!isLoading && !error && transcripts.length === 0 && (
                <p>No transcripts found for Doctor ID: 34.</p>
            )}

            {!isLoading && !error && transcripts.length > 0 && (
                <div className="transcripts-list">
                    {transcripts.map((record) => (
                        <div key={record._id} className="transcript-item-clickable card" onClick={() => handleSelectTranscript(record)}>
                            <div className="transcript-item-content">
                                <h3>Record ID: {record._id}</h3>
                                <p><strong>Patient ID:</strong> {record.patient_id}</p>
                                {/* <p><strong>Date:</strong> {new Date(record.createdAt || record.timestamp || Date.now()).toLocaleDateString()}</p> */}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Selected Transcript Details (conditionally rendered) */}
            {selectedTranscript && (
                <div className="transcript-detail-view card-content" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <h2>Transcript Details</h2>
                    <button onClick={handleCloseDetails} className="back-link">← Close Details</button>

                    <div className="details-grid">
                        <div className="detail-item">
                            <strong>Record ID:</strong>
                            <p>{selectedTranscript._id}</p>
                        </div>
                        <div className="detail-item">
                            <strong>Patient ID:</strong>
                            <p>{selectedTranscript.patient_id}</p>
                        </div>
                        <div className="detail-item">
                            <strong>Doctor ID:</strong>
                            <p>{selectedTranscript.doctor_id}</p>
                        </div>
                        {selectedTranscript.s3_url && (
                            <div className="detail-item full-width">
                                <strong>Media URL:</strong>
                                <p><a href={selectedTranscript.s3_url} target="_blank" rel="noopener noreferrer">{selectedTranscript.s3_url}</a></p>
                            </div>
                        )}
                    </div>

                    <div className="section">
                        <h3>SOAP Notes:</h3>
                        <pre className="code-block">{JSON.stringify(selectedTranscript.soap_notes, null, 2)}</pre>
                    </div>

                    <div className="section">
                        <h3>Full Transcript:</h3>
                        <pre className="code-block">{JSON.stringify(selectedTranscript.transcript, null, 2)}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PreviousTranscriptsPage;