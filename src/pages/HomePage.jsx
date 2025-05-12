import React, { useState, useEffect, useRef } from 'react';
import { BASE_URL } from '../config';
import { useNavigate, Link } from 'react-router-dom'; // Import useNavigate and Link
import ConversationRecorder from '../components/ConversationRecorder';
import SoapNotesGenerator from '../components/SoapNotesGenerator';
import TabNavigation from '../components/TabNavigation';
import HomePreviousTranscripts from '../components/HomePreviousTranscripts'; // Import the new component
import '../App.css';

const TABS = [
    { id: 'soapNotes', label: 'SOAP Notes Generator' },
    { id: 'liveRecorder', label: 'Live Conversation Recorder' },
    { id: 'previousTranscripts', label: 'Previous Records' }, // Removed path, will render in-page
];

// Removed the PreviousTranscriptsList component

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
                {activeTab === 'previousTranscripts' && <HomePreviousTranscripts />}
            </main>
        </div>
    );
}

export default HomePage;