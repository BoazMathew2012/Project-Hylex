import { useState, createContext, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Check from 'lucide-react/dist/esm/icons/check.mjs';
import Copy from 'lucide-react/dist/esm/icons/copy.mjs';

const PreContext = createContext(false);

/**
 * Fenced code block with language header and copy button
 */
function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeText = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  return (
    <div className="my-2.5 rounded-lg border border-slate-800 bg-slate-950/90 overflow-hidden text-xs max-w-full">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[10px] font-mono text-slate-400">
        <span className="uppercase tracking-wider">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-300 transition-colors"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[11px] font-mono text-slate-200 leading-relaxed">
        <code>{codeText}</code>
      </pre>
    </div>
  );
}

/**
 * Safe link renderer that opens external links in a new tab with noopener
 */
function SafeLink({ href, children }) {
  // Prevent javascript: or unsafe protocols
  const isSafe = href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('/'));
  if (!isSafe) {
    return <span className="text-slate-400">{children}</span>;
  }
  const isExternal = href.startsWith('http://') || href.startsWith('https://');
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="text-cyan-400 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-300 hover:decoration-cyan-400 transition-colors"
    >
      {children}
    </a>
  );
}

function PreBlock({ children }) {
  return (
    <PreContext.Provider value={true}>
      {children}
    </PreContext.Provider>
  );
}

function CodeRenderer({ node: _node, className, children, ...props }) {
  const isBlock = useContext(PreContext);
  if (!isBlock) {
    return (
      <code
        className="px-1.5 py-0.5 rounded bg-slate-800/90 text-cyan-300 font-mono text-[10.5px] border border-slate-700/60 break-words"
        {...props}
      >
        {children}
      </code>
    );
  }
  return <CodeBlock className={className}>{children}</CodeBlock>;
}

/**
 * MarkdownRenderer
 * Renders assistant messages with GitHub-flavored Markdown, safe HTML sanitization,
 * formatted headings, lists, tables, code blocks, and links.
 */
export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  return (
    <div className="markdown-content text-[11.5px] leading-relaxed text-slate-200 font-sans space-y-2 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-sm font-bold text-white mt-3 mb-1.5 font-mono tracking-tight pb-1 border-b border-slate-800">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-bold text-white mt-2.5 mb-1 font-mono tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-cyan-300 mt-2 mb-0.5 font-mono">
              {children}
            </h3>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="my-1 text-slate-200 text-[11.5px] leading-relaxed">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="my-1.5 pl-4 list-disc space-y-1 text-slate-200 text-[11.5px]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1.5 pl-4 list-decimal space-y-1 text-slate-200 text-[11.5px]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">
              {children}
            </li>
          ),

          // Strong & Emphasis
          strong: ({ children }) => (
            <strong className="font-semibold text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-300">
              {children}
            </em>
          ),

          // Pre wrapper provides block context
          pre: PreBlock,

          // Code: accurately distinguishes inline code from code blocks
          code: CodeRenderer,

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-cyan-500/60 pl-3 italic text-slate-300 text-[11px] bg-slate-900/40 py-1 rounded-r">
              {children}
            </blockquote>
          ),

          // Tables
          table: ({ children }) => (
            <div className="my-2.5 overflow-x-auto rounded-lg border border-slate-800 max-w-full">
              <table className="w-full text-left border-collapse text-[11px] font-mono">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-300">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-900/40 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-1.5 font-semibold text-cyan-300 text-[10px] uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-1.5 text-slate-300 text-[10.5px]">
              {children}
            </td>
          ),

          // Links
          a: SafeLink,

          // Horizontal rule
          hr: () => <hr className="my-3 border-slate-800" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
