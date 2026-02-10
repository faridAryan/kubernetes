"use client";

interface Props {
  content: string;
}

function processMarkdown(text: string): string {
  let html = text;

  // Code blocks
  html = html.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    '<pre class="bg-kube-900 border border-kube-700 rounded-xl p-4 mb-4 overflow-x-auto"><code class="text-accent-cyan text-sm font-mono">$2</code></pre>'
  );

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-kube-800 text-accent-cyan px-2 py-0.5 rounded text-sm font-mono">$1</code>'
  );

  // Headers
  html = html.replace(
    /^### (.*$)/gm,
    '<h3 class="text-xl font-semibold text-kube-200 mt-5 mb-2">$1</h3>'
  );
  html = html.replace(
    /^## (.*$)/gm,
    '<h2 class="text-2xl font-bold text-white mt-6 mb-3">$1</h2>'
  );
  html = html.replace(
    /^# (.*$)/gm,
    '<h1 class="text-3xl font-bold text-white mt-8 mb-4">$1</h1>'
  );

  // Bold and italic
  html = html.replace(
    /\*\*\*(.*?)\*\*\*/g,
    '<strong class="text-white font-semibold"><em>$1</em></strong>'
  );
  html = html.replace(
    /\*\*(.*?)\*\*/g,
    '<strong class="text-white font-semibold">$1</strong>'
  );
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Blockquotes
  html = html.replace(
    /^> (.*$)/gm,
    '<blockquote class="border-l-4 border-kube-500 pl-4 italic text-kube-300 my-4">$1</blockquote>'
  );

  // Unordered lists
  html = html.replace(
    /^- (.*$)/gm,
    '<li class="text-gray-300 ml-4 list-disc">$1</li>'
  );

  // Ordered lists
  html = html.replace(
    /^\d+\. (.*$)/gm,
    '<li class="text-gray-300 ml-4 list-decimal">$1</li>'
  );

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-kube-400 hover:text-kube-300 underline" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Paragraphs
  html = html.replace(
    /^(?!<[hbuola]|<pre|<code|<block|<li)(.*\S.*)$/gm,
    '<p class="text-gray-300 leading-relaxed mb-4">$1</p>'
  );

  // Line breaks
  html = html.replace(/\n\n/g, "\n");

  return html;
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: processMarkdown(content) }}
    />
  );
}
