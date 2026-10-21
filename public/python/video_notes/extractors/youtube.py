"""
video_notes.extractors.youtube
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
YouTube content ingestion with transcript-first strategy and audio fallback.

Pipeline:
    1. Parse video ID from URL (standard, shortened, or shorts)
    2. Fetch captions via youtube-transcript-api (multi-language)
    3. Merge segments → timestamped text (every 2 min)
    4. On failure → download audio via yt-dlp for Whisper fallback

Error handling covers:
    - Invalid / unrecognisable URLs
    - Private or deleted videos
    - Disabled captions (TranscriptsDisabled)
    - Missing FFmpeg binary (for yt-dlp audio extraction)
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

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Matches YouTube video IDs from:
#   youtube.com/watch?v=ID
#   youtu.be/ID
#   youtube.com/shorts/ID
#   youtube.com/embed/ID
#   youtube.com/v/ID
#   m.youtube.com/watch?v=ID  (mobile)
_VIDEO_ID_RE = re.compile(
    r"(?:https?://)?(?:www\.|m\.)?"          # optional scheme + subdomain
    r"(?:youtube\.com/(?:watch\?(?:.*&)?v=|"  # standard watch URL
    r"shorts/|"                               # shorts URL
    r"embed/|"                                # embed URL
    r"v/)"                                    # old /v/ URL
    r"|youtu\.be/)"                            # shortened URL
    r"([A-Za-z0-9_-]{11})"                    # the 11-char video ID
)

_SUPPORTED_LANGUAGES = ["en", "hi", "zh", "es", "de"]
_TIMESTAMP_INTERVAL_SEC = 120  # insert timestamp every 2 minutes


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class ExtractionError(Exception):
    """Base exception for content extraction failures."""


class InvalidURLError(ExtractionError):
    """Raised when the input cannot be parsed as a YouTube URL or video ID."""


class VideoUnavailableError(ExtractionError):
    """Raised when the video is private, deleted, or otherwise inaccessible."""


class FFmpegNotFoundError(ExtractionError):
    """Raised when FFmpeg is required but not found on the system PATH."""


# ---------------------------------------------------------------------------
# Video ID extraction
# ---------------------------------------------------------------------------

def extract_video_id(url_or_id: str) -> str:
    """
    Extract the 11-character YouTube video ID from a URL or bare ID.

    Supports:
        - https://www.youtube.com/watch?v=dQw4w9WgXcQ
        - https://youtu.be/dQw4w9WgXcQ
        - https://www.youtube.com/shorts/dQw4w9WgXcQ
        - https://youtube.com/watch?v=dQw4w9WgXcQ&t=42
        - dQw4w9WgXcQ  (bare ID)

    Parameters
    ----------
    url_or_id : str
        A YouTube URL or raw 11-character video ID.

    Returns
    -------
    str
        The extracted video ID.

    Raises
    ------
    InvalidURLError
        If the input cannot be parsed.
    """
    url_or_id = url_or_id.strip()

    if not url_or_id:
        raise InvalidURLError("Input is empty — expected a YouTube URL or video ID.")

    # Try regex match against URL patterns
    match = _VIDEO_ID_RE.search(url_or_id)
    if match:
        return match.group(1)

    # Fallback: check if it's a bare 11-char video ID
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", url_or_id):
        return url_or_id

    raise InvalidURLError(
        f"Could not extract a YouTube video ID from: {url_or_id!r}\n"
        "Expected a YouTube URL (youtube.com/watch?v=…, youtu.be/…, "
        "youtube.com/shorts/…) or a bare 11-character video ID."
    )


# ---------------------------------------------------------------------------
# Transcript fetching
# ---------------------------------------------------------------------------

def _format_timestamp(total_seconds: float) -> str:
    """Convert seconds to [HH:MM:SS] or [MM:SS] format."""
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
    """
    Merge raw transcript segments into continuous text with periodic timestamps.

    Each segment from YouTubeTranscriptApi is a dict with keys:
        {"text": str, "start": float, "duration": float}

    A timestamp marker is inserted every `interval_sec` seconds of content.

    Parameters
    ----------
    segments : list[dict]
        Raw transcript segments from the API.
    interval_sec : int
        Seconds between timestamp markers (default: 120 = 2 min).

    Returns
    -------
    str
        Merged text with timestamps.
    """
    if not segments:
        return ""

    lines: list[str] = []
    next_timestamp_at = 0.0  # when to insert the next timestamp

    for seg in segments:
        start = seg.get("start", 0.0)
        text = seg.get("text", "").strip()

        if not text:
            continue

        # Insert timestamp if we've crossed the interval boundary
        if start >= next_timestamp_at:
            ts = _format_timestamp(start)
            lines.append(f"\n{ts} {text}")
            next_timestamp_at = start + interval_sec
        else:
            # Append text to the current line (same timestamp block)
            if lines:
                lines[-1] += f" {text}"
            else:
                lines.append(text)

    return "\n".join(lines).strip()


def get_youtube_transcript(url_or_id: str) -> str:
    """
    Fetch YouTube video transcript as timestamped text.

    Strategy:
        1. Extract video ID from URL
        2. Try youtube-transcript-api with multiple languages
        3. Merge segments into timestamped text (every 2 min)
        4. On failure, fall back to audio download for Whisper processing

    Parameters
    ----------
    url_or_id : str
        YouTube URL or video ID.

    Returns
    -------
    str
        Timestamped transcript text.

    Raises
    ------
    InvalidURLError
        If the URL cannot be parsed.
    VideoUnavailableError
        If the video is private/deleted.
    ExtractionError
        If all extraction methods fail.
    """
    video_id = extract_video_id(url_or_id)
    logger.info("Extracting transcript for video ID: %s", video_id)

    # --- Attempt 1: youtube-transcript-api ---
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api._errors import (
            TranscriptsDisabled,
            NoTranscriptFound,
            VideoUnavailable,
            CouldNotRetrieveTranscript,
        )
    except ImportError:
        logger.warning(
            "youtube-transcript-api not installed. "
            "Falling back to audio download + Whisper."
        )
        return _fallback_to_audio(url_or_id, video_id)

    try:
        logger.info(
            "Fetching transcript (languages: %s)…",
            ", ".join(_SUPPORTED_LANGUAGES),
        )
        transcript = YouTubeTranscriptApi.get_transcript(
            video_id,
            languages=_SUPPORTED_LANGUAGES,
        )

        if not transcript:
            raise ExtractionError(
                f"Transcript API returned empty results for video {video_id}."
            )

        merged = _merge_transcript_segments(transcript)
        logger.info(
            "Transcript fetched: %d segments, %d chars",
            len(transcript),
            len(merged),
        )
        return merged

    except TranscriptsDisabled:
        logger.warning(
            "Captions are disabled for video %s. Falling back to audio.",
            video_id,
        )
        return _fallback_to_audio(url_or_id, video_id)

    except NoTranscriptFound:
        logger.warning(
            "No transcript found in supported languages for %s. "
            "Falling back to audio.",
            video_id,
        )
        return _fallback_to_audio(url_or_id, video_id)

    except VideoUnavailable as exc:
        raise VideoUnavailableError(
            f"Video {video_id} is unavailable (private, deleted, or region-locked): {exc}"
        ) from exc

    except CouldNotRetrieveTranscript as exc:
        logger.warning(
            "Could not retrieve transcript for %s: %s. Falling back to audio.",
            video_id,
            exc,
        )
        return _fallback_to_audio(url_or_id, video_id)


# ---------------------------------------------------------------------------
# Audio download fallback (yt-dlp)
# ---------------------------------------------------------------------------

def _check_ffmpeg() -> bool:
    """Check if FFmpeg is available on the system PATH."""
    return shutil.which("ffmpeg") is not None


def download_audio(url: str, output_dir: Optional[str] = None) -> str:
    """
    Download audio from a YouTube URL using yt-dlp.

    Extracts audio only in the smallest available format (target < 64 kbps)
    to minimise file size for subsequent Whisper processing.

    Parameters
    ----------
    url : str
        Full YouTube URL.
    output_dir : str, optional
        Directory to save the audio file. Defaults to a temporary directory.

    Returns
    -------
    str
        Absolute path to the downloaded audio file.

    Raises
    ------
    FFmpegNotFoundError
        If FFmpeg is not installed (required by yt-dlp for audio extraction).
    ExtractionError
        If the download fails for any reason.
    """
    # Pre-flight: check FFmpeg
    if not _check_ffmpeg():
        raise FFmpegNotFoundError(
            "FFmpeg is required for audio extraction but was not found on PATH.\n"
            "Install it:\n"
            "  • macOS:   brew install ffmpeg\n"
            "  • Ubuntu:  sudo apt install ffmpeg\n"
            "  • Windows: https://ffmpeg.org/download.html"
        )

    # Determine output directory
    if output_dir is None:
        output_dir = tempfile.mkdtemp(prefix="vna_audio_")
    else:
        Path(output_dir).mkdir(parents=True, exist_ok=True)

    output_template = os.path.join(output_dir, "%(id)s.%(ext)s")

    # yt-dlp command: extract best audio under 64 kbps, convert to mp3
    cmd = [
        "yt-dlp",
        "--no-playlist",
        "-x",                          # extract audio only
        "--audio-format", "mp3",       # convert to mp3
        "--audio-quality", "9",        # lowest quality → smallest file
        "-f", "ba[abr<64]/ba/b",      # prefer audio < 64 kbps
        "-o", output_template,
        "--no-warnings",
        "--quiet",
        url,
    ]

    logger.info("Downloading audio: %s", " ".join(cmd))

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5-minute timeout
        )
    except FileNotFoundError:
        raise ExtractionError(
            "yt-dlp is not installed. Install it with: pip install yt-dlp"
        )
    except subprocess.TimeoutExpired:
        raise ExtractionError(
            "Audio download timed out after 300 seconds."
        )

    if result.returncode != 0:
        stderr = result.stderr.strip()
        # Detect common error patterns
        if "Sign in to confirm" in stderr or "private video" in stderr.lower():
            raise VideoUnavailableError(
                f"Video is private or requires authentication: {stderr}"
            )
        if "unable to download" in stderr.lower() or "HTTP Error 404" in stderr:
            raise VideoUnavailableError(
                f"Video not found or unavailable: {stderr}"
            )
        raise ExtractionError(
            f"yt-dlp failed (exit code {result.returncode}): {stderr}"
        )

    # Find the downloaded file
    downloaded_files = list(Path(output_dir).glob("*"))
    audio_files = [
        f for f in downloaded_files
        if f.suffix.lower() in (".mp3", ".m4a", ".ogg", ".opus", ".wav")
    ]

    if not audio_files:
        raise ExtractionError(
            f"Download completed but no audio file found in {output_dir}. "
            f"Files present: {[f.name for f in downloaded_files]}"
        )

    audio_path = str(audio_files[0].resolve())
    logger.info("Audio downloaded to: %s (%.1f MB)", audio_path,
                audio_files[0].stat().st_size / (1024 * 1024))
    return audio_path


def _fallback_to_audio(url: str, video_id: str) -> str:
    """
    Download audio via yt-dlp and return the file path.

    The caller (typically the CLI) is responsible for passing this path
    to `transcribe_local_audio()` for Whisper processing.

    Parameters
    ----------
    url : str
        Original YouTube URL.
    video_id : str
        Extracted video ID (for logging).

    Returns
    -------
    str
        Path to the downloaded audio file.
        Returns a sentinel string if download also fails.
    """
    logger.info("Falling back to audio download for video %s…", video_id)

    try:
        audio_path = download_audio(url)
        # Return a marker that the CLI layer can detect to trigger Whisper
        logger.info("Audio ready for Whisper: %s", audio_path)
        return f"__AUDIO_FILE__:{audio_path}"
    except FFmpegNotFoundError:
        raise  # Re-raise — user needs to install FFmpeg
    except (ExtractionError, VideoUnavailableError) as exc:
        raise ExtractionError(
            f"All extraction methods failed for video {video_id}.\n"
            f"Transcript API: no captions available.\n"
            f"Audio download: {exc}"
        ) from exc
