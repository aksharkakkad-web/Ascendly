/**
 * ScrollingText Component
 * 
 * Displays one text fragment at a time, centered.
 * Each phrase pauses for 1.5 seconds, then the next phrase flies up from below in 0.5 seconds.
 * 
 * @param items - Array of text fragments to display in the animation
 * @param className - Optional additional CSS classes
 */

interface ScrollingTextProps {
  items: string[];
  className?: string;
}

export function ScrollingText({ items, className = "" }: ScrollingTextProps) {
  return (
    <div 
      className={`w-full overflow-hidden mb-6 ${className}`}
      aria-label="Scrolling text animation"
    >
      <div className="scrolling-text-container">
        <div className="scrolling-text-content">
          {items.map((item, index) => (
            <span 
              key={`${item}-${index}`}
              className="scrolling-text-item"
              data-index={index}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

