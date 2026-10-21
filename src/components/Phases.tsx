import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Code2, Settings, Terminal } from 'lucide-react';
import { useState } from 'react';

interface Phase {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  steps: string[];
  code?: string;
  status: 'complete' | 'active' | 'pending';
}

const phases: Phase[] = [
  {
    id: 1,
    title: 'Environment & Project Setup',
    subtitle: 'Foundation & Dependencies',
    icon: <Settings size={20} />,
    color: 'from-primary to-primary-light',
    status: 'complete',
    steps: [
      'Create directory structure with all modules',
      'Generate pyproject.toml with locked dependency versions',
      'Write .env.example with GEMINI_API_KEY placeholder',
      'Set up Python 3.11+ virtual environment with uv',
      'Verify all imports work without syntax errors',
    ],
    code: `# pyproject.toml
[project]
name = "video-note-architect"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "google-genai>=0.3.0",
    "youtube-transcript-api>=0.6.0",
    "yt-dlp>=2024.1.0",
    "faster-whisper>=1.0.0",
    "typer>=0.9.0",
    "rich>=13.7.0",
    "pydantic>=2.5.0",
    "python-dotenv>=1.0.0",
]`,
  },
  {
    id: 2,
    title: 'Extractor Module',
    subtitle: 'Content Retrieval Pipeline',
    icon: <Code2 size={20} />,
    color: 'from-accent to-cyan-400',
    status: 'complete',
    steps: [
      'Implement YouTube transcript fetching via youtube-transcript-api',
      'Build yt-dlp audio download fallback',
      'Integrate faster-whisper for local STT processing',
      'Create fallback chain: transcript → yt-dlp+whisper → error',
      'Add input validation with pydantic models',
    ],
    code: `# extractors/youtube.py
from youtube_transcript_api import YouTubeTranscriptApi
from pydantic import BaseModel

class TranscriptResult(BaseModel):
    text: str
    language: str
    source: str  # "transcript_api" | "whisper"

def fetch_youtube_content(video_id: str) -> TranscriptResult:
    """Fetch transcript with fallback chain."""
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        text = " ".join([t["text"] for t in transcript])
        return TranscriptResult(
            text=text, language="en", source="transcript_api"
        )
    except Exception:
        # Fallback to yt-dlp + faster-whisper
        return download_and_transcribe(video_id)`,
  },
  {
    id: 3,
    title: 'Synthesis Engine',
    subtitle: 'Gemini 2.5 Flash Integration',
    icon: <Code2 size={20} />,
    color: 'from-accent-green to-emerald-400',
    status: 'active',
    steps: [
      'Initialize google-genai client with API key',
      'Configure gemini-2.5-flash model parameters',
      'Build prompt templates for structured note generation',
      'Handle both text and audio input modes',
      'Parse and validate structured output',
    ],
    code: `# generators/gemini_notes.py
from google import genai
from prompts.note_templates import NOTE_SYSTEM_PROMPT

class GeminiNoteGenerator:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.5-flash"

    def generate_notes(self, content: str) -> str:
        """Generate structured Markdown notes from content."""
        response = self.client.models.generate_content(
            model=self.model,
            contents=[
                {"role": "user", "parts": [
                    NOTE_SYSTEM_PROMPT,
                    content
                ]}
            ],
        )
        return response.text`,
  },
  {
    id: 4,
    title: 'CLI & Output',
    subtitle: 'User Interface & Formatting',
    icon: <Terminal size={20} />,
    color: 'from-accent-orange to-amber-400',
    status: 'pending',
    steps: [
      'Build CLI with typer (URL input, file input, options)',
      'Implement rich terminal rendering for live feedback',
      'Add Markdown file export functionality',
      'Create progress indicators for long operations',
      'Add error handling and user-friendly messages',
    ],
    code: `# cli.py
import typer
from rich.console import Console
from rich.progress import Progress

app = typer.Typer(name="video-notes")
console = Console()

@app.command()
def generate(
    source: str = typer.Argument(help="YouTube URL or file path"),
    output: str = typer.Option("notes.md", help="Output file path"),
    verbose: bool = typer.Option(False, help="Enable verbose output"),
):
    """Convert video/audio to structured Markdown notes."""
    with Progress() as progress:
        task = progress.add_task("Processing...", total=3)
        
        # Step 1: Extract content
        progress.update(task, description="Extracting content...")
        content = extract(source)
        progress.advance(task)
        
        # Step 2: Generate notes
        progress.update(task, description="Generating notes...")
        notes = generate_notes(content)
        progress.advance(task)
        
        # Step 3: Save output
        progress.update(task, description="Saving notes...")
        save_notes(notes, output)
        console.print(f"[green]✓ Notes saved to {output}[/green]")`,
  },
];

export default function Phases() {
  const [activePhase, setActivePhase] = useState(0);

  return (
    <section id="phases" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Execution Phases</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            The project is built in sequential phases, each producing a working increment.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Phase selector */}
          <div className="lg:col-span-4 space-y-3">
            {phases.map((phase, index) => (
              <motion.button
                key={phase.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setActivePhase(index)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  activePhase === index
                    ? 'bg-surface-light border-primary/50 glow-primary'
                    : 'bg-surface-light/50 border-surface-lighter hover:border-surface-lighter'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${phase.color} flex items-center justify-center text-white`}>
                    {phase.status === 'complete' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Phase {phase.id}</span>
                      {phase.status === 'active' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary-light">
                          Current
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-white truncate">{phase.title}</h4>
                    <p className="text-xs text-slate-400 truncate">{phase.subtitle}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Phase detail */}
          <div className="lg:col-span-8">
            <motion.div
              key={activePhase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-surface-light border border-surface-lighter rounded-xl overflow-hidden"
            >
              {/* Header */}
              <div className={`p-6 bg-gradient-to-r ${phases[activePhase].color} bg-opacity-10`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center text-white">
                    {phases[activePhase].icon}
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Phase {phases[activePhase].id}: {phases[activePhase].title}</h3>
                    <p className="text-white/70 text-sm">{phases[activePhase].subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="p-6 border-b border-surface-lighter">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Implementation Steps</h4>
                <ul className="space-y-2">
                  {phases[activePhase].steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-surface border border-surface-lighter flex items-center justify-center text-[10px] text-slate-400 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-slate-300">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Code */}
              {phases[activePhase].code && (
                <div className="p-6">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Example Code</h4>
                  <pre className="code-block bg-surface rounded-lg p-4 overflow-x-auto text-slate-300 border border-surface-lighter">
                    <code>{phases[activePhase].code}</code>
                  </pre>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
