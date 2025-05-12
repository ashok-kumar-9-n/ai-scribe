import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';

const PREFERRED_SOAP_ORDER = ['subjective', 'objective', 'assessment', 'plan'];
const SPEAKER_COLORS = ['#0f766e', '#0369a1', '#6d28d9', '#be185d', '#065f46', '#0c4a6e']; // teal-700, sky-700, violet-700, pink-700, emerald-800, cyan-800
const SOAP_LABEL_COLORS = ['#7c3aed', '#db2777', '#ea580c', '#16a34a', '#65a30d', '#0891b2']; // purple-600, pink-600, orange-600, green-600, lime-600, cyan-600

// Helper function to get a consistent color for a string label
const getLabelColor = (label, colorMap, colorPalette) => {
    if (!colorMap[label]) {
        // Assign a new color if this label hasn't been seen
        // This simple version might repeat colors if many unique labels
        const colorIndex = Object.keys(colorMap).length % colorPalette.length;
        colorMap[label] = colorPalette[colorIndex];
    }
    return colorMap[label];
};
let soapLabelColorMap = {}; // Needs to be reset if component can remount with different data sets or be module-level if shared

const formatTimestamp = (totalSeconds) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const paddedSeconds = seconds.toString().padStart(2, '0');
    const paddedMinutes = minutes.toString().padStart(2, '0');
    if (hours > 0) {
        const paddedHours = hours.toString().padStart(2, '0');
        return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
    }
    return `${paddedMinutes}:${paddedSeconds}`;
};

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
    const [activeSoapTab, setActiveSoapTab] = useState('');
    const [orderedSoapKeys, setOrderedSoapKeys] = useState([]);

    // Reset color map when new data is fetched to ensure consistency for that dataset
    useEffect(() => {
        soapLabelColorMap = {};
    }, [recordId]);


    useEffect(() => {
        if (transcriptDetails && transcriptDetails.transcript) {
            chunkRefs.current = transcriptDetails.transcript.map((_, i) => chunkRefs.current[i] || React.createRef());
        }
        if (transcriptDetails && transcriptDetails.soap_notes && typeof transcriptDetails.soap_notes === 'object') {
            const availableKeys = Object.keys(transcriptDetails.soap_notes);
            let currentOrderedKeys = PREFERRED_SOAP_ORDER.filter(key =>
                availableKeys.some(ak => ak.toLowerCase() === key.toLowerCase())
            );
            const preferredKeysLower = PREFERRED_SOAP_ORDER.map(k => k.toLowerCase());
            availableKeys.forEach(key => {
                if (!preferredKeysLower.includes(key.toLowerCase())) {
                    if (!currentOrderedKeys.some(cok => cok.toLowerCase() === key.toLowerCase())) {
                        currentOrderedKeys.push(key);
                    }
                }
            });
            // Ensure original casing from availableKeys is used for tabs if matched from PREFERRED_SOAP_ORDER
            currentOrderedKeys = currentOrderedKeys.map(pk => {
                const foundKey = availableKeys.find(ak => ak.toLowerCase() === pk.toLowerCase());
                return foundKey || pk;
            });

            setOrderedSoapKeys(currentOrderedKeys);

            if (!activeSoapTab && currentOrderedKeys.length > 0) {
                let firstNonEmptyTab = '';
                for (const key of currentOrderedKeys) {
                    const sectionContent = transcriptDetails.soap_notes[key];
                    if (Array.isArray(sectionContent) && sectionContent.length > 0) { firstNonEmptyTab = key; break; }
                    else if (!Array.isArray(sectionContent) && sectionContent) { firstNonEmptyTab = key; break; }
                }
                setActiveSoapTab(firstNonEmptyTab || currentOrderedKeys[0]);
            } else if (currentOrderedKeys.length === 0) {
                setActiveSoapTab('');
            }
        } else {
            setOrderedSoapKeys([]);
            setActiveSoapTab('');
        }
    }, [transcriptDetails]);

    useEffect(() => {
        if (effectRan.current === true && process.env.NODE_ENV === 'development') return;
        const fetchTranscriptById = async () => {
            setIsLoading(true); setError(''); setTranscriptDetails(null); setActiveChunkIndex(-1); setAutoScrollEnabled(true); setUserScrolled(false); setActiveSoapTab(''); setOrderedSoapKeys([]); soapLabelColorMap = {};
            const apiUrl = `http://localhost:8000/api/record/get-record-by-id`;
            try {
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ record_id: recordId }), });
                if (!response.ok) { const errorData = await response.json().catch(() => ({ message: response.statusText })); throw new Error(`API Error: ${response.status} - ${errorData.detail || errorData.message}`); }
                const result = await response.json();
                if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
                    setTranscriptDetails(result.data);
                } else if (result.data === null || (typeof result.data === 'object' && Object.keys(result.data).length === 0)) {
                    setError(`Transcript with ID ${recordId} not found.`);
                } else { console.warn('API response error:', result); setError('Unexpected data format.'); }
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
            if (autoScrollEnabled) setAutoScrollEnabled(false);
        };
        container.addEventListener('scroll', handleManualScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleManualScroll);
    }, [autoScrollEnabled, transcriptContainerRef.current]);

    const handleMediaSeek = (startTime) => {
        if (mediaRef.current && typeof startTime === 'number') {
            mediaRef.current.currentTime = startTime;
            mediaRef.current.play().catch(e => console.error("Media play error:", e));
            setAutoScrollEnabled(true); setUserScrolled(false);
        }
    };

    const handleResumeScroll = () => {
        setAutoScrollEnabled(true); setUserScrolled(false);
        if (activeChunkIndex !== -1 && chunkRefs.current[activeChunkIndex]?.current) {
            chunkRefs.current[activeChunkIndex].current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const renderTranscriptChunk = (chunk, index) => {
        const speakerColor = (typeof chunk.speaker === 'number' && chunk.speaker >= 0)
            ? SPEAKER_COLORS[chunk.speaker % SPEAKER_COLORS.length]
            : '#0f766e'; // Default color if speaker is undefined or not a number

        return (
            <div key={`transcript-${index}`} ref={chunkRefs.current[index]} className={`transcript-chunk interactive-item ${index === activeChunkIndex ? 'active-chunk' : ''}`} onClick={() => typeof chunk.start_timestamp === 'number' && handleMediaSeek(chunk.start_timestamp)}>
                <p className="speaker-text" style={{ color: speakerColor }}>
                    Speaker {chunk.speaker !== undefined ? chunk.speaker : 'N/A'}
                    {typeof chunk.start_timestamp === 'number' && typeof chunk.end_timestamp === 'number' && (
                        <span className="timestamp-text">({formatTimestamp(chunk.start_timestamp)} - {formatTimestamp(chunk.end_timestamp)})</span>
                    )}
                </p>
                <p className="main-text">{chunk.text}</p>
            </div>
        );
    };

    const renderSoapNoteItem = (item, sectionKey, itemIndex) => {
        const itemId = `soap-${sectionKey}-${itemIndex}`;
        const hasTimestamp = typeof item.timestamp === 'number';
        const labelColor = item.label ? getLabelColor(item.label, soapLabelColorMap, SOAP_LABEL_COLORS) : '#7c3aed';

        return (
            <div key={itemId} className={`soap-note-item ${hasTimestamp ? 'interactive-item' : ''}`} onClick={hasTimestamp ? () => handleMediaSeek(item.timestamp) : undefined}>
                {item.label && <p className="soap-label" style={{ color: labelColor }}>{item.label}</p>}
                {item.explanation && <p className="soap-explanation">{item.explanation}</p>}
                {item.quote && (
                    <p className="verbatim-text">
                        <strong className="verbatim-tag">Verbatim:</strong> "{item.quote}"
                    </p>
                )}
                {hasTimestamp && <p className="timestamp-text soap-timestamp">(Timestamp: {formatTimestamp(item.timestamp)})</p>}
            </div>
        );
    };

    if (isLoading) return <div className="transcript-detail-page loading-state"><p>Loading transcript details...</p></div>;
    if (error) return <div className="transcript-detail-page error-state"><p className="error-message-box">Error: {error}</p><Link to="/" className="back-link-styled">← Back to Home</Link></div>;
    if (!transcriptDetails) return <div className="transcript-detail-page empty-state"><p>Transcript not found.</p><Link to="/" className="back-link-styled">← Back to Home</Link></div>;

    const MediaElement = transcriptDetails.s3_url && transcriptDetails.s3_url.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'audio';
    const currentSoapData = activeSoapTab && transcriptDetails.soap_notes ? transcriptDetails.soap_notes[activeSoapTab] : null;
    const isActiveSoapTabEmpty = !currentSoapData || (Array.isArray(currentSoapData) && currentSoapData.length === 0);

    return (
        <div className="transcript-detail-page">
            <header className="page-header-container">
                <h2 className="page-main-title">Transcript Details</h2>
                <Link to="/" className="back-link-styled">← Back to Home</Link>
            </header>

            <div className="detail-page-main-content">
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
                                    <button onClick={handleResumeScroll} className="resume-scroll-button" title="Resume Auto-Scroll">&#x21BB;</button>
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
                        <section className="detail-section soap-notes-section-tabbed">
                            <h3 className="section-title">SOAP Notes</h3>
                            {orderedSoapKeys.length > 0 ? (
                                <nav className="soap-tabs-nav">
                                    {orderedSoapKeys.map(key => (
                                        <button
                                            key={key}
                                            className={`soap-tab-button ${activeSoapTab === key ? 'active' : ''}`}
                                            onClick={() => setActiveSoapTab(key)}
                                        >
                                            {key.replace(/_/g, ' ')}
                                        </button>
                                    ))}
                                </nav>
                            ) : <p className="empty-section-message">No SOAP note sections available.</p>}

                            <div className="interactive-list-container soap-list-container soap-tab-content">
                                {activeSoapTab && !isActiveSoapTabEmpty && Array.isArray(currentSoapData) ? (
                                    currentSoapData.map((item, itemIndex) =>
                                        renderSoapNoteItem(item, activeSoapTab, itemIndex)
                                    )
                                ) : activeSoapTab && !isActiveSoapTabEmpty && typeof currentSoapData === 'object' ? (
                                    renderSoapNoteItem(currentSoapData, activeSoapTab, 0)
                                ) : activeSoapTab && isActiveSoapTabEmpty ? (
                                    <p className="empty-section-message">No notes for this section.</p>
                                ) : (
                                    orderedSoapKeys.length > 0 && <p className="empty-section-message">Select a SOAP note section to view details.</p>
                                )}
                                {!activeSoapTab && orderedSoapKeys.length === 0 && !transcriptDetails.soap_notes && (
                                    <p className="empty-section-message">SOAP notes are not available for this record.</p>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TranscriptDetailPage;