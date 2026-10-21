"""
video_notes
~~~~~~~~~~~
A production-grade Python CLI tool that converts YouTube videos or local media
files into structured Markdown notes using AI.
"""

from .config import Config, get_config, reload_config, validate_config, load_dotenv

__version__ = "0.1.0"
__author__ = "Video Note Architect"

__all__ = [
    "Config",
    "get_config",
    "reload_config",
    "validate_config",
    "load_dotenv",
]
