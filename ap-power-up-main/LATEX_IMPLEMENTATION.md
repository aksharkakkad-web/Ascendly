# LaTeX Rendering Implementation Guide

This document provides a comprehensive guide to the LaTeX rendering implementation in the AP test prep platform.

## Overview

The platform uses **MathJax 3** to automatically render LaTeX math expressions throughout the application. All math expressions are properly formatted and displayed as textbook-quality mathematical notation.

## Implementation Details

### 1. MathJax Configuration

MathJax is loaded globally in `index.html` with the following configuration:

```html
<script>
  window.MathJax = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
      processEscapes: true,
      processEnvironments: true,
      autoload: {
        color: [],
        colorv2: ['color'],
        bbox: ['bbox'],
        cancel: ['cancel', 'bcancel', 'xcancel', 'cancelto'],
        enclose: ['enclose']
      }
    },
    options: { 
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
      ignoreHtmlClass: 'tex2jax_ignore',
      processHtmlClass: 'tex2jax_process'
    }
  };
</script>
<script id="mathjax" defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
```

### 2. LaTeX Normalization

The `normalizeLatexDelimiters` function in `src/components/Latex.tsx` handles conversion of various LaTeX formats from JSON to MathJax-compatible format:

**Supported Input Formats:**
- `\$...\$` → `$...$` (escaped dollars from JSON)
- `\(...\)` → `$...$` (LaTeX inline math)
- `\[...\]` → `$$...$$` (LaTeX display math)
- `\\frac` → `\frac` (double-escaped LaTeX commands from JSON)

**Example Transformations:**
```javascript
// Input from JSON: "\\$ s(t) = t^2 \\$"
// After JSON parsing: "\$ s(t) = t^2 \$"
// After normalization: "$ s(t) = t^2 $"

// Input from JSON: "\\$ \\\\frac{(3+h)^2 - 3^2}{h} \\$"
// After JSON parsing: "\$ \\frac{(3+h)^2 - 3^2}{h} \$"
// After normalization: "$ \frac{(3+h)^2 - 3^2}{h} $"
```

### 3. MathText Component

The `MathText` component is the primary way to render text containing LaTeX:

```tsx
import { MathText } from "@/components/Latex";

// Usage
<MathText text="The formula $E = mc^2$ is famous." />
<MathText text={question.questionText} />
<MathText text={option.content} />
<MathText text={question.explanation} />
```

**Features:**
- Automatically normalizes LaTeX delimiters
- Waits for MathJax to be ready
- Processes math expressions asynchronously
- Handles dynamic content updates
- Works on both desktop and mobile

### 4. Usage Throughout the Platform

#### Question Text
```tsx
// In StudentDashboard.tsx
<CardTitle>
  <MathText text={currentQuestion.questionText} />
</CardTitle>
```

#### Answer Options
```tsx
// In StudentDashboard.tsx
{currentQuestion.options.map((option) => (
  <div>
    <MathText text={option.content} />
  </div>
))}
```

#### Explanations
```tsx
// In StudentDashboard.tsx
{currentQuestion.explanation && (
  <div>
    <MathText text={currentQuestion.explanation} />
  </div>
)}
```

#### Chart Tooltips
```tsx
// In chart.tsx - automatically handles LaTeX in tooltip labels
<ChartTooltipContent 
  labelFormatter={(value) => <MathText text={String(value)} />}
/>
```

#### Regular Tooltips
```tsx
// In tooltip.tsx - automatically handles LaTeX
<TooltipContent>
  {typeof children === "string" ? <MathText text={children} /> : children}
</TooltipContent>
```

## Supported LaTeX Syntax

### Inline Math
- `$x^2 + y^2 = r^2$` - Basic equation
- `$\frac{a}{b}$` - Fractions
- `$\sqrt{x}$` - Square roots
- `$\sum_{i=1}^{n}$` - Summation
- `$\int_0^1 f(x) dx$` - Integrals
- `$\alpha, \beta, \gamma, \delta$` - Greek letters

### Display Math
- `$$\int_0^1 x^2 dx = \frac{1}{3}$$` - Centered block equations

