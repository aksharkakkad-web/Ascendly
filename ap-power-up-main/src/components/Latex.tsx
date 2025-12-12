import { useEffect, useRef } from "react";

type LatexProps = {
  latex: string;
  block?: boolean;
  className?: string;
};

export function Latex({ latex, block = false, className }: LatexProps) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = block ? `$$${latex}$$` : `$${latex}$`;
    const mj = (window as any).MathJax;
    if (mj?.typesetPromise) {
      mj.typesetPromise([el]).catch(() => {});
    }
  }, [latex, block]);

  return (
    <span
      ref={ref}
      className={className}
      style={{
        display: block ? "block" : "inline",
        lineHeight: 1.5,
        overflow: "visible",
      }}
    />
  );
}

type MathTextProps = {
  text: string;
  className?: string;
};

/**
 * Formats LaTeX text to readable format by removing delimiters and converting commands.
 * This is used as a fallback when MathJax is not available or fails to render.
 * Preserves ALL original content while making it readable.
 */
function formatLatexToReadable(text: string): string {
  if (!text) return "";
  
  try {
    let formatted = text;
    
    console.log('[formatLatexToReadable] Input:', text.substring(0, 200));
    
    // First, handle escaped dollar signs from JSON (\\$ -> $)
    formatted = formatted.replace(/\\\$/g, "$");
    
    // Strip math delimiters but preserve ALL content ($...$ -> content)
    // Use a more careful approach to ensure we capture everything between delimiters
    formatted = formatted.replace(/\$([^$]*?)\$/g, (match, content) => {
      console.log('[formatLatexToReadable] Found math block:', content);
      return content.trim();
    });
    formatted = formatted.replace(/\$\$([^$]*?)\$\$/g, "$1");
    formatted = formatted.replace(/\\\(([^)]*?)\\\)/g, "$1");
    formatted = formatted.replace(/\\\[([^\]]*?)\\\]/g, "$1");
    formatted = formatted.replace(/\\n/g, "\n");
    
    console.log('[formatLatexToReadable] After delimiter removal:', formatted.substring(0, 200));
    
    // Handle LaTeX commands with braces - preserve ALL content inside braces
    // \frac{a}{b} -> (a)/(b) to preserve all parts
    formatted = formatted.replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, "($1)/($2)");
    
    // Superscripts/subscripts with braces -> plain (x^{2} -> x^2, x_{1} -> x_1)
    // CRITICAL: Preserve the content inside braces
    formatted = formatted.replace(/\^\{([^}]*)\}/g, "^$1");
    formatted = formatted.replace(/_\{([^}]*)\}/g, "_$1");
    
    // Handle \to command before other replacements
    formatted = formatted.replace(/\\to/g, "→");
    formatted = formatted.replace(/\\rightarrow/g, "→");
    
    // Targeted token replacements (only when preceded by backslash)
    const tokenMap: Record<string, string> = {
      "delta": "δ", "Delta": "Δ",
      "alpha": "α", "beta": "β", "gamma": "γ", "theta": "θ",
      "mu": "μ", "pi": "π", "sigma": "σ", "rho": "ρ", "omega": "ω",
      "phi": "φ", "psi": "ψ", "lambda": "λ", "eta": "η",
      "cdot": "·", "times": "×",
      "leq": "≤", "le": "≤",
      "geq": "≥", "ge": "≥",
      "pm": "±", "mp": "∓",
      "neq": "≠",
      "int": "∫",
      "sum": "Σ",
      "lim": "lim",
    };
    
    // Replace LaTeX commands, but preserve unknown commands
    formatted = formatted.replace(/\\([A-Za-z]+)/g, (match, cmd: string) => {
      if (tokenMap[cmd]) {
        return tokenMap[cmd];
      }
      // For unknown commands, keep the command name without backslash
      return cmd;
    });
    
    // Superscripts/subscripts into basic HTML for readability
    // Handle patterns like x^2, x_1, y=x^2, etc. - preserve ALL parts
    // Match variable followed by caret/underscore followed by number or variable
    formatted = formatted.replace(/([A-Za-z])\^(\d+)/g, "$1<sup>$2</sup>");
    formatted = formatted.replace(/([A-Za-z])\^([A-Za-z0-9]+)/g, "$1<sup>$2</sup>");
    formatted = formatted.replace(/([A-Za-z])_(\d+)/g, "$1<sub>$2</sub>");
    formatted = formatted.replace(/([A-Za-z])_([A-Za-z0-9]+)/g, "$1<sub>$2</sub>");
    
    // Compact integrals: ∫_a^b -> ∫[a→b]
    formatted = formatted.replace(/∫\s*_?\s*([^\s^_]+)\s*\^?\s*([^\s^_]+)/g, "∫[$1→$2]");
    
    // Remove ONLY empty braces, preserve all content
    formatted = formatted.replace(/\{\s*\}/g, "");
    formatted = formatted.replace(/\\\\/g, "\\");
    
    // Remove braces around simple expressions, but be very careful to preserve everything
    // Only remove braces that contain simple math expressions (not complex LaTeX)
    // Don't remove braces that might break the expression
    formatted = formatted.replace(/\{([A-Za-z0-9_+\-*/=<>\s.()]+)\}/g, (match, content) => {
      // Only remove if it's a simple expression (no backslashes, no nested braces)
      if (!content.includes('\\') && !content.includes('{')) {
        return content;
      }
      return match; // Keep the braces if it's complex
    });
    
    console.log('[formatLatexToReadable] Final output:', formatted.substring(0, 200));
    
    return formatted;
  } catch (error) {
    console.error('Error formatting LaTeX:', error);
    console.error('Original text:', text.substring(0, 200));
    return text; // Return original text if formatting fails
  }
}

