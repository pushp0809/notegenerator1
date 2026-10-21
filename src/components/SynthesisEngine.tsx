import { motion } from 'framer-motion';
import { FileCode2, Upload, Type, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
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

interface FileTab {
  name: string;
  path: string;
  code: string;
}

const synthesisFiles: FileTab[] = [
  {
    name: 'gemini_notes.py',
    path: 'video_notes/generators/gemini_notes.py',
    code: `"""
video_notes.generators.gemini_notes
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Synthesis engine using Google Gemini 2.5 Flash.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Generator, Optional, Union

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-2.5-flash"
DIRECT_UPLOAD_THRESHOLD_MB = 25


class SynthesisError(Exception):
    """Base exception for note synthesis failures."""


class APIKeyError(SynthesisError):
    """Raised when the Gemini API key is missing or invalid."""


class ModelError(SynthesisError):
    """Raised when the model fails to load or respond."""


class FileUploadError(SynthesisError):
    """Raised when file upload to Gemini fails."""


class RateLimitError(SynthesisError):
    """Raised when API rate limits are exceeded."""


def _get_api_key() -> str:
    """Retrieve the Gemini API key from environment variables."""
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()

    if not api_key:
        raise APIKeyError(
            "GEMINI_API_KEY environment variable is not set.\\n"
            "Get your API key at: https://aistudio.google.com/apikey"
        )

    return api_key


def _init_client():
    """Initialize the Gemini client."""
    try:
        from google import genai
    except ImportError:
        raise ModelError(
            "google-genai is not installed.\\n"
            "Install: pip install google-genai"
        )

    api_key = _get_api_key()

    try:
        client = genai.Client(api_key=api_key)
        logger.info("Gemini client initialized (model=%s)", MODEL_NAME)
        return client
    except Exception as exc:
        raise ModelError(f"Failed to initialize client: {exc}") from exc


def _should_use_direct_upload(file_path: str) -> bool:
    """Determine if a file should be uploaded directly to Gemini."""
    path = Path(file_path)

    if not path.exists():
        return False

    file_size_mb = path.stat().st_size / (1024 * 1024)
    return file_size_mb > DIRECT_UPLOAD_THRESHOLD_MB


def generate_notes_from_text(
    text: str,
    stream: bool = False,
) -> Union[str, Generator[str, None, None]]:
    """
    Generate structured notes from transcribed text.
    
    Parameters
    ----------
    text : str
        Raw transcribed text (with timestamps).
    stream : bool
        If True, return a generator for streaming output.
    """
    from ..prompts.note_templates import SYSTEM_INSTRUCTION, USER_PROMPT_TEMPLATE

    client = _init_client()
    user_prompt = USER_PROMPT_TEMPLATE.format(content=text)

    logger.info("Generating notes from text (%d chars)…", len(text))

    try:
        if stream:
            return _stream_text_response(client, user_prompt, SYSTEM_INSTRUCTION)
        else:
            return _generate_text_response(client, user_prompt, SYSTEM_INSTRUCTION)

    except Exception as exc:
        error_msg = str(exc).lower()

        if "rate limit" in error_msg or "quota" in error_msg:
            raise RateLimitError(f"Rate limit exceeded: {exc}") from exc

        if "api key" in error_msg or "unauthorized" in error_msg:
            raise APIKeyError(f"Invalid API key: {exc}") from exc

        raise SynthesisError(f"Note generation failed: {exc}") from exc


def _generate_text_response(client, user_prompt: str, system_instruction: str) -> str:
    """Generate a complete text response (non-streaming)."""
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[
            {"role": "user", "parts": [{"text": user_prompt}]}
        ],
        config={
            "system_instruction": system_instruction,
            "temperature": 0.3,
        },
    )

    if not response.text:
        raise SynthesisError("Gemini returned an empty response.")

    logger.info("Notes generated: %d characters", len(response.text))
    return response.text


def _stream_text_response(
    client,
    user_prompt: str,
    system_instruction: str,
) -> Generator[str, None, None]:
    """Stream text response chunks for real-time rendering."""
    response_stream = client.models.generate_content_stream(
        model=MODEL_NAME,
        contents=[
            {"role": "user", "parts": [{"text": user_prompt}]}
        ],
        config={
            "system_instruction": system_instruction,
            "temperature": 0.3,
        },
    )

    chunk_count = 0
    for chunk in response_stream:
        if chunk.text:
            chunk_count += 1
            yield chunk.text

    logger.info("Streaming complete: %d chunks", chunk_count)


def generate_notes_from_audio(
    file_path: str,
    stream: bool = False,
) -> Union[str, Generator[str, None, None]]:
    """
    Generate notes by uploading audio directly to Gemini.
    
    For files > 25MB, this avoids local transcription compute.
    """
    from ..prompts.note_templates import SYSTEM_INSTRUCTION, USER_PROMPT_AUDIO_TEMPLATE

    client = _init_client()

    # Validate file
    path = Path(file_path)
    if not path.exists():
        raise FileUploadError(f"File not found: {file_path}")

    file_size_mb = path.stat().st_size / (1024 * 1024)
    logger.info("Uploading audio: %s (%.1f MB)", path.name, file_size_mb)

    # Upload file to Gemini
    try:
        uploaded_file = client.files.upload(file=str(path))
        logger.info("File uploaded: %s", uploaded_file.name)
    except Exception as exc:
        raise FileUploadError(f"Upload failed: {exc}") from exc

    # Generate notes
    logger.info("Generating notes from audio…")

    try:
        if stream:
            return _stream_audio_response(client, uploaded_file, USER_PROMPT_AUDIO_TEMPLATE, SYSTEM_INSTRUCTION)
        else:
            return _generate_audio_response(client, uploaded_file, USER_PROMPT_AUDIO_TEMPLATE, SYSTEM_INSTRUCTION)

    except Exception as exc:
        if "rate limit" in str(exc).lower():
            raise RateLimitError(f"Rate limit exceeded: {exc}") from exc
        raise SynthesisError(f"Audio synthesis failed: {exc}") from exc


def _generate_audio_response(
    client,
    uploaded_file,
    user_prompt: str,
    system_instruction: str,
) -> str:
    """Generate notes from uploaded audio file."""
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[
            uploaded_file,
            {"role": "user", "parts": [{"text": user_prompt}]}
        ],
        config={
            "system_instruction": system_instruction,
            "temperature": 0.3,
        },
    )

    if not response.text:
        raise SynthesisError("Gemini returned an empty response.")

    logger.info("Notes from audio: %d characters", len(response.text))
    return response.text


def _stream_audio_response(
    client,
    uploaded_file,
    user_prompt: str,
    system_instruction: str,
) -> Generator[str, None, None]:
    """Stream notes from uploaded audio file."""
    response_stream = client.models.generate_content_stream(
        model=MODEL_NAME,
        contents=[
            uploaded_file,
            {"role": "user", "parts": [{"text": user_prompt}]}
        ],
        config={
            "system_instruction": system_instruction,
            "temperature": 0.3,
        },
    )

    chunk_count = 0
    for chunk in response_stream:
        if chunk.text:
            chunk_count += 1
            yield chunk.text

    logger.info("Audio streaming complete: %d chunks", chunk_count)


def generate_notes(
    input_data: Union[str, Path],
    stream: bool = False,
) -> Union[str, Generator[str, None, None]]:
    """
    Unified interface for note generation.
    
    Automatically selects mode based on input:
    - Audio file > 25MB → direct upload
    - Text or small file → text mode
    """
    if isinstance(input_data, (str, Path)):
        path = Path(input_data)

        if path.exists() and path.is_file():
            if _should_use_direct_upload(str(path)):
                logger.info("Using direct audio upload (file > 25MB)")
                return generate_notes_from_audio(str(path), stream=stream)

    # Treat as text
    if isinstance(input_data, Path):
        input_data = str(input_data)

    return generate_notes_from_text(input_data, stream=stream)


def generate_notes_smart(
    input_data: str,
    stream: bool = False,
) -> Union[str, Generator[str, None, None]]:
    """
    Smart note generation that handles __AUDIO_FILE__ sentinel.
    
    If input starts with "__AUDIO_FILE__:", use direct upload mode.
    """
    if input_data.startswith("__AUDIO_FILE__:"):
        audio_path = input_data[len("__AUDIO_FILE__:"):]
        logger.info("Detected audio sentinel, using direct upload")
        return generate_notes_from_audio(audio_path, stream=stream)

    return generate_notes_from_text(input_data, stream=stream)`,
  },
  {
    name: 'note_templates.py',
    path: 'video_notes/prompts/note_templates.py',
    code: `"""
video_notes.prompts.note_templates
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
System instructions for structured note generation.
"""

SYSTEM_INSTRUCTION = """You are a technical research architect. Convert the raw content into structured, high-yield reference notes. Do not omit technical specifications, framework names, commands, or comparative nuances. Strictly follow this 5-part architecture:

1. **Executive Summary & TL;DR** (3 bullet points with **bold keywords**)
   - Capture the core value proposition and key takeaways
   - Highlight critical technical decisions or innovations
   - Summarize practical impact or use cases

2. **Deep Dive & Core Taxonomy** (Component breakdown, architecture, specs, access)
   - Break down the system/concept into its fundamental components
   - Explain relationships and dependencies between components
   - Include technical specifications, version numbers, and constraints
   - Document access patterns, authentication, or licensing requirements

3. **Markdown Comparison Table** (At least 4-5 columns: Entity, Type/Role, Key Metrics, Access/License)
   - Create a structured comparison of entities, tools, or concepts
   - Include quantitative metrics where available
   - Document licensing, pricing, or access restrictions
   - Use markdown table format for clarity

4. **Practical Implementation / Workflow** (Sequential numbered steps with exact flags or configs)
   - Provide step-by-step implementation guide
   - Include exact command-line flags, configuration snippets, or code examples
   - Document prerequisites and dependencies
   - Highlight common pitfalls or troubleshooting steps

5. **Active-Recall Self-Test** (3 to 5 challenging Q&A pairs)
   - Create questions that test deep understanding, not just recall
   - Include answers that reference specific sections of the notes
   - Focus on comparative analysis, trade-offs, and edge cases
   - Encourage critical thinking about the material

**Formatting Requirements:**
- Use proper markdown hierarchy (# for main sections, ## for subsections)
- Bold key terms and technical specifications
- Use code blocks for commands, configs, and code snippets
- Include inline code formatting for flags, parameters, and file paths
- Maintain technical precision—do not simplify or omit critical details
- Use bullet points and numbered lists for clarity
- Include timestamps [MM:SS] when referencing specific moments in video content

**Quality Standards:**
- No fluff or filler content—every sentence must add value
- Preserve technical terminology and jargon (do not "dumb down")
- Include version numbers, dates, and specific metrics when mentioned
- Flag any ambiguities or areas that need clarification
- Ensure the notes are self-contained and useful without re-watching the video"""

USER_PROMPT_TEMPLATE = """Convert the following content into structured technical reference notes following the 5-part architecture.

---

{content}

---

Generate comprehensive, high-yield notes that a technical professional could use as a quick reference without needing to revisit the original content."""

USER_PROMPT_AUDIO_TEMPLATE = """Analyze the uploaded audio/video file and convert it into structured technical reference notes following the 5-part architecture.

Generate comprehensive, high-yield notes that a technical professional could use as a quick reference without needing to revisit the original content."""`,
  },
];

export default function SynthesisEngine() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(synthesisFiles[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="synthesis" className="py-24 relative">
      <div className="absolute inset-0">
        <div className="absolute bottom-1/3 left-1/4 w-[500px] h-[500px] bg-accent-green/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Synthesis Engine</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Gemini 2.5 Flash integration with dual input modes and streaming support.
          </p>
        </motion.div>

        {/* Input mode comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
        >
          <ModeCard
            icon={<Type className="text-primary-light" size={24} />}
            title="Text Mode"
            description="Pass raw transcribed text directly to Gemini"
            features={[
              'Best for: YouTube videos with captions',
              'Input: Timestamped transcript text',
              'Latency: Low (no file upload)',
              'Cost: Standard API pricing',
            ]}
            code={`generate_notes_from_text(
    text="[00:00] Welcome to...",
    stream=True
)`}
          />
          <ModeCard
            icon={<Upload className="text-accent-green" size={24} />}
            title="Direct Audio Mode"
            description="Upload large audio files directly to Gemini"
            features={[
              'Best for: Files > 25MB without captions',
              'Input: Audio file path (MP3, M4A, WAV)',
              'Latency: Higher (file upload required)',
              'Cost: Standard API pricing',
            ]}
            code={`generate_notes_from_audio(
    file_path="video.mp4",
    stream=True
)`}
          />
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
        >
          <FeatureCard
            icon={<Zap className="text-accent-orange" size={20} />}
            title="Streaming Output"
            description="Real-time terminal rendering with chunk-by-chunk delivery"
          />
          <FeatureCard
            icon={<CheckCircle2 className="text-accent-green" size={20} />}
            title="5-Part Architecture"
            description="Executive summary, deep dive, comparison table, workflow, and self-test"
          />
          <FeatureCard
            icon={<AlertTriangle className="text-accent-pink" size={20} />}
            title="Smart Mode Selection"
            description="Automatic detection of input type and optimal processing mode"
          />
        </motion.div>

        {/* Code viewer */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-surface-light border border-surface-lighter rounded-xl overflow-hidden"
        >
          {/* Tabs */}
          <div className="flex items-center border-b border-surface-lighter overflow-x-auto">
            {synthesisFiles.map((file, index) => (
              <button
                key={file.name}
                onClick={() => setActiveTab(index)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === index
                    ? 'text-white bg-surface border-b-2 border-accent-green'
                    : 'text-slate-400 hover:text-white hover:bg-surface/50'
                }`}
              >
                <FileCode2 size={16} />
                {file.name}
              </button>
            ))}
            <div className="ml-auto px-4">
              <button
                onClick={handleCopy}
                className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-surface"
              >
                {copied ? '✓ Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>

          {/* File path */}
          <div className="px-4 py-2 bg-surface border-b border-surface-lighter">
            <span className="text-xs text-slate-500 font-mono">
              {synthesisFiles[activeTab].path}
            </span>
          </div>

          {/* Code */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <pre className="code-block p-4 text-slate-300">
              <code
                dangerouslySetInnerHTML={{
                  __html: highlightPython(synthesisFiles[activeTab].code),
                }}
              />
            </pre>
          </div>
        </motion.div>

        {/* Note structure preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12"
        >
          <h3 className="text-xl font-semibold text-white mb-6 text-center">Generated Note Structure</h3>
          <div className="bg-surface-light border border-surface-lighter rounded-xl p-6 max-w-4xl mx-auto">
            <div className="space-y-4 text-sm">
              <NoteSection
                number="1"
                title="Executive Summary & TL;DR"
                description="3 bullet points with bold keywords capturing core value and takeaways"
                color="bg-primary"
              />
              <NoteSection
                number="2"
                title="Deep Dive & Core Taxonomy"
                description="Component breakdown, architecture, specs, and access patterns"
                color="bg-accent"
              />
              <NoteSection
                number="3"
                title="Markdown Comparison Table"
                description="4-5 columns: Entity, Type/Role, Key Metrics, Access/License"
                color="bg-accent-green"
              />
              <NoteSection
                number="4"
                title="Practical Implementation / Workflow"
                description="Sequential numbered steps with exact flags and configurations"
                color="bg-accent-orange"
              />
              <NoteSection
                number="5"
                title="Active-Recall Self-Test"
                description="3-5 challenging Q&A pairs testing deep understanding"
                color="bg-accent-pink"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ModeCard({
  icon,
  title,
  description,
  features,
  code,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  code: string;
}) {
  return (
    <div className="bg-surface-light border border-surface-lighter rounded-xl p-6 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0">{icon}</div>
        <div>
          <h3 className="text-white font-semibold mb-1">{title}</h3>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      <ul className="space-y-2 mb-4">
        {features.map((feature, i) => (
          <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
            <span className="text-accent-green mt-0.5">•</span>
            {feature}
          </li>
        ))}
      </ul>
      <pre className="code-block bg-surface rounded-lg p-3 text-xs text-slate-400 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-surface-light/50 border border-surface-lighter rounded-xl p-5 hover:border-accent-green/30 transition-colors">
      <div className="mb-3">{icon}</div>
      <h3 className="text-white font-semibold text-sm mb-2">{title}</h3>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function NoteSection({
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
    <div className="flex items-start gap-3">
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${color} flex items-center justify-center text-white font-bold text-sm`}>
        {number}
      </div>
      <div className="flex-1">
        <h4 className="text-white font-semibold text-sm mb-1">{title}</h4>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
}
