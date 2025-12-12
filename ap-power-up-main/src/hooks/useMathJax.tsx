import { useEffect, useRef } from "react";

/**
 * Hook to automatically render LaTeX in any element using MathJax
 * Useful for tooltips, charts, and dynamically inserted content
 */
export function useMathJax<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const mj = (window as any).MathJax;
    if (mj?.typesetPromise) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        mj.typesetPromise([element]).catch((err: any) => {
          console.warn('MathJax rendering error:', err);
        });
      }, 0);
      
      return () => clearTimeout(timer);
    }
  });

  return ref;
}

/**
 * Utility function to render LaTeX in a string and return HTML
 * Useful for tooltips and other places where you need HTML content
 */
export function renderLaTeXToHTML(text: string): string {
  if (!text) return "";
  
  // Normalize LaTeX delimiters
  let normalized = text;
  
  // Convert \(...\) to $...$
  normalized = normalized.replace(/\\(\(([^)]+)\)\\)/g, (match, content) => `$${content}$`);
  
  // Convert \[...\] to $$...$$
  normalized = normalized.replace(/\\\[([^\]]+)\\\]/g, (match, content) => `$$${content}$$`);
  
  // Handle double-escaped versions
  normalized = normalized.replace(/\\\\\\(([^)]+)\\\\\)/g, (match, content) => `$${content}$`);
  normalized = normalized.replace(/\\\\\\\[([^\]]+)\\\\\\\]/g, (match, content) => `$$${content}$$`);
  
  // Escape HTML to prevent XSS
  const div = document.createElement('div');
  div.textContent = normalized;
  return div.innerHTML;
}

/**
 * Component wrapper for tooltips and other dynamic content that needs LaTeX
 */
export function MathJaxWrapper({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  const ref = useMathJax<HTMLDivElement>();

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

