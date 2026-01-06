import { useClipboard } from '@mantine/hooks';
import { IconClipboard } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import { Prism } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from 'react-toastify';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css'; // Import KaTeX CSS
import { useTransientNavigate } from 'src/hooks';
import { cn } from 'src/lib';
import { texts } from 'src/texts';
import { Icon } from './Icon';

interface MarkdownProps {
  // The content to render.
  children: string | null | undefined;
  animateText?: boolean;
  className?: string;
}

const AnimatedP = ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
  if (typeof children === 'string') {
    return (
      <p className="fade-in">
        {children.split(' ').map((word, index) => (
          <span key={index} className="fade-in" style={{}} {...props}>
            {word}{' '}
          </span>
        ))}
      </p>
    );
  }
  return <p {...props}>{children}</p>;
};

export function Markdown({ children, animateText, className }: MarkdownProps) {
  const latexFormattedContent = children
    ?.replace(/\\\[/g, '$$')
    ?.replace(/\\\]/g, '$$')
    ?.replace(/\\\(/g, '$')
    ?.replace(/\\\)/g, '$');

  return (
    <div
      className={cn(
        'markdown prose prose-headings:font-semibold prose-headings:text-base w-full text-black',
        animateText && '[&_*]:fade-in',
        className,
      )}
    >
      <ReactMarkdown
        components={{
          a: LinkRenderer,
          code: Code,
          pre: PreBlock,
          p: animateText ? AnimatedP : 'p',
        }}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {latexFormattedContent}
      </ReactMarkdown>
    </div>
  );
}

function LinkRenderer({ href, children }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const navigate = useTransientNavigate();
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (href !== undefined) {
      e.preventDefault();
      navigate(href);
    }
  };
  if (href !== undefined && (href.startsWith('http') || href.startsWith('mailto'))) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        <Icon className="!-mb-[1px] inline-block align-baseline" icon="external-link" size={12} />
        {children}
      </a>
    );
  } else {
    return (
      <a href={href} onClick={handleClick}>
        {children}
      </a>
    );
  }
}

function PreBlock({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  if (typeof children === 'object' && children && 'props' in children && children.type === Code) {
    return (
      <pre {...props}>
        <CodeBlock {...children.props} />
      </pre>
    );
  }
  return <pre {...props}>{children}</pre>;
}

function CodeBlock(props: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>) {
  const { children, className, ref: _, ...other } = props;
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'plain';
  const clipboard = useClipboard();

  const handleCopy = () => {
    if (typeof children === 'string') {
      clipboard.copy(children);
      toast(texts.common.copied, { type: 'info' });
    }
  };

  return typeof children === 'string' ? (
    <div className="group relative max-w-full overflow-x-auto">
      <Prism {...other} language={language} style={vscDarkPlus} customStyle={{ backgroundColor: 'transparent', padding: 0 }}>
        {children.replace(/\n$/, '')}
      </Prism>
      <IconClipboard
        onClick={handleCopy}
        data-testid="copy-code-button"
        className="absolute top-2 right-2 cursor-pointer rounded bg-gray-800 p-1 text-white opacity-0 transition-all group-hover:opacity-100"
      />
    </div>
  ) : (
    <Code {...props}>{children}</Code>
  );
}

function Code(props: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>) {
  const { children, className, ref: _, ...other } = props;
  return (
    <code {...other} className={cn(className, 'overflow-auto')}>
      {children}
    </code>
  );
}
