"""
video_notes.generators.gemini_notes
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Synthesis engine using Google Gemini 2.5 Flash for structured note generation.

Supports two input modes:
  1. Text mode: Pass raw transcribed text directly in the prompt
  2. Direct audio mode: Upload large audio/video files (>25MB) directly to Gemini

Features:
  - Streaming response support for real-time terminal rendering
  - Automatic mode selection based on input type and size
  - Robust error handling for API failures and rate limits
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Generator, Optional, Union

from ..config import get_config, MissingAPIKeyError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DIRECT_UPLOAD_THRESHOLD_MB = 25  # Upload files > 25MB directly to Gemini
SUPPORTED_AUDIO_EXTENSIONS = {".mp3", ".m4a", ".wav", ".ogg", ".opus", ".flac", ".webm", ".mp4"}


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class SynthesisError(Exception):
    """Base exception for note synthesis failures."""


class APIKeyError(SynthesisError):
    """Raised when the Gemini API key is missing or invalid."""


class ModelError(SynthesisError):
    """Raised when the model fails to load or respond."""


class FileUploadError(SynthesisError):
    """Raised when file upload to Gemini fails."""


class RateLimitError(SynthesisError):
    """Raised when API rate limits are exceeded."""


# ---------------------------------------------------------------------------
# Client initialization
# ---------------------------------------------------------------------------

def _init_client():
    """
    Initialize the Gemini client.

    Returns
    -------
    genai.Client
        Initialized client instance.

    Raises
    ------
    APIKeyError
        If the API key is missing.
    ModelError
        If the client cannot be initialized.
    """
    try:
        from google import genai
    except ImportError:
        raise ModelError(
            "google-genai is not installed.\n"
            "Install it with: pip install google-genai"
        )

    config = get_config()
    api_key = config.get_gemini_api_key(required=True)
    model_name = config.gemini_model

    try:
        client = genai.Client(api_key=api_key)
        logger.info("Gemini client initialized (model=%s)", model_name)
        return client
    except Exception as exc:
        raise ModelError(f"Failed to initialize Gemini client: {exc}") from exc


# ---------------------------------------------------------------------------
# Input mode detection
# ---------------------------------------------------------------------------

def _should_use_direct_upload(file_path: str) -> bool:
    """
    Determine if a file should be uploaded directly to Gemini.

    Files > 25MB are uploaded directly to avoid local transcription compute.

    Parameters
    ----------
    file_path : str
        Path to the audio/video file.

    Returns
    -------
    bool
        True if the file should be uploaded directly.
    """
    path = Path(file_path)

    if not path.exists():
        return False

    file_size_mb = path.stat().st_size / (1024 * 1024)
    return file_size_mb > DIRECT_UPLOAD_THRESHOLD_MB


def _is_audio_file(file_path: str) -> bool:
    """
    Check if a file is a supported audio/video format.

    Parameters
    ----------
    file_path : str
        Path to the file.

    Returns
    -------
    bool
        True if the file has a supported audio/video extension.
    """
    path = Path(file_path)
    return path.suffix.lower() in SUPPORTED_AUDIO_EXTENSIONS


# ---------------------------------------------------------------------------
# Text mode synthesis
# ---------------------------------------------------------------------------

def generate_notes_from_text(
    text: str,
    stream: bool = False,
) -> Union[str, Generator[str, None, None]]:
    """
    Generate structured notes from transcribed text.

    Parameters
    ----------
    text : str
        Raw transcribed text (with timestamps).
    stream : bool
        If True, return a generator that yields text chunks.
        If False, return the complete response as a string.

    Returns
    -------
    str or Generator[str, None, None]
        Generated notes (complete string or streaming chunks).

    Raises
    ------
    SynthesisError
        If the API call fails.
    """
    from .prompts.note_templates import SYSTEM_INSTRUCTION, USER_PROMPT_TEMPLATE

    client = _init_client()

    # Build the prompt
    user_prompt = USER_PROMPT_TEMPLATE.format(content=text)

    logger.info("Generating notes from text (%d chars)…", len(text))

    try:
        if stream:
            return _stream_text_response(client, user_prompt, SYSTEM_INSTRUCTION)
        else:
            return _generate_text_response(client, user_prompt, SYSTEM_INSTRUCTION)

    except Exception as exc:
        error_msg = str(exc).lower()

        if "rate limit" in error_msg or "quota" in error_msg:
            raise RateLimitError(
                "Gemini API rate limit exceeded. Wait a moment and try again.\n"
                f"Details: {exc}"
            ) from exc

        if "api key" in error_msg or "unauthorized" in error_msg:
            raise APIKeyError(
                "Invalid or expired API key.\n"
                "Get a new key at: https://aistudio.google.com/apikey"
            ) from exc

        raise SynthesisError(f"Note generation failed: {exc}") from exc


def _generate_text_response(client, user_prompt: str, system_instruction: str) -> str:
    """Generate a complete text response (non-streaming)."""
    config = get_config()
    response = client.models.generate_content(
        model=config.gemini_model,
        contents=[
            {"role": "user", "parts": [{"text": user_prompt}]}
        ],
        config={
            "system_instruction": system_instruction,
            "temperature": config.temperature,
        },
    )

    if not response.text:
        raise SynthesisError("Gemini returned an empty response.")

    logger.info("Notes generated: %d characters", len(response.text))
    return response.text


def _stream_text_response(
    client,
    user_prompt: str,
    system_instruction: str,
) -> Generator[str, None, None]:
    """Stream text response chunks for real-time rendering."""
    config = get_config()
    response_stream = client.models.generate_content_stream(
        model=config.gemini_model,
        contents=[
            {"role": "user", "parts": [{"text": user_prompt}]}
        ],
        config={
            "system_instruction": system_instruction,
            "temperature": config.temperature,
        },
    )

    chunk_count = 0
    for chunk in response_stream:
        if chunk.text:
            chunk_count += 1
            yield chunk.text

    logger.info("Streaming complete: %d chunks", chunk_count)


# ---------------------------------------------------------------------------
# Direct audio mode synthesis
# ---------------------------------------------------------------------------

def generate_notes_from_audio(
    file_path: str,
    stream: bool = False,
) -> Union[str, Generator[str, None, None]]:
    """
    Generate structured notes by uploading audio directly to Gemini.

    For files > 25MB, this avoids local transcription compute by letting
    Gemini process the audio natively.

    Parameters
    ----------
    file_path : str
        Path to the audio/video file.
    stream : bool
        If True, return a generator that yields text chunks.

    Returns
    -------
    str or Generator[str, None, None]
        Generated notes.

    Raises
    ------
    FileUploadError
        If the file upload fails.
    SynthesisError
        If the API call fails.
    """
    from .prompts.note_templates import SYSTEM_INSTRUCTION, USER_PROMPT_AUDIO_TEMPLATE

    client = _init_client()

    # Validate file
    path = Path(file_path)
    if not path.exists():
        raise FileUploadError(f"File not found: {file_path}")

    if not _is_audio_file(file_path):
        raise FileUploadError(
            f"Unsupported file format: {path.suffix}\n"
            f"Supported: {', '.join(sorted(SUPPORTED_AUDIO_EXTENSIONS))}"
        )

    file_size_mb = path.stat().st_size / (1024 * 1024)
    logger.info("Uploading audio file: %s (%.1f MB)", path.name, file_size_mb)

    # Upload file to Gemini
    try:
        uploaded_file = client.files.upload(file=str(path))
        logger.info("File uploaded: %s (URI=%s)", uploaded_file.name, uploaded_file.uri)
    except Exception as exc:
        raise FileUploadError(
            f"Failed to upload file to Gemini: {exc}\n"
            "This may be due to:\n"
            "  • File too large (max 2GB for Gemini)\n"
            "  • Unsupported format\n"
            "  • Network issues"
        ) from exc

    # Generate notes from uploaded file
    logger.info("Generating notes from audio…")

    try:
        if stream:
            return _stream_audio_response(client, uploaded_file, USER_PROMPT_AUDIO_TEMPLATE, SYSTEM_INSTRUCTION)
        else:
            return _generate_audio_response(client, uploaded_file, USER_PROMPT_AUDIO_TEMPLATE, SYSTEM_INSTRUCTION)

    except Exception as exc:
        error_msg = str(exc).lower()

        if "rate limit" in error_msg or "quota" in error_msg:
            raise RateLimitError(
                "Gemini API rate limit exceeded. Wait a moment and try again."
            ) from exc

        raise SynthesisError(f"Note generation from audio failed: {exc}") from exc


def _generate_audio_response(
    client,
    uploaded_file,
    user_prompt: str,
    system_instruction: str,
) -> str:
    """Generate notes from uploaded audio file (non-streaming)."""
    config = get_config()
    response = client.models.generate_content(
        model=config.gemini_model,
        contents=[
            uploaded_file,
            {"role": "user", "parts": [{"text": user_prompt}]}
        ],
        config={
            "system_instruction": system_instruction,
            "temperature": config.temperature,
        },
    )

    if not response.text:
        raise SynthesisError("Gemini returned an empty response.")

    logger.info("Notes generated from audio: %d characters", len(response.text))
    return response.text


def _stream_audio_response(
    client,
    uploaded_file,
    user_prompt: str,
    system_instruction: str,
) -> Generator[str, None, None]:
    """Stream notes from uploaded audio file."""
    config = get_config()
    response_stream = client.models.generate_content_stream(
        model=config.gemini_model,
        contents=[
            uploaded_file,
            {"role": "user", "parts": [{"text": user_prompt}]}
        ],
        config={
            "system_instruction": system_instruction,
            "temperature": config.temperature,
        },
    )

    chunk_count = 0
    for chunk in response_stream:
        if chunk.text:
            chunk_count += 1
            yield chunk.text

    logger.info("Audio streaming complete: %d chunks", chunk_count)


# ---------------------------------------------------------------------------
# Unified interface
# ---------------------------------------------------------------------------

def generate_notes(
    input_data: Union[str, Path],
    stream: bool = False,
) -> Union[str, Generator[str, None, None]]:
    """
    Unified interface for note generation.

    Automatically selects the best mode based on input type:
    - If input is a file path to audio > 25MB → direct upload mode
    - If input is text or small audio file → text mode

    Parameters
    ----------
    input_data : str or Path
        Either transcribed text or path to an audio file.
    stream : bool
        If True, return a streaming generator.

    Returns
    -------
    str or Generator[str, None, None]
        Generated notes.
    """
    # Check if input is a file path
    if isinstance(input_data, (str, Path)):
        path = Path(input_data)

        if path.exists() and path.is_file():
            # It's a file - check if we should use direct upload
            if _should_use_direct_upload(str(path)):
                logger.info("Using direct audio upload mode (file > 25MB)")
                return generate_notes_from_audio(str(path), stream=stream)
            elif _is_audio_file(str(path)):
                # Small audio file - caller should transcribe first
                logger.warning(
                    "Small audio file detected. Transcribe it first with "
                    "transcribe_local_audio(), then pass the text to generate_notes()."
                )
                raise SynthesisError(
                    "For audio files < 25MB, transcribe them first using "
                    "transcribe_local_audio(), then pass the text to generate_notes()."
                )

    # Treat as text
    if isinstance(input_data, Path):
        input_data = str(input_data)

    return generate_notes_from_text(input_data, stream=stream)


# ---------------------------------------------------------------------------
# Convenience: handle sentinel from youtube.py
# ---------------------------------------------------------------------------

def generate_notes_smart(
    input_data: str,
    stream: bool = False,
) -> Union[str, Generator[str, None, None]]:
    """
    Smart note generation that handles the __AUDIO_FILE__ sentinel.

    If input_data starts with "__AUDIO_FILE__:", extract the path and use
    direct audio upload mode.

    Parameters
    ----------
    input_data : str
        Either transcribed text or "__AUDIO_FILE__:<path>" sentinel.
    stream : bool
        If True, return a streaming generator.

    Returns
    -------
    str or Generator[str, None, None]
        Generated notes.
    """
    # Handle sentinel from youtube.py fallback
    if input_data.startswith("__AUDIO_FILE__:"):
        audio_path = input_data[len("__AUDIO_FILE__:"):]
        logger.info("Detected audio file sentinel, using direct upload mode")
        return generate_notes_from_audio(audio_path, stream=stream)

    # Regular text input
    return generate_notes_from_text(input_data, stream=stream)
