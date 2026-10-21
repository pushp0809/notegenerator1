"""
video_notes.extractors
~~~~~~~~~~~~~~~~~~~~~~
Content ingestion layer — retrieves raw text/audio from YouTube or local files.
"""

from .youtube import get_youtube_transcript, download_audio
from .whisper_local import transcribe_local_audio

__all__ = [
    "get_youtube_transcript",
    "download_audio",
    "transcribe_local_audio",
]