/**
 * Normalizes LaTeX delimiters in text to MathJax-compatible format.
 * Converts various formats to standard $...$ (inline) and $$...$$ (display).
 * Handles escaped dollar signs and double-escaped backslashes from JSON.
 * 
 * Key transformations:
 * - \$...\$ -> $...$ (escaped dollars from JSON)
 * - \(...\) -> $...$ (LaTeX inline math)
 * - \[...\] -> $$...$$ (LaTeX display math)
 * - \\command -> \command (double-escaped LaTeX commands from JSON)
 */
function normalizeLatexDelimiters(text: string): string {
  if (!text) return text;
  
  try {
    let normalized = text;
    
    console.log('[normalizeLatexDelimiters] Input:', text.substring(0, 200));
    
    // Step 1: Convert escaped dollar signs \$...\$ to $...$ (common in JSON data)
    // JSON has "\\$" which becomes "\$" after parsing
    // This regex matches: backslash + dollar and replaces with: just dollar
    // This handles patterns like \$ t = 2 \$ -> $ t = 2 $
    // Use non-greedy matching to handle multiple math expressions in one string
    normalized = normalized.replace(/\\\$([\s\S]*?)\\\$/g, (match, content) => {
      console.log('[normalizeLatexDelimiters] Found escaped math:', content);
      return `$${content}$`;
    });
    
    console.log('[normalizeLatexDelimiters] After Step 1:', normalized.substring(0, 200));
    
    // Step 2: Fix double-escaped backslashes in LaTeX commands
    // JSON stores \\ as escaped backslash, but LaTeX needs single \
    // Convert \\command to \command (e.g., \\frac -> \frac)
    // This handles: \\frac, \\Delta, \\sqrt, \\sum, \\alpha, etc.
    // Pattern: backslash + backslash + (letters/symbols) -> backslash + (letters/symbols)
    normalized = normalized.replace(/\\(\\[a-zA-Z@*]+)/g, '$1');
    
    // Step 3: Convert \(...\) to $...$ (inline math)
    // Match literal \( and \) in the text and convert to $...$
    // Use non-greedy matching to handle multiple math expressions
    normalized = normalized.replace(/\\\(([\s\S]*?)\\\)/g, '$$1$');
    
    // Step 4: Convert \[...\] to $$...$$ (display math)
    // Match literal \[ and \] in the text and convert to $$...$$
    // Use non-greedy matching to handle multiple math expressions
    normalized = normalized.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$1$$');
    
    console.log('[normalizeLatexDelimiters] Final output:', normalized.substring(0, 200));
    
    return normalized;
  } catch (error) {
    console.error('Error normalizing LaTeX:', error);
    return text; // Return original text if normalization fails
  }
}

