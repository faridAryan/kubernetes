"use client";

import { BookOpenCheck, FileCode2, TerminalSquare } from "lucide-react";

export interface Solution {
  explanation: string;
  commands: string[];
  files?: Record<string, string>;
}

interface Props {
  solution: Solution;
  onUseCommand: (command: string) => void;
  onOpenFile: (name: string, content: string) => void;
}

// Worked solution: commands fill the terminal prompt, files open in the manifest editor
export default function SolutionPanel({ solution, onUseCommand, onOpenFile }: Props) {
  return (
    <div className="glass-card p-5 space-y-4 border border-accent-yellow/30">
      <h3 className="text-sm font-semibold text-accent-yellow flex items-center gap-2">
        <BookOpenCheck size={16} />
        Solution
      </h3>
      <p className="text-sm text-kube-300 whitespace-pre-line">{solution.explanation}</p>

      {Object.entries(solution.files ?? {}).map(([name, content]) => (
        <div key={name} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-kube-400 flex items-center gap-1">
              <FileCode2 size={14} />
              {name}
            </span>
            <button onClick={() => onOpenFile(name, content)} className="btn-ghost text-xs">
              Open in editor
            </button>
          </div>
          <pre className="bg-black rounded-lg p-3 text-xs text-gray-300 overflow-x-auto">{content}</pre>
        </div>
      ))}

      {solution.commands.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-kube-500">Click a command to put it on the prompt:</p>
          {solution.commands.map((command, i) => (
            <button
              key={`${i}-${command}`}
              onClick={() => onUseCommand(command)}
              className="w-full text-left font-mono text-xs text-accent-green bg-black/60 hover:bg-black rounded px-3 py-2 flex items-center gap-2"
            >
              <TerminalSquare size={12} className="shrink-0" />
              {command}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