### Common Commands
- Fractions: `\frac{numerator}{denominator}`
- Superscripts: `x^2`, `x^{n+1}`
- Subscripts: `H_2O`, `x_{i,j}`
- Roots: `\sqrt{x}`, `\sqrt[n]{x}`
- Greek letters: `\alpha`, `\beta`, `\gamma`, `\Delta`, `\theta`, `\pi`
- Operators: `\sum`, `\prod`, `\int`, `\lim`
- Relations: `\leq`, `\geq`, `\neq`, `\approx`, `\equiv`

## Example Questions with LaTeX

### Example 1: Basic Math
**Question Text:**
```
Given a position function $ s(t) = t^2 $, which expression represents the average velocity over the interval $ [3, 3+h] $?
```

**Options:**
- A: `$ 2(3) $`
- B: `$ \frac{(3+h)^2 - 3^2}{h} $`
- C: `$ \frac{(3+h)^2 + 3^2}{2} $`
- D: `$ (3+h)^2 - 3^2 $`

**Explanation:**
```
Average velocity is the change in position divided by the change in time: $ \frac{s(3+h) - s(3)}{(3+h) - 3} = \frac{(3+h)^2 - 9}{h} $.
```

### Example 2: Calculus
**Question Text:**
```
The 'Tangent Line Problem' in calculus asks how to find the slope of a curve at a single point $ P $. Why does standard algebra fail to solve this directly without limits?
```

**Options:**
- A: `Because the slope formula $ \frac{\Delta y}{\Delta x} $ requires two distinct points, resulting in division by zero if applied to a single point.`

## Testing LaTeX Rendering

To verify LaTeX is rendering correctly:

1. **Check Browser Console:**
   - Look for "MathJax is ready" message
   - Look for "MathJax page ready" message
   - Check for any MathJax errors

2. **Visual Inspection:**
   - Math expressions should appear as formatted notation, not raw LaTeX code
   - Fractions should display as stacked numbers
   - Superscripts/subscripts should be properly positioned
   - Greek letters should appear as symbols, not text

3. **Test Cases:**
   - Inline math: `$x^2$` should render as x²
   - Fractions: `$\frac{1}{2}$` should render as ½
   - Display math: `$$\int_0^1 x dx$$` should render as a centered equation

## Troubleshooting

### Math Not Rendering

1. **Check MathJax is loaded:**
   ```javascript
   console.log(window.MathJax);
   ```

2. **Verify LaTeX syntax:**
   - Ensure delimiters are matched: `$...$` not `$...`
   - Check for proper escaping in JSON

3. **Check component usage:**
   - Ensure `MathText` component is being used
   - Verify text contains LaTeX delimiters

4. **Check normalization:**
   - JSON format: `"\\$"` becomes `\$` after parsing
   - Normalization converts `\$` to `$`
   - MathJax processes `$...$` patterns

### Performance Issues

- MathJax renders asynchronously - allow time for processing
- Large documents may take a moment to render
- Consider lazy loading for very long content

## Mobile Compatibility

MathJax 3 is fully responsive and works on mobile devices:
- Math expressions scale properly
- Touch interactions work correctly
- Layout adapts to screen size

## Best Practices

1. **Always use MathText** for user-facing text that may contain LaTeX
2. **Keep LaTeX in JSON files** - don't pre-render it
3. **Use inline math** for short expressions within sentences
4. **Use display math** for equations that should be centered
5. **Test on mobile** - verify layout and readability

## Files Modified

- `index.html` - MathJax configuration and loading
- `src/components/Latex.tsx` - MathText component and normalization
- `src/components/StudentDashboard.tsx` - Uses MathText for questions/options/explanations
- `src/components/ui/chart.tsx` - Uses MathText in tooltips
- `src/components/ui/tooltip.tsx` - Uses MathText for tooltip content

## Summary

The LaTeX rendering system is fully implemented and working throughout the platform:
- ✅ MathJax 3 loaded globally
- ✅ LaTeX normalization handles all JSON escape sequences
- ✅ MathText component used in all relevant places
- ✅ Questions, options, and explanations render correctly
- ✅ Chart tooltips and regular tooltips support LaTeX
- ✅ Works on desktop and mobile
- ✅ No modification to question IDs, options, metadata, or userState