/**
 * Renders a string that may contain LaTeX math in various formats:
 * - Inline: $...$ or \(...\) or \$...\$
 * - Display: $$...$$ or \[...\]
 * Only the delimited math segments are passed to MathJax; all other text is plain.
 */
export function MathText({ text, className }: MathTextProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const safeText = text || "";
  
  // Normalize LaTeX delimiters before rendering
  const normalizedText = normalizeLatexDelimiters(safeText);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Only process MathJax if there's actual content
    if (!normalizedText) {
      element.textContent = '';
      return;
    }

    let isCancelled = false;

    const processMath = async (retryCount = 0) => {
      if (isCancelled) return;

      const mj = (window as any).MathJax;
      
      if (!mj || !mj.typesetPromise) {
        // Retry if MathJax isn't loaded yet (max 20 retries = 4 seconds)
        if (retryCount < 20) {
          setTimeout(() => processMath(retryCount + 1), 200);
        } else {
          // Fallback: show formatted readable text
          if (!isCancelled) {
            const readableText = formatLatexToReadable(normalizedText);
            element.innerHTML = readableText;
          }
        }
        return;
      }

      try {
        // Wait for MathJax to be fully ready
        if (mj.startup?.ready) {
          await mj.startup.ready;
        }
        
        // Wait for page to be ready
        if (mj.startup?.pageReady) {
          await mj.startup.pageReady();
        }

        if (isCancelled) return;

        // Ensure element is in document
        if (!document.contains(element)) {
          if (retryCount < 10) {
            setTimeout(() => processMath(retryCount + 1), 100);
          }
          return;
        }

        // Check if text contains math delimiters
        const hasMath = normalizedText.includes('$');
        
        // Clear any previously processed math (handles both HTML/CSS and SVG output)
        // SVG output uses mjx-container elements, HTML/CSS uses .MathJax and .mjx-* classes
        element.innerHTML = '';
        // Clear existing MathJax elements - need separate selectors for element vs class
        try {
          const classSelectors = element.querySelectorAll('.MathJax, [class*="mjx-"]');
          const elementSelectors = element.querySelectorAll('mjx-container');
          [...classSelectors, ...elementSelectors].forEach((el: Element) => el.remove());
        } catch (e) {
          // If selector fails, innerHTML is already cleared above
          console.warn('Error clearing MathJax elements:', e);
        }

        if (!hasMath) {
          // No math, just set as plain text
          element.textContent = normalizedText;
          return;
        }

        // Set text content directly - MathJax will process $...$ patterns
        element.textContent = normalizedText;

        // Mark element for processing (MathJax looks for this class)
        element.classList.add('tex2jax_process');

        // Process with MathJax - this will find $...$ patterns and render them
        await mj.typesetPromise([element]);
        
        if (isCancelled) return;

          // Verify MathJax actually rendered the content
          // Check after a brief delay to allow rendering to complete
          setTimeout(() => {
            if (isCancelled) return;
            
            // Check for MathJax rendered elements (mjx-container is an element, not a class)
            const hasMathJaxElements = element.querySelector('mjx-container') ||
                                       element.querySelector('.MathJax') ||
                                       element.querySelector('[class*="mjx-"]');
            const stillHasDollarSigns = element.textContent && element.textContent.includes('$');
          
          // If MathJax didn't render and we still have dollar signs, retry once
          if (stillHasDollarSigns && !hasMathJaxElements) {
            // Try one more time - sometimes MathJax needs a second pass
            element.textContent = normalizedText;
            mj.typesetPromise([element]).catch(() => {
              // If retry fails, use fallback
              if (!isCancelled) {
                const readableText = formatLatexToReadable(normalizedText);
                element.innerHTML = readableText;
              }
            });
          }
        }, 300);
      } catch (err: any) {
        if (isCancelled) return;
        console.warn('MathJax rendering error:', err);
        // Fallback to formatted readable text on error
        const readableText = formatLatexToReadable(normalizedText);
        element.innerHTML = readableText;
      }
    };

    // Process after a short delay to ensure DOM is ready and text is set
    const timer = setTimeout(() => processMath(0), 10);
    
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [normalizedText]);

  return (
    <div
      ref={containerRef}
      className={`${className || ''} tex2jax_process`}
      style={{
        lineHeight: 1.5,
        overflow: "visible",
        wordBreak: "break-word",
        whiteSpace: "normal",
      }}
    />
  );
}


