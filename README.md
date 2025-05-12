# 🩺 AI-Scribe Frontend

The frontend of AI-Scribe provides an intuitive interface for doctors to upload recordings, transcribe calls, generate SOAP notes, and manage patient records.

## 🔹 Frontend (FE) Service - Local run setup

1. **Update Config**
   - In the config file, set the `base_url` to:
     ```
     http://localhost:8000
     ```
     *(Use this if you're running the backend locally.)*

2. **Install Dependencies**
   ```bash
   npm install

3. **Start Development Server**
    ```bash
    npm run dev


## 🌐 Live Deployment

The frontend is deployed and accessible at:

```
https://ai-scribe-seven.vercel.app/
```

---

## 🏠 Home Page Overview

The homepage contains three main tabs:

### 1. SOAP Notes Generator
- Upload any media file or paste a media URL.
- The system will automatically:
  - Upload the file
  - Transcribe the conversation
  - Generate SOAP notes
  - Create a medical record

---

### 2. Live Conversation Recorder
- Start a live call recording session.
- Real-time transcript appears in the UI with **speaker diarization**.
- After the call:
  - Listen to the recording
  - Download the audio
  - Generate SOAP notes (which creates a new medical record automatically)

---

### 3. Previous Records
- View all past patient records for the selected doctor.
- On clicking any record, you're taken to the **Transcript Details** page.

---

## 🩻 Transcript Details Page

- Listen to the original audio recording
- View the full transcript with speaker segmentation
- Read the generated SOAP notes

---

## 🧑‍⚕️ Patient and Doctor Selection

- Use the dropdown in the **bottom-right corner** to select:
  - `patient_id`
  - `doctor_id`
- This selection applies globally across the app to filter and manage relevant data.