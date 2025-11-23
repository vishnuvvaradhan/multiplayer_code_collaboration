import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Pre-process content to handle special formatting
  const processedContent = content
    .replace(/✅/g, '✅ ') // Add space after checkmarks
    .replace(/❌/g, '❌ ') // Add space after X marks
    .replace(/⚠️/g, '⚠️ ') // Add space after warnings
    .replace(/🔍/g, '🔍 ') // Add space after magnifying glass
    .replace(/📝/g, '📝 ') // Add space after memo
    .replace(/💭/g, '💭 ') // Add space after thought bubble
    .replace(/🏗️/g, '🏗️ ') // Add space after construction
    .replace(/⚙️/g, '⚙️ '); // Add space after gear

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom component for code blocks
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <code className={`${className} block whitespace-pre-wrap bg-gray-900 text-gray-100`} {...props}>
                {children}
              </code>
            ) : (
              <code className={`${className} bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800`} {...props}>
                {children}
              </code>
            );
          },
          // Custom component for pre blocks (code blocks)
          pre: ({ children }: any) => (
            <pre className="bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto text-xs font-mono my-3 border border-gray-700">
              {children}
            </pre>
          ),
          // Custom component for lists
          ul: ({ children }: any) => (
            <ul className="list-disc list-inside space-y-1 my-2">
              {children}
            </ul>
          ),
          ol: ({ children }: any) => (
            <ol className="list-decimal list-inside space-y-1 my-2">
              {children}
            </ol>
          ),
          // Custom component for links
          a: ({ children, href }: any) => (
            <a
              href={href}
              className="text-blue-600 hover:text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          // Custom component for blockquotes
          blockquote: ({ children }: any) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 py-2 my-4 bg-gray-50 italic text-gray-700">
              {children}
            </blockquote>
          ),
          // Custom component for headings
          h1: ({ children }: any) => (
            <h1 className="text-xl font-bold text-gray-900 mt-6 mb-4 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }: any) => (
            <h2 className="text-lg font-semibold text-gray-900 mt-5 mb-3">
              {children}
            </h2>
          ),
          h3: ({ children }: any) => (
            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-2">
              {children}
            </h3>
          ),
          // Custom component for paragraphs
          p: ({ children }: any) => (
            <p className="text-sm text-gray-800 leading-relaxed mb-2 last:mb-0">
              {children}
            </p>
          ),
          // Custom component for strong/bold text
          strong: ({ children }: any) => (
            <strong className="font-semibold text-gray-900">
              {children}
            </strong>
          ),
          // Custom component for emphasis/italic text
          em: ({ children }: any) => (
            <em className="italic text-gray-800">
              {children}
            </em>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}