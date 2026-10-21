import { motion } from 'framer-motion';
import { Terminal, Copy, Check } from 'lucide-react';
import { useState } from 'react';

// Python syntax highlighting (simplified)
function highlightPython(code: string): string {
  return code
    // Comments
    .replace(/(#.*$)/gm, '<span class="text-slate-500 italic">$1</span>')
    // Strings (triple quotes)
    .replace(/("""[\s\S]*?""")/g, '<span class="text-accent-green">$1</span>')
    // Strings (single/double quotes)
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="text-accent-green">$1</span>')
    // Keywords
    .replace(/\b(from|import|def|class|return|if|else|elif|try|except|raise|with|as|for|in|not|and|or|is|None|True|False)\b/g, '<span class="text-primary-light font-medium">$1</span>')
    // Decorators
    .replace(/(@\w+)/g, '<span class="text-accent-pink">$1</span>')
    // Numbers
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-accent-orange">$1</span>')
    // Function calls
    .replace(/\b(\w+)\s*\(/g, '<span class="text-accent">$1</span>(');
}

const cliCode = `"""
video_notes.cli
~~~~~~~~~~~~~~~
Production-grade CLI for converting videos to structured notes.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn

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
    help="Convert YouTube videos or local media files into structured Markdown notes.",
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
    invalid_chars = '<>:"/\\\\|?*'
    for char in invalid_chars:
        title = title.replace(char, '')
    
    title = title.strip().replace(' ', '_')[:100]
    return title or 'video_notes'


def _get_video_title(source: str) -> str:
    """Extract or generate a title for the video."""
    if _is_youtube_url(source):
        from .extractors.youtube import extract_video_id
        try:
            video_id = extract_video_id(source)
            return f"youtube_{video_id}"
        except Exception:
            return "youtube_video"
    else:
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
        help="YouTube URL or path to local media file"
    ),
    output: Optional[Path] = typer.Option(
        None,
        "--output", "-o",
        help="Output Markdown file path (default: ./notes/<title>.md)"
    ),
    whisper_model: str = typer.Option(
        "base",
        "--whisper-model",
        help="Whisper model size (tiny, base, small, medium, large-v3)"
    ),
    direct_audio: bool = typer.Option(
        False,
        "--direct-audio",
        help="Skip transcription and upload audio directly to Gemini"
    ),
    verbose: bool = typer.Option(
        False,
        "--verbose", "-v",
        help="Enable verbose logging"
    ),
) -> None:
    """Process a video source and generate structured Markdown notes."""
    
    # Set log level
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Validate source exists (for local files)
    if not _is_youtube_url(source):
        source_path = Path(source)
        if not source_path.exists():
            console.print(f"[red]✗ Error:[/red] File not found: {source}")
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
        f"[bold cyan]Video Note Architect[/bold cyan]\\n"
        f"[dim]Source:[/dim] {source}\\n"
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
                progress.update(task, description="[cyan]Fetching YouTube transcript...")
                
                from .extractors.youtube import get_youtube_transcript
                content = get_youtube_transcript(source)
                
                # Check if we got audio fallback sentinel
                if content.startswith("__AUDIO_FILE__:"):
                    audio_path = content[len("__AUDIO_FILE__:"):]
                    
                    if direct_audio:
                        progress.update(task, description="[cyan]Preparing direct audio upload...")
                    else:
                        progress.update(task, description="[cyan]Transcribing audio with Whisper...")
                        from .extractors.whisper_local import transcribe_local_audio
                        content = transcribe_local_audio(
                            audio_path,
                            model_size=whisper_model,
                            cleanup=False
                        )
                
                progress.advance(task)
            
            else:
                progress.update(task, description="[cyan]Processing local file...")
                
                if direct_audio:
                    audio_path = source
                    progress.update(task, description="[cyan]Preparing direct audio upload...")
                else:
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
            
            if audio_path and direct_audio:
                notes_stream = generate_notes_smart(
                    f"__AUDIO_FILE__:{audio_path}",
                    stream=True
                )
            else:
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
                sys.stdout.write(chunk)
                sys.stdout.flush()
            
            console.print()
            
            progress.update(task, description="[bold green]✓ Complete![/bold green]")
            progress.advance(task)
        
        # Step 4: Save to file
        console.print()
        console.print(f"[dim]Saving to:[/dim] {output}")
        output.write_text(full_notes, encoding='utf-8')
        
        # Success message
        console.print()
        console.print(Panel.fit(
            f"[bold green]✓ Notes generated successfully![/bold green]\\n"
            f"[dim]Saved to:[/dim] {output}\\n"
            f"[dim]Length:[/dim] {len(full_notes)} characters",
            border_style="green"
        ))
        console.print()
        
    except KeyboardInterrupt:
        console.print("\\n[yellow]Interrupted by user[/yellow]")
        raise typer.Exit(130)
    
    except Exception as exc:
        console.print(f"\\n[red]✗ Error:[/red] {exc}")
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
    main()`;

const usageExamples = [
  {
    title: 'YouTube Video with Captions',
    command: 'python -m video_notes process "https://youtube.com/watch?v=dQw4w9WgXcQ"',
    description: 'Fetches transcript via YouTube API, generates notes with Gemini',
  },
  {
    title: 'Local Video with Direct Audio Upload',
    command: 'python -m video_notes process video.mp4 --direct-audio',
    description: 'Uploads audio directly to Gemini (skips local transcription)',
  },
  {
    title: 'Custom Output Path & Whisper Model',
    command: 'python -m video_notes process "https://youtu.be/xyz" -o notes.md --whisper-model small',
    description: 'Uses smaller Whisper model for faster transcription',
  },
  {
    title: 'Verbose Mode',
    command: 'python -m video_notes process video.mp4 --verbose',
    description: 'Shows detailed logging for debugging',
  },
];

export default function CLI() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(cliCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="cli" className="py-24 relative">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 right-1/3 w-[500px] h-[500px] bg-accent-orange/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">CLI Interface</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Production-grade command-line interface with rich progress indicators and streaming output.
          </p>
        </motion.div>

        {/* Usage examples */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12"
        >
          {usageExamples.map((example, index) => (
            <div
              key={index}
              className="bg-surface-light border border-surface-lighter rounded-xl p-5 hover:border-accent-orange/30 transition-colors"
            >
              <div className="flex items-start gap-2 mb-3">
                <Terminal className="text-accent-orange flex-shrink-0 mt-0.5" size={18} />
                <h3 className="text-white font-semibold text-sm">{example.title}</h3>
              </div>
              <pre className="code-block bg-surface rounded-lg p-3 text-xs text-slate-300 overflow-x-auto mb-2">
                <code>{example.command}</code>
              </pre>
              <p className="text-xs text-slate-400">{example.description}</p>
            </div>
          ))}
        </motion.div>

        {/* CLI code viewer */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-surface-light border border-surface-lighter rounded-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-lighter">
            <div className="flex items-center gap-2">
              <Terminal className="text-accent-orange" size={18} />
              <span className="text-sm font-semibold text-white">cli.py</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface text-slate-400 font-mono">
                video_notes/cli.py
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-surface"
            >
              {copied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          {/* Code */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <pre className="code-block p-4 text-slate-300">
              <code
                dangerouslySetInnerHTML={{
                  __html: highlightPython(cliCode),
                }}
              />
            </pre>
          </div>
        </motion.div>

        {/* Workflow diagram */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12"
        >
          <h3 className="text-xl font-semibold text-white mb-6 text-center">CLI Workflow</h3>
          <div className="bg-surface-light border border-surface-lighter rounded-xl p-6 max-w-4xl mx-auto">
            <div className="space-y-4">
              <WorkflowStep
                number="1"
                title="Input Validation"
                description="Detect URL vs local file, validate existence, determine output path"
                color="bg-primary"
              />
              <WorkflowStep
                number="2"
                title="Content Extraction"
                description="YouTube transcript → Whisper fallback → Direct audio upload"
                color="bg-accent"
              />
              <WorkflowStep
                number="3"
                title="Note Generation"
                description="Stream Gemini output to terminal with rich progress indicators"
                color="bg-accent-green"
              />
              <WorkflowStep
                number="4"
                title="File Output"
                description="Save complete notes to Markdown file with success confirmation"
                color="bg-accent-orange"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function WorkflowStep({
  number,
  title,
  description,
  color,
}: {
  number: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white font-bold`}>
        {number}
      </div>
      <div className="flex-1">
        <h4 className="text-white font-semibold mb-1">{title}</h4>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
}
