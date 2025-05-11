import React from 'react';

function ErrorBanner({ error, onClose }) {
    if (!error) {
        return null;
    }

    return (
        <div className="error-banner">
            <p>{error}</p>
            <button onClick={onClose} className="error-close">×</button>
        </div>
    );
}

export default ErrorBanner;