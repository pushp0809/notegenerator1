"""
Unit tests for video_notes.cli
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
from typer.testing import CliRunner

from video_notes.cli import app, _is_youtube_url, _sanitize_filename, _get_video_title


runner = CliRunner()


class TestHelperFunctions:
    """Tests for CLI helper functions."""
    
    def test_is_youtube_url_standard(self):
        """Test detection of standard YouTube URLs."""
        assert _is_youtube_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        assert _is_youtube_url("https://youtube.com/watch?v=dQw4w9WgXcQ")
    
    def test_is_youtube_url_shortened(self):
        """Test detection of shortened YouTube URLs."""
        assert _is_youtube_url("https://youtu.be/dQw4w9WgXcQ")
    
    def test_is_youtube_url_shorts(self):
        """Test detection of YouTube Shorts URLs."""
        assert _is_youtube_url("https://www.youtube.com/shorts/dQw4w9WgXcQ")
    
    def test_is_youtube_url_local_file(self):
        """Test that local files are not detected as YouTube URLs."""
        assert not _is_youtube_url("/path/to/video.mp4")
        assert not _is_youtube_url("video.mp3")
    
    def test_sanitize_filename(self):
        """Test filename sanitization."""
        assert _sanitize_filename("Test Video Title") == "Test_Video_Title"
        assert _sanitize_filename("Video: With/Invalid\\Chars") == "Video_WithInvalidChars"
        assert _sanitize_filename("") == "video_notes"
    
    def test_get_video_title_youtube(self):
        """Test title extraction from YouTube URLs."""
        title = _get_video_title("https://youtu.be/dQw4w9WgXcQ")
        assert "youtube_dQw4w9WgXcQ" == title
    
    def test_get_video_title_local(self):
        """Test title extraction from local files."""
        title = _get_video_title("/path/to/my_video.mp4")
        assert title == "my_video"


class TestCLIProcessCommand:
    """Tests for the process command."""
    
    def test_missing_source(self):
        """Test that missing source argument shows error."""
        result = runner.invoke(app, ["process"])
        assert result.exit_code != 0
        assert "Missing argument" in result.stdout or "error" in result.stdout.lower()
    
    def test_nonexistent_local_file(self):
        """Test error handling for nonexistent local files."""
        result = runner.invoke(app, ["process", "/nonexistent/video.mp4"])
        assert result.exit_code == 1
        assert "not found" in result.stdout.lower() or "error" in result.stdout.lower()
    
    @patch('video_notes.cli.get_youtube_transcript')
    @patch('video_notes.cli.generate_notes_smart')
    def test_youtube_url_processing(self, mock_generate, mock_transcript, tmp_path):
        """Test processing a YouTube URL."""
        # Mock transcript
        mock_transcript.return_value = "[00:00] Test transcript"
        
        # Mock note generation
        mock_generate.return_value = iter(["# Notes\n\nGenerated content"])
        
        output_file = tmp_path / "output.md"
        
        result = runner.invoke(app, [
            "process",
            "https://youtu.be/dQw4w9WgXcQ",
            "--output", str(output_file)
        ])
        
        # Check that transcript was fetched
        assert mock_transcript.called
        
        # Check that notes were generated
        assert mock_generate.called
        
        # Check output file was created
        assert output_file.exists()
        assert "Generated content" in output_file.read_text()
    
    @patch('video_notes.cli.transcribe_local_audio')
    @patch('video_notes.cli.generate_notes_smart')
    def test_local_file_processing(self, mock_generate, mock_transcribe, tmp_path):
        """Test processing a local file."""
        # Create a fake video file
        video_file = tmp_path / "test_video.mp4"
        video_file.write_bytes(b"fake video data")
        
        # Mock transcription
        mock_transcribe.return_value = "[00:00] Transcribed content"
        
        # Mock note generation
        mock_generate.return_value = iter(["# Local Notes\n\nContent"])
        
        output_file = tmp_path / "output.md"
        
        result = runner.invoke(app, [
            "process",
            str(video_file),
            "--output", str(output_file)
        ])
        
        # Check that transcription was called
        assert mock_transcribe.called
        
        # Check that notes were generated
        assert mock_generate.called
        
        # Check output file
        assert output_file.exists()
    
    @patch('video_notes.cli.generate_notes_smart')
    def test_direct_audio_mode(self, mock_generate, tmp_path):
        """Test direct audio upload mode."""
        # Create a fake video file
        video_file = tmp_path / "test_video.mp4"
        video_file.write_bytes(b"fake video data")
        
        # Mock note generation
        mock_generate.return_value = iter(["# Direct Audio Notes"])
        
        output_file = tmp_path / "output.md"
        
        result = runner.invoke(app, [
            "process",
            str(video_file),
            "--output", str(output_file),
            "--direct-audio"
        ])
        
        # Check that generate_notes_smart was called with audio sentinel
        call_args = mock_generate.call_args
        assert "__AUDIO_FILE__:" in call_args[0][0] or call_args[1].get('input_data', '').startswith("__AUDIO_FILE__")
    
    @patch('video_notes.cli.get_youtube_transcript')
    @patch('video_notes.cli.generate_notes_smart')
    def test_default_output_path(self, mock_generate, mock_transcript, tmp_path, monkeypatch):
        """Test that default output path is created correctly."""
        # Change to temp directory
        monkeypatch.chdir(tmp_path)
        
        # Mock transcript
        mock_transcript.return_value = "Test transcript"
        
        # Mock note generation
        mock_generate.return_value = iter(["# Notes"])
        
        result = runner.invoke(app, [
            "process",
            "https://youtu.be/dQw4w9WgXcQ"
        ])
        
        # Check that notes directory was created
        notes_dir = tmp_path / "notes"
        assert notes_dir.exists()
        
        # Check that output file was created
        output_files = list(notes_dir.glob("*.md"))
        assert len(output_files) > 0
    
    @patch('video_notes.cli.transcribe_local_audio')
    @patch('video_notes.cli.generate_notes_smart')
    def test_whisper_model_parameter(self, mock_generate, mock_transcribe, tmp_path):
        """Test that whisper model parameter is passed correctly."""
        video_file = tmp_path / "test.mp4"
        video_file.write_bytes(b"fake data")
        
        mock_transcribe.return_value = "Transcript"
        mock_generate.return_value = iter(["# Notes"])
        
        output_file = tmp_path / "output.md"
        
        result = runner.invoke(app, [
            "process",
            str(video_file),
            "--output", str(output_file),
            "--whisper-model", "small"
        ])
        
        # Check that transcribe was called with correct model
        call_args = mock_transcribe.call_args
        assert call_args[1].get('model_size') == "small" or call_args[0][1] == "small"
    
    @patch('video_notes.cli.get_youtube_transcript')
    @patch('video_notes.cli.generate_notes_smart')
    def test_audio_fallback_sentinel(self, mock_generate, mock_transcript, tmp_path):
        """Test handling of __AUDIO_FILE__ sentinel from transcript fallback."""
        # Mock transcript returning audio sentinel
        mock_transcript.return_value = "__AUDIO_FILE__:/tmp/audio.mp3"
        
        # Mock note generation
        mock_generate.return_value = iter(["# Fallback Notes"])
        
        output_file = tmp_path / "output.md"
        
        result = runner.invoke(app, [
            "process",
            "https://youtu.be/dQw4w9WgXcQ",
            "--output", str(output_file)
        ])
        
        # Should handle the sentinel and generate notes
        assert mock_generate.called
    
    @patch('video_notes.cli.get_youtube_transcript')
    @patch('video_notes.cli.generate_notes_smart')
    def test_url_with_query_parameters(self, mock_generate, mock_transcript, tmp_path):
        """Test URL with additional query parameters (like pp=...)."""
        # URL with extra tracking parameters
        url_with_params = "https://www.youtube.com/watch?v=po8ZFG0Xc4Q&pp=ygUKaXAgYWRkcmVzcw%3D%3D"
        
        # Mock transcript
        mock_transcript.return_value = "[00:00] IP Addressing tutorial content"
        
        # Mock note generation
        mock_generate.return_value = iter(["# IP Addressing Notes"])
        
        output_file = tmp_path / "output.md"
        
        result = runner.invoke(app, [
            "process",
            url_with_params,
            "--output", str(output_file)
        ])
        
        # Should successfully extract video ID and process
        assert mock_transcript.called
        assert mock_generate.called
        assert output_file.exists()
        
        # Verify the correct video ID was extracted
        call_args = mock_transcript.call_args
        assert call_args[0][0] == url_with_params  # Full URL passed
