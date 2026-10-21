"""
video_notes.config
~~~~~~~~~~~~~~~~~~
Centralized configuration management for API keys and settings.

Supports multiple AI providers:
  - Google Gemini (gemini-2.5-flash)
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude 3)
  - Cohere (Command R+)
  - Mistral AI (Mistral Large)

Usage:
    from video_notes.config import Config
    
    config = Config()
    api_key = config.gemini_api_key
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class ConfigError(Exception):
    """Base exception for configuration errors."""


class MissingAPIKeyError(ConfigError):
    """Raised when a required API key is not set."""


class InvalidConfigError(ConfigError):
    """Raised when configuration values are invalid."""


# ---------------------------------------------------------------------------
# Configuration Dataclass
# ---------------------------------------------------------------------------

@dataclass
class Config:
    """
    Centralized configuration for all AI providers and settings.
    
    API keys are loaded from environment variables with fallback to .env file.
    
    Attributes
    ----------
    gemini_api_key : str
        Google Gemini API key (GEMINI_API_KEY)
    openai_api_key : str, optional
        OpenAI API key (OPENAI_API_KEY)
    anthropic_api_key : str, optional
        Anthropic Claude API key (ANTHROPIC_API_KEY)
    cohere_api_key : str, optional
        Cohere API key (COHERE_API_KEY)
    mistral_api_key : str, optional
        Mistral AI API key (MISTRAL_API_KEY)
    whisper_model_size : str
        Default Whisper model size (WHISPER_MODEL_SIZE)
    output_dir : str
        Default output directory (OUTPUT_DIR)
    log_level : str
        Logging level (LOG_LEVEL)
    """
    
    # AI Provider API Keys
    gemini_api_key: str = field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    openai_api_key: str = field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    anthropic_api_key: str = field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY", ""))
    cohere_api_key: str = field(default_factory=lambda: os.getenv("COHERE_API_KEY", ""))
    mistral_api_key: str = field(default_factory=lambda: os.getenv("MISTRAL_API_KEY", ""))
    
    # Model Settings
    whisper_model_size: str = field(default_factory=lambda: os.getenv("WHISPER_MODEL_SIZE", "base"))
    gemini_model: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
    openai_model: str = field(default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4"))
    anthropic_model: str = field(default_factory=lambda: os.getenv("ANTHROPIC_MODEL", "claude-3-opus-20240229"))
    
    # Application Settings
    output_dir: str = field(default_factory=lambda: os.getenv("OUTPUT_DIR", "./notes"))
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    temperature: float = field(default_factory=lambda: float(os.getenv("TEMPERATURE", "0.3")))
    max_tokens: int = field(default_factory=lambda: int(os.getenv("MAX_TOKENS", "4096")))
    
    # Feature Flags
    enable_streaming: bool = field(default_factory=lambda: os.getenv("ENABLE_STREAMING", "true").lower() == "true")
    enable_caching: bool = field(default_factory=lambda: os.getenv("ENABLE_CACHING", "false").lower() == "true")
    cleanup_temp_files: bool = field(default_factory=lambda: os.getenv("CLEANUP_TEMP_FILES", "true").lower() == "true")
    
    def __post_init__(self):
        """Validate configuration after initialization."""
        self._validate_whisper_model()
        self._validate_temperature()
        self._validate_log_level()
    
    def _validate_whisper_model(self):
        """Validate Whisper model size."""
        valid_models = {"tiny", "base", "small", "medium", "large-v2", "large-v3"}
        if self.whisper_model_size not in valid_models:
            raise InvalidConfigError(
                f"Invalid Whisper model: {self.whisper_model_size}. "
                f"Valid options: {', '.join(sorted(valid_models))}"
            )
    
    def _validate_temperature(self):
        """Validate temperature value."""
        if not 0.0 <= self.temperature <= 2.0:
            raise InvalidConfigError(
                f"Temperature must be between 0.0 and 2.0, got {self.temperature}"
            )
    
    def _validate_log_level(self):
        """Validate log level."""
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if self.log_level.upper() not in valid_levels:
            raise InvalidConfigError(
                f"Invalid log level: {self.log_level}. "
                f"Valid options: {', '.join(sorted(valid_levels))}"
            )
    
    # -----------------------------------------------------------------------
    # API Key Accessors with Validation
    # -----------------------------------------------------------------------
    
    def get_gemini_api_key(self, required: bool = True) -> str:
        """
        Get Gemini API key with validation.
        
        Parameters
        ----------
        required : bool
            If True, raise error when key is missing.
        
        Returns
        -------
        str
            The API key.
        
        Raises
        ------
        MissingAPIKeyError
            If key is missing and required=True.
        """
        if not self.gemini_api_key and required:
            raise MissingAPIKeyError(
                "GEMINI_API_KEY is not set.\n"
                "Get your API key at: https://aistudio.google.com/apikey\n"
                "Then set it: export GEMINI_API_KEY=your_key_here\n"
                "Or add it to your .env file."
            )
        return self.gemini_api_key
    
    def get_openai_api_key(self, required: bool = False) -> Optional[str]:
        """Get OpenAI API key with validation."""
        if not self.openai_api_key and required:
            raise MissingAPIKeyError(
                "OPENAI_API_KEY is not set.\n"
                "Get your API key at: https://platform.openai.com/api-keys"
            )
        return self.openai_api_key or None
    
    def get_anthropic_api_key(self, required: bool = False) -> Optional[str]:
        """Get Anthropic API key with validation."""
        if not self.anthropic_api_key and required:
            raise MissingAPIKeyError(
                "ANTHROPIC_API_KEY is not set.\n"
                "Get your API key at: https://console.anthropic.com/"
            )
        return self.anthropic_api_key or None
    
    def get_cohere_api_key(self, required: bool = False) -> Optional[str]:
        """Get Cohere API key with validation."""
        if not self.cohere_api_key and required:
            raise MissingAPIKeyError(
                "COHERE_API_KEY is not set.\n"
                "Get your API key at: https://dashboard.cohere.com/"
            )
        return self.cohere_api_key or None
    
    def get_mistral_api_key(self, required: bool = False) -> Optional[str]:
        """Get Mistral API key with validation."""
        if not self.mistral_api_key and required:
            raise MissingAPIKeyError(
                "MISTRAL_API_KEY is not set.\n"
                "Get your API key at: https://console.mistral.ai/"
            )
        return self.mistral_api_key or None
    
    # -----------------------------------------------------------------------
    # Utility Methods
    # -----------------------------------------------------------------------
    
    def has_gemini(self) -> bool:
        """Check if Gemini API key is configured."""
        return bool(self.gemini_api_key)
    
    def has_openai(self) -> bool:
        """Check if OpenAI API key is configured."""
        return bool(self.openai_api_key)
    
    def has_anthropic(self) -> bool:
        """Check if Anthropic API key is configured."""
        return bool(self.anthropic_api_key)
    
    def has_cohere(self) -> bool:
        """Check if Cohere API key is configured."""
        return bool(self.cohere_api_key)
    
    def has_mistral(self) -> bool:
        """Check if Mistral API key is configured."""
        return bool(self.mistral_api_key)
    
    def get_available_providers(self) -> list[str]:
        """Get list of configured AI providers."""
        providers = []
        if self.has_gemini():
            providers.append("gemini")
        if self.has_openai():
            providers.append("openai")
        if self.has_anthropic():
            providers.append("anthropic")
        if self.has_cohere():
            providers.append("cohere")
        if self.has_mistral():
            providers.append("mistral")
        return providers
    
    def ensure_output_dir(self) -> Path:
        """Ensure output directory exists and return Path object."""
        output_path = Path(self.output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        return output_path
    
    def to_dict(self) -> dict:
        """Convert config to dictionary (excluding API keys for security)."""
        return {
            "whisper_model_size": self.whisper_model_size,
            "gemini_model": self.gemini_model,
            "openai_model": self.openai_model,
            "anthropic_model": self.anthropic_model,
            "output_dir": self.output_dir,
            "log_level": self.log_level,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "enable_streaming": self.enable_streaming,
            "enable_caching": self.enable_caching,
            "cleanup_temp_files": self.cleanup_temp_files,
            "available_providers": self.get_available_providers(),
        }


# ---------------------------------------------------------------------------
# Singleton Instance
# ---------------------------------------------------------------------------

_config_instance: Optional[Config] = None


def get_config() -> Config:
    """
    Get the global configuration instance.
    
    Returns
    -------
    Config
        The global configuration instance.
    """
    global _config_instance
    if _config_instance is None:
        _config_instance = Config()
        logger.debug("Configuration loaded: %s", _config_instance.to_dict())
    return _config_instance


def reload_config() -> Config:
    """
    Reload configuration from environment variables.
    
    Returns
    -------
    Config
        The reloaded configuration instance.
    """
    global _config_instance
    _config_instance = Config()
    logger.info("Configuration reloaded")
    return _config_instance


# ---------------------------------------------------------------------------
# Convenience Functions
# ---------------------------------------------------------------------------

def load_dotenv(env_file: Optional[str] = None) -> None:
    """
    Load environment variables from .env file.
    
    Parameters
    ----------
    env_file : str, optional
        Path to .env file. Defaults to ".env" in current directory.
    """
    try:
        from dotenv import load_dotenv as _load_dotenv
        
        if env_file is None:
            env_file = ".env"
        
        env_path = Path(env_file)
        if env_path.exists():
            _load_dotenv(env_path)
            logger.info("Loaded environment from: %s", env_path)
        else:
            logger.warning(".env file not found: %s", env_path)
    except ImportError:
        logger.warning(
            "python-dotenv not installed. Install with: pip install python-dotenv"
        )


def validate_config() -> bool:
    """
    Validate that at least one AI provider is configured.
    
    Returns
    -------
    bool
        True if at least one provider is configured.
    
    Raises
    ------
    ConfigError
        If no AI providers are configured.
    """
    config = get_config()
    providers = config.get_available_providers()
    
    if not providers:
        raise ConfigError(
            "No AI providers configured. Set at least one API key:\n"
            "  • GEMINI_API_KEY (recommended)\n"
            "  • OPENAI_API_KEY\n"
            "  • ANTHROPIC_API_KEY\n"
            "  • COHERE_API_KEY\n"
            "  • MISTRAL_API_KEY\n"
            "\n"
            "See .env.example for all available options."
        )
    
    logger.info("Configured providers: %s", ", ".join(providers))
    return True
