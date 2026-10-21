"""
Unit tests for video_notes.extractors.whisper_local
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

from video_notes.extractors.whisper_local import (
    transcribe_local_audio,
    transcribe_youtube_audio,
    AudioFileError,
    ModelLoadError,
    FFmpegNotFoundError,
    TranscriptionError,
)


class TestTranscribeLocalAudio:
    """Tests for transcribe_local_audio function."""
    
    def test_invalid_model_size(self):
        """Test that invalid model size raises ModelLoadError."""
        with pytest.raises(ModelLoadError, match="Invalid model"):
            transcribe_local_audio("/tmp/audio.mp3", model_size="invalid")
    
    def test_file_not_found(self):
        """Test that AudioFileError is raised for missing files."""
        with pytest.raises(AudioFileError, match="not found"):
            transcribe_local_audio("/nonexistent/audio.mp3")
    
    def test_empty_file(self, tmp_path):
        """Test that AudioFileError is raised for empty files."""
        empty_file = tmp_path / "empty.mp3"
        empty_file.write_bytes(b"")
        
        with pytest.raises(AudioFileError, match="empty"):
            transcribe_local_audio(str(empty_file))
    
    @patch('video_notes.extractors.whisper_local.shutil.which')
    def test_ffmpeg_not_found_for_mp3(self, mock_which, tmp_path):
        """Test that FFmpegNotFoundError is raised for MP3 without FFmpeg."""
        mock_which.return_value = None
        
        # Create a fake audio file
        audio_file = tmp_path / "audio.mp3"
        audio_file.write_bytes(b"fake audio data")
        
        with pytest.raises(FFmpegNotFoundError):
            transcribe_local_audio(str(audio_file))
    
    @patch('video_notes.extractors.whisper_local.shutil.which')
    @patch('video_notes.extractors.whisper_local.WhisperModel')
    def test_successful_transcription(self, mock_model_class, mock_which, tmp_path):
        """Test successful audio transcription."""
        mock_which.return_value = "/usr/bin/ffmpeg"
        
        # Create a fake audio file
        audio_file = tmp_path / "audio.mp3"
        audio_file.write_bytes(b"fake audio data")
        
        # Mock Whisper model
        mock_model = Mock()
        mock_model_class.return_value = mock_model
        
        # Mock transcription result
        mock_segment1 = Mock(start=0.0, text="Hello world")
        mock_segment2 = Mock(start=125.0, text="This is a test")
        mock_info = Mock(language="en", language_probability=0.95)
        
        mock_model.transcribe.return_value = ([mock_segment1, mock_segment2], mock_info)
        
        result = transcribe_local_audio(str(audio_file), model_size="base")
        
        assert "Hello world" in result
        assert "This is a test" in result
        assert "[00:00]" in result
        assert "[02:05]" in result  # 125 seconds = 2:05
        assert "en" in result  # Language info
    
    @patch('video_notes.extractors.whisper_local.shutil.which')
    @patch('video_notes.extractors.whisper_local.WhisperModel')
    def test_model_load_error(self, mock_model_class, mock_which, tmp_path):
        """Test that ModelLoadError is raised when model fails to load."""
        mock_which.return_value = "/usr/bin/ffmpeg"
        
        audio_file = tmp_path / "audio.mp3"
        audio_file.write_bytes(b"fake audio data")
        
        mock_model_class.side_effect = Exception("Model download failed")
        
        with pytest.raises(ModelLoadError, match="Failed to load"):
            transcribe_local_audio(str(audio_file))
    
    @patch('video_notes.extractors.whisper_local.shutil.which')
    @patch('video_notes.extractors.whisper_local.WhisperModel')
    def test_transcription_error(self, mock_model_class, mock_which, tmp_path):
        """Test that TranscriptionError is raised on transcription failure."""
        mock_which.return_value = "/usr/bin/ffmpeg"
        
        audio_file = tmp_path / "audio.mp3"
        audio_file.write_bytes(b"fake audio data")
        
        mock_model = Mock()
        mock_model_class.return_value = mock_model
        mock_model.transcribe.side_effect = Exception("Transcription failed")
        
        with pytest.raises(TranscriptionError, match="failed"):
            transcribe_local_audio(str(audio_file))
    
    @patch('video_notes.extractors.whisper_local.shutil.which')
    @patch('video_notes.extractors.whisper_local.WhisperModel')
    def test_wav_no_ffmpeg_required(self, mock_model_class, mock_which, tmp_path):
        """Test that WAV files don't require FFmpeg."""
        mock_which.return_value = None  # No FFmpeg
        
        audio_file = tmp_path / "audio.wav"
        audio_file.write_bytes(b"fake audio data")
        
        # Mock successful transcription
        mock_model = Mock()
        mock_model_class.return_value = mock_model
        mock_segment = Mock(start=0.0, text="Test")
        mock_info = Mock(language="en", language_probability=0.9)
        mock_model.transcribe.return_value = ([mock_segment], mock_info)
        
        # Should not raise FFmpegNotFoundError
        result = transcribe_local_audio(str(audio_file))
        assert "Test" in result


class TestTranscribeYoutubeAudio:
    """Tests for transcribe_youtube_audio function."""
    
    @patch('video_notes.extractors.whisper_local.transcribe_local_audio')
    def test_sentinel_handling(self, mock_transcribe):
        """Test that __AUDIO_FILE__ sentinel is handled correctly."""
        mock_transcribe.return_value = "Transcribed text"
        
        result = transcribe_youtube_audio("__AUDIO_FILE__:/tmp/audio.mp3")
        
        assert result == "Transcribed text"
        mock_transcribe.assert_called_once_with(
            file_path="/tmp/audio.mp3",
            model_size="base",
            cleanup=True,
        )
    
    @patch('video_notes.extractors.whisper_local.transcribe_local_audio')
    def test_regular_path(self, mock_transcribe):
        """Test that regular paths are passed through."""
        mock_transcribe.return_value = "Transcribed text"
        
        result = transcribe_youtube_audio("/tmp/audio.mp3")
        
        assert result == "Transcribed text"
        mock_transcribe.assert_called_once_with(
            file_path="/tmp/audio.mp3",
            model_size="base",
            cleanup=True,
        )
