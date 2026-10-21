"""
video_notes.cli
~~~~~~~~~~~~~~~
Production-grade CLI for converting videos to structured notes.

Usage:
    python -m video_notes.cli process <SOURCE> [OPTIONS]

Examples:
    # YouTube video with captions
    python -m video_notes.cli process "https://youtube.com/watch?v=dQw4w9WgXcQ"
    
    # Local video file with direct audio upload
    python -m video_notes.cli process video.mp4 --direct-audio
    
    # Custom output path and whisper model
    python -m video_notes.cli process "https://youtu.be/xyz" -o notes.md --whisper-model small
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.markdown import Markdown
from rich.text import Text

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s',
    handlers=[logging.StreamHandler(sys.stderr)]
)
logger = logging.getLogger(__name__)

# Rich console for styled output
console = Console()

# ---------------------------------------------------------------------------
# CLI App
# ---------------------------------------------------------------------------

app = typer.Typer(
    name="video-notes",
    help="Convert YouTube videos or local media files into structured Markdown notes using AI.",
    add_completion=False,
)


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _is_youtube_url(source: str) -> bool:
    """Check if the source is a YouTube URL."""
    source_lower = source.lower()
    return any(domain in source_lower for domain in [
        'youtube.com', 'youtu.be', 'youtube.com/shorts'
    ])


def _sanitize_filename(title: str) -> str:
    """Sanitize a title for use as a filename."""
    # Remove invalid characters
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        title = title.replace(char, '')
    
    # Replace spaces with underscores and limit length
    title = title.strip().replace(' ', '_')[:100]
    return title or 'video_notes'


def _get_video_title(source: str) -> str:
    """
    Extract or generate a title for the video.
    
    For YouTube URLs, this would ideally fetch the actual title.
    For simplicity, we'll use the video ID or filename.
    """
    if _is_youtube_url(source):
        # Extract video ID as fallback title
        from .extractors.youtube import extract_video_id
        try:
            video_id = extract_video_id(source)
            return f"youtube_{video_id}"
        except Exception:
            return "youtube_video"
    else:
        # Use filename without extension
        return Path(source).stem


def _ensure_output_dir(output_path: Path) -> None:
    """Ensure the output directory exists."""
    output_path.parent.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Main command
# ---------------------------------------------------------------------------

@app.command()
def process(
    source: str = typer.Argument(
        help="YouTube URL or path to local media file (.mp4, .mkv, .mp3, .wav)"
    ),
    output: Optional[Path] = typer.Option(
        None,
        "--output", "-o",
        help="Output Markdown file path (default: ./notes/<title>.md)"
    ),
    whisper_model: str = typer.Option(
        "base",
        "--whisper-model",
        help="Whisper model size for transcription (tiny, base, small, medium, large-v3)"
    ),
    direct_audio: bool = typer.Option(
        False,
        "--direct-audio",
        help="Skip transcription and upload audio directly to Gemini (for files > 25MB)"
    ),
    verbose: bool = typer.Option(
        False,
        "--verbose", "-v",
        help="Enable verbose logging"
    ),
) -> None:
    """
    Process a video source and generate structured Markdown notes.
    
    SOURCE can be:
      - A YouTube URL (youtube.com, youtu.be, shorts)
      - A local file path (.mp4, .mkv, .mp3, .wav, etc.)
    """
    # Set log level
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.debug("Verbose logging enabled")
    
    # Validate source exists (for local files)
    if not _is_youtube_url(source):
        source_path = Path(source)
        if not source_path.exists():
            console.print(f"[red]✗ Error:[/red] File not found: {source}")
            raise typer.Exit(1)
        if not source_path.is_file():
            console.print(f"[red]✗ Error:[/red] Not a file: {source}")
            raise typer.Exit(1)
    
    # Determine output path
    if output is None:
        title = _get_video_title(source)
        sanitized = _sanitize_filename(title)
        output = Path("./notes") / f"{sanitized}.md"
    
    _ensure_output_dir(output)
    
    # Display header
    console.print()
    console.print(Panel.fit(
        f"[bold cyan]Video Note Architect[/bold cyan]\n"
        f"[dim]Source:[/dim] {source}\n"
        f"[dim]Output:[/dim] {output}",
        border_style="cyan"
    ))
    console.print()
    
    # Main processing pipeline
    try:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            console=console,
        ) as progress:
            
            # Step 1: Extract content
            task = progress.add_task("[cyan]Extracting content...", total=3)
            
            content = ""
            audio_path = None
            
            if _is_youtube_url(source):
                # YouTube processing
                progress.update(task, description="[cyan]Fetching YouTube transcript...")
                
                from .extractors.youtube import get_youtube_transcript
                content = get_youtube_transcript(source)
                
                # Check if we got audio fallback sentinel
                if content.startswith("__AUDIO_FILE__:"):
                    audio_path = content[len("__AUDIO_FILE__:"):]
                    progress.update(task, description="[cyan]Transcript unavailable, using audio...")
                    
                    if direct_audio:
                        # Skip transcription, use direct upload
                        progress.update(task, description="[cyan]Preparing direct audio upload...")
                    else:
                        # Transcribe with Whisper
                        progress.update(task, description="[cyan]Transcribing audio with Whisper...")
                        from .extractors.whisper_local import transcribe_local_audio
                        content = transcribe_local_audio(
                            audio_path,
                            model_size=whisper_model,
                            cleanup=False  # Keep file for potential direct upload
                        )
                
                progress.advance(task)
            
            else:
                # Local file processing
                progress.update(task, description="[cyan]Processing local file...")
                
                if direct_audio:
                    # Direct audio upload mode
                    audio_path = source
                    progress.update(task, description="[cyan]Preparing direct audio upload...")
                else:
                    # Transcribe with Whisper
                    progress.update(task, description="[cyan]Transcribing with Whisper...")
                    from .extractors.whisper_local import transcribe_local_audio
                    content = transcribe_local_audio(
                        source,
                        model_size=whisper_model,
                        cleanup=False
                    )
                
                progress.advance(task)
            
            # Step 2: Generate notes
            progress.update(task, description="[green]Generating notes with Gemini...")
            
            from .generators.gemini_notes import generate_notes_smart
            
            # Use streaming for real-time output
            if audio_path and direct_audio:
                # Direct audio upload mode
                notes_stream = generate_notes_smart(
                    f"__AUDIO_FILE__:{audio_path}",
                    stream=True
                )
            else:
                # Text mode
                notes_stream = generate_notes_smart(content, stream=True)
            
            progress.advance(task)
            
            # Step 3: Stream output
            progress.update(task, description="[green]Streaming notes...")
            
            console.print()
            console.print("[bold green]Generated Notes:[/bold green]")
            console.print()
            
            # Collect streamed output
            full_notes = ""
            
            for chunk in notes_stream:
                full_notes += chunk
                # Print chunk without newline (streaming effect)
                sys.stdout.write(chunk)
                sys.stdout.flush()
            
            console.print()  # Final newline
            
            # Mark task complete
            progress.update(task, description="[bold green]✓ Complete![/bold green]")
            progress.advance(task)
        
        # Step 4: Save to file
        console.print()
        console.print(f"[dim]Saving to:[/dim] {output}")
        output.write_text(full_notes, encoding='utf-8')
        
        # Success message
        console.print()
        console.print(Panel.fit(
            f"[bold green]✓ Notes generated successfully![/bold green]\n"
            f"[dim]Saved to:[/dim] {output}\n"
            f"[dim]Length:[/dim] {len(full_notes)} characters",
            border_style="green"
        ))
        console.print()
        
    except KeyboardInterrupt:
        console.print("\n[yellow]Interrupted by user[/yellow]")
        raise typer.Exit(130)
    
    except Exception as exc:
        console.print(f"\n[red]✗ Error:[/red] {exc}")
        if verbose:
            console.print_exception()
        raise typer.Exit(1)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    """Main entry point for the CLI."""
    app()


if __name__ == "__main__":
    main()
