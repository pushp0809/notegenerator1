import { motion } from 'framer-motion';
import { FileCode2, CheckCircle2, AlertTriangle, Zap, Shield } from 'lucide-react';
import { useState } from 'react';

// Python syntax highlighting (simplified)
function highlightPython(code: string): string {
  return code
    // Comments
    .replace(/(#.*$)/gm, '<span class="text-slate-500 italic">$1</span>')
    // Strings (triple quotes)
    .replace(/("""[\s\S]*?""")/g, '<span class="text-accent-green">$1</span>')
    // Strings (single/double quotes)
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="text-accent-green">$1</span>')
    // Keywords
    .replace(/\b(from|import|def|class|return|if|else|elif|try|except|raise|with|as|for|in|not|and|or|is|None|True|False)\b/g, '<span class="text-primary-light font-medium">$1</span>')
    // Decorators
    .replace(/(@\w+)/g, '<span class="text-accent-pink">$1</span>')
    // Numbers
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-accent-orange">$1</span>')
    // Function calls
    .replace(/\b(\w+)\s*\(/g, '<span class="text-accent">$1</span>(');
}

interface FileTab {
  name: string;
  path: string;
  code: string;
}

const implementationFiles: FileTab[] = [
  {
    name: 'youtube.py',
    path: 'video_notes/extractors/youtube.py',
    code: `"""
video_notes.extractors.youtube
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
YouTube content ingestion with transcript-first strategy and audio fallback.
"""

from __future__ import annotations

import logging
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Regex for YouTube video ID extraction
_VIDEO_ID_RE = re.compile(
    r"(?:https?://)?(?:www\\.|m\\.)?"
    r"(?:youtube\\.com/(?:watch\\?(?:.*&)?v=|"
    r"shorts/|embed/|v/)"
    r"|youtu\\.be/)"
    r"([A-Za-z0-9_-]{11})"
)

_SUPPORTED_LANGUAGES = ["en", "hi", "zh", "es", "de"]
_TIMESTAMP_INTERVAL_SEC = 120


class ExtractionError(Exception):
    """Base exception for content extraction failures."""


class InvalidURLError(ExtractionError):
    """Raised when the input cannot be parsed as a YouTube URL."""


class VideoUnavailableError(ExtractionError):
    """Raised when the video is private, deleted, or inaccessible."""


class FFmpegNotFoundError(ExtractionError):
    """Raised when FFmpeg is required but not found."""


def extract_video_id(url_or_id: str) -> str:
    """Extract the 11-character YouTube video ID from a URL or bare ID."""
    url_or_id = url_or_id.strip()

    if not url_or_id:
        raise InvalidURLError("Input is empty.")

    # Try regex match
    match = _VIDEO_ID_RE.search(url_or_id)
    if match:
        return match.group(1)

    # Fallback: bare 11-char ID
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", url_or_id):
        return url_or_id

    raise InvalidURLError(
        f"Could not extract video ID from: {url_or_id!r}"
    )


def _format_timestamp(total_seconds: float) -> str:
    """Convert seconds to [MM:SS] or [HH:MM:SS] format."""
    total_seconds = int(total_seconds)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours > 0:
        return f"[{hours:02d}:{minutes:02d}:{seconds:02d}]"
    return f"[{minutes:02d}:{seconds:02d}]"


def _merge_transcript_segments(
    segments: list[dict],
    interval_sec: int = _TIMESTAMP_INTERVAL_SEC,
) -> str:
    """Merge transcript segments into continuous text with timestamps."""
    if not segments:
        return ""

    lines: list[str] = []
    next_timestamp_at = 0.0

    for seg in segments:
        start = seg.get("start", 0.0)
        text = seg.get("text", "").strip()

        if not text:
            continue

        if start >= next_timestamp_at:
            ts = _format_timestamp(start)
            lines.append(f"\\n{ts} {text}")
            next_timestamp_at = start + interval_sec
        else:
            if lines:
                lines[-1] += f" {text}"
            else:
                lines.append(text)

    return "\\n".join(lines).strip()


def get_youtube_transcript(url_or_id: str) -> str:
    """
    Fetch YouTube video transcript as timestamped text.
    
    Falls back to audio download if captions are unavailable.
    """
    video_id = extract_video_id(url_or_id)
    logger.info("Extracting transcript for: %s", video_id)

    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api._errors import (
            TranscriptsDisabled,
            NoTranscriptFound,
            VideoUnavailable,
        )
    except ImportError:
        logger.warning("youtube-transcript-api not installed. Falling back.")
        return _fallback_to_audio(url_or_id, video_id)

    try:
        transcript = YouTubeTranscriptApi.get_transcript(
            video_id,
            languages=_SUPPORTED_LANGUAGES,
        )

        if not transcript:
            raise ExtractionError("Transcript API returned empty results.")

        merged = _merge_transcript_segments(transcript)
        logger.info("Transcript fetched: %d segments", len(transcript))
        return merged

    except TranscriptsDisabled:
        logger.warning("Captions disabled. Falling back to audio.")
        return _fallback_to_audio(url_or_id, video_id)

    except NoTranscriptFound:
        logger.warning("No transcript in supported languages. Falling back.")
        return _fallback_to_audio(url_or_id, video_id)

    except VideoUnavailable as exc:
        raise VideoUnavailableError(
            f"Video {video_id} is unavailable: {exc}"
        ) from exc


def _check_ffmpeg() -> bool:
    """Check if FFmpeg is available on the system PATH."""
    return shutil.which("ffmpeg") is not None


def download_audio(url: str, output_dir: Optional[str] = None) -> str:
    """
    Download audio from YouTube using yt-dlp.
    Extracts audio only in smallest format (< 64 kbps).
    """
    if not _check_ffmpeg():
        raise FFmpegNotFoundError(
            "FFmpeg is required but not found.\\n"
            "Install: brew install ffmpeg (macOS) or "
            "sudo apt install ffmpeg (Ubuntu)"
        )

    if output_dir is None:
        output_dir = tempfile.mkdtemp(prefix="vna_audio_")
    else:
        Path(output_dir).mkdir(parents=True, exist_ok=True)

    output_template = os.path.join(output_dir, "%(id)s.%(ext)s")

    cmd = [
        "yt-dlp",
        "--no-playlist",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "9",
        "-f", "ba[abr<64]/ba/b",
        "-o", output_template,
        "--quiet",
        url,
    ]

    logger.info("Downloading audio: %s", url)

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
        )
    except FileNotFoundError:
        raise ExtractionError("yt-dlp is not installed.")
    except subprocess.TimeoutExpired:
        raise ExtractionError("Download timed out after 300 seconds.")

    if result.returncode != 0:
        stderr = result.stderr.strip()
        if "private video" in stderr.lower():
            raise VideoUnavailableError(f"Video is private: {stderr}")
        raise ExtractionError(f"yt-dlp failed: {stderr}")

    # Find downloaded file
    audio_files = list(Path(output_dir).glob("*.mp3"))
    if not audio_files:
        raise ExtractionError("No audio file found after download.")

    audio_path = str(audio_files[0].resolve())
    logger.info("Audio downloaded: %s", audio_path)
    return audio_path


def _fallback_to_audio(url: str, video_id: str) -> str:
    """Download audio and return sentinel for Whisper processing."""
    logger.info("Falling back to audio download for %s…", video_id)

    try:
        audio_path = download_audio(url)
        return f"__AUDIO_FILE__:{audio_path}"
    except FFmpegNotFoundError:
        raise
    except ExtractionError as exc:
        raise ExtractionError(
            f"All extraction methods failed for {video_id}.\\n"
            f"Transcript API: no captions.\\n"
            f"Audio download: {exc}"
        ) from exc`,
  },
  {
    name: 'whisper_local.py',
    path: 'video_notes/extractors/whisper_local.py',
    code: `"""
video_notes.extractors.whisper_local
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Local speech-to-text using faster-whisper (CTranslate2 backend).
"""

from __future__ import annotations

import logging
import shutil
import tempfile
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_TIMESTAMP_INTERVAL_SEC = 120
_VALID_MODEL_SIZES = {"tiny", "base", "small", "medium", "large-v2", "large-v3"}


class TranscriptionError(Exception):
    """Base exception for transcription failures."""


class ModelLoadError(TranscriptionError):
    """Raised when the Whisper model cannot be loaded."""


class AudioFileError(TranscriptionError):
    """Raised when the audio file is missing or corrupt."""


class FFmpegNotFoundError(TranscriptionError):
    """Raised when FFmpeg is required but not found."""


def _format_timestamp(total_seconds: float) -> str:
    """Convert seconds to [MM:SS] or [HH:MM:SS] format."""
    total_seconds = int(total_seconds)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours > 0:
        return f"[{hours:02d}:{minutes:02d}:{seconds:02d}]"
    return f"[{minutes:02d}:{seconds:02d}]"


def _check_ffmpeg() -> bool:
    """Check if FFmpeg is available on the system PATH."""
    return shutil.which("ffmpeg") is not None


def _validate_audio_file(file_path: str) -> Path:
    """Validate that the audio file exists and is readable."""
    path = Path(file_path).resolve()

    if not path.exists():
        raise AudioFileError(f"Audio file not found: {file_path}")

    if path.is_dir():
        raise AudioFileError(f"Path is a directory: {file_path}")

    if path.stat().st_size == 0:
        raise AudioFileError(f"Audio file is empty: {file_path}")

    return path


def _select_device() -> str:
    """Automatically select the best available compute device."""
    try:
        import torch
        if torch.cuda.is_available():
            logger.info("CUDA detected — using GPU.")
            return "cuda"
    except ImportError:
        pass

    logger.info("Using CPU with INT8 quantisation.")
    return "cpu"


def _cleanup_temp_files(file_path: str) -> None:
    """Clean up temporary audio files (only in temp directories)."""
    path = Path(file_path)
    temp_dir = Path(tempfile.gettempdir())
    
    if str(path).startswith(str(temp_dir)):
        try:
            if path.is_file():
                path.unlink()
                logger.info("Cleaned up: %s", path)
        except OSError as exc:
            logger.warning("Cleanup failed: %s", exc)


def _format_segments_with_timestamps(
    segments,
    interval_sec: int = _TIMESTAMP_INTERVAL_SEC,
) -> str:
    """Format Whisper segments into timestamped text blocks."""
    lines: list[str] = []
    next_timestamp_at = 0.0

    for segment in segments:
        start = segment.start
        text = segment.text.strip()

        if not text:
            continue

        if start >= next_timestamp_at:
            ts = _format_timestamp(start)
            lines.append(f"\\n{ts} {text}")
            next_timestamp_at = start + interval_sec
        else:
            if lines:
                lines[-1] += f" {text}"
            else:
                lines.append(text)

    return "\\n".join(lines).strip()


def transcribe_local_audio(
    file_path: str,
    model_size: str = "base",
    language: Optional[str] = None,
    cleanup: bool = True,
) -> str:
    """
    Transcribe a local audio file using faster-whisper.
    
    Uses CTranslate2 with INT8 quantisation for efficient CPU inference.
    """
    # Validate model size
    if model_size not in _VALID_MODEL_SIZES:
        raise ModelLoadError(
            f"Invalid model: {model_size!r}. "
            f"Valid: {', '.join(sorted(_VALID_MODEL_SIZES))}"
        )

    # Validate audio file
    audio_path = _validate_audio_file(file_path)
    logger.info("Transcribing: %s (model=%s)", audio_path.name, model_size)

    # Check FFmpeg for non-WAV formats
    if audio_path.suffix.lower() != ".wav" and not _check_ffmpeg():
        raise FFmpegNotFoundError(
            "FFmpeg required for audio decoding.\\n"
            "Install: brew install ffmpeg (macOS)"
        )

    # Load model
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise ModelLoadError(
            "faster-whisper not installed.\\n"
            "Install: pip install faster-whisper"
        )

    device = _select_device()
    compute_type = "float16" if device == "cuda" else "int8"

    logger.info("Loading model (device=%s, compute=%s)…", device, compute_type)

    try:
        model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )
    except Exception as exc:
        raise ModelLoadError(f"Failed to load model: {exc}") from exc

    # Transcribe
    logger.info("Running inference…")
    try:
        transcribe_kwargs = {
            "beam_size": 5,
            "vad_filter": True,
            "vad_parameters": {"min_silence_duration_ms": 500},
        }

        if language:
            transcribe_kwargs["language"] = language

        segments, info = model.transcribe(
            str(audio_path),
            **transcribe_kwargs,
        )

        segment_list = list(segments)

        if not segment_list:
            logger.warning("No segments produced.")
            return ""

        logger.info(
            "Complete: %d segments, lang=%s (%.0f%%)",
            len(segment_list), info.language, info.language_probability * 100,
        )

    except Exception as exc:
        if "ffmpeg" in str(exc).lower():
            raise FFmpegNotFoundError(f"FFmpeg error: {exc}") from exc
        raise TranscriptionError(f"Transcription failed: {exc}") from exc

    # Format output
    result = _format_segments_with_timestamps(segment_list)

    # Add metadata header
    header = (
        f"<!-- Transcribed: faster-whisper ({model_size}) | "
        f"Language: {info.language} ({info.language_probability:.0%}) -->\\n\\n"
    )
    result = header + result

    # Cleanup
    if cleanup:
        _cleanup_temp_files(str(audio_path))

    return result


def transcribe_youtube_audio(
    audio_path: str,
    model_size: str = "base",
    cleanup: bool = True,
) -> str:
    """Transcribe audio downloaded from YouTube via yt-dlp."""
    # Handle sentinel from youtube.py
    if audio_path.startswith("__AUDIO_FILE__:"):
        audio_path = audio_path[len("__AUDIO_FILE__:"):]

    return transcribe_local_audio(
        file_path=audio_path,
        model_size=model_size,
        cleanup=cleanup,
    )`,
  },
];

export default function Implementation() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(implementationFiles[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="implementation" className="py-24 relative">
      <div className="absolute inset-0">
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Implementation</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Production-ready Python code with comprehensive error handling for edge cases.
          </p>
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
        >
          <FeatureCard
            icon={<Shield className="text-accent-green" size={20} />}
            title="Robust Error Handling"
            description="Custom exceptions for invalid URLs, private videos, missing FFmpeg, and corrupt files"
          />
          <FeatureCard
            icon={<Zap className="text-accent-orange" size={20} />}
            title="Smart Fallback Chain"
            description="Transcript API → yt-dlp audio → Whisper STT with automatic device selection"
          />
          <FeatureCard
            icon={<CheckCircle2 className="text-primary-light" size={20} />}
            title="Timestamped Output"
            description="Clean text with [MM:SS] markers every 2 minutes for easy navigation"
          />
        </motion.div>

        {/* Code viewer */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-surface-light border border-surface-lighter rounded-xl overflow-hidden"
        >
          {/* Tabs */}
          <div className="flex items-center border-b border-surface-lighter overflow-x-auto">
            {implementationFiles.map((file, index) => (
              <button
                key={file.name}
                onClick={() => setActiveTab(index)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === index
                    ? 'text-white bg-surface border-b-2 border-primary'
                    : 'text-slate-400 hover:text-white hover:bg-surface/50'
                }`}
              >
                <FileCode2 size={16} />
                {file.name}
              </button>
            ))}
            <div className="ml-auto px-4">
              <button
                onClick={handleCopy}
                className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-surface"
              >
                {copied ? '✓ Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>

          {/* File path */}
          <div className="px-4 py-2 bg-surface border-b border-surface-lighter">
            <span className="text-xs text-slate-500 font-mono">
              {implementationFiles[activeTab].path}
            </span>
          </div>

          {/* Code */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <pre className="code-block p-4 text-slate-300">
              <code
                dangerouslySetInnerHTML={{
                  __html: highlightPython(implementationFiles[activeTab].code),
                }}
              />
            </pre>
          </div>
        </motion.div>

        {/* Error handling matrix */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12"
        >
          <h3 className="text-xl font-semibold text-white mb-6 text-center">Error Handling Coverage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ErrorCard
              title="Invalid URLs"
              description="Regex validates YouTube URL formats (standard, shortened, shorts) and bare video IDs"
              exception="InvalidURLError"
            />
            <ErrorCard
              title="Private / Deleted Videos"
              description="Detects VideoUnavailable and authentication requirements from both APIs"
              exception="VideoUnavailableError"
            />
            <ErrorCard
              title="Missing FFmpeg"
              description="Pre-flight check before yt-dlp and Whisper to provide clear installation instructions"
              exception="FFmpegNotFoundError"
            />
            <ErrorCard
              title="Corrupt / Missing Audio"
              description="Validates file existence, size, and format before attempting transcription"
              exception="AudioFileError"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-surface-light/50 border border-surface-lighter rounded-xl p-5 hover:border-primary/30 transition-colors">
      <div className="mb-3">{icon}</div>
      <h3 className="text-white font-semibold text-sm mb-2">{title}</h3>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function ErrorCard({ title, description, exception }: { title: string; description: string; exception: string }) {
  return (
    <div className="bg-surface-light border border-surface-lighter rounded-xl p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-accent-orange flex-shrink-0 mt-0.5" size={18} />
        <div className="flex-1">
          <h4 className="text-white font-semibold text-sm mb-1">{title}</h4>
          <p className="text-xs text-slate-400 mb-2">{description}</p>
          <code className="text-[10px] px-2 py-0.5 rounded bg-surface text-accent-pink font-mono">
            {exception}
          </code>
        </div>
      </div>
    </div>
  );
}
