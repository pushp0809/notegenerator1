import { motion } from 'framer-motion';
import { Github, ExternalLink, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="py-12 border-t border-surface-lighter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-white font-bold text-sm">VN</span>
              </div>
              <span className="font-bold text-white">Video Note Architect</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              An autonomous agent execution spec for converting video content into structured knowledge.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                  Google AI Studio <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a href="https://github.com/google-gemini/generative-ai-python" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                  google-genai SDK <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a href="https://github.com/jdanil/youtube-transcript-api" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                  youtube-transcript-api <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a href="https://github.com/SYSTRAN/faster-whisper" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                  faster-whisper <ExternalLink size={12} />
                </a>
              </li>
            </ul>
          </div>

          {/* Agent platforms */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Compatible Agents</h4>
            <ul className="space-y-2">
              <li className="text-sm text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span> Claude Code
              </li>
              <li className="text-sm text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span> Cursor
              </li>
              <li className="text-sm text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-green"></span> Windsurf
              </li>
              <li className="text-sm text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-orange"></span> LangGraph / CrewAI
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-surface-lighter flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            Built with <Heart size={12} className="text-red-400" /> for autonomous coding agents
          </p>
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-accent-green pulse-glow"></span>
              <span className="text-xs text-slate-400">Phase 1: Ready for Execution</span>
            </motion.div>
          </div>
        </div>
      </div>
    </footer>
  );
}
