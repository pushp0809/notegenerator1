"""
video_notes.generators
~~~~~~~~~~~~~~~~~~~~~~
Note generation modules using AI synthesis engines.
"""

from .gemini_notes import (
    generate_notes,
    generate_notes_from_text,
    generate_notes_from_audio,
    generate_notes_smart,
)

__all__ = [
    "generate_notes",
    "generate_notes_from_text",
    "generate_notes_from_audio",
    "generate_notes_smart",
]
