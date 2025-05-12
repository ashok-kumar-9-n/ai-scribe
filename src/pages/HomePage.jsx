import React, { useState, useEffect, useRef } from 'react';
import { BASE_URL } from '../config';
import { useNavigate, Link } from 'react-router-dom'; // Import useNavigate and Link
import ConversationRecorder from '../components/ConversationRecorder';
import SoapNotesGenerator from '../components/SoapNotesGenerator';
import TabNavigation from '../components/TabNavigation';
import '../App.css';

const TABS = [
    { id: 'soapNotes', label: 'SOAP Notes Generator' },
    { id: 'liveRecorder', label: 'Live Conversation Recorder' },
    { id: 'previousTranscripts', label: 'Previous Transcripts' }, // Removed path
];

function PreviousTranscriptsList() {
    const [transcripts, setTranscripts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const effectRan = useRef(false); // Guard for StrictMode

    useEffect(() => {
        if (effectRan.current === false || process.env.NODE_ENV !== 'development') {
            const fetchTranscripts = async () => {
                setIsLoading(true);
                setError('');
                // TODO: Replace with dynamic doctor_id from context or props
                const doctorId = 35;
                const apiUrl = `${BASE_URL}/api/record/fetch-records`;

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
                        setTranscripts(result.data);
                    } else {
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
        return () => {
            if (process.env.NODE_ENV === 'development') {
                effectRan.current = true;
            }
        };
    }, []);

    if (isLoading) return <p>Loading transcripts...</p>;
    if (error) return <p className="error-message">Error: {error}</p>;
    if (transcripts.length === 0) return <p>No transcripts found for Doctor ID: 34.</p>;

    return (
        <div className="transcripts-list">
            {transcripts.map((record) => (
                <Link to={`/record-id/${record._id}`} key={record._id} className="transcript-item-clickable"> {/* Removed 'card' class */}
                    <div className="transcript-item-content">
                        <h3>Record ID: {record._id}</h3>
                        <p><strong>Patient ID:</strong> {record.patient_id}</p>
                    </div>
                </Link>
            ))}
        </div>
    );
}


function HomePage() {
    const [activeTab, setActiveTab] = useState(TABS[0].id);
    const navigate = useNavigate();

    const handleTabClick = (tab) => {
        // Always set active tab, navigation to detail page is handled by Link component
        setActiveTab(tab.id);
        // If a path was defined for a tab (not used for previousTranscripts anymore)
        if (tab.path) {
            navigate(tab.path);
        }
    };

    return (
        <div className="home-page-container">
            <header className="app-header">
                <h1>AI Clinical Assistant</h1>
                <p>Streamline your clinical documentation and recording workflows.</p>
            </header>

            <TabNavigation
                tabs={TABS}
                activeTab={activeTab}
                onTabClick={handleTabClick}
            />

            <main className="tab-content card">
                {activeTab === 'soapNotes' && <SoapNotesGenerator />}
                {activeTab === 'liveRecorder' && <ConversationRecorder />}
                {activeTab === 'previousTranscripts' && <PreviousTranscriptsList />}
            </main>
        </div>
    );
}

export default HomePage;