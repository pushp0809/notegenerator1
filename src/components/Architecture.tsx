import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown } from 'lucide-react';

export default function Architecture() {
  return (
    <section id="architecture" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">System Architecture</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            A modular pipeline that flows from input source through extraction, synthesis, and output formatting.
          </p>
        </motion.div>

        {/* Architecture Flow */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          {/* Desktop flow */}
          <div className="hidden lg:flex items-center justify-between gap-4">
            <ArchNode
              title="Input Source"
              subtitle="YouTube URL / Local File"
              color="from-primary to-primary-light"
              items={['YouTube URLs', 'Local MP4/MP3', 'Audio Files']}
            />
            <FlowArrow />
            <ArchNode
              title="Extractor"
              subtitle="Content Retrieval"
              color="from-accent to-cyan-400"
              items={['Transcript API', 'yt-dlp + Whisper', 'Fallback Chain']}
            />
            <FlowArrow />
            <ArchNode
              title="Synthesis"
              subtitle="Gemini 2.5 Flash"
              color="from-accent-green to-emerald-400"
              items={['1M+ Context', 'Audio Upload', 'Structured Output']}
            />
            <FlowArrow />
            <ArchNode
              title="Output"
              subtitle="Formatted Notes"
              color="from-accent-orange to-amber-400"
              items={['Markdown', 'Terminal Rich', 'File Export']}
            />
          </div>

          {/* Mobile flow */}
          <div className="lg:hidden flex flex-col items-center gap-4">
            <ArchNode
              title="Input Source"
              subtitle="YouTube URL / Local File"
              color="from-primary to-primary-light"
              items={['YouTube URLs', 'Local MP4/MP3', 'Audio Files']}
            />
            <ArrowDown className="text-slate-500" size={24} />
            <ArchNode
              title="Extractor"
              subtitle="Content Retrieval"
              color="from-accent to-cyan-400"
              items={['Transcript API', 'yt-dlp + Whisper', 'Fallback Chain']}
            />
            <ArrowDown className="text-slate-500" size={24} />
            <ArchNode
              title="Synthesis"
              subtitle="Gemini 2.5 Flash"
              color="from-accent-green to-emerald-400"
              items={['1M+ Context', 'Audio Upload', 'Structured Output']}
            />
            <ArrowDown className="text-slate-500" size={24} />
            <ArchNode
              title="Output"
              subtitle="Formatted Notes"
              color="from-accent-orange to-amber-400"
              items={['Markdown', 'Terminal Rich', 'File Export']}
            />
          </div>
        </motion.div>

        {/* Decision tree */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <h3 className="text-xl font-semibold text-white mb-6 text-center">Extraction Decision Flow</h3>
          <div className="bg-surface-light rounded-xl border border-surface-lighter p-6 sm:p-8">
            <div className="space-y-4 text-sm">
              <DecisionRow step="1" condition="Is input a YouTube URL?" yes="Fetch transcript via youtube-transcript-api" no="Proceed to step 2" />
              <DecisionRow step="2" condition="Does the video have captions?" yes="Use transcript text" no="Proceed to step 3" />
              <DecisionRow step="3" condition="Download audio with yt-dlp" yes="Process with faster-whisper" no="Error: Unsupported format" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ArchNode({ title, subtitle, color, items }: { title: string; subtitle: string; color: string; items: string[] }) {
  return (
    <div className="flex-1 min-w-0">
      <div className={`bg-gradient-to-br ${color} p-[1px] rounded-xl`}>
        <div className="bg-surface-light rounded-xl p-5 h-full">
          <h4 className="text-white font-semibold text-sm mb-1">{title}</h4>
          <p className="text-xs text-slate-400 mb-3">{subtitle}</p>
          <ul className="space-y-1.5">
            {items.map((item, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex-shrink-0">
      <ArrowRight className="text-slate-500" size={20} />
    </div>
  );
}

function DecisionRow({ step, condition, yes, no }: { step: string; condition: string; yes: string; no: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg bg-surface/50">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex-shrink-0">
        {step}
      </span>
      <span className="text-white font-medium flex-1">{condition}</span>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 ml-8 sm:ml-0">
        <span className="text-accent-green text-xs">✓ {yes}</span>
        <span className="text-accent-orange text-xs">→ {no}</span>
      </div>
    </div>
  );
}
