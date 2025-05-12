import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../config';

function HomePreviousTranscripts() {
    const [transcripts, setTranscripts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentDoctorId, setCurrentDoctorId] = useState(null);
    const initializedForCurrentDoctor = useRef(null); // Track initialization per doctor ID

    useEffect(() => {
        const docIdFromStorage = localStorage.getItem('doctorId');

        if (docIdFromStorage !== currentDoctorId) {
            setCurrentDoctorId(docIdFromStorage);
            initializedForCurrentDoctor.current = null; // Reset initialization for the new doctor
            setTranscripts([]); // Clear old transcripts
            setError(''); // Clear old errors
            // Effect will re-run due to currentDoctorId state change
            // No explicit return needed here if setIsLoading(true) is desired on ID change
        }

        // Only fetch if currentDoctorId is set and not already initialized for this ID
        if (currentDoctorId && initializedForCurrentDoctor.current !== currentDoctorId) {
            initializedForCurrentDoctor.current = currentDoctorId; // Mark as initialized for this doctor ID

            const fetchTranscripts = async () => {
                setIsLoading(true);
                setError('');
                // setTranscripts([]); // Already cleared if doctorId changed

                const apiUrl = `${BASE_URL}/api/record/fetch-records`;
                console.log(`HomePreviousTranscripts: Fetching records for doctor_id: ${currentDoctorId}`);

                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ doctor_id: parseInt(currentDoctorId, 10) }), // Convert to integer
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
                    console.error('Error fetching transcripts in HomePreviousTranscripts:', err);
                    setError(err.message || 'Failed to fetch transcripts.');
                    setTranscripts([]); // Ensure transcripts are cleared on error
                } finally {
                    setIsLoading(false);
                }
            };

            fetchTranscripts();
        } else if (!currentDoctorId && initializedForCurrentDoctor.current !== 'no_doctor_id_prompted') {
            setError('Doctor ID not set. Please set it using the FAB icon (👤) on the bottom right to see transcripts.');
            setIsLoading(false);
            setTranscripts([]); // Clear any existing transcripts
            initializedForCurrentDoctor.current = 'no_doctor_id_prompted';
        }
    }, [currentDoctorId]); // Effect depends on currentDoctorId

    // Effect to listen for localStorage changes (e.g., from FAB)
    useEffect(() => {
        const handleStorageChange = () => {
            const newDoctorId = localStorage.getItem('doctorId');
            if (newDoctorId !== currentDoctorId) {
                setCurrentDoctorId(newDoctorId); // This will trigger the main data fetching useEffect
            }
        };

        window.addEventListener('storage', handleStorageChange);
        // Also check on mount in case storage changed while component was unmounted
        handleStorageChange();

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [currentDoctorId]); // Re-run if currentDoctorId changes to ensure listener is up-to-date

    if (isLoading) return <p>Loading transcripts...</p>;
    if (error) return <p className="error-message" style={{ padding: '20px' }}>Error: {error}</p>;

    if (!currentDoctorId && !isLoading) {
        return <p style={{ padding: '20px' }}>Please set a Doctor ID using the FAB (👤) to view transcripts.</p>;
    }

    if (transcripts.length === 0 && !isLoading && !error && currentDoctorId) {
        return <p style={{ padding: '20px' }}>No transcripts found for Doctor ID: {currentDoctorId}.</p>;
    }

    if (transcripts.length === 0 && !isLoading && !error && !currentDoctorId) {
        // This case should be covered by the !currentDoctorId check above, but as a fallback:
        return <p style={{ padding: '20px' }}>Please set a Doctor ID.</p>;
    }


    return (
        <div className="transcripts-list" style={{ padding: '20px' }}>
            {transcripts.map((record) => (
                <Link to={`/record-id/${record._id}`} key={record._id} className="transcript-item-clickable card" style={{ marginBottom: '10px', display: 'block' }}>
                    <div className="transcript-item-content">
                        <p><strong>Record ID:</strong> {record._id}</p>
                        <p><strong>Patient ID:</strong> {record.patient_id}</p>
                        <p><strong>Doctor ID:</strong> {record.doctor_id}</p>
                        {record.s3_url && (
                            <div style={{ marginTop: '10px' }}>
                                <audio
                                    controls
                                    src={record.s3_url}
                                    style={{ width: '100%' }}
                                    onClick={(e) => e.stopPropagation()} // Prevent card click when interacting with player
                                >
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        )}
                    </div>
                </Link>
            ))}
        </div>
    );
}

export default HomePreviousTranscripts;