"""
video_notes.extractors.whisper_local
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Local speech-to-text transcription using faster-whisper (CTranslate2 backend).

Used as the fallback when YouTube captions are unavailable — receives an
audio file path (from yt-dlp) and returns timestamped text.

Features:
    - Automatic device selection (CPU / CUDA / MPS)
    - INT8 quantisation for fast CPU inference
    - Timestamped output blocks (every 2 minutes)
    - Automatic cleanup of temporary audio files
    - Robust error handling for missing FFmpeg, corrupt files, etc.
"""

from __future__ import annotations

import logging
import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_TIMESTAMP_INTERVAL_SEC = 120  # insert timestamp every 2 minutes
_VALID_MODEL_SIZES = {"tiny", "base", "small", "medium", "large-v2", "large-v3"}
_TEMP_PREFIX = "vna_whisper_"


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class TranscriptionError(Exception):
    """Base exception for transcription failures."""


class ModelLoadError(TranscriptionError):
    """Raised when the Whisper model cannot be loaded."""


class AudioFileError(TranscriptionError):
    """Raised when the audio file is missing, corrupt, or unreadable."""


class FFmpegNotFoundError(TranscriptionError):
    """Raised when FFmpeg is required but not found on the system PATH."""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_timestamp(total_seconds: float) -> str:
    """
    Convert seconds to [HH:MM:SS] or [MM:SS] format.

    Parameters
    ----------
    total_seconds : float
        Time in seconds.

    Returns
    -------
    str
        Formatted timestamp string.
    """
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
    """
    Validate that the audio file exists and is readable.

    Parameters
    ----------
    file_path : str
        Path to the audio file.

    Returns
    -------
    Path
        Resolved Path object.

    Raises
    ------
    AudioFileError
        If the file doesn't exist, is a directory, or is empty.
    """
    path = Path(file_path).resolve()

    if not path.exists():
        raise AudioFileError(f"Audio file not found: {file_path}")

    if path.is_dir():
        raise AudioFileError(f"Path is a directory, not a file: {file_path}")

    if path.stat().st_size == 0:
        raise AudioFileError(f"Audio file is empty (0 bytes): {file_path}")

    # Check for supported audio extensions
    supported = {".mp3", ".m4a", ".wav", ".ogg", ".opus", ".flac", ".webm", ".mp4"}
    if path.suffix.lower() not in supported:
        logger.warning(
            "Unusual audio format: %s. Supported: %s",
            path.suffix, ", ".join(sorted(supported)),
        )

    return path


def _select_device() -> str:
    """
    Automatically select the best available compute device.

    Priority: CUDA > MPS (Apple Silicon) > CPU

    Returns
    -------
    str
        Device string: "cuda", "cpu", or "auto".
    """
    try:
        import torch
        if torch.cuda.is_available():
            logger.info("CUDA detected — using GPU acceleration.")
            return "cuda"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            logger.info("Apple MPS detected — using Metal acceleration.")
            return "cpu"  # faster-whisper doesn't support MPS directly
    except ImportError:
        pass

    logger.info("No GPU detected — using CPU with INT8 quantisation.")
    return "cpu"


def _cleanup_temp_files(file_path: str) -> None:
    """
    Clean up temporary audio files created during the extraction pipeline.

    Only removes files in temporary directories (identified by the temp prefix
    or location in the system temp directory). Never removes user-provided files.

    Parameters
    ----------
    file_path : str
        Path to the file to potentially clean up.
    """
    path = Path(file_path)

    # Safety: only clean up files in temp directories
    temp_dir = Path(tempfile.gettempdir())
    is_in_temp = str(path).startswith(str(temp_dir))
    has_temp_prefix = path.name.startswith(_TEMP_PREFIX) or path.parent.name.startswith("vna_")

    if is_in_temp or has_temp_prefix:
        try:
            if path.is_file():
                path.unlink()
                logger.info("Cleaned up temporary file: %s", path)
            elif path.is_dir():
                shutil.rmtree(path, ignore_errors=True)
                logger.info("Cleaned up temporary directory: %s", path)
        except OSError as exc:
            logger.warning("Failed to clean up %s: %s", path, exc)
    else:
        logger.debug("Skipping cleanup of user file: %s", path)


# ---------------------------------------------------------------------------
# Core transcription
# ---------------------------------------------------------------------------

def _format_segments_with_timestamps(
    segments,
    interval_sec: int = _TIMESTAMP_INTERVAL_SEC,
) -> str:
    """
    Format Whisper segments into timestamped text blocks.

    Inserts a timestamp marker every `interval_sec` seconds.

    Parameters
    ----------
    segments : iterable
        Whisper segment objects with `start`, `end`, and `text` attributes.
    interval_sec : int
        Seconds between timestamp markers.

    Returns
    -------
    str
        Formatted text with periodic timestamps.
    """
    lines: list[str] = []
    next_timestamp_at = 0.0

    for segment in segments:
        start = segment.start
        text = segment.text.strip()

        if not text:
            continue

        # Insert timestamp if we've crossed the interval boundary
        if start >= next_timestamp_at:
            ts = _format_timestamp(start)
            lines.append(f"\n{ts} {text}")
            next_timestamp_at = start + interval_sec
        else:
            # Append to current block
            if lines:
                lines[-1] += f" {text}"
            else:
                lines.append(text)

    return "\n".join(lines).strip()


