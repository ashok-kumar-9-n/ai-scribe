import React, { useState, useEffect } from 'react';
import './IdManagementFab.css'; // We'll create this CSS file next

function IdManagementFab() {
    const [doctorId, setDoctorId] = useState('');
    const [patientId, setPatientId] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const storedDoctorId = localStorage.getItem('doctorId');
        const storedPatientId = localStorage.getItem('patientId');
        if (storedDoctorId) {
            setDoctorId(storedDoctorId);
        }
        if (storedPatientId) {
            setPatientId(storedPatientId);
        }
    }, []);

    const handleGeneratePatientId = () => {
        // Generate a random integer (e.g., between 10000 and 99999)
        const randomInt = Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000;
        setPatientId(String(randomInt)); // Store as string in state, will be parsed by API callers
    };

    const handleSaveIds = () => {
        if (doctorId && patientId) {
            localStorage.setItem('doctorId', doctorId);
            localStorage.setItem('patientId', patientId);
            alert('IDs saved successfully!');
            setIsOpen(false); // Close the FAB pop-up after saving
        } else {
            alert('Please enter Doctor ID and generate Patient ID before saving.');
        }
    };

    const toggleFab = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className={`fab-container ${isOpen ? 'open' : ''}`}>
            <button onClick={toggleFab} className="fab-button">
                {isOpen ? '✕' : '👤'}
            </button>
            {isOpen && (
                <div className="fab-content">
                    <h3>Manage IDs</h3>
                    <div>
                        <label htmlFor="fab-doctorId">Doctor ID: </label>
                        <input
                            type="number"
                            id="fab-doctorId"
                            value={doctorId}
                            onChange={(e) => setDoctorId(e.target.value)}
                            placeholder="Enter Doctor ID (number)"
                        />
                    </div>
                    <div>
                        <label htmlFor="fab-patientId">Patient ID: </label>
                        <input
                            type="text"
                            id="fab-patientId"
                            value={patientId}
                            readOnly
                            placeholder="Generated Patient ID"
                        />
                        <button onClick={handleGeneratePatientId} style={{ marginLeft: '10px' }}>Generate</button>
                    </div>
                    <button onClick={handleSaveIds} style={{ marginTop: '10px' }}>Save IDs</button>
                </div>
            )}
        </div>
    );
}

export default IdManagementFab;