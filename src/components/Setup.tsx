import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface CodeBlock {
  title: string;
  filename: string;
  language: string;
  code: string;
}

const setupBlocks: CodeBlock[] = [
  {
    title: '1. Create Project & Virtual Environment',
    filename: 'terminal',
    language: 'bash',
    code: `# Create project directory
mkdir video-note-architect && cd video-note-architect

# Create virtual environment with uv (recommended)
uv venv --python 3.11
source .venv/bin/activate

# Or with standard venv
python3.11 -m venv .venv
source .venv/bin/activate`,
  },
  {
    title: '2. Project Configuration',
    filename: 'pyproject.toml',
    language: 'toml',
    code: `[project]
name = "video-note-architect"
version = "0.1.0"
description = "Convert YouTube videos to structured Markdown notes"
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
]

[project.scripts]
video-notes = "video_notes.cli:app"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"`,
  },
  {
    title: '3. Environment Variables',
    filename: '.env.example',
    language: 'env',
    code: `# Google AI Studio API Key
# Get yours at: https://aistudio.google.com/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Configure whisper model size
# Options: tiny, base, small, medium, large-v3
WHISPER_MODEL_SIZE=base

# Optional: Output directory
OUTPUT_DIR=./notes`,
  },
  {
    title: '4. Create Directory Structure',
    filename: 'terminal',
    language: 'bash',
    code: `# Create all directories
mkdir -p video_notes/{extractors,generators,prompts,utils}

# Create __init__.py files
touch video_notes/__init__.py
touch video_notes/extractors/__init__.py
touch video_notes/generators/__init__.py

# Create module files
touch video_notes/cli.py
touch video_notes/extractors/youtube.py
touch video_notes/extractors/whisper_local.py
touch video_notes/generators/gemini_notes.py
touch video_notes/prompts/note_templates.py
touch video_notes/utils/formatter.py`,
  },
  {
    title: '5. Install Dependencies & Verify',
    filename: 'terminal',
    language: 'bash',
    code: `# Install dependencies
uv pip install -e .

# Copy environment file
cp .env.example .env
# Edit .env with your actual GEMINI_API_KEY

# Verify all imports work
python -c "
from video_notes.extractors.youtube import fetch_youtube_content
from video_notes.extractors.whisper_local import transcribe_audio
from video_notes.generators.gemini_notes import GeminiNoteGenerator
from video_notes.prompts.note_templates import NOTE_SYSTEM_PROMPT
from video_notes.utils.formatter import format_markdown
print('✓ All imports successful!')
"`,
  },
];

export default function Setup() {
  return (
    <section id="setup" className="py-24 relative">
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[300px] bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Quick Start Setup</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Get the project running in 5 minutes. Follow these steps to set up the complete environment.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-6">
          {setupBlocks.map((block, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <CodeBlockCard block={block} />
            </motion.div>
          ))}
        </div>

        {/* Success message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 max-w-3xl mx-auto"
        >
          <div className="bg-gradient-to-r from-accent-green/10 to-accent/10 border border-accent-green/20 rounded-xl p-6 text-center">
            <span className="text-3xl mb-3 block">🎉</span>
            <h4 className="text-white font-semibold mb-2">You're all set!</h4>
            <p className="text-sm text-slate-400">
              Your environment is ready. Run <code className="text-accent bg-surface px-2 py-0.5 rounded">video-notes generate "https://youtube.com/watch?v=..."</code> to start generating notes.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CodeBlockCard({ block }: { block: CodeBlock }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface-light border border-surface-lighter rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-lighter">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-semibold text-white">{block.title}</h4>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface text-slate-400 font-mono">
            {block.filename}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-surface"
        >
          {copied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Code */}
      <pre className="code-block p-4 overflow-x-auto text-slate-300">
        <code>{block.code}</code>
      </pre>
    </div>
  );
}
