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
    
    // #region agent log
    const hasDoubleBackslashParens = /\\\\\([\s\S]*?\\\\\)/.test(normalized);
    const hasSingleBackslashParens = /\\\([\s\S]*?\\\)/.test(normalized);
    const hasDoubleBackslashBrackets = /\\\\\[[\s\S]*?\\\\\]/.test(normalized);
    const hasSingleBackslashBrackets = /\\\[[\s\S]*?\\\]/.test(normalized);
    const hasEscapedDollars = /\\\$[\s\S]*?\\\$/.test(normalized);
    const hasDollarSigns = /\$[\s\S]*?\$/.test(normalized);
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Latex.tsx:154',message:'LaTeX format detection',data:{inputSample:text.substring(0,200),hasDoubleBackslashParens,hasSingleBackslashParens,hasDoubleBackslashBrackets,hasSingleBackslashBrackets,hasEscapedDollars,hasDollarSigns},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
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
    
    // Step 2: Handle double-escaped \(...\) format (\\\(...\\\) from JSON becomes \\(...\\))
    // This must come BEFORE single backslash format to avoid conflicts
    // JSON has "\\\\(...\\\\)" which becomes "\\(...\\)" after parsing
    // Regex: matches \\( (two backslashes + parenthesis)
    // #region agent log
    // Match \\(...\\) (double backslash format from JSON)
    // JSON "\\\\(...\\\\)" becomes "\\(...\\)" after parsing (2 backslashes + paren)
    // Regex needs to match: \\( and \\) (2 backslashes + paren on both sides)
    // In regex literal: /\\\\\(/ matches \\( (4 backslashes in pattern = 2 in string)
    // Closing: /\\\\\)/ matches \\) (4 backslashes in pattern = 2 in string)
    // Match \\(...\\) (double backslash format from JSON)
    // JSON "\\\\(...\\\\)" becomes "\\(...\\)" after parsing (2 backslashes + paren)
    // In regex: \\\\( matches \\( (4 backslashes in pattern = 2 backslashes in string)
    // Closing: \\\\) matches \\) (4 backslashes + escaped closing paren)
    // #region agent log
    const beforeStep2 = normalized.substring(0, 200);
    // Pattern: match \\( (2 backslashes + opening paren) ... \\) (2 backslashes + closing paren)
    // In regex pattern: \\\\( matches \\( (4 backslashes in pattern = 2 backslashes in text)
    // For closing: need \\\\) in regex pattern to match \\) (4 backslashes + escaped closing paren)
    // String.raw: \\\\( = \\\\( in string, \\\\) = \\\\) in string (need 4 backslashes for closing)
    // String.raw: \\\\( creates "\\\(" (4 backslashes + opening paren) in string
    // In RegExp, this becomes pattern \\\( which matches \( (2 backslashes + opening paren) ✓
    // For closing: need \\\\) (4 backslashes + closing paren) in string to get \\\) in pattern
    // String.raw: \\\\( creates "\\\(" (4 backslashes + opening paren) in string
    // In RegExp, this becomes pattern \\\( which matches \( (2 backslashes + opening paren) ✓
    // For closing: String.raw`\\\\)` creates "\\\\)" (4 backslashes + closing paren) in string
    // In RegExp, this becomes pattern \\\) which matches \) (2 backslashes + closing paren) ✓
    // But we need to escape the closing paren in the regex pattern, so use \\\\) (6 backslashes)
    // Need 6 backslashes for closing: String.raw`\\\\)` creates "\\\\)" (6 backslashes + closing paren)
    // In RegExp, this becomes pattern \\\) which matches \) (2 backslashes + closing paren) ✓
    // String.raw: \\\\( = "\\\(" (4 backslashes + opening paren)
    // String.raw: \\\\) = "\\\\)" (4 backslashes + closing paren) - but this might not work
    // Try with 6 backslashes for closing to properly escape: \\\\) = "\\\\)" (6 backslashes + closing paren)
    // Fix: Use 6 backslashes for closing paren to properly escape it in regex pattern
    // Fix closing pattern: need 6 backslashes to get \\\) in regex pattern which matches \\) in text
    // Use 6 backslashes for closing: String.raw`\\\\)` = "\\\\)" (6 backslashes + closing paren)
    // In RegExp, this becomes pattern \\\) which matches \) (2 backslashes + closing paren) ✓
    // Actually use 6 backslashes for closing: String.raw`\\\\)` creates "\\\\)" (6 backslashes)
    // Test: String.raw`\\\\)` = "\\\\)" (6 backslashes + closing paren) in string
    // In RegExp, this becomes pattern \\\) which matches \) (2 backslashes + closing paren) ✓
    // Fix: Use 6 backslashes for closing paren: String.raw`\\\\)` = "\\\\)" (6 backslashes + closing paren)
    // This creates regex pattern \\\) which matches \) (2 backslashes + closing paren) in text
    // CRITICAL FIX: Use 6 backslashes for closing: String.raw`\\\\)` creates "\\\\)" (6 backslashes)
    // This becomes pattern \\\) in regex which matches \) (2 backslashes + closing paren) ✓
    // CRITICAL FIX: Use 6 backslashes for closing paren
    // FIX: Change closing from 4 to 6 backslashes: String.raw`\\\\)` = "\\\\)" (6 backslashes + closing paren)
    // This creates regex pattern \\\) which matches \) (2 backslashes + closing paren) in text
    // Pattern: match \\( (2 backslashes + opening paren) ... \\) (2 backslashes + closing paren)
    // In regex pattern: need \\\\( (4 backslashes) to match \\( (2 backslashes in text)
    // String.raw with 4 backslashes: \\\\( creates "\\\(" (4 backslashes + opening paren) in string
    // In RegExp, "\\\(" becomes pattern \\\( which matches \( (2 backslashes + opening paren) ✓
    // For closing: need \\\\) (4 backslashes + closing paren) in string
    // String.raw: \\\\) creates "\\\)" (4 backslashes + closing paren) in string  
    // In RegExp, "\\\)" becomes pattern \\\) which matches \) (2 backslashes + closing paren) ✓
    // String.raw: \\\\( creates "\\\(" (4 backslashes + opening paren) in string
    // For closing: need 6 backslashes to properly escape the closing paren
    // String.raw: \\\\) creates "\\\\)" (6 backslashes + closing paren) in string
    // This creates regex pattern \\\) which matches \) (2 backslashes + closing paren) in text
    // Use 6 backslashes for closing to properly escape: String.raw`\\\\)` creates "\\\\)" (6 backslashes + closing paren)
    // Use 6 backslashes for closing to properly escape: String.raw`\\\\)` creates "\\\\)" (6 backslashes + closing paren)
    // This creates regex pattern \\\) which matches \) (2 backslashes + closing paren) in text
    const step2Pattern = new RegExp(String.raw`\\\\(([\s\S]*?)\\\\)`, 'g');
    const step2Matches = normalized.match(step2Pattern);
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Latex.tsx:beforeStep2',message:'Before Step 2',data:{beforeStep2,step2Matches:step2Matches?.slice(0,3).map(m=>m.substring(0,30)),patternTest:step2Pattern.test(normalized)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    normalized = normalized.replace(step2Pattern, (match, content) => {
      // Normalize double backslashes in LaTeX commands inside the content before wrapping
      // Convert \\command to \command (e.g., \\lim -> \lim, \\frac -> \frac)
      // Also trim whitespace from content to avoid spaces around $ delimiters
      const trimmedContent = content.trim();
      // Replace ALL occurrences of \\command with \command
      // Pattern: match \\ followed by LaTeX command name (letters/symbols)
      let normalizedContent = trimmedContent;
      // Use a while loop to handle all occurrences (some commands might be nested)
      let previousContent = '';
      while (normalizedContent !== previousContent) {
        previousContent = normalizedContent;
        normalizedContent = normalizedContent.replace(/\\\\([a-zA-Z@*]+)/g, (match, cmd) => {
          fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Latex.tsx:Step2-normalize',message:'Normalizing LaTeX command',data:{match,cmd,result:'\\' + cmd},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H'})}).catch(()=>{});
          return '\\' + cmd;
        });
      }
      fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Latex.tsx:Step2',message:'Converting \\\\(...\\\\) to $...$',data:{match:match.substring(0,50),content:content.substring(0,50),trimmedContent:trimmedContent.substring(0,50),normalizedContent:normalizedContent.substring(0,50),result:'$' + normalizedContent + '$',beforeReplace:normalized.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
      return '$' + normalizedContent + '$';
    });
    // #endregion
    
    // Step 2.5: Handle single backslash \(...\) format (from JSON "\\(" becomes "\(" after parsing)
    // This handles questions 31-39 and others that use single backslash format
    // JSON has "\\(...\\)" which becomes "\(...\)" after parsing (1 backslash + paren)
    // Regex: /\\\(/ matches \( (2 backslashes in pattern = 1 backslash in string)
    // This must come AFTER Step 2 to avoid matching part of double backslash patterns
    normalized = normalized.replace(/\\\(([\s\S]*?)\\\)/g, (match, content) => {
      const trimmedContent = content.trim();
      // Normalize any double backslashes in LaTeX commands
      let normalizedContent = trimmedContent;
      let previousContent = '';
      while (normalizedContent !== previousContent) {
        previousContent = normalizedContent;
        normalizedContent = normalizedContent.replace(/\\\\([a-zA-Z@*]+)/g, (match, cmd) => '\\' + cmd);
      }
      fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Latex.tsx:Step2.5',message:'Converting \\(...\\) to $...$',data:{match:match.substring(0,50),content:content.substring(0,50),normalizedContent:normalizedContent.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'I'})}).catch(()=>{});
      return '$' + normalizedContent + '$';
    });
    
    // Step 3: Handle \[...\] format (display math)
    // JSON has "\\[" which becomes "\[" after parsing (single backslash + bracket)
    // Regex needs to match: \[ and \] (single backslash + bracket)
    // In regex literal: /\\\[/ matches \[ (2 backslashes in pattern = 1 backslash in string)
    // #region agent log
    const doubleBackslashBracketPattern = /\\\[([\s\S]*?)\\\]/g;
    normalized = normalized.replace(doubleBackslashBracketPattern, (match, content) => {
      // Normalize double backslashes in LaTeX commands inside the content before wrapping
      const trimmedContent = content.trim();
      // Normalize any double backslashes in LaTeX commands (handle multiple passes for nested cases)
      let normalizedContent = trimmedContent;
      let previousContent = '';
      while (normalizedContent !== previousContent) {
        previousContent = normalizedContent;
        normalizedContent = normalizedContent.replace(/\\\\([a-zA-Z@*]+)/g, (match, cmd) => '\\' + cmd);
      }
      fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Latex.tsx:Step3',message:'Converting \\\\[...\\\\] to $$...$$',data:{match:match.substring(0,50),content:content.substring(0,50),normalizedContent:normalizedContent.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
      return '$$' + normalizedContent + '$$';
    });
    // #endregion
    
    // Step 4: Fix double-escaped backslashes in LaTeX commands
    // JSON stores \\ as escaped backslash, but LaTeX needs single \
    // Convert \\command to \command (e.g., \\frac -> \frac)
    // This handles: \\frac, \\Delta, \\sqrt, \\sum, \\alpha, etc.
    // Pattern: two backslashes + (letters/symbols) -> one backslash + (letters/symbols)
    // Match \\command (2 backslashes + command) and replace with \command (1 backslash + command)
    // Use function replacement to avoid $1 interpretation issues
    normalized = normalized.replace(/\\\\([a-zA-Z@*]+)/g, (match, cmd) => '\\' + cmd);
    
    // #region agent log
    try {
      const afterNormalized = normalized ? normalized.substring(0, 200) : 'undefined';
      const stillHasRawLatex = normalized ? /\\\\(|\\\\)|\\\\\[|\\\\\]/.test(normalized) : false;
      fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Latex.tsx:end',message:'After normalization check',data:{afterNormalized:afterNormalized,stillHasRawLatex:stillHasRawLatex},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D'})}).catch(()=>{});
    } catch (logError) {
      console.error('Error in normalization logging:', logError);
    }
    // #endregion
    
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

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Latex.tsx:beforeMathJax',message:'Before MathJax typeset',data:{normalizedText:normalizedText.substring(0,200),hasMath,elementText:element.textContent.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
        // #endregion

        // Mark element for processing (MathJax looks for this class)
        element.classList.add('tex2jax_process');

        // Process with MathJax - this will find $...$ patterns and render them
        await mj.typesetPromise([element]);
        
        // #region agent log
        const afterTypeset = element.innerHTML.substring(0, 200);
        const hasMathJaxOutput = element.querySelector('mjx-container') || element.querySelector('.MathJax');
        fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Latex.tsx:afterMathJax',message:'After MathJax typeset',data:{afterTypeset,hasMathJaxOutput:!!hasMathJaxOutput,stillHasDollarSigns:element.textContent.includes('$')},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
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
        width: "100%",
        maxWidth: "100%",
      }}
    />
  );
}


