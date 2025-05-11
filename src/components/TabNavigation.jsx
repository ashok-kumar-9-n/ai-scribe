import React from 'react';

// Changed setActiveTab to onTabClick for more general click handling
function TabNavigation({ tabs, activeTab, onTabClick }) {
    return (
        <div className="tab-navigation">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                    // Pass the whole tab object to the click handler
                    onClick={() => onTabClick(tab)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

export default TabNavigation;