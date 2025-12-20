/**
 * Typewriter Component
 * 
 * Displays text with a typewriter animation effect. Types out words letter by letter,
 * then deletes them letter by letter before typing the next word. Includes a blinking cursor.
 * 
 * @param words - Array of words/phrases to cycle through
 * @param typingSpeed - Milliseconds per character when typing (default: 100)
 * @param deletingSpeed - Milliseconds per character when deleting (default: 50)
 * @param pauseTime - Milliseconds to pause after completing a word (default: 2000)
 * @param className - Optional additional CSS classes
 */

import { useState, useEffect } from "react";

interface TypewriterProps {
  words: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseTime?: number;
  className?: string;
}

export function Typewriter({ 
  words, 
  typingSpeed = 100, 
  deletingSpeed = 50, 
  pauseTime = 2000,
  className = "" 
}: TypewriterProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (words.length === 0) return;

    const currentWord = words[currentWordIndex];
    
    // Handle pause after completing a word
    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseTime);
      return () => clearTimeout(pauseTimer);
    }

    // Handle typing
    if (!isDeleting && currentText.length < currentWord.length) {
      const typingTimer = setTimeout(() => {
        setCurrentText(currentWord.substring(0, currentText.length + 1));
      }, typingSpeed);
      return () => clearTimeout(typingTimer);
    }

    // Handle deleting
    if (isDeleting && currentText.length > 0) {
      const deletingTimer = setTimeout(() => {
        setCurrentText(currentText.substring(0, currentText.length - 1));
      }, deletingSpeed);
      return () => clearTimeout(deletingTimer);
    }

    // Finished deleting, move to next word
    if (isDeleting && currentText.length === 0) {
      setIsDeleting(false);
      setCurrentWordIndex((prev) => (prev + 1) % words.length);
    }

    // Finished typing, pause before deleting
    if (!isDeleting && currentText.length === currentWord.length) {
      setIsPaused(true);
    }
  }, [currentText, isDeleting, isPaused, currentWordIndex, words, typingSpeed, deletingSpeed, pauseTime]);

  const currentWord = words[currentWordIndex];
  const isAscendly = currentWord === "Ascendly";

  return (
    <div 
      className={`typewriter-container ${className}`}
      aria-label="Typewriter animation"
    >
      <span className={`typewriter-text ${isAscendly ? 'typewriter-text-ascendly' : ''}`}>
        {currentText}
        <span className="typewriter-cursor">|</span>
      </span>
    </div>
  );
}

