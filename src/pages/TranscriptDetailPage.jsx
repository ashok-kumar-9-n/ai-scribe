import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';

function TranscriptDetailPage() {
    const { recordId } = useParams();
    const [transcriptDetails, setTranscriptDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const effectRan = useRef(false);
    const mediaRef = useRef(null);
    const [expandedSoapQuotes, setExpandedSoapQuotes] = useState({}); // State for SOAP quote toggles

    useEffect(() => {
        if (effectRan.current === true && process.env.NODE_ENV === 'development') {
            return;
        }

        const fetchTranscriptById = async () => {
            setIsLoading(true);
            setError('');
            setTranscriptDetails(null);
            setExpandedSoapQuotes({}); // Reset on new fetch

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

        if (process.env.NODE_ENV === 'development') {
            effectRan.current = true;
        }
    }, [recordId]);

    const handleMediaSeek = (startTime) => {
        if (mediaRef.current && typeof startTime === 'number') {
            mediaRef.current.currentTime = startTime;
            mediaRef.current.play().catch(e => console.error("Error playing media:", e));
        }
    };

    const toggleSoapQuote = (id) => {
        setExpandedSoapQuotes(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const renderTranscriptChunk = (chunk, index) => {
        const baseStyle = {
            marginBottom: '10px', padding: '8px', border: '1px solid #eee',
            borderRadius: '4px', backgroundColor: '#fff', transition: 'background-color 0.2s ease',
        };
        const clickableStyle = { ...baseStyle, cursor: 'pointer' };

        return (
            <div
                key={`transcript-${index}`}
                onClick={() => typeof chunk.start_timestamp === 'number' && handleMediaSeek(chunk.start_timestamp)}
                style={typeof chunk.start_timestamp === 'number' ? clickableStyle : baseStyle}
                onMouseOver={typeof chunk.start_timestamp === 'number' ? (e) => e.currentTarget.style.backgroundColor = '#f0f0f0' : undefined}
                onMouseOut={typeof chunk.start_timestamp === 'number' ? (e) => e.currentTarget.style.backgroundColor = '#fff' : undefined}
            >
                <p style={{ margin: 0, fontWeight: 'bold', color: '#555' }}>
                    Speaker {chunk.speaker !== undefined ? chunk.speaker : 'N/A'}
                    {typeof chunk.start_timestamp === 'number' && typeof chunk.end_timestamp === 'number' && (
                        <span style={{ fontSize: '0.8em', color: '#777', marginLeft: '10px' }}>
                            ({chunk.start_timestamp.toFixed(2)}s - {chunk.end_timestamp.toFixed(2)}s)
                        </span>
                    )}
                </p>
                <p style={{ margin: '5px 0 0', color: '#333' }}>{chunk.text}</p>
            </div>
        );
    };

    const renderSoapNoteItem = (item, sectionKey, itemIndex) => {
        const itemId = `soap-${sectionKey}-${itemIndex}`;
        const isExpanded = expandedSoapQuotes[itemId];
        const hasTimestamp = typeof item.timestamp === 'number';

        const baseStyle = {
            marginBottom: '10px', padding: '10px', border: '1px solid #e0e0e0',
            borderRadius: '6px', backgroundColor: '#fdfdfd',
        };
        const clickableStyle = { ...baseStyle, cursor: 'pointer', transition: 'background-color 0.2s ease, border-color 0.2s ease' };


        return (
            <div
                key={itemId}
                style={hasTimestamp ? clickableStyle : baseStyle}
                onClick={hasTimestamp ? () => handleMediaSeek(item.timestamp) : undefined}
                onMouseOver={hasTimestamp ? (e) => { e.currentTarget.style.backgroundColor = '#f5f5f5'; e.currentTarget.style.borderColor = '#ccc'; } : undefined}
                onMouseOut={hasTimestamp ? (e) => { e.currentTarget.style.backgroundColor = '#fdfdfd'; e.currentTarget.style.borderColor = '#e0e0e0'; } : undefined}
            >
                {item.label && <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#444', fontSize: '1.05em' }}>{item.label}</p>}
                {item.explanation && <p style={{ margin: '0 0 8px 0', color: '#555' }}>{item.explanation}</p>}
                {item.quote && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleSoapQuote(itemId); }}
                            style={{
                                background: '#6c757d', color: 'white', border: 'none',
                                padding: '5px 10px', borderRadius: '4px', cursor: 'pointer',
                                fontSize: '0.85em', marginBottom: isExpanded ? '5px' : '0'
                            }}
                        >
                            {isExpanded ? 'Hide verbatim' : 'Show verbatim'}
                        </button>
                        {isExpanded && <p style={{ margin: '8px 0 0', fontStyle: 'italic', color: '#666', backgroundColor: '#f0f0f0', padding: '8px', borderRadius: '4px' }}>"{item.quote}"</p>}
                    </>
                )}
                {hasTimestamp && (
                    <p style={{ margin: '5px 0 0', fontSize: '0.8em', color: '#888' }}>
                        (Timestamp: {item.timestamp.toFixed(2)}s)
                    </p>
                )}
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
                        {transcriptDetails.transcript.map((chunk, index) => renderTranscriptChunk(chunk, index))}
                    </div>
                </div>
            )}

            {transcriptDetails.soap_notes && (
                <div className="section">
                    <h3>SOAP Notes</h3>
                    <div className="soap-notes-container" style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '8px', background: '#f9f9f9' }}>
                        {typeof transcriptDetails.soap_notes === 'object' && transcriptDetails.soap_notes !== null ? (
                            Object.entries(transcriptDetails.soap_notes).map(([key, value], sectionIndex) => (
                                <div key={`soap-section-${key}-${sectionIndex}`} style={{ marginBottom: '20px' }}>
                                    <h4 style={{ textTransform: 'capitalize', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '12px', color: '#333' }}>
                                        {key.replace(/_/g, ' ')}
                                    </h4>
                                    {Array.isArray(value) ? (
                                        value.map((item, itemIndex) => {
                                            // Check if item has the expected structure for detailed rendering
                                            if (item && typeof item.label === 'string' && typeof item.explanation === 'string' && typeof item.quote === 'string' && typeof item.timestamp === 'number') {
                                                return renderSoapNoteItem(item, key, itemIndex);
                                            }
                                            // Fallback for other structures within SOAP arrays
                                            return (
                                                <pre key={`soap-fallback-${key}-${itemIndex}`} className="code-block" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', padding: '8px', background: '#fff', border: '1px solid #eee', borderRadius: '4px' }}>
                                                    {JSON.stringify(item, null, 2)}
                                                </pre>
                                            );
                                        })
                                    ) : typeof value === 'string' ? ( // If the section value itself is a string
                                        <p>{value}</p>
                                    ) : ( // Fallback for non-array, non-string section values
                                        <pre className="code-block" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                            {JSON.stringify(value, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            ))
                        ) : ( // Fallback if soap_notes is not a structured object
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