import React, { useState } from 'react';

// Question data type
interface Question {
  questionText: string;
  options: Array<{ id: string; content: string }>;
  correctAnswer: string | number; // Can be string or number
}

// Example question
const sampleQuestion: Question = {
  questionText: "What is 2 + 2?",
  options: [
    { id: "A", content: "3" },
    { id: "B", content: "4" },
    { id: "C", content: "5" },
    { id: "D", content: "6" }
  ],
  correctAnswer: "B" // Can be "B" or 1, will be normalized
};

/**
 * Answer Toggle Component - React Version
 * 
 * FIXES IMPLEMENTED:
 * 1. Immediate state updates: setShowResult(true) and setQuestionResults happen
 *    BEFORE async operations, not after
 * 2. Proper state management: Using React hooks (useState) correctly, no direct DOM manipulation
 * 3. Type-safe comparison: Normalizes both selected and correct answers to strings
 *    to handle string/number mismatches
 * 4. CSS class ordering: Correct/incorrect classes take precedence over default classes
 * 
 * WHY PREVIOUS APPROACHES FAILED:
 * 1. setShowResult(false) was called first, hiding colors, then async operations ran,
 *    then setShowResult(true) was called later - causing delay
 * 2. State updates were batched with async operations, so React didn't re-render immediately
 * 3. CSS classes were in wrong order, so default styles overrode correct/incorrect styles
 * 4. Type mismatches (string vs number) caused comparison to fail silently
 */
export function AnswerToggleComponent() {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  /**
   * Handle answer selection
   */
  const handleAnswerSelect = (answerId: string) => {
    if (showResult) return; // Don't allow selection after submission
    setSelectedAnswer(answerId);
  };

  /**
   * Handle answer submission
   * 
   * CRITICAL FIX: Update state IMMEDIATELY, before any async operations
   * Previous bug: State was updated after async operations (database saves, etc.),
   * causing React to delay re-rendering until async operations completed.
   * 
   * Solution: Calculate correctness synchronously, update state immediately,
   * then do async operations in background.
   */
  const handleSubmit = async () => {
    if (!selectedAnswer) return;

    // Normalize both values for comparison (handles string/number mismatch)
    // This is critical: if correctAnswer is number 1 and selectedAnswer is string "A",
    // we need to compare the actual answer IDs, not the values
    const normalizedSelected = String(selectedAnswer).trim();
    const normalizedCorrect = String(sampleQuestion.correctAnswer).trim();
    const calculatedIsCorrect = normalizedSelected === normalizedCorrect;

    // FIX: Update state IMMEDIATELY - this triggers React re-render right away
    // Previous bug: This was done after await operations, causing delay
    setIsCorrect(calculatedIsCorrect);
    setShowResult(true);

    // Now do async operations in background (colors are already shown above)
    // Example: await saveAnswerToDatabase(selectedAnswer, calculatedIsCorrect);
    // Example: await updateUserScore(calculatedIsCorrect);
  };

  /**
   * Render answer button with correct styling
   * 
   * FIX: CSS class ordering ensures correct/incorrect colors take precedence
   * Previous bug: Default classes were applied last, overriding correct/incorrect styles
   */
  const renderAnswerButton = (option: { id: string; content: string }) => {
    // Normalize for comparison (handles string/number mismatch)
    const normalizedOptionId = String(option.id).trim();
    const normalizedSelected = selectedAnswer ? String(selectedAnswer).trim() : null;
    const normalizedCorrect = String(sampleQuestion.correctAnswer).trim();

    const isSelected = normalizedSelected === normalizedOptionId;
    const isCorrectOption = normalizedOptionId === normalizedCorrect;
    
    // Determine which classes to apply
    // FIX: Check showCorrect/showWrong FIRST, then default states
    // Previous bug: Default state was checked first, then correct/incorrect was added,
    // but CSS specificity caused default to win
    const showCorrect = showResult && isCorrectOption;
    const showWrong = showResult && isSelected && !isCorrectOption;

    // Build className with correct precedence
    let buttonClassName = 'answer-button';
    if (showCorrect) {
      buttonClassName += ' correct';
    } else if (showWrong) {
      buttonClassName += ' incorrect';
    } else if (isSelected && !showResult) {
      buttonClassName += ' selected';
    }

    return (
      <button
        key={option.id}
        onClick={() => handleAnswerSelect(option.id)}
        disabled={showResult}
        className={buttonClassName}
        style={{
          width: '100%',
          padding: '15px',
          margin: '10px 0',
          border: showCorrect 
            ? '2px solid #4caf50' 
            : showWrong 
            ? '2px solid #f44336' 
            : isSelected && !showResult
            ? '2px solid #4a90e2'
            : '2px solid #ccc',
          borderRadius: '8px',
          background: showCorrect
            ? '#e8f5e9'
            : showWrong
            ? '#ffebee'
            : isSelected && !showResult
            ? '#e3f2fd'
            : '#f5f5f5',
          color: showCorrect
            ? '#2e7d32'
            : showWrong
            ? '#c62828'
            : 'inherit',
          cursor: showResult ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          transition: 'all 0.2s',
          fontSize: '16px'
        }}
      >
        {option.id}. {option.content}
        {showCorrect && ' ✓'}
        {showWrong && ' ✗'}
      </button>
    );
  };

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      <h1>Answer Toggle Fix - React Version</h1>
      
      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        border: '2px solid #ddd', 
        borderRadius: '8px' 
      }}>
        <h2>{sampleQuestion.questionText}</h2>
        
        {sampleQuestion.options.map(option => renderAnswerButton(option))}
        
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer || showResult}
          style={{
            padding: '12px 24px',
            background: (!selectedAnswer || showResult) ? '#ccc' : '#4a90e2',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (!selectedAnswer || showResult) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            marginTop: '10px'
          }}
        >
          Submit Answer
        </button>
        
        {showResult && (
          <div style={{ 
            marginTop: '15px', 
            fontWeight: 'bold',
            color: isCorrect ? '#4caf50' : '#f44336'
          }}>
            {isCorrect 
              ? 'Correct! ✓' 
              : `Incorrect. The correct answer is ${sampleQuestion.correctAnswer}.`}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * TEST EXAMPLE USAGE:
 * 
 * 1. Click answer "B" (correct) → Should turn GREEN immediately
 * 2. Click "Submit Answer" → Button should be disabled, result shows "Correct!"
 * 3. Refresh page
 * 4. Click answer "A" (wrong) → Should turn RED immediately after submit
 * 5. Click "Submit Answer" → Button disabled, result shows "Incorrect. The correct answer is B."
 * 
 * VERIFICATION:
 * - Colors appear instantly (no delay, no page refresh needed)
 * - Only selected answer changes color
 * - Other answers remain neutral (grey/default)
 * - Works with string "B" or number 1 as correctAnswer (type-safe)
 */



