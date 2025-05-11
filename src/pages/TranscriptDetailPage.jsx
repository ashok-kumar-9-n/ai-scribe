import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';

function TranscriptDetailPage() {
    const { recordId } = useParams();
    const [transcriptDetails, setTranscriptDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const effectRan = useRef(false);
    const mediaRef = useRef(null); // Ref for the audio/video player

    useEffect(() => {
        // Guard for StrictMode in development
        if (effectRan.current === true && process.env.NODE_ENV === 'development') {
            return;
        }

        const fetchTranscriptById = async () => {
            setIsLoading(true);
            setError('');
            setTranscriptDetails(null);

            const doctorId = 34; // TODO: Replace with dynamic doctor_id
            const apiUrl = 'http://13.49.223.112:8000/api/record/fetch-record';

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ doctor_id: doctorId }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: response.statusText }));
                    throw new Error(`API Error: ${response.status} - ${errorData.detail || errorData.message}`);
                }

                const result = await response.json();
                if (result.data && Array.isArray(result.data)) {
                    const foundTranscript = result.data.find(t => t._id === recordId);
                    if (foundTranscript) {
                        setTranscriptDetails(foundTranscript);
                    } else {
                        setError(`Transcript with ID ${recordId} not found for Doctor ID ${doctorId}.`);
                    }
                } else {
                    console.warn('API response did not contain a data array:', result);
                    setError('Received unexpected data format from server.');
                }
            } catch (err) {
                console.error('Error fetching transcript details:', err);
                setError(err.message || 'Failed to fetch transcript details.');
            } finally {
                setIsLoading(false);
            }
        };

        if (recordId) {
            fetchTranscriptById();
        }

        // Mark effect as run for StrictMode
        if (process.env.NODE_ENV === 'development') {
            effectRan.current = true;
        }
    }, [recordId]);

    const handleMediaSeek = (startTime) => {
        if (mediaRef.current) {
            mediaRef.current.currentTime = startTime;
            mediaRef.current.play().catch(e => console.error("Error playing media:", e));
        }
    };

    const renderClickableTextEntry = (entry, index, type) => {
        const hasTimestamp = typeof entry.start_timestamp === 'number';
        const style = {
            marginBottom: '10px',
            padding: '8px',
            border: '1px solid #eee',
            borderRadius: '4px',
            backgroundColor: '#fff',
            transition: 'background-color 0.2s ease',
            cursor: hasTimestamp ? 'pointer' : 'default',
        };

        return (
            <div
                key={`${type}-${index}`}
                onClick={hasTimestamp ? () => handleMediaSeek(entry.start_timestamp) : undefined}
                style={style}
                onMouseOver={hasTimestamp ? (e) => e.currentTarget.style.backgroundColor = '#f0f0f0' : undefined}
                onMouseOut={hasTimestamp ? (e) => e.currentTarget.style.backgroundColor = '#fff' : undefined}
            >
                {entry.speaker !== undefined && (
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#555' }}>
                        Speaker {entry.speaker}
                        {hasTimestamp && entry.end_timestamp !== undefined && (
                            <span style={{ fontSize: '0.8em', color: '#777', marginLeft: '10px' }}>
                                ({entry.start_timestamp.toFixed(2)}s - {entry.end_timestamp.toFixed(2)}s)
                            </span>
                        )}
                    </p>
                )}
                <p style={{ margin: '5px 0 0', color: '#333' }}>{entry.text || JSON.stringify(entry)}</p>
            </div>
        );
    };


    if (isLoading) {
        return <div className="card-content"><p>Loading transcript details...</p></div>;
    }

    if (error) {
        return <div className="card-content"><p className="error-message">Error: {error}</p><Link to="/" className="back-link">← Back to Home</Link></div>;
    }

    if (!transcriptDetails) {
        return <div className="card-content"><p>Transcript not found.</p><Link to="/" className="back-link">← Back to Home</Link></div>;
    }

    const isVideo = transcriptDetails.s3_url && transcriptDetails.s3_url.match(/\.(mp4|webm|ogg)$/i);
    const MediaElement = isVideo ? 'video' : 'audio';

    return (
        <div className="transcript-detail-page card-content">
            <h2>Transcript Details</h2>
            <Link to="/" className="back-link" style={{ marginBottom: '20px', display: 'inline-block' }}>← Back to Home</Link>

            {transcriptDetails.s3_url && (
                <div className="media-player-section section">
                    <h3>Media Playback</h3>
                    <MediaElement ref={mediaRef} src={transcriptDetails.s3_url} controls style={{ width: '100%', borderRadius: '8px' }}>
                        Your browser does not support the <code>{MediaElement}</code> tag.
                    </MediaElement>
                </div>
            )}

            <div className="details-grid section">
                <div className="detail-item"><strong>Record ID:</strong> <p>{transcriptDetails._id}</p></div>
                <div className="detail-item"><strong>Patient ID:</strong> <p>{transcriptDetails.patient_id}</p></div>
                <div className="detail-item"><strong>Doctor ID:</strong> <p>{transcriptDetails.doctor_id}</p></div>
            </div>

            {transcriptDetails.transcript && Array.isArray(transcriptDetails.transcript) && (
                <div className="section">
                    <h3>Full Transcript</h3>
                    <div className="transcript-chunks-container" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '8px', background: '#f9f9f9' }}>
                        {transcriptDetails.transcript.map((chunk, index) => renderClickableTextEntry(chunk, index, 'transcript'))}
                    </div>
                </div>
            )}

            {transcriptDetails.soap_notes && (
                <div className="section">
                    <h3>SOAP Notes</h3>
                    <div className="soap-notes-container" style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '8px', background: '#f9f9f9' }}>
                        {typeof transcriptDetails.soap_notes === 'object' && transcriptDetails.soap_notes !== null ? (
                            Object.entries(transcriptDetails.soap_notes).map(([key, value], sectionIndex) => (
                                <div key={`soap-${key}-${sectionIndex}`} style={{ marginBottom: '15px' }}>
                                    <h4 style={{ textTransform: 'capitalize', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px' }}>
                                        {key.replace(/_/g, ' ')}
                                    </h4>
                                    {Array.isArray(value) ? (
                                        value.map((item, itemIndex) => renderClickableTextEntry(item, itemIndex, `soap-${key}`))
                                    ) : typeof value === 'string' ? (
                                        <p>{value}</p>
                                    ) : (
                                        <pre className="code-block" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                            {JSON.stringify(value, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            ))
                        ) : typeof transcriptDetails.soap_notes === 'string' ? (
                            <pre className="code-block" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {transcriptDetails.soap_notes}
                            </pre>
                        ) : (
                            <pre className="code-block" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {JSON.stringify(transcriptDetails.soap_notes, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TranscriptDetailPage;