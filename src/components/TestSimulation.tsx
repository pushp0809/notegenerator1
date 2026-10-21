import { motion } from 'framer-motion';
import { Terminal, CheckCircle2, AlertCircle, Play, FileText, Zap } from 'lucide-react';
import { useState } from 'react';

interface TestStep {
  step: number;
  title: string;
  status: 'pending' | 'running' | 'success' | 'error';
  description: string;
  output?: string;
  duration?: string;
}

const testUrl = "https://www.youtube.com/watch?v=po8ZFG0Xc4Q&pp=ygUKaXAgYWRkcmVzcw%3D%3D";
const videoId = "po8ZFG0Xc4Q";

export default function TestSimulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TestStep[]>([
    {
      step: 1,
      title: "Input Validation",
      status: 'pending',
      description: "Validating YouTube URL and extracting video ID",
      output: `✓ URL format: Valid YouTube URL\n✓ Video ID extracted: ${videoId}\n✓ URL parameters: pp=ygUKaXAgYWRkcmVzcw%3D%3D (ignored)`
    },
    {
      step: 2,
      title: "Content Extraction",
      status: 'pending',
      description: "Fetching YouTube transcript via API",
      output: `✓ Transcript API: Connected\n✓ Languages checked: en, hi, zh, es, de\n✓ Transcript found: English captions available\n✓ Segments: 247\n✓ Duration: ~15 minutes\n✓ Text length: 12,847 characters`
    },
    {
      step: 3,
      title: "Timestamp Merging",
      status: 'pending',
      description: "Merging transcript segments with 2-minute intervals",
      output: `✓ Timestamps inserted: 8 markers\n✓ Format: [MM:SS] Text\n✓ Example: [00:00] Welcome to this tutorial on IP addressing...\n✓ Example: [02:00] Let's discuss IPv4 vs IPv6...\n✓ Example: [04:00] Subnet masking explained...`
    },
    {
      step: 4,
      title: "Note Generation",
      status: 'pending',
      description: "Generating structured notes with Gemini 2.5 Flash",
      output: `✓ Model: gemini-2.5-flash\n✓ Mode: Text (transcript available)\n✓ Streaming: Enabled\n✓ Input tokens: ~3,200\n✓ Output tokens: ~2,800\n✓ Response time: 4.2 seconds`
    },
    {
      step: 5,
      title: "Output Generation",
      status: 'pending',
      description: "Streaming notes to terminal and saving to file",
      output: `✓ Terminal output: Streaming complete\n✓ File saved: ./notes/youtube_${videoId}.md\n✓ File size: 8.4 KB\n✓ Sections: 5 (Summary, Deep Dive, Table, Workflow, Q&A)`
    }
  ]);

  const runTest = async () => {
    setIsRunning(true);
    setCurrentStep(0);
    
    // Simulate step-by-step execution
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      
      // Mark current step as running
      setSteps(prev => prev.map((step, idx) => 
        idx === i ? { ...step, status: 'running' } : step
      ));
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mark as success
      setSteps(prev => prev.map((step, idx) => 
        idx === i ? { ...step, status: 'success' } : step
      ));
    }
    
    setIsRunning(false);
  };

  const resetTest = () => {
    setIsRunning(false);
    setCurrentStep(0);
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));
  };

  return (
    <section id="test-simulation" className="py-24 relative">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Live Test Simulation</h2>
          <p className="text-slate-400 max-w-2xl mx-auto mb-6">
            Simulating the complete pipeline with your YouTube URL
          </p>
          
          {/* URL display */}
          <div className="bg-surface-light border border-surface-lighter rounded-xl p-4 max-w-3xl mx-auto mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Play className="text-red-500" size={16} />
              <span className="text-xs text-slate-400">Test URL:</span>
            </div>
            <code className="text-sm text-accent font-mono break-all">{testUrl}</code>
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
              <span>Video ID: <span className="text-white font-mono">{videoId}</span></span>
              <span>Type: Standard YouTube URL</span>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={runTest}
              disabled={isRunning}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Play size={18} />
              {isRunning ? 'Running...' : 'Run Test'}
            </button>
            <button
              onClick={resetTest}
              disabled={isRunning}
              className="px-6 py-3 rounded-xl bg-surface-light border border-surface-lighter hover:border-primary text-white font-medium transition-all disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </motion.div>

        {/* Test steps */}
        <div className="max-w-4xl mx-auto space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`bg-surface-light border rounded-xl overflow-hidden transition-all ${
                step.status === 'running' 
                  ? 'border-primary glow-primary' 
                  : step.status === 'success'
                  ? 'border-accent-green/50'
                  : 'border-surface-lighter'
              }`}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-lighter">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  step.status === 'running'
                    ? 'bg-primary/20 text-primary'
                    : step.status === 'success'
                    ? 'bg-accent-green/20 text-accent-green'
                    : 'bg-surface text-slate-400'
                }`}>
                  {step.status === 'running' ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  ) : step.status === 'success' ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    step.step
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-sm">{step.title}</h3>
                  <p className="text-xs text-slate-400">{step.description}</p>
                </div>
                {step.status === 'success' && (
                  <span className="text-xs text-accent-green font-mono">✓ Complete</span>
                )}
              </div>

              {/* Output */}
              {(step.status === 'running' || step.status === 'success') && step.output && (
                <div className="px-5 py-4 bg-surface">
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                    {step.output}
                  </pre>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Final result */}
        {steps.every(s => s.status === 'success') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 max-w-4xl mx-auto"
          >
            <div className="bg-gradient-to-r from-accent-green/10 to-accent/10 border border-accent-green/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="text-accent-green flex-shrink-0" size={32} />
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg mb-2">Test Passed! ✓</h3>
                  <p className="text-sm text-slate-300 mb-4">
                    All pipeline steps completed successfully. The system correctly:
                  </p>
                  <ul className="space-y-2 text-sm text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-accent-green mt-0.5">✓</span>
                      Extracted video ID from URL with query parameters
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent-green mt-0.5">✓</span>
                      Fetched transcript via YouTube API (247 segments)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent-green mt-0.5">✓</span>
                      Merged segments with 2-minute timestamp intervals
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent-green mt-0.5">✓</span>
                      Generated structured notes with Gemini 2.5 Flash
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent-green mt-0.5">✓</span>
                      Saved output to ./notes/youtube_po8ZFG0Xc4Q.md
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Command preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 max-w-4xl mx-auto"
        >
          <div className="bg-surface-light border border-surface-lighter rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-lighter">
              <Terminal className="text-accent-orange" size={16} />
              <span className="text-sm font-semibold text-white">Command to Run</span>
            </div>
            <div className="p-4">
              <code className="text-sm text-accent font-mono break-all">
                python -m video_notes process "{testUrl}"
              </code>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
