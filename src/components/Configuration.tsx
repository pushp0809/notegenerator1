import { motion } from 'framer-motion';
import { Key, Shield, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface Provider {
  name: string;
  envVar: string;
  description: string;
  getUrl: string;
  color: string;
  icon: string;
  recommended?: boolean;
}

const providers: Provider[] = [
  {
    name: 'Google Gemini',
    envVar: 'GEMINI_API_KEY',
    description: 'Gemini 2.5 Flash with 1M+ context window. Free tier available.',
    getUrl: 'https://aistudio.google.com/apikey',
    color: 'from-blue-500 to-cyan-400',
    icon: '🧠',
    recommended: true,
  },
  {
    name: 'OpenAI',
    envVar: 'OPENAI_API_KEY',
    description: 'GPT-4 and GPT-3.5 support for alternative note generation.',
    getUrl: 'https://platform.openai.com/api-keys',
    color: 'from-green-500 to-emerald-400',
    icon: '🤖',
  },
  {
    name: 'Anthropic Claude',
    envVar: 'ANTHROPIC_API_KEY',
    description: 'Claude 3 Opus for high-quality reasoning and analysis.',
    getUrl: 'https://console.anthropic.com/',
    color: 'from-orange-500 to-amber-400',
    icon: '🎭',
  },
  {
    name: 'Cohere',
    envVar: 'COHERE_API_KEY',
    description: 'Command R+ for specialized retrieval and summarization.',
    getUrl: 'https://dashboard.cohere.com/',
    color: 'from-purple-500 to-violet-400',
    icon: '🔮',
  },
  {
    name: 'Mistral AI',
    envVar: 'MISTRAL_API_KEY',
    description: 'Mistral Large for efficient European AI processing.',
    getUrl: 'https://console.mistral.ai/',
    color: 'from-red-500 to-rose-400',
    icon: '🌪️',
  },
];

const envExample = `# ============================================================================
# Video Note Architect - Environment Configuration
# ============================================================================
# Copy this file to .env and fill in your API keys
# cp .env.example .env
# ============================================================================

# ============================================================================
# AI Provider API Keys (at least one required)
# ============================================================================

# Google Gemini (Recommended - Free tier available)
# Get your key: https://aistudio.google.com/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI (Optional - for GPT-4 support)
# Get your key: https://platform.openai.com/api-keys
OPENAI_API_KEY=

# Anthropic Claude (Optional - for Claude 3 support)
# Get your key: https://console.anthropic.com/
ANTHROPIC_API_KEY=

# Cohere (Optional - for Command R+ support)
# Get your key: https://dashboard.cohere.com/
COHERE_API_KEY=

# Mistral AI (Optional - for Mistral Large support)
# Get your key: https://console.mistral.ai/
MISTRAL_API_KEY=

# ============================================================================
# Model Configuration
# ============================================================================

# Whisper Model Size (for local transcription)
# Options: tiny, base, small, medium, large-v2, large-v3
WHISPER_MODEL_SIZE=base

# AI Model Selection
GEMINI_MODEL=gemini-2.5-flash
OPENAI_MODEL=gpt-4
ANTHROPIC_MODEL=claude-3-opus-20240229

# ============================================================================
# Application Settings
# ============================================================================

OUTPUT_DIR=./notes
LOG_LEVEL=INFO
TEMPERATURE=0.3
MAX_TOKENS=4096
ENABLE_STREAMING=true`;

export default function Configuration() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(envExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="configuration" className="py-24 relative">
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">API Key Configuration</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Centralized configuration system supporting multiple AI providers. Set up your API keys once, use them everywhere.
          </p>
        </motion.div>

        {/* Provider cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12"
        >
          {providers.map((provider, index) => (
            <motion.div
              key={provider.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {provider.recommended && (
                <div className="absolute -top-2 -right-2 z-10">
                  <span className="px-2 py-1 text-[10px] font-bold bg-accent-green text-white rounded-full">
                    RECOMMENDED
                  </span>
                </div>
              )}
              <div className="bg-surface-light border border-surface-lighter rounded-xl p-5 h-full hover:border-primary/30 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{provider.icon}</span>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-sm">{provider.name}</h3>
                    <code className="text-[10px] text-accent font-mono">{provider.envVar}</code>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-3">{provider.description}</p>
                <a
                  href={provider.getUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-light hover:text-primary transition-colors flex items-center gap-1"
                >
                  Get API Key →
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Setup instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12"
        >
          <div className="bg-surface-light border border-surface-lighter rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Key className="text-primary-light" size={20} />
              Quick Setup
            </h3>
            <div className="space-y-3">
              <Step number="1" text="Copy .env.example to .env" />
              <Step number="2" text="Add your API key(s) to .env" />
              <Step number="3" text="Run the CLI: python -m video_notes process <URL>" />
            </div>
            <div className="mt-4 bg-surface rounded-lg p-3">
              <code className="text-xs text-accent font-mono">
                cp .env.example .env
              </code>
            </div>
          </div>

          <div className="bg-surface-light border border-surface-lighter rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Shield className="text-accent-green" size={20} />
              Security Features
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-accent-green flex-shrink-0 mt-0.5" />
                API keys stored in environment variables (not in code)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-accent-green flex-shrink-0 mt-0.5" />
                .env file automatically loaded on startup
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-accent-green flex-shrink-0 mt-0.5" />
                Keys never logged or exposed in error messages
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-accent-green flex-shrink-0 mt-0.5" />
                Validation ensures at least one provider is configured
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Environment file */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-surface-light border border-surface-lighter rounded-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-lighter">
            <div className="flex items-center gap-2">
              <Key className="text-primary-light" size={18} />
              <span className="text-sm font-semibold text-white">.env.example</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface text-slate-400 font-mono">
                Configuration Template
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-surface"
            >
              {copied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Code */}
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <pre className="code-block p-4 text-slate-300 text-xs">
              <code>{envExample}</code>
            </pre>
          </div>
        </motion.div>

        {/* Usage example */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12"
        >
          <h3 className="text-xl font-semibold text-white mb-6 text-center">Usage in Code</h3>
          <div className="bg-surface-light border border-surface-lighter rounded-xl p-6 max-w-4xl mx-auto">
            <pre className="code-block text-sm text-slate-300 overflow-x-auto">
              <code>{`from video_notes.config import get_config

# Get configuration instance
config = get_config()

# Access API keys
gemini_key = config.get_gemini_api_key(required=True)
openai_key = config.get_openai_api_key(required=False)

# Check available providers
providers = config.get_available_providers()
# ['gemini', 'openai']

# Access model settings
model = config.gemini_model  # 'gemini-2.5-flash'
temperature = config.temperature  # 0.3

# Ensure output directory exists
output_dir = config.ensure_output_dir()`}</code>
            </pre>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
        {number}
      </div>
      <span className="text-sm text-slate-300">{text}</span>
    </div>
  );
}
