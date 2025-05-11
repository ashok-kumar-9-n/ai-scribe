import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import ConversationRecorder from '../components/ConversationRecorder';
import SoapNotesGenerator from '../components/SoapNotesGenerator';
import TabNavigation from '../components/TabNavigation';
import '../App.css';

const TABS = [
    { id: 'soapNotes', label: 'SOAP Notes Generator' },
    { id: 'liveRecorder', label: 'Live Conversation Recorder' },
    { id: 'previousTranscripts', label: 'Previous Transcripts', path: '/previous-transcripts' }, // Added new tab
];

function HomePage() {
    const [activeTab, setActiveTab] = useState(TABS[0].id);
    const navigate = useNavigate(); // Initialize navigate

    const handleTabClick = (tab) => {
        if (tab.path) {
            navigate(tab.path);
            // Optionally, you might want to set activeTab to this tab.id as well
            // if you want the tab to appear active after navigation.
            // setActiveTab(tab.id);
        } else {
            setActiveTab(tab.id);
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
                // Pass the tab object itself to the click handler
                onTabClick={handleTabClick}
            />

            <main className="tab-content card">
                {activeTab === 'soapNotes' && <SoapNotesGenerator />}
                {activeTab === 'liveRecorder' && <ConversationRecorder />}
                {/* Content for 'previousTranscripts' is on a separate page, so no render here */}
            </main>
        </div>
    );
}

export default HomePage;