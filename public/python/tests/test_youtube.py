"""
Unit tests for video_notes.extractors.youtube
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path

from video_notes.extractors.youtube import (
    extract_video_id,
    get_youtube_transcript,
    download_audio,
    InvalidURLError,
    VideoUnavailableError,
    FFmpegNotFoundError,
    ExtractionError,
)


class TestExtractVideoId:
    """Tests for extract_video_id function."""
    
    def test_standard_url(self):
        """Test extraction from standard YouTube URL."""
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        assert extract_video_id(url) == "dQw4w9WgXcQ"
    
    def test_shortened_url(self):
        """Test extraction from shortened youtu.be URL."""
        url = "https://youtu.be/dQw4w9WgXcQ"
        assert extract_video_id(url) == "dQw4w9WgXcQ"
    
    def test_shorts_url(self):
        """Test extraction from YouTube Shorts URL."""
        url = "https://www.youtube.com/shorts/dQw4w9WgXcQ"
        assert extract_video_id(url) == "dQw4w9WgXcQ"
    
    def test_url_with_timestamp(self):
        """Test extraction from URL with timestamp parameter."""
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42"
        assert extract_video_id(url) == "dQw4w9WgXcQ"
    
    def test_bare_video_id(self):
        """Test extraction from bare 11-character video ID."""
        video_id = "dQw4w9WgXcQ"
        assert extract_video_id(video_id) == "dQw4w9WgXcQ"
    
    def test_mobile_url(self):
        """Test extraction from mobile YouTube URL."""
        url = "https://m.youtube.com/watch?v=dQw4w9WgXcQ"
        assert extract_video_id(url) == "dQw4w9WgXcQ"
    
    def test_embed_url(self):
        """Test extraction from embed URL."""
        url = "https://www.youtube.com/embed/dQw4w9WgXcQ"
        assert extract_video_id(url) == "dQw4w9WgXcQ"
    
    def test_invalid_url(self):
        """Test that invalid URL raises InvalidURLError."""
        with pytest.raises(InvalidURLError):
            extract_video_id("https://example.com/video")
    
    def test_empty_input(self):
        """Test that empty input raises InvalidURLError."""
        with pytest.raises(InvalidURLError):
            extract_video_id("")
    
    def test_whitespace_handling(self):
        """Test that whitespace is stripped."""
        url = "  https://youtu.be/dQw4w9WgXcQ  "
        assert extract_video_id(url) == "dQw4w9WgXcQ"


class TestGetYouTubeTranscript:
    """Tests for get_youtube_transcript function."""
    
    @patch('video_notes.extractors.youtube.YouTubeTranscriptApi')
    def test_successful_transcript_fetch(self, mock_api):
        """Test successful transcript fetching."""
        # Mock transcript data
        mock_api.get_transcript.return_value = [
            {"text": "Hello", "start": 0.0, "duration": 2.0},
            {"text": "world", "start": 2.0, "duration": 2.0},
            {"text": "This is a test", "start": 4.0, "duration": 3.0},
        ]
        
        result = get_youtube_transcript("dQw4w9WgXcQ")
        
        assert "Hello" in result
        assert "world" in result
        assert "This is a test" in result
        assert "[00:00]" in result  # Timestamp should be present
    
    @patch('video_notes.extractors.youtube.YouTubeTranscriptApi')
    def test_transcripts_disabled_fallback(self, mock_api):
        """Test fallback when transcripts are disabled."""
        from youtube_transcript_api._errors import TranscriptsDisabled
        
        mock_api.get_transcript.side_effect = TranscriptsDisabled("dQw4w9WgXcQ")
        
        with patch('video_notes.extractors.youtube.download_audio') as mock_download:
            mock_download.return_value = "/tmp/audio.mp3"
            
            result = get_youtube_transcript("dQw4w9WgXcQ")
            
            # Should return audio file sentinel
            assert result.startswith("__AUDIO_FILE__:")
            assert "/tmp/audio.mp3" in result
    
    @patch('video_notes.extractors.youtube.YouTubeTranscriptApi')
    def test_video_unavailable(self, mock_api):
        """Test that VideoUnavailableError is raised for private videos."""
        from youtube_transcript_api._errors import VideoUnavailable
        
        mock_api.get_transcript.side_effect = VideoUnavailable("dQw4w9WgXcQ")
        
        with pytest.raises(VideoUnavailableError):
            get_youtube_transcript("dQw4w9WgXcQ")
    
    @patch('video_notes.extractors.youtube.YouTubeTranscriptApi')
    def test_no_transcript_found(self, mock_api):
        """Test fallback when no transcript is found in supported languages."""
        from youtube_transcript_api._errors import NoTranscriptFound
        
        mock_api.get_transcript.side_effect = NoTranscriptFound("dQw4w9WgXcQ")
        
        with patch('video_notes.extractors.youtube.download_audio') as mock_download:
            mock_download.return_value = "/tmp/audio.mp3"
            
            result = get_youtube_transcript("dQw4w9WgXcQ")
            
            # Should return audio file sentinel
            assert result.startswith("__AUDIO_FILE__:")


class TestDownloadAudio:
    """Tests for download_audio function."""
    
    @patch('video_notes.extractors.youtube.shutil.which')
    def test_ffmpeg_not_found(self, mock_which):
        """Test that FFmpegNotFoundError is raised when FFmpeg is missing."""
        mock_which.return_value = None
        
        with pytest.raises(FFmpegNotFoundError):
            download_audio("https://youtube.com/watch?v=dQw4w9WgXcQ")
    
    @patch('video_notes.extractors.youtube.shutil.which')
    @patch('video_notes.extractors.youtube.subprocess.run')
    def test_successful_download(self, mock_run, mock_which, tmp_path):
        """Test successful audio download."""
        mock_which.return_value = "/usr/bin/ffmpeg"
        
        # Mock successful subprocess run
        mock_run.return_value = Mock(returncode=0, stderr="")
        
        # Create a fake audio file
        audio_file = tmp_path / "test.mp3"
        audio_file.write_bytes(b"fake audio data")
        
        with patch('video_notes.extractors.youtube.Path.glob') as mock_glob:
            mock_glob.return_value = [audio_file]
            
            result = download_audio(
                "https://youtube.com/watch?v=dQw4w9WgXcQ",
                output_dir=str(tmp_path)
            )
            
            assert result == str(audio_file.resolve())
            assert mock_run.called
    
    @patch('video_notes.extractors.youtube.shutil.which')
    @patch('video_notes.extractors.youtube.subprocess.run')
    def test_private_video_error(self, mock_run, mock_which):
        """Test that VideoUnavailableError is raised for private videos."""
        mock_which.return_value = "/usr/bin/ffmpeg"
        
        # Mock subprocess failure with private video error
        mock_run.return_value = Mock(
            returncode=1,
            stderr="ERROR: Video is private"
        )
        
        with pytest.raises(VideoUnavailableError):
            download_audio("https://youtube.com/watch?v=dQw4w9WgXcQ")
    
    @patch('video_notes.extractors.youtube.shutil.which')
    @patch('video_notes.extractors.youtube.subprocess.run')
    def test_timeout_error(self, mock_run, mock_which):
        """Test that ExtractionError is raised on timeout."""
        import subprocess
        
        mock_which.return_value = "/usr/bin/ffmpeg"
        mock_run.side_effect = subprocess.TimeoutExpired(cmd="yt-dlp", timeout=300)
        
        with pytest.raises(ExtractionError, match="timed out"):
            download_audio("https://youtube.com/watch?v=dQw4w9WgXcQ")
