"""
Unit tests for video_notes.config
"""

import pytest
import os
from unittest.mock import patch

from video_notes.config import (
    Config,
    ConfigError,
    MissingAPIKeyError,
    InvalidConfigError,
    get_config,
    reload_config,
    validate_config,
)


class TestConfig:
    """Tests for Config dataclass."""

    def test_default_values(self):
        """Test that default values are set correctly."""
        config = Config()
        assert config.whisper_model_size == "base"
        assert config.gemini_model == "gemini-2.5-flash"
        assert config.output_dir == "./notes"
        assert config.log_level == "INFO"
        assert config.temperature == 0.3
        assert config.enable_streaming is True
        assert config.cleanup_temp_files is True

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test_key_123"})
    def test_api_key_from_env(self):
        """Test that API keys are loaded from environment."""
        config = Config()
        assert config.gemini_api_key == "test_key_123"

    @patch.dict(os.environ, {
        "GEMINI_API_KEY": "gemini_key",
        "OPENAI_API_KEY": "openai_key",
        "ANTHROPIC_API_KEY": "anthropic_key",
    })
    def test_multiple_api_keys(self):
        """Test that multiple API keys can be loaded."""
        config = Config()
        assert config.gemini_api_key == "gemini_key"
        assert config.openai_api_key == "openai_key"
        assert config.anthropic_api_key == "anthropic_key"

    def test_get_gemini_api_key_required(self):
        """Test that get_gemini_api_key raises error when required and missing."""
        config = Config()
        with pytest.raises(MissingAPIKeyError, match="GEMINI_API_KEY"):
            config.get_gemini_api_key(required=True)

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"})
    def test_get_gemini_api_key_present(self):
        """Test that get_gemini_api_key returns key when present."""
        config = Config()
        assert config.get_gemini_api_key(required=True) == "test_key"

    def test_get_openai_api_key_optional(self):
        """Test that get_openai_api_key returns None when missing."""
        config = Config()
        assert config.get_openai_api_key(required=False) is None

    def test_get_openai_api_key_required_missing(self):
        """Test that get_openai_api_key raises error when required and missing."""
        config = Config()
        with pytest.raises(MissingAPIKeyError, match="OPENAI_API_KEY"):
            config.get_openai_api_key(required=True)

    def test_has_gemini(self):
        """Test has_gemini method."""
        config = Config()
        assert config.has_gemini() is False

        with patch.dict(os.environ, {"GEMINI_API_KEY": "key"}):
            config = Config()
            assert config.has_gemini() is True

    def test_get_available_providers(self):
        """Test get_available_providers method."""
        with patch.dict(os.environ, {
            "GEMINI_API_KEY": "key1",
            "OPENAI_API_KEY": "key2",
        }):
            config = Config()
            providers = config.get_available_providers()
            assert "gemini" in providers
            assert "openai" in providers
            assert "anthropic" not in providers

    def test_invalid_whisper_model(self):
        """Test that invalid Whisper model raises error."""
        with patch.dict(os.environ, {"WHISPER_MODEL_SIZE": "invalid_model"}):
            with pytest.raises(InvalidConfigError, match="Invalid Whisper model"):
                Config()

    def test_invalid_temperature(self):
        """Test that invalid temperature raises error."""
        with patch.dict(os.environ, {"TEMPERATURE": "5.0"}):
            with pytest.raises(InvalidConfigError, match="Temperature must be"):
                Config()

    def test_invalid_log_level(self):
        """Test that invalid log level raises error."""
        with patch.dict(os.environ, {"LOG_LEVEL": "INVALID"}):
            with pytest.raises(InvalidConfigError, match="Invalid log level"):
                Config()

    def test_to_dict_excludes_api_keys(self):
        """Test that to_dict excludes API keys for security."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": "secret_key"}):
            config = Config()
            config_dict = config.to_dict()
            assert "gemini_api_key" not in config_dict
            assert "openai_api_key" not in config_dict
            assert "whisper_model_size" in config_dict
            assert "available_providers" in config_dict

    def test_ensure_output_dir(self, tmp_path):
        """Test that ensure_output_dir creates directory."""
        output_dir = tmp_path / "test_notes"
        with patch.dict(os.environ, {"OUTPUT_DIR": str(output_dir)}):
            config = Config()
            result = config.ensure_output_dir()
            assert result.exists()
            assert result.is_dir()


class TestConfigSingleton:
    """Tests for config singleton pattern."""

    def test_get_config_returns_same_instance(self):
        """Test that get_config returns the same instance."""
        config1 = get_config()
        config2 = get_config()
        assert config1 is config2

    def test_reload_config_creates_new_instance(self):
        """Test that reload_config creates a new instance."""
        config1 = get_config()
        config2 = reload_config()
        assert config1 is not config2


class TestValidateConfig:
    """Tests for validate_config function."""

    def test_validate_config_no_providers(self):
        """Test that validate_config raises error when no providers configured."""
        # Clear all API keys
        env_vars = {
            "GEMINI_API_KEY": "",
            "OPENAI_API_KEY": "",
            "ANTHROPIC_API_KEY": "",
            "COHERE_API_KEY": "",
            "MISTRAL_API_KEY": "",
        }
        with patch.dict(os.environ, env_vars, clear=False):
            reload_config()
            with pytest.raises(ConfigError, match="No AI providers configured"):
                validate_config()

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"})
    def test_validate_config_with_provider(self):
        """Test that validate_config succeeds when at least one provider configured."""
        reload_config()
        assert validate_config() is True


class TestConfigIntegration:
    """Integration tests for config with other modules."""

    @patch.dict(os.environ, {
        "GEMINI_API_KEY": "test_key",
        "GEMINI_MODEL": "gemini-2.5-flash",
        "TEMPERATURE": "0.5",
    })
    def test_config_integration_with_gemini(self):
        """Test that config integrates properly with Gemini module."""
        from video_notes.generators.gemini_notes import get_config as gemini_get_config
        
        config = gemini_get_config()
        assert config.gemini_api_key == "test_key"
        assert config.gemini_model == "gemini-2.5-flash"
        assert config.temperature == 0.5

    @patch.dict(os.environ, {"WHISPER_MODEL_SIZE": "small"})
    def test_config_integration_with_whisper(self):
        """Test that config integrates properly with Whisper module."""
        from video_notes.extractors.whisper_local import get_config as whisper_get_config
        
        config = whisper_get_config()
        assert config.whisper_model_size == "small"
