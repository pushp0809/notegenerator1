"""
Unit tests for video_notes.generators.gemini_notes
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import os

from video_notes.generators.gemini_notes import (
    generate_notes_from_text,
    generate_notes_from_audio,
    generate_notes_smart,
    APIKeyError,
    ModelError,
    FileUploadError,
    SynthesisError,
    RateLimitError,
)


class TestGenerateNotesFromText:
    """Tests for generate_notes_from_text function."""
    
    @patch.dict(os.environ, {}, clear=True)
    def test_missing_api_key(self):
        """Test that APIKeyError is raised when API key is missing."""
        with pytest.raises(APIKeyError, match="GEMINI_API_KEY"):
            generate_notes_from_text("Test content")
    
    @patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"})
    @patch('video_notes.generators.gemini_notes.genai.Client')
    def test_successful_generation(self, mock_client_class):
        """Test successful note generation from text."""
        # Mock client and response
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        
        mock_response = Mock()
        mock_response.text = "# Generated Notes\n\nThis is the output."
        mock_client.models.generate_content.return_value = mock_response
        
        result = generate_notes_from_text("Test content")
        
        assert "Generated Notes" in result
        assert mock_client.models.generate_content.called
    
    @patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"})
    @patch('video_notes.generators.gemini_notes.genai.Client')
    def test_empty_response(self, mock_client_class):
        """Test that SynthesisError is raised for empty response."""
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        
        mock_response = Mock()
        mock_response.text = ""
        mock_client.models.generate_content.return_value = mock_response
        
        with pytest.raises(SynthesisError, match="empty response"):
            generate_notes_from_text("Test content")
    
    @patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"})
    @patch('video_notes.generators.gemini_notes.genai.Client')
    def test_rate_limit_error(self, mock_client_class):
        """Test that RateLimitError is raised on rate limit."""
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        
        mock_client.models.generate_content.side_effect = Exception("Rate limit exceeded")
        
        with pytest.raises(RateLimitError):
            generate_notes_from_text("Test content")
    
    @patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"})
    @patch('video_notes.generators.gemini_notes.genai.Client')
    def test_streaming_mode(self, mock_client_class):
        """Test streaming note generation."""
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        
        # Mock streaming response
        mock_chunk1 = Mock(text="Part 1")
        mock_chunk2 = Mock(text=" Part 2")
        mock_client.models.generate_content_stream.return_value = [mock_chunk1, mock_chunk2]
        
        result = generate_notes_from_text("Test content", stream=True)
        
        # Should be a generator
        chunks = list(result)
        assert chunks == ["Part 1", " Part 2"]


class TestGenerateNotesFromAudio:
    """Tests for generate_notes_from_audio function."""
    
    def test_file_not_found(self):
        """Test that FileUploadError is raised for missing files."""
        with pytest.raises(FileUploadError, match="not found"):
            generate_notes_from_audio("/nonexistent/audio.mp3")
    
    @patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"})
    @patch('video_notes.generators.gemini_notes.genai.Client')
    def test_successful_audio_upload(self, mock_client_class, tmp_path):
        """Test successful note generation from uploaded audio."""
        # Create a fake audio file
        audio_file = tmp_path / "audio.mp3"
        audio_file.write_bytes(b"fake audio data")
        
        # Mock client
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        
        # Mock file upload
        mock_uploaded_file = Mock()
        mock_uploaded_file.name = "audio.mp3"
        mock_uploaded_file.uri = "https://example.com/audio.mp3"
        mock_client.files.upload.return_value = mock_uploaded_file
        
        # Mock response
        mock_response = Mock()
        mock_response.text = "# Audio Notes\n\nTranscribed from audio."
        mock_client.models.generate_content.return_value = mock_response
        
        result = generate_notes_from_audio(str(audio_file))
        
        assert "Audio Notes" in result
        assert mock_client.files.upload.called
        assert mock_client.models.generate_content.called
    
    @patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"})
    @patch('video_notes.generators.gemini_notes.genai.Client')
    def test_upload_failure(self, mock_client_class, tmp_path):
        """Test that FileUploadError is raised on upload failure."""
        audio_file = tmp_path / "audio.mp3"
        audio_file.write_bytes(b"fake audio data")
        
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        mock_client.files.upload.side_effect = Exception("Upload failed")
        
        with pytest.raises(FileUploadError, match="Upload failed"):
            generate_notes_from_audio(str(audio_file))


class TestGenerateNotesSmart:
    """Tests for generate_notes_smart function."""
    
    @patch('video_notes.generators.gemini_notes.generate_notes_from_text')
    def test_text_input(self, mock_generate):
        """Test that text input is passed to generate_notes_from_text."""
        mock_generate.return_value = "Generated notes"
        
        result = generate_notes_smart("Test content")
        
        assert result == "Generated notes"
        mock_generate.assert_called_once_with("Test content", stream=False)
    
    @patch('video_notes.generators.gemini_notes.generate_notes_from_audio')
    def test_audio_sentinel(self, mock_generate):
        """Test that __AUDIO_FILE__ sentinel triggers audio mode."""
        mock_generate.return_value = "Audio notes"
        
        result = generate_notes_smart("__AUDIO_FILE__:/tmp/audio.mp3")
        
        assert result == "Audio notes"
        mock_generate.assert_called_once_with("/tmp/audio.mp3", stream=False)
    
    @patch('video_notes.generators.gemini_notes.generate_notes_from_text')
    def test_streaming_parameter(self, mock_generate):
        """Test that stream parameter is passed through."""
        mock_generate.return_value = iter(["chunk1", "chunk2"])
        
        result = generate_notes_smart("Test content", stream=True)
        
        mock_generate.assert_called_once_with("Test content", stream=True)
