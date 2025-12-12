# LaTeX Rendering Guide

This guide explains how LaTeX math expressions are automatically rendered throughout the AP test prep platform.

## Overview

The platform uses **MathJax 3** to automatically render LaTeX math expressions in:
- Question text
- Answer options
- Explanations
- Chart tooltips
- Any other text content

## Supported LaTeX Formats

The platform supports both inline and display math in multiple formats:

### Inline Math
- `$...$` - Standard inline math
- `\(...\)` - Alternative inline format

**Examples:**
- `$x^2 + y^2 = r^2$`
- `\(\frac{1}{2}\)`
- `The value is $\delta+$ and $\delta-$`

### Display Math
- `$$...$$` - Standard display math (centered, block)
- `\[...\]` - Alternative display format

**Examples:**
```
$$\int_0^1 x^2 dx = \frac{1}{3}$$
```

## Components

### MathText Component

The main component for rendering text with LaTeX:

```tsx
import { MathText } from "@/components/Latex";

// Automatically detects and renders LaTeX
<MathText text="The formula $E = mc^2$ is famous." />
```

**Features:**
- Automatically detects LaTeX delimiters
- Renders math while preserving plain text
- Handles both inline and display math
- Works on desktop and mobile
- Responsive and accessible

### Usage Examples

#### Question Text
```tsx
<MathText text={question.questionText} />
```

#### Answer Options
```tsx
{question.options.map((option) => (
  <div>
    <MathText text={option.content} />
  </div>
))}
```

#### Explanations
```tsx
{question.explanation && (
  <div>
    <MathText text={question.explanation} />
  </div>
)}
```

### useMathJax Hook

For custom components that need LaTeX rendering:

```tsx
import { useMathJax } from "@/hooks/useMathJax";

function MyComponent() {
  const ref = useMathJax<HTMLDivElement>();
  
  return (
    <div ref={ref}>
      <p>The formula $E = mc^2$ will be rendered.</p>
    </div>
  );
}
```

### MathJaxWrapper Component

For wrapping dynamic content:

```tsx
import { MathJaxWrapper } from "@/hooks/useMathJax";

<MathJaxWrapper>
  <div>Content with $x^2$ math</div>
</MathJaxWrapper>
```

## Chart Tooltips

Chart tooltips automatically render LaTeX in labels and values:

```tsx
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

<ChartTooltip 
  content={<ChartTooltipContent />} 
/>
```

Any labels or values containing LaTeX will be automatically rendered.

## Common LaTeX Commands

The platform supports standard LaTeX math commands:

### Fractions
- `$\frac{a}{b}$` → renders as a fraction

### Superscripts and Subscripts
- `$x^2$` → x squared
- `$H_2O$` → H₂O

### Greek Letters
- `$\alpha, \beta, \gamma, \delta, \Delta$`
- `$\theta, \pi, \sigma, \rho, \omega$`

### Operators
- `$\sum, \int, \prod$`
- `$\sqrt{x}, \sqrt[n]{x}$`

### Relations
- `$\leq, \geq, \neq, \approx$`
- `$\rightarrow, \leftarrow$`

### Text in Math
- `$\text{some text}$` → renders text within math

## Best Practices

1. **Always use MathText for user-facing text** that may contain LaTeX
2. **Keep LaTeX in JSON files** - don't pre-render it
3. **Use inline math for short expressions** within sentences
4. **Use display math for equations** that should be centered
5. **Test on mobile** - MathJax is responsive but verify layout

## Troubleshooting

### Math not rendering?
1. Check that MathJax is loaded (check browser console)
2. Verify LaTeX syntax is correct
3. Ensure delimiters are properly matched
4. Check that MathText component is being used

### Performance issues?
- MathJax renders asynchronously
- Large documents may take a moment to render
- Consider lazy loading for very long content

## Technical Details

- **Library**: MathJax 3.0+
- **CDN**: jsdelivr.net
- **Format**: TeX/LaTeX
- **Output**: HTML+CSS (no images)

The platform automatically:
- Detects LaTeX delimiters
- Normalizes different formats (`\(...\)` → `$...$`)
- Renders math on component mount/update
- Handles dynamic content updates

