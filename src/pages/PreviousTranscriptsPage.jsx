import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { Link } from 'react-router-dom'; // For a "Back to Home" link

function PreviousTranscriptsPage() {
    const [transcripts, setTranscripts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const initialized = useRef(false); // Ref to track if initialization has occurred

    useEffect(() => {
        // Only run the fetch logic if not already initialized for this component instance
        if (!initialized.current) {
            initialized.current = true; // Mark as initialized immediately

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
    }, []); // Empty dependency array means this effect runs on mount

    return (
        <div className="previous-transcripts-page card-content">
            <h2>Previous Transcripts</h2>
            <Link to="/" className="back-link">← Back to Home</Link>

            {isLoading && <p>Loading transcripts...</p>}
            {error && <p className="error-message">Error: {error}</p>}

            {!isLoading && !error && transcripts.length === 0 && (
                <p>No transcripts found for Doctor ID: 34.</p>
            )}

            {!isLoading && !error && transcripts.length > 0 && (
                <div className="transcripts-list">
                    {transcripts.map((record) => (
                        <div key={record._id} className="transcript-item card">
                            <h3>Record ID: {record._id}</h3>
                            <p><strong>Patient ID:</strong> {record.patient_id}</p>
                            <p><strong>Doctor ID:</strong> {record.doctor_id}</p>
                            {record.s3_url && <p><strong>Media URL:</strong> <a href={record.s3_url} target="_blank" rel="noopener noreferrer">{record.s3_url}</a></p>}

                            <h4>SOAP Notes:</h4>
                            <pre>{JSON.stringify(record.soap_notes, null, 2)}</pre>

                            <h4>Transcript:</h4>
                            <pre>{JSON.stringify(record.transcript, null, 2)}</pre>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default PreviousTranscriptsPage;