"use client";

import { useState, type KeyboardEvent } from "react";
import { FileCode2, Play, Save } from "lucide-react";

interface Props {
  files: Record<string, string>;
  disabled: boolean;
  onSave: (name: string, content: string, apply: boolean) => void;
}

const STARTER = `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: example
  namespace: default
spec:
  podSelector: {}
  policyTypes:
    - Ingress
`;

// A small YAML editor standing in for vim: files are saved into the lab session
export default function ManifestEditor({ files, disabled, onSave }: Props) {
  const [name, setName] = useState("manifest.yaml");
  const [content, setContent] = useState(STARTER);
  const validName = /^[\w.-]{1,64}$/.test(name);

  // Tab inserts two spaces instead of leaving the textarea
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const { selectionStart, selectionEnd } = e.currentTarget;
    const next = `${content.slice(0, selectionStart)}  ${content.slice(selectionEnd)}`;
    setContent(next);
    requestAnimationFrame(() => e.currentTarget?.setSelectionRange(selectionStart + 2, selectionStart + 2));
  };

  const open = (file: string) => {
    setName(file);
    setContent(files[file]);
  };

  return (
    <details className="glass-card overflow-hidden">
      <summary className="p-4 cursor-pointer text-sm text-kube-400 hover:text-kube-300 transition flex items-center gap-2">
        <FileCode2 size={16} />
        Manifest editor (write YAML, then kubectl apply -f)
      </summary>
      <div className="px-4 pb-4 space-y-3">
        {Object.keys(files).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-kube-500">Saved files:</span>
            {Object.keys(files).sort().map((file) => (
              <button key={file} onClick={() => open(file)} className="px-2 py-1 rounded bg-kube-800 text-kube-300 hover:text-white font-mono">
                {file}
              </button>
            ))}
          </div>
        )}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field font-mono text-sm"
          aria-label="File name"
          spellCheck={false}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={16}
          maxLength={20000}
          spellCheck={false}
          aria-label="Manifest YAML"
          className="w-full rounded-xl bg-black border border-kube-700 p-3 font-mono text-sm text-gray-200 outline-none focus:border-kube-500"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSave(name, content, false)}
            disabled={disabled || validName === false}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={() => onSave(name, content, true)}
            disabled={disabled || validName === false}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Play size={14} />
            Save &amp; kubectl apply -f {name}
          </button>
          {validName === false && <span className="text-xs text-accent-red">Use letters, digits, dot, dash or underscore</span>}
        </div>
      </div>
    </details>
  );
}
