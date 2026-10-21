import { motion } from 'framer-motion';
import { TestTube, CheckCircle2, FileCode2 } from 'lucide-react';

interface TestFile {
  name: string;
  path: string;
  testCount: number;
  coverage: string;
  description: string;
}

const testFiles: TestFile[] = [
  {
    name: 'test_youtube.py',
    path: 'tests/test_youtube.py',
    testCount: 14,
    coverage: '95%',
    description: 'Tests for YouTube transcript extraction, video ID parsing, and audio download fallback',
  },
  {
    name: 'test_whisper_local.py',
    path: 'tests/test_whisper_local.py',
    testCount: 9,
    coverage: '92%',
    description: 'Tests for local Whisper transcription, model loading, and FFmpeg detection',
  },
  {
    name: 'test_gemini_notes.py',
    path: 'tests/test_gemini_notes.py',
    testCount: 11,
    coverage: '94%',
    description: 'Tests for Gemini note generation, API key validation, and streaming output',
  },
  {
    name: 'test_cli.py',
    path: 'tests/test_cli.py',
    testCount: 12,
    coverage: '90%',
    description: 'Tests for CLI commands, argument parsing, and workflow orchestration',
  },
];

const mockExample = `@patch('video_notes.extractors.youtube.YouTubeTranscriptApi')
def test_successful_transcript_fetch(self, mock_api):
    """Test successful transcript fetching."""
    # Mock transcript data
    mock_api.get_transcript.return_value = [
        {"text": "Hello", "start": 0.0, "duration": 2.0},
        {"text": "world", "start": 2.0, "duration": 2.0},
    ]
    
    result = get_youtube_transcript("dQw4w9WgXcQ")
    
    assert "Hello" in result
    assert "[00:00]" in result  # Timestamp should be present`;

const cliTestExample = `@patch('video_notes.cli.get_youtube_transcript')
@patch('video_notes.cli.generate_notes_smart')
def test_youtube_url_processing(self, mock_generate, mock_transcript, tmp_path):
    """Test processing a YouTube URL."""
    # Mock transcript
    mock_transcript.return_value = "[00:00] Test transcript"
    
    # Mock note generation
    mock_generate.return_value = iter(["# Notes\\n\\nGenerated content"])
    
    output_file = tmp_path / "output.md"
    
    result = runner.invoke(app, [
        "process",
        "https://youtu.be/dQw4w9WgXcQ",
        "--output", str(output_file)
    ])
    
    # Check that transcript was fetched
    assert mock_transcript.called
    
    # Check output file was created
    assert output_file.exists()`;

// Python syntax highlighting
function highlightPython(code: string): string {
  return code
    .replace(/(#.*$)/gm, '<span class="text-slate-500 italic">$1</span>')
    .replace(/("""[\s\S]*?""")/g, '<span class="text-accent-green">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="text-accent-green">$1</span>')
    .replace(/\b(from|import|def|class|return|if|else|elif|try|except|raise|with|as|for|in|not|and|or|is|None|True|False)\b/g, '<span class="text-primary-light font-medium">$1</span>')
    .replace(/(@\w+)/g, '<span class="text-accent-pink">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-accent-orange">$1</span>')
    .replace(/\b(\w+)\s*\(/g, '<span class="text-accent">$1</span>(');
}

export default function Tests() {
  return (
    <section id="tests" className="py-24 relative">
      <div className="absolute inset-0">
        <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-accent-pink/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Unit Tests</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Comprehensive test suite with mocked dependencies ensuring pipeline integrity.
          </p>
        </motion.div>

        {/* Test stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          <StatCard label="Test Files" value="4" color="text-primary-light" />
          <StatCard label="Total Tests" value="46" color="text-accent" />
          <StatCard label="Avg Coverage" value="93%" color="text-accent-green" />
          <StatCard label="Mock Strategy" value="Full" color="text-accent-orange" />
        </motion.div>

        {/* Test files */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12"
        >
          {testFiles.map((file, index) => (
            <div
              key={index}
              className="bg-surface-light border border-surface-lighter rounded-xl p-5 hover:border-accent-pink/30 transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <FileCode2 className="text-accent-pink flex-shrink-0" size={20} />
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-sm">{file.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{file.path}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-3">{file.description}</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <TestTube size={14} className="text-slate-400" />
                  <span className="text-xs text-slate-300">{file.testCount} tests</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-accent-green" />
                  <span className="text-xs text-accent-green">{file.coverage}</span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Mock examples */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="bg-surface-light border border-surface-lighter rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-lighter">
              <h3 className="text-sm font-semibold text-white">Extractor Mock Example</h3>
              <p className="text-xs text-slate-400">Mocking YouTubeTranscriptApi</p>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <pre className="code-block p-4 text-slate-300 text-xs">
                <code dangerouslySetInnerHTML={{ __html: highlightPython(mockExample) }} />
              </pre>
            </div>
          </div>

          <div className="bg-surface-light border border-surface-lighter rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-lighter">
              <h3 className="text-sm font-semibold text-white">CLI Integration Test</h3>
              <p className="text-xs text-slate-400">Testing the process command</p>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <pre className="code-block p-4 text-slate-300 text-xs">
                <code dangerouslySetInnerHTML={{ __html: highlightPython(cliTestExample) }} />
              </pre>
            </div>
          </div>
        </motion.div>

        {/* Running tests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12"
        >
          <div className="bg-surface-light border border-surface-lighter rounded-xl p-6 max-w-3xl mx-auto">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TestTube className="text-accent-pink" size={20} />
              Running Tests
            </h3>
            <div className="space-y-3">
              <div className="bg-surface rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-2">Run all tests:</p>
                <code className="text-sm text-accent font-mono">pytest</code>
              </div>
              <div className="bg-surface rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-2">Run with coverage:</p>
                <code className="text-sm text-accent font-mono">pytest --cov=video_notes --cov-report=term-missing</code>
              </div>
              <div className="bg-surface rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-2">Run specific test file:</p>
                <code className="text-sm text-accent font-mono">pytest tests/test_cli.py -v</code>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-light border border-surface-lighter rounded-xl p-4 text-center">
      <div className={`text-2xl font-bold ${color} mb-1`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
