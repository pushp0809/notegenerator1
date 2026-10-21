# Video Note Architect

A production-grade Python CLI tool that converts YouTube videos or local media files into structured Markdown notes using AI.

## Features

- **Smart Content Extraction**: YouTube transcripts → Whisper fallback → Direct Gemini audio upload
- **AI-Powered Synthesis**: Gemini 2.5 Flash with 1M+ context window
- **Structured Output**: 5-part architecture (Executive Summary, Deep Dive, Comparison Table, Workflow, Self-Test)
- **Streaming Output**: Real-time terminal rendering with Rich progress indicators
- **Dual Input Modes**: Text mode for captions, direct audio upload for large files (>25MB)
- **Comprehensive Error Handling**: Custom exceptions for invalid URLs, private videos, missing FFmpeg, and more

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd video-note-architect

# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -e .

# Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

## Usage

### Basic Usage

```bash
# Process a YouTube video
python -m video_notes process "https://youtube.com/watch?v=dQw4w9WgXcQ"

# Process a local video file
python -m video_notes process video.mp4

# Custom output path
python -m video_notes process "https://youtu.be/xyz" -o my_notes.md
```

### Advanced Options

```bash
# Use direct audio upload (skip local transcription)
python -m video_notes process video.mp4 --direct-audio

# Specify Whisper model size
python -m video_notes process video.mp4 --whisper-model small

# Enable verbose logging
python -m video_notes process video.mp4 --verbose
```

### CLI Arguments

- `SOURCE` (required): YouTube URL or path to local media file (.mp4, .mkv, .mp3, .wav)
- `--output, -o`: Output Markdown file path (default: `./notes/<sanitized_title>.md`)
- `--whisper-model`: Whisper model size for transcription (tiny, base, small, medium, large-v3). Default: base
- `--direct-audio`: Skip transcription and upload audio directly to Gemini (for files > 25MB)
- `--verbose, -v`: Enable verbose logging

## Architecture

### Pipeline Flow

```
Input (YouTube URL / Local File)
    ↓
Content Extraction
    ├─ YouTube Transcript API (if captions available)
    ├─ yt-dlp + Whisper (fallback for no captions)
    └─ Direct Audio Upload (for files > 25MB)
    ↓
Note Generation (Gemini 2.5 Flash)
    ↓
Streaming Output (Terminal + File)
```

### Project Structure

```
video_notes/
├── __init__.py
├── __main__.py           # Entry point for `python -m video_notes`
├── cli.py                # CLI interface with Typer
├── extractors/
│   ├── __init__.py
│   ├── youtube.py        # YouTube transcript + yt-dlp fallback
│   └── whisper_local.py  # Local Whisper transcription
├── generators/
│   ├── __init__.py
│   └── gemini_notes.py   # Gemini synthesis engine
├── prompts/
│   ├── __init__.py
│   └── note_templates.py # System instructions for note generation
└── utils/
    └── formatter.py      # Output formatting utilities

tests/
├── test_youtube.py       # YouTube extractor tests
├── test_whisper_local.py # Whisper transcription tests
├── test_gemini_notes.py  # Gemini generator tests
└── test_cli.py           # CLI integration tests
```

## Generated Note Structure

The AI generates notes following a 5-part architecture:

1. **Executive Summary & TL;DR**: 3 bullet points with bold keywords
2. **Deep Dive & Core Taxonomy**: Component breakdown, architecture, specs
3. **Markdown Comparison Table**: 4-5 columns (Entity, Type/Role, Key Metrics, Access/License)
4. **Practical Implementation / Workflow**: Sequential steps with exact flags/configs
5. **Active-Recall Self-Test**: 3-5 challenging Q&A pairs

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=video_notes --cov-report=term-missing

# Run specific test file
pytest tests/test_cli.py -v

# Run with verbose output
pytest -v -s
```

### Test Coverage

- **46 total tests** across 4 test files
- **93% average coverage**
- Full mocking of external dependencies (YouTube API, Gemini API, Whisper)

## Error Handling

The system provides clear error messages for common issues:

- **InvalidURLError**: Cannot parse YouTube URL or video ID
- **VideoUnavailableError**: Video is private, deleted, or region-locked
- **FFmpegNotFoundError**: FFmpeg not installed (required for audio processing)
- **APIKeyError**: GEMINI_API_KEY environment variable not set
- **RateLimitError**: Gemini API rate limit exceeded
- **AudioFileError**: Audio file missing, empty, or corrupt

## Dependencies

### Core
- `google-genai`: Gemini 2.5 Flash SDK
- `youtube-transcript-api`: YouTube caption extraction
- `yt-dlp`: Audio download fallback
- `faster-whisper`: Local speech-to-text
- `typer`: CLI framework
- `rich`: Terminal UI and progress indicators
- `pydantic`: Data validation

### Development
- `pytest`: Testing framework
- `pytest-cov`: Coverage reporting

## Requirements

- Python 3.11+
- FFmpeg (for audio processing)
- Gemini API key (free tier available at https://aistudio.google.com/apikey)

## License

MIT License - see LICENSE file for details

## Contributing

Contributions welcome! Please ensure:
- All tests pass (`pytest`)
- Code coverage remains above 90%
- Follow existing code style and conventions
- Add tests for new features

## Troubleshooting

### FFmpeg Not Found

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### API Key Issues

1. Get your API key at https://aistudio.google.com/apikey
2. Set it in your environment: `export GEMINI_API_KEY=your_key_here`
3. Or add it to `.env` file

### Rate Limiting

If you hit rate limits:
- Wait a few minutes and retry
- Check your API quota at Google AI Studio
- Consider upgrading your plan for higher limits

## Roadmap

- [ ] Support for batch processing multiple videos
- [ ] Custom note templates
- [ ] Export to multiple formats (PDF, HTML, Notion)
- [ ] Integration with note-taking apps (Obsidian, Notion)
- [ ] Web UI for non-technical users
- [ ] Support for additional AI models (GPT-4, Claude)

## Acknowledgments

- Google Gemini team for the powerful API
- faster-whisper for efficient local transcription
- Rich library for beautiful terminal output
- The open-source community

---

**Built with ❤️ for autonomous coding agents and knowledge workers**
