import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';

function TranscriptDetailPage() {
    const { recordId } = useParams();
    const [transcriptDetails, setTranscriptDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const effectRan = useRef(false);

    const mediaRef = useRef(null);
    const transcriptContainerRef = useRef(null);
    const chunkRefs = useRef([]);

    const [activeChunkIndex, setActiveChunkIndex] = useState(-1);
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const [userScrolled, setUserScrolled] = useState(false);
    const [expandedSoapQuotes, setExpandedSoapQuotes] = useState({});

    useEffect(() => {
        if (transcriptDetails && transcriptDetails.transcript) {
            chunkRefs.current = transcriptDetails.transcript.map(
                (_, i) => chunkRefs.current[i] || React.createRef()
            );
        }
    }, [transcriptDetails]);

    useEffect(() => {
        if (effectRan.current === true && process.env.NODE_ENV === 'development') return;
        const fetchTranscriptById = async () => {
            setIsLoading(true); setError(''); setTranscriptDetails(null); setExpandedSoapQuotes({}); setActiveChunkIndex(-1); setAutoScrollEnabled(true); setUserScrolled(false);
            const apiUrl = `http://localhost:8000/api/record/get-record-by-id`;
            try {
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ record_id: recordId }), });
                if (!response.ok) { const errorData = await response.json().catch(() => ({ message: response.statusText })); throw new Error(`API Error: ${response.status} - ${errorData.detail || errorData.message}`); }
                const result = await response.json();
                if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
                    setTranscriptDetails(result.data);
                } else if (result.data === null || (typeof result.data === 'object' && Object.keys(result.data).length === 0)) {
                    setError(`Transcript with ID ${recordId} not found.`);
                }
                else { console.warn('API response error or unexpected data format:', result); setError('Unexpected data format received from server.'); }
            } catch (err) { console.error('Fetch error:', err); setError(err.message || 'Failed to fetch details.'); }
            finally { setIsLoading(false); }
        };
        if (recordId) fetchTranscriptById();
        if (process.env.NODE_ENV === 'development') effectRan.current = true;
    }, [recordId]);

    useEffect(() => {
        const mediaElement = mediaRef.current;
        const transcript = transcriptDetails?.transcript;
        if (!mediaElement || !transcript || transcript.length === 0) return;
        const handleTimeUpdate = () => {
            const currentTime = mediaElement.currentTime;
            let newActiveIndex = -1;
            for (let i = 0; i < transcript.length; i++) {
                if (currentTime >= transcript[i].start_timestamp && currentTime < transcript[i].end_timestamp) { newActiveIndex = i; break; }
            }
            if (newActiveIndex !== activeChunkIndex) {
                setActiveChunkIndex(newActiveIndex);
                if (autoScrollEnabled && newActiveIndex !== -1 && chunkRefs.current[newActiveIndex]?.current) {
                    chunkRefs.current[newActiveIndex].current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        };
        mediaElement.addEventListener('timeupdate', handleTimeUpdate);
        return () => mediaElement.removeEventListener('timeupdate', handleTimeUpdate);
    }, [mediaRef.current, transcriptDetails, activeChunkIndex, autoScrollEnabled]);

    useEffect(() => {
        const container = transcriptContainerRef.current;
        if (!container) return;
        const handleManualScroll = () => {
            setUserScrolled(true);
            if (autoScrollEnabled) {
                setAutoScrollEnabled(false);
            }
        };
        container.addEventListener('scroll', handleManualScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', handleManualScroll);
        }
    }, [autoScrollEnabled]);

    const handleMediaSeek = (startTime) => {
        if (mediaRef.current && typeof startTime === 'number') {
            mediaRef.current.currentTime = startTime;
            mediaRef.current.play().catch(e => console.error("Media play error:", e));
            setAutoScrollEnabled(true);
            setUserScrolled(false);
        }
    };

    const toggleSoapQuote = (id) => setExpandedSoapQuotes(prev => ({ ...prev, [id]: !prev[id] }));

    const handleResumeScroll = () => {
        setAutoScrollEnabled(true);
        setUserScrolled(false);
        if (activeChunkIndex !== -1 && chunkRefs.current[activeChunkIndex]?.current) {
            chunkRefs.current[activeChunkIndex].current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const renderTranscriptChunk = (chunk, index) => (
        <div
            key={`transcript-${index}`}
            ref={chunkRefs.current[index]}
            className={`transcript-chunk interactive-item ${index === activeChunkIndex ? 'active-chunk' : ''}`}
            onClick={() => typeof chunk.start_timestamp === 'number' && handleMediaSeek(chunk.start_timestamp)}
        >
            <p className="speaker-text">
                Speaker {chunk.speaker !== undefined ? chunk.speaker : 'N/A'}
                {typeof chunk.start_timestamp === 'number' && typeof chunk.end_timestamp === 'number' && (
                    <span className="timestamp-text">({chunk.start_timestamp.toFixed(2)}s - {chunk.end_timestamp.toFixed(2)}s)</span>
                )}
            </p>
            <p className="main-text">{chunk.text}</p>
        </div>
    );

    const renderSoapNoteItem = (item, sectionKey, itemIndex) => {
        const itemId = `soap-${sectionKey}-${itemIndex}`;
        const isExpanded = expandedSoapQuotes[itemId];
        const hasTimestamp = typeof item.timestamp === 'number';
        return (
            <div
                key={itemId}
                className={`soap-note-item ${hasTimestamp ? 'interactive-item' : ''}`}
                onClick={hasTimestamp ? () => handleMediaSeek(item.timestamp) : undefined}
            >
                {item.label && <p className="soap-label">{item.label}</p>}
                {item.explanation && <p className="soap-explanation">{item.explanation}</p>}
                {item.quote && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleSoapQuote(itemId); }}
                            className="verbatim-toggle-button"
                        >
                            {isExpanded ? 'Hide verbatim' : 'Show verbatim'}
                        </button>
                        {isExpanded && <p className="verbatim-text">"{item.quote}"</p>}
                    </>
                )}
                {hasTimestamp && <p className="timestamp-text soap-timestamp">(Timestamp: {item.timestamp.toFixed(2)}s)</p>}
            </div>
        );
    };

    if (isLoading) return <div className="transcript-detail-page loading-state"><p>Loading transcript details...</p></div>;
    if (error) return <div className="transcript-detail-page error-state"><p className="error-message-box">Error: {error}</p><Link to="/" className="back-link-styled">← Back to Home</Link></div>;
    if (!transcriptDetails) return <div className="transcript-detail-page empty-state"><p>Transcript not found.</p><Link to="/" className="back-link-styled">← Back to Home</Link></div>;

    const MediaElement = transcriptDetails.s3_url && transcriptDetails.s3_url.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'audio';

    return (
        <div className="transcript-detail-page">
            <header className="page-header-container">
                <h2 className="page-main-title">Transcript Details</h2>
                <Link to="/" className="back-link-styled">← Back to Home</Link>
            </header>

            <div className="detail-page-main-content"> {/* Wrapper for two-column layout */}
                <div className="left-column">
                    {transcriptDetails.s3_url && (
                        <section className="detail-section media-section">
                            <h3 className="section-title">Media Playback</h3>
                            <MediaElement ref={mediaRef} src={transcriptDetails.s3_url} controls className="media-player-element">
                                Your browser does not support the <code>{MediaElement}</code> tag.
                            </MediaElement>
                        </section>
                    )}

                    {transcriptDetails.transcript && Array.isArray(transcriptDetails.transcript) && (
                        <section className="detail-section transcript-section">
                            <div className="section-title-container">
                                <h3 className="section-title">Full Transcript</h3>
                                {userScrolled && !autoScrollEnabled && (
                                    <button onClick={handleResumeScroll} className="resume-scroll-button" title="Resume Auto-Scroll">
                                        &#x21BB;
                                    </button>
                                )}
                            </div>
                            <div className="interactive-list-container" ref={transcriptContainerRef}>
                                {transcriptDetails.transcript.map((chunk, index) => renderTranscriptChunk(chunk, index))}
                            </div>
                        </section>
                    )}
                </div>

                <div className="right-column">
                    <section className="detail-section info-section">
                        <h3 className="section-title">Record Information</h3>
                        <div className="info-details-grid">
                            <div className="info-item"><span className="info-label">Record ID:</span> <span className="info-value">{transcriptDetails._id}</span></div>
                            <div className="info-item"><span className="info-label">Patient ID:</span> <span className="info-value">{transcriptDetails.patient_id}</span></div>
                            <div className="info-item"><span className="info-label">Doctor ID:</span> <span className="info-value">{transcriptDetails.doctor_id}</span></div>
                        </div>
                    </section>
                    {transcriptDetails.soap_notes && (
                        <section className="detail-section soap-notes-section">
                            <h3 className="section-title">SOAP Notes</h3>
                            <div className="interactive-list-container soap-list-container">
                                {typeof transcriptDetails.soap_notes === 'object' && transcriptDetails.soap_notes !== null ? (
                                    Object.entries(transcriptDetails.soap_notes).map(([key, value], sectionIndex) => (
                                        <div key={`soap-category-${key}-${sectionIndex}`} className="soap-category">
                                            <h4 className="soap-category-title">{key.replace(/_/g, ' ')}</h4>
                                            {Array.isArray(value) ? (
                                                value.map((item, itemIndex) => (item && typeof item.label === 'string' && typeof item.explanation === 'string' && typeof item.quote === 'string' && typeof item.timestamp === 'number') ?
                                                    renderSoapNoteItem(item, key, itemIndex) :
                                                    <pre key={`soap-fallback-${key}-${itemIndex}`} className="code-block-fallback">{JSON.stringify(item, null, 2)}</pre>
                                                )
                                            ) : <pre className="code-block-fallback">{JSON.stringify(value, null, 2)}</pre>}
                                        </div>
                                    ))
                                ) : <pre className="code-block-fallback">{JSON.stringify(transcriptDetails.soap_notes, null, 2)}</pre>}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TranscriptDetailPage;