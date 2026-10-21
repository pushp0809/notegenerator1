import { motion } from 'framer-motion';
import { Play, FileText, Zap } from 'lucide-react';

export default function Hero() {
  return (
    <section id="overview" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-light border border-surface-lighter mb-8">
            <span className="w-2 h-2 rounded-full bg-accent-green pulse-glow"></span>
            <span className="text-sm text-slate-300">Autonomous Agent Execution Spec</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
            <span className="gradient-text">Video Note</span>
            <br />
            <span className="text-white">Architect</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            A modular Python CLI tool that converts YouTube URLs or local video/audio files into 
            structured Markdown notes using Gemini 2.5 Flash — designed for autonomous coding agents.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <a
              href="#setup"
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium transition-all hover:scale-105 glow-primary"
            >
              View Setup Instructions
            </a>
            <a
              href="#architecture"
              className="px-6 py-3 rounded-xl bg-surface-light border border-surface-lighter hover:border-primary text-white font-medium transition-all hover:scale-105"
            >
              Explore Architecture
            </a>
          </div>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          <FeatureCard
            icon={<Play className="text-accent" size={24} />}
            title="YouTube Extraction"
            description="Instant caption scraping via youtube-transcript-api — no media download needed"
          />
          <FeatureCard
            icon={<Zap className="text-accent-orange" size={24} />}
            title="Gemini 2.5 Flash"
            description="1M+ context window, native audio upload, free tier via Google AI Studio"
          />
          <FeatureCard
            icon={<FileText className="text-accent-green" size={24} />}
            title="Structured Notes"
            description="Beautiful Markdown output with sections, summaries, and key takeaways"
          />
        </motion.div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="gradient-border bg-surface-light/50 p-6 text-left hover:bg-surface-light/80 transition-colors">
      <div className="mb-3">{icon}</div>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}