def transcribe_local_audio(
    file_path: str,
    model_size: str = "base",
    language: Optional[str] = None,
    cleanup: bool = True,
) -> str:
    """
    Transcribe a local audio file using faster-whisper.

    Uses CTranslate2 backend with INT8 quantisation for efficient CPU inference.
    Automatically selects the best available device (CUDA > CPU).

    Parameters
    ----------
    file_path : str
        Path to the audio file (mp3, m4a, wav, etc.).
    model_size : str
        Whisper model size. One of: tiny, base, small, medium, large-v2, large-v3.
        Default: "base" (good balance of speed and accuracy).
    language : str, optional
        Force a specific language code (e.g., "en"). If None, auto-detect.
    cleanup : bool
        Whether to delete the audio file after transcription (only for temp files).
        Default: True.

    Returns
    -------
    str
        Timestamped transcription text.

    Raises
    ------
    AudioFileError
        If the file is missing, empty, or unreadable.
    FFmpegNotFoundError
        If FFmpeg is not installed (required for non-WAV formats).
    ModelLoadError
        If the Whisper model cannot be downloaded or loaded.
    TranscriptionError
        If transcription fails for any other reason.
    """
    # -----------------------------------------------------------------------
    # Pre-flight checks
    # -----------------------------------------------------------------------

    # Validate model size
    if model_size not in _VALID_MODEL_SIZES:
        raise ModelLoadError(
            f"Invalid model size: {model_size!r}. "
            f"Valid options: {', '.join(sorted(_VALID_MODEL_SIZES))}"
        )

    # Validate audio file
    audio_path = _validate_audio_file(file_path)
    file_size_mb = audio_path.stat().st_size / (1024 * 1024)
    logger.info(
        "Transcribing: %s (%.1f MB, model=%s)",
        audio_path.name, file_size_mb, model_size,
    )

    # Check FFmpeg (required for non-WAV formats)
    if audio_path.suffix.lower() != ".wav" and not _check_ffmpeg():
        raise FFmpegNotFoundError(
            "FFmpeg is required to decode audio files but was not found on PATH.\n"
            "faster-whisper needs FFmpeg for MP3, M4A, OGG, and other compressed formats.\n"
            "Install it:\n"
            "  • macOS:   brew install ffmpeg\n"
            "  • Ubuntu:  sudo apt install ffmpeg\n"
            "  • Windows: https://ffmpeg.org/download.html\n"
            "Or convert your file to WAV first."
        )

    # -----------------------------------------------------------------------
    # Load model and transcribe
    # -----------------------------------------------------------------------
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise ModelLoadError(
            "faster-whisper is not installed. Install it with:\n"
            "  pip install faster-whisper"
        )

    device = _select_device()
    compute_type = "float16" if device == "cuda" else "int8"

    logger.info("Loading Whisper model '%s' (device=%s, compute=%s)…",
                model_size, device, compute_type)

    try:
        model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )
    except Exception as exc:
        raise ModelLoadError(
            f"Failed to load Whisper model '{model_size}': {exc}\n"
            "This may be due to:\n"
            "  • Insufficient disk space for model download\n"
            "  • Network issues (model needs to be downloaded first)\n"
            "  • Incompatible system architecture"
        ) from exc

    # Run transcription
    logger.info("Running inference…")
    try:
        transcribe_kwargs = {
            "beam_size": 5,
            "vad_filter": True,          # filter out silence
            "vad_parameters": {
                "min_silence_duration_ms": 500,
            },
        }

        if language:
            transcribe_kwargs["language"] = language

        segments, info = model.transcribe(
            str(audio_path),
            **transcribe_kwargs,
        )

        # Consume segments into a list (they're lazily generated)
        segment_list = list(segments)

        if not segment_list:
            logger.warning("Transcription produced no segments for: %s", audio_path)
            return ""

        detected_lang = info.language
        lang_prob = info.language_probability
        logger.info(
            "Transcription complete: %d segments, detected language=%s (%.0f%%)",
            len(segment_list), detected_lang, lang_prob * 100,
        )

    except Exception as exc:
        error_msg = str(exc).lower()
        if "ffmpeg" in error_msg or "decode" in error_msg:
            raise FFmpegNotFoundError(
                f"FFmpeg error during transcription: {exc}\n"
                "Ensure FFmpeg is installed and supports the audio format."
            ) from exc
        raise TranscriptionError(
            f"Transcription failed: {exc}"
        ) from exc

    # -----------------------------------------------------------------------
    # Format output
    # -----------------------------------------------------------------------
    result = _format_segments_with_timestamps(segment_list)

    # Add metadata header
    header = (
        f"<!-- Transcribed with faster-whisper ({model_size}) | "
        f"Language: {detected_lang} ({lang_prob:.0%}) | "
        f"Segments: {len(segment_list)} -->\n\n"
    )
    result = header + result

    # -----------------------------------------------------------------------
    # Cleanup
    # -----------------------------------------------------------------------
    if cleanup:
        _cleanup_temp_files(str(audio_path))

    logger.info("Transcription output: %d characters", len(result))
    return result


# ---------------------------------------------------------------------------
# Convenience: transcribe from YouTube audio path
# ---------------------------------------------------------------------------

def transcribe_youtube_audio(
    audio_path: str,
    model_size: str = "base",
    cleanup: bool = True,
) -> str:
    """
    Transcribe audio downloaded from YouTube via yt-dlp.

    This is a thin wrapper around `transcribe_local_audio` that handles
    the sentinel value returned by `youtube._fallback_to_audio()`.

    Parameters
    ----------
    audio_path : str
        Path to the audio file, or the sentinel "__AUDIO_FILE__:<path>".
    model_size : str
        Whisper model size.
    cleanup : bool
        Whether to delete the audio file after transcription.

    Returns
    -------
    str
        Timestamped transcription text.
    """
    # Handle sentinel from youtube.py fallback
    if audio_path.startswith("__AUDIO_FILE__:"):
        audio_path = audio_path[len("__AUDIO_FILE__:"):]

    return transcribe_local_audio(
        file_path=audio_path,
        model_size=model_size,
        cleanup=cleanup,
    )
