import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import PreviousTranscriptsPage from './pages/PreviousTranscriptsPage';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/previous-transcripts" element={<PreviousTranscriptsPage />} />
          {/*
            Example of other potential routes from original comments:
            <Route path="/recordings" element={<div>Show All Recordings Page</div>} />
            <Route path="/upload" element={<div>Upload Video Page</div>} />
          */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
