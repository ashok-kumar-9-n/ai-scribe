import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { Link } from 'react-router-dom'; // For a "Back to Home" link
import { BASE_URL } from '../config';

function PreviousTranscriptsPage() {
    const [transcripts, setTranscripts] = useState([]);
    const [selectedTranscript, setSelectedTranscript] = useState(null); // To store the selected transcript
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentDoctorId, setCurrentDoctorId] = useState(null); // Initialize as null
    const initializedForCurrentDoctor = useRef(null); // Track initialization per doctor ID

    const handleSelectTranscript = (record) => {
        setSelectedTranscript(record);
    };

    const handleCloseDetails = () => {
        setSelectedTranscript(null);
    };

    useEffect(() => {
        const docIdFromStorage = localStorage.getItem('doctorId');

        if (docIdFromStorage !== currentDoctorId) {
            setCurrentDoctorId(docIdFromStorage);
            initializedForCurrentDoctor.current = null; // Reset initialization for the new doctor
            setTranscripts([]); // Clear old transcripts
            setError(''); // Clear old errors
            return; // Effect will re-run due to currentDoctorId state change
        }

        if (currentDoctorId && initializedForCurrentDoctor.current !== currentDoctorId && !selectedTranscript) {
            initializedForCurrentDoctor.current = currentDoctorId; // Mark as initialized for this doctor ID

            const fetchTranscripts = async () => {
                setIsLoading(true);
                setError('');
                // setTranscripts([]); // Already cleared if doctorId changed

                const apiUrl = `${BASE_URL}/api/record/fetch-records`;
                console.log(`Fetching records for doctor_id: ${currentDoctorId}`);

                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ doctor_id: currentDoctorId }),
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
                    setTranscripts([]); // Ensure transcripts are cleared on error
                } finally {
                    setIsLoading(false);
                }
            };

            fetchTranscripts();
        } else if (!currentDoctorId && initializedForCurrentDoctor.current !== 'no_doctor_id_prompted') {
            setError('Doctor ID not set. Please set it using the FAB icon (👤) on the bottom right.');
            setIsLoading(false);
            setTranscripts([]); // Clear any existing transcripts
            initializedForCurrentDoctor.current = 'no_doctor_id_prompted';
        }
    }, [currentDoctorId, selectedTranscript]);

    return (
        <div className="previous-transcripts-page card-content">
            <h2>Previous Records {currentDoctorId ? `for Doctor ID: ${currentDoctorId}` : ''}</h2>
            <Link to="/" className="back-link">← Back to Home</Link>

            {/* List of Transcripts */}
            {isLoading && <p>Loading transcripts...</p>}
            {error && <p className="error-message">Error: {error}</p>}

            {!isLoading && !error && transcripts.length === 0 && currentDoctorId && (
                <p>No transcripts found for Doctor ID: {currentDoctorId}.</p>
            )}
            {!isLoading && !error && transcripts.length === 0 && !currentDoctorId && !error && (
                <p>Please set a Doctor ID using the FAB (👤) to fetch transcripts.</p>
            )}


            {!isLoading && !error && transcripts.length > 0 && (
                <div className="transcripts-list">
                    {transcripts.map((record) => (
                        <div key={record._id} className="transcript-item-clickable card" onClick={() => handleSelectTranscript(record)}>
                            <div className="transcript-item-content">
                                <h3>Record ID: {record._id}</h3>
                                <p><strong>Doctor ID:</strong> {record.doctor_id}</p>
                                <p><strong>Patient ID:</strong> {record.patient_id}</p>
                                {record.s3_url && (
                                    <p>
                                        <strong>Media:</strong>{' '}
                                        <a href={record.s3_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                            View/Listen
                                        </a>
                                    </p>
                                )}
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