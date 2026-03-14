# CodeForge — AI Code Generator

A Flask-based AI code generation studio powered by the NVIDIA NIM API (phi-4-mini-instruct).

## Project Structure

```
codeforge/
├── app.py                  # Flask backend — API proxy with SSE streaming
├── requirements.txt        # Python dependencies
├── templates/
│   └── index.html          # Main HTML template
└── static/
    ├── css/
    │   └── style.css       # All styles
    └── js/
        └── main.js         # Frontend logic
```

## Setup & Run

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the Flask app

```bash
python app.py
```

### 3. Open in browser

```
http://localhost:5000
```

## Features

- **Real-time streaming** — tokens stream live from the NVIDIA API via SSE
- **14 languages** — Python, JS, TS, Go, Rust, Java, C++, C, PHP, Ruby, Swift, Kotlin, Bash, SQL
- **4 code styles** — Clean, Verbose, Terse, Beginner-friendly
- **Syntax highlighting** — Keywords, functions, strings, numbers, comments
- **Line numbers** — Displayed alongside all output
- **Copy / Save** — Copy to clipboard or download as the correct file extension
- **Responsive** — Works on mobile and desktop
- **Keyboard shortcut** — Ctrl+Enter to generate

## Tech Stack

- **Backend**: Python 3 + Flask (no extra SDK needed — uses `urllib` for streaming)
- **Frontend**: Vanilla HTML/CSS/JS (no framework)
- **API**: NVIDIA NIM — `microsoft/phi-4-mini-instruct`
- **Streaming**: Server-Sent Events (SSE) via Flask `stream_with_context`
