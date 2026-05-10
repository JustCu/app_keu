import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

const markdownSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "u"],
  attributes: {
    ...(defaultSchema.attributes || {}),
    u: [],
  },
};

export default function MarkdownAIText({ content, isDark, className = "" }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSchema]]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-extrabold mt-2 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-extrabold mt-2 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold mt-2 mb-1.5">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-sm leading-relaxed mb-2">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 mb-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 mb-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-extrabold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          u: ({ children }) => <u className="underline">{children}</u>,
          blockquote: ({ children }) => (
            <blockquote
              className={`border-l-2 pl-3 my-2 ${isDark ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-700"}`}
            >
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline font-semibold"
            >
              {children}
            </a>
          ),
        }}
      >
        {String(content || "")}
      </ReactMarkdown>
    </div>
  );
}
