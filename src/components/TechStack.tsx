import { motion } from 'framer-motion';

interface TechItem {
  name: string;
  description: string;
  category: string;
  color: string;
  icon: string;
}

const techItems: TechItem[] = [
  {
    name: 'google-genai',
    description: 'Gemini official SDK — gemini-2.5-flash with 1M+ context window',
    category: 'Synthesis Engine',
    color: 'from-accent-green to-emerald-400',
    icon: '🧠',
  },
  {
    name: 'youtube-transcript-api',
    description: 'Instant caption scraping without downloading media files',
    category: 'Audio Extraction',
    color: 'from-red-500 to-rose-400',
    icon: '📝',
  },
  {
    name: 'yt-dlp',
    description: 'Audio downloader fallback for videos without captions',
    category: 'Audio Extraction',
    color: 'from-accent to-cyan-400',
    icon: '📥',
  },
  {
    name: 'faster-whisper',
    description: 'Local CPU/GPU speech-to-text when captions are absent',
    category: 'Fallback STT',
    color: 'from-accent-orange to-amber-400',
    icon: '🎙️',
  },
  {
    name: 'click / typer',
    description: 'CLI interface framework for command-line argument parsing',
    category: 'CLI Interface',
    color: 'from-primary to-primary-light',
    icon: '⌨️',
  },
  {
    name: 'rich',
    description: 'Terminal UI and beautiful markdown rendering in the console',
    category: 'Terminal UI',
    color: 'from-accent-pink to-fuchsia-400',
    icon: '🎨',
  },
  {
    name: 'pydantic',
    description: 'Structured validation for inputs, outputs, and configurations',
    category: 'Validation',
    color: 'from-violet-500 to-purple-400',
    icon: '🔒',
  },
  {
    name: 'Python 3.11+',
    description: 'Runtime with virtual environment via uv or venv',
    category: 'Runtime',
    color: 'from-yellow-500 to-amber-400',
    icon: '🐍',
  },
];

export default function TechStack() {
  return (
    <section id="tech-stack" className="py-24 relative">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Tech Stack</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Optimized for cost, speed, and context size. Every dependency serves a clear purpose in the pipeline.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {techItems.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group"
            >
              <div className="bg-surface-light border border-surface-lighter rounded-xl p-5 h-full hover:border-primary/50 transition-all hover:-translate-y-1">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r ${item.color} text-white font-medium`}>
                    {item.category}
                  </span>
                </div>
                <h3 className="text-white font-semibold text-sm mb-2 group-hover:text-primary-light transition-colors">
                  {item.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Cost optimization note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 max-w-3xl mx-auto"
        >
          <div className="bg-gradient-to-r from-accent-green/10 to-accent/10 border border-accent-green/20 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <h4 className="text-white font-semibold text-sm mb-1">Cost Optimization Strategy</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The stack is designed to minimize API costs: youtube-transcript-api fetches captions instantly 
                  without downloading media. Gemini 2.5 Flash's free tier handles synthesis. faster-whisper runs 
                  locally as a fallback — zero API cost for transcription when captions aren't available.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
