import { motion } from 'framer-motion';
import { Folder, File, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface TreeNode {
  name: string;
  type: 'folder' | 'file';
  description?: string;
  children?: TreeNode[];
}

const directoryTree: TreeNode[] = [
  {
    name: 'video_notes/',
    type: 'folder',
    description: 'Root package directory',
    children: [
      { name: '__init__.py', type: 'file', description: 'Package initialization' },
      { name: 'cli.py', type: 'file', description: 'CLI entry point (click/typer)' },
      {
        name: 'extractors/',
        type: 'folder',
        description: 'Content extraction modules',
        children: [
          { name: '__init__.py', type: 'file', description: 'Extractor package init' },
          { name: 'youtube.py', type: 'file', description: 'YouTube transcript + yt-dlp fallback' },
          { name: 'whisper_local.py', type: 'file', description: 'Local faster-whisper STT engine' },
        ],
      },
      {
        name: 'generators/',
        type: 'folder',
        description: 'Note generation modules',
        children: [
          { name: '__init__.py', type: 'file', description: 'Generator package init' },
          { name: 'gemini_notes.py', type: 'file', description: 'Gemini 2.5 Flash synthesis engine' },
        ],
      },
      {
        name: 'prompts/',
        type: 'folder',
        description: 'Prompt templates',
        children: [
          { name: 'note_templates.py', type: 'file', description: 'Structured note templates' },
        ],
      },
      {
        name: 'utils/',
        type: 'folder',
        description: 'Utility functions',
        children: [
          { name: 'formatter.py', type: 'file', description: 'Output formatting & rich rendering' },
        ],
      },
    ],
  },
  { name: 'pyproject.toml', type: 'file', description: 'Project config & locked dependencies' },
  { name: '.env.example', type: 'file', description: 'Environment template (GEMINI_API_KEY=)' },
];

export default function DirectoryStructure() {
  return (
    <section id="structure" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Project Structure</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Clean, modular architecture with clear separation of concerns between extraction, generation, and formatting.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-surface-light border border-surface-lighter rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-surface border-b border-surface-lighter">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              <span className="ml-2 text-xs text-slate-500">video-note-architect/</span>
            </div>

            {/* Tree */}
            <div className="p-4 sm:p-6">
              {directoryTree.map((node, i) => (
                <TreeItem key={i} node={node} depth={0} />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const isFolder = node.type === 'folder';

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-surface/50 cursor-pointer transition-colors group`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => isFolder && setExpanded(!expanded)}
      >
        {isFolder ? (
          <>
            <ChevronRight
              size={14}
              className={`text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
            <Folder size={16} className="text-primary-light" />
          </>
        ) : (
          <>
            <span className="w-[14px]"></span>
            <File size={16} className="text-slate-500" />
          </>
        )}
        <span className={`text-sm ${isFolder ? 'text-white font-medium' : 'text-slate-300'}`}>
          {node.name}
        </span>
        {node.description && (
          <span className="text-xs text-slate-500 ml-2 hidden sm:inline group-hover:text-slate-400 transition-colors">
            — {node.description}
          </span>
        )}
      </div>
      {isFolder && expanded && node.children && (
        <div>
          {node.children.map((child, i) => (
            <TreeItem key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
