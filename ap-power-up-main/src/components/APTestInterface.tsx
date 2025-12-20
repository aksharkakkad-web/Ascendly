import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, CheckCircle, XCircle, Clock, AlertTriangle, ChevronLeft, ChevronRight, Eye, EyeOff, Flag } from "lucide-react";
import { APTestData, APTestQuestion, APTestQuestionResponse } from "@/lib/apTestData";
import { MathText } from "@/components/Latex";
import { StimulusRenderer } from "@/components/StimulusRenderer";
import { StimulusPerformance } from "@/lib/questionData";
import { toast } from "sonner";

// Calculate struggle score (0-1) based on correctness and time spent
function calculateStruggleScore(
  isCorrect: boolean,
  timeSpentSeconds: number,
  maxExpectedTime: number = 120
): number {
  const correctnessComponent = isCorrect ? 0 : 1;
  const normalizedTime = Math.min(timeSpentSeconds / maxExpectedTime, 2.0) / 2.0;
  const struggleScore = correctnessComponent * 0.7 + normalizedTime * 0.3;
  return Math.max(0, Math.min(1, struggleScore));
}

interface APTestInterfaceProps {
  testData: APTestData;
  onComplete: (responses: APTestQuestionResponse[]) => void;
  onExit: () => void;
}

export function APTestInterface({ testData, onComplete, onExit }: APTestInterfaceProps) {
  // Validate testData
  if (!testData || !testData.questions || testData.questions.length === 0) {
    console.error('[APTestInterface] Invalid testData:', testData);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card variant="elevated" className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Test</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The test data could not be loaded. Please try again.
            </p>
            <Button onClick={onExit} variant="default">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(testData.time_limit_minutes * 60); // in seconds
  const [responses, setResponses] = useState<Record<number, APTestQuestionResponse>>({});
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<number, number>>({});
  const [answerChanges, setAnswerChanges] = useState<Record<number, number>>({});
  const [showTimeBar, setShowTimeBar] = useState(true);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  const currentQuestion = testData.questions[currentQuestionIndex];
  const currentResponse = responses[currentQuestionIndex];

  // Additional safety check
  if (!currentQuestion) {
    console.error('[APTestInterface] Current question is undefined:', {
      currentQuestionIndex,
      questionsLength: testData.questions.length,
      testData
    });
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card variant="elevated" className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Question</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Question {currentQuestionIndex + 1} could not be loaded.
            </p>
            <Button onClick={onExit} variant="default">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Define handleAutoSubmit before it's used in useEffect
  const handleAutoSubmit = useCallback(() => {
    // Save all current responses and submit
    const allResponses: APTestQuestionResponse[] = [];
    
    testData.questions.forEach((question, index) => {
      const response = responses[index];
      if (response) {
        allResponses.push(response);
      } else {
        // Create response for unanswered questions
        const startTime = questionStartTimes[index] || Date.now();
        const timeSpent = (Date.now() - startTime) / 1000;
        
        // Calculate stimulus performance if question has stimulus
        let stimulusPerformance: StimulusPerformance | undefined;
        if (question.stimulusMeta?.hasStimulus) {
          const struggleScore = calculateStruggleScore(false, timeSpent, question.estimated_time_seconds);
          stimulusPerformance = {
            attemptCount: 1,
            timeSpentSeconds: timeSpent,
            wasCorrect: false,
            struggleScore,
          };
        }
        
        allResponses.push({
          questionId: question.id,
          userAnswer: null,
          isCorrect: false,
          timeSpentSeconds: timeSpent,
          answerChanges: answerChanges[index] || 0,
          skillType: question.skill_type,
          difficulty: question.difficulty,
          tags: question.tags,
          estimatedTimeSeconds: question.estimated_time_seconds,
          startTime,
          endTime: Date.now(),
          stimulusPerformance,
        });
      }
    });

    toast.error("Time limit reached! Test submitted automatically.");
    onComplete(allResponses);
  }, [responses, questionStartTimes, answerChanges, testData.questions, onComplete]);

  // Initialize question start time when navigating to a question
  useEffect(() => {
    if (!questionStartTimes[currentQuestionIndex]) {
      setQuestionStartTimes(prev => ({
        ...prev,
        [currentQuestionIndex]: Date.now()
      }));
    }
  }, [currentQuestionIndex, questionStartTimes]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) {
      handleAutoSubmit();
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, handleAutoSubmit]);

  // Track answer changes
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'APTestInterface.tsx:172',message:'selectedAnswer useEffect triggered',data:{selectedAnswer,currentQuestionIndex,currentResponseUserAnswer:currentResponse?.userAnswer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (selectedAnswer && selectedAnswer !== currentResponse?.userAnswer) {
      setAnswerChanges(prev => ({
        ...prev,
        [currentQuestionIndex]: (prev[currentQuestionIndex] || 0) + 1
      }));
    }
  }, [selectedAnswer, currentQuestionIndex, currentResponse]);
  
  // Auto-save answer when selectedAnswer changes (for immediate UI update)
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'APTestInterface.tsx:auto-save',message:'Auto-save useEffect triggered',data:{selectedAnswer,currentQuestionIndex,responsesKeys:Object.keys(responses),currentResponseUserAnswer:responses[currentQuestionIndex]?.userAnswer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (selectedAnswer && currentQuestion) {
      try {
        // Use functional update to avoid stale closure issues
        setResponses(prev => {
          const existingResponse = prev[currentQuestionIndex];
          // Check if answer actually changed to avoid unnecessary updates
          if (existingResponse && existingResponse.userAnswer === selectedAnswer) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'APTestInterface.tsx:auto-save',message:'Answer unchanged, skipping update',data:{selectedAnswer,currentQuestionIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            return prev; // Return same object reference if no change
          }
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'APTestInterface.tsx:auto-save',message:'Saving/updating answer to responses immediately',data:{selectedAnswer,currentQuestionIndex,isUpdate:!!existingResponse},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          
          // Use functional updates for other state to avoid stale closures
          const startTime = existingResponse?.startTime || questionStartTimes[currentQuestionIndex] || Date.now();
          const isCorrect = selectedAnswer === currentQuestion.correct_answer;
          const timeSpent = (Date.now() - startTime) / 1000;
          
          // Calculate stimulus performance if question has stimulus
          let stimulusPerformance: StimulusPerformance | undefined;
          if (currentQuestion.stimulusMeta?.hasStimulus) {
            const struggleScore = calculateStruggleScore(isCorrect, timeSpent, currentQuestion.estimated_time_seconds);
            stimulusPerformance = {
              attemptCount: 1,
              timeSpentSeconds: timeSpent,
              wasCorrect: isCorrect,
              struggleScore,
            };
          }
          
          const response: APTestQuestionResponse = {
            questionId: currentQuestion.id,
            userAnswer: selectedAnswer,
            isCorrect,
            timeSpentSeconds: timeSpent,
            answerChanges: answerChanges[currentQuestionIndex] || 0,
            skillType: currentQuestion.skill_type,
            difficulty: currentQuestion.difficulty,
            tags: currentQuestion.tags,
            estimatedTimeSeconds: currentQuestion.estimated_time_seconds,
            startTime,
            endTime: Date.now(),
            stimulusPerformance,
          };
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'APTestInterface.tsx:auto-save',message:'Updating responses state',data:{currentQuestionIndex,selectedAnswer,prevResponsesCount:Object.keys(prev).length,newResponseUserAnswer:response.userAnswer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          
          // Create new object to ensure React detects the change
          const newResponses = { ...prev, [currentQuestionIndex]: response };
          
          return newResponses;
        });
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'APTestInterface.tsx:auto-save',message:'Error in auto-save useEffect',data:{error:error?.toString(),selectedAnswer,currentQuestionIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        console.error('[APTestInterface] Error in auto-save useEffect:', error);
        // Don't throw - just log the error to prevent navigation issues
      }
    }
  }, [selectedAnswer, currentQuestionIndex, currentQuestion, questionStartTimes, answerChanges]);

  const handleAnswerSelect = (answer: "A" | "B" | "C" | "D") => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'APTestInterface.tsx:275',message:'handleAnswerSelect called',data:{answer,currentQuestionIndex,hasResponse:!!responses[currentQuestionIndex],correctAnswer:currentQuestion?.correct_answer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    setSelectedAnswer(answer);
    
    // Immediately save the answer and update colors
    if (currentQuestion) {
      const isCorrect = answer === currentQuestion.correct_answer;
      const startTime = questionStartTimes[currentQuestionIndex] || Date.now();
      const timeSpent = (Date.now() - startTime) / 1000;
      
      // Calculate stimulus performance if question has stimulus
      let stimulusPerformance: StimulusPerformance | undefined;
      if (currentQuestion.stimulusMeta?.hasStimulus) {
        const struggleScore = calculateStruggleScore(isCorrect, timeSpent, currentQuestion.estimated_time_seconds);
        stimulusPerformance = {
          attemptCount: 1,
          timeSpentSeconds: timeSpent,
          wasCorrect: isCorrect,
          struggleScore,
        };
      }
      
      const response: APTestQuestionResponse = {
        questionId: currentQuestion.id,
        userAnswer: answer,
        isCorrect,
        timeSpentSeconds: timeSpent,
        answerChanges: answerChanges[currentQuestionIndex] || 0,
        skillType: currentQuestion.skill_type,
        difficulty: currentQuestion.difficulty,
        tags: currentQuestion.tags,
        estimatedTimeSeconds: currentQuestion.estimated_time_seconds,
        startTime,
        endTime: Date.now(),
        stimulusPerformance,
      };
      
      // Update responses immediately
      setResponses(prev => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'APTestInterface.tsx:handleAnswerSelect',message:'Saving answer immediately in handleAnswerSelect',data:{currentQuestionIndex,answer,isCorrect,prevResponsesCount:Object.keys(prev).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return { ...prev, [currentQuestionIndex]: response };
      });
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ca7e74ef-d8f9-434d-94a2-0f5f654cf3f3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'APTestInterface.tsx:handleAnswerSelect',message:'selectedAnswer state updated and answer saved',data:{answer,currentQuestionIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  };

  // Auto-save answer when navigating away (handled in jumpToQuestion)

  const jumpToQuestion = (index: number) => {
      // Save current answer if selected (auto-save when navigating)
      if (selectedAnswer && !responses[currentQuestionIndex]) {
        const startTime = questionStartTimes[currentQuestionIndex] || Date.now();
        const isCorrect = selectedAnswer === currentQuestion.correct_answer;
        const timeSpent = (Date.now() - startTime) / 1000;
        
        // Calculate stimulus performance if question has stimulus
        let stimulusPerformance: StimulusPerformance | undefined;
        if (currentQuestion.stimulusMeta?.hasStimulus) {
          const struggleScore = calculateStruggleScore(isCorrect, timeSpent, currentQuestion.estimated_time_seconds);
          stimulusPerformance = {
            attemptCount: 1,
            timeSpentSeconds: timeSpent,
            wasCorrect: isCorrect,
            struggleScore,
          };
        }
        
        const response: APTestQuestionResponse = {
          questionId: currentQuestion.id,
          userAnswer: selectedAnswer,
          isCorrect,
          timeSpentSeconds: timeSpent,
          answerChanges: answerChanges[currentQuestionIndex] || 0,
          skillType: currentQuestion.skill_type,
          difficulty: currentQuestion.difficulty,
          tags: currentQuestion.tags,
          estimatedTimeSeconds: currentQuestion.estimated_time_seconds,
          startTime,
          endTime: Date.now(),
          stimulusPerformance,
        };
        setResponses(prev => ({ ...prev, [currentQuestionIndex]: response }));
      }

    setCurrentQuestionIndex(index);
    const existingResponse = responses[index];
    setSelectedAnswer(existingResponse?.userAnswer || null);
  };

  const handleSubmitTest = () => {
    const answeredCount = Object.keys(responses).length;
    const totalQuestions = testData.questions.length;

    if (answeredCount < totalQuestions) {
      const confirm = window.confirm(
        `You have answered ${answeredCount} out of ${totalQuestions} questions. ` +
        `Are you sure you want to submit? Unanswered questions will be marked as incorrect.`
      );
      if (!confirm) return;
    }

    // Collect all responses
    const allResponses: APTestQuestionResponse[] = [];
    testData.questions.forEach((question, index) => {
      const response = responses[index];
      if (response) {
        allResponses.push(response);
      } else {
        // Create response for unanswered questions
        const startTime = questionStartTimes[index] || Date.now();
        const timeSpent = (Date.now() - startTime) / 1000;
        
        // Calculate stimulus performance if question has stimulus
        let stimulusPerformance: StimulusPerformance | undefined;
        if (question.stimulusMeta?.hasStimulus) {
          const struggleScore = calculateStruggleScore(false, timeSpent, question.estimated_time_seconds);
          stimulusPerformance = {
            attemptCount: 1,
            timeSpentSeconds: timeSpent,
            wasCorrect: false,
            struggleScore,
          };
        }
        
        allResponses.push({
          questionId: question.id,
          userAnswer: null,
          isCorrect: false,
          timeSpentSeconds: timeSpent,
          answerChanges: answerChanges[index] || 0,
          skillType: question.skill_type,
          difficulty: question.difficulty,
          tags: question.tags,
          estimatedTimeSeconds: question.estimated_time_seconds,
          startTime,
          endTime: Date.now(),
          stimulusPerformance,
        });
      }
    });

    onComplete(allResponses);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(responses).length;
  const isTimeLow = timeRemaining < 300; // Less than 5 minutes

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-secondary text-secondary-foreground py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <span className="font-bold text-xl">{testData.ap_class}</span>
              <span className="mx-2 opacity-50">•</span>
              <span className="opacity-80">Practice {testData.test_id}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isTimeLow ? 'bg-destructive/20 text-destructive' : 'bg-secondary-foreground/10'
            }`}>
              <Clock className="w-5 h-5" />
              <span className="font-bold text-xl md:text-2xl">{formatTime(timeRemaining)}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTimeBar(!showTimeBar)}
              className="text-secondary-foreground hover:bg-secondary-foreground/10"
              title={showTimeBar ? "Hide time bar" : "Show time bar"}
            >
              {showTimeBar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {showTimeBar && (
          <div className="container mx-auto px-6 mt-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm md:text-base text-secondary-foreground/80">
                <span>Time Remaining</span>
                <span>{formatTime(timeRemaining)}</span>
              </div>
              <div className="h-3 bg-secondary-foreground/20 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    timeRemaining < 300 ? 'bg-destructive' :
                    timeRemaining < 600 ? 'bg-orange-500' :
                    'bg-secondary-foreground'
                  }`}
                  style={{ width: `${(timeRemaining / (testData.time_limit_minutes * 60)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 max-w-[95vw]">
        {/* Progress Summary at Top */}
        <Card variant="elevated" className="mb-4 shadow-lg border-2">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Answered</span>
                  <span className="text-2xl font-bold text-success">{answeredCount}</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-success transition-all duration-500"
                    style={{ width: `${(answeredCount / testData.questions.length) * 100}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Remaining</span>
                  <span className="text-2xl font-bold text-muted-foreground">
                    {testData.questions.length - answeredCount}
                  </span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-muted-foreground/30 transition-all duration-500"
                    style={{ width: `${((testData.questions.length - answeredCount) / testData.questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="text-center">
                <div className="text-4xl font-bold text-secondary mb-1">
                  {Math.round((answeredCount / testData.questions.length) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stimulus Section - Above Question Card */}
        {currentQuestion?.stimulus && Array.isArray(currentQuestion.stimulus) && currentQuestion.stimulus.length > 0 && (
          <Card variant="elevated" className="mb-8 border-2 border-secondary/30 bg-secondary/10 shadow-lg">
            <CardContent className="pt-12 pb-12 px-12">
              <div className="mb-10">
                <h3 className="text-4xl md:text-5xl font-bold text-secondary mb-4">Stimulus</h3>
                <p className="text-2xl text-foreground/80 font-medium">Review the information below before answering the question.</p>
              </div>
              <StimulusRenderer stimulus={currentQuestion.stimulus} />
            </CardContent>
          </Card>
        )}

        {/* Question Card - Stretched horizontally to fill space */}
        <Card variant="elevated" className="animate-fade-in min-h-[75vh] shadow-xl border-2 w-full">
              <CardHeader className="pb-6 px-8 pt-8">
                
                <div className="flex items-start justify-between gap-4 mb-4">
                  <CardTitle className="text-2xl md:text-3xl lg:text-4xl leading-[1.5] text-left flex-1">
                    <div className="w-full max-w-none">
                      <MathText text={currentQuestion.question_text} />
                    </div>
                  </CardTitle>
                  <Button
                    variant={flaggedQuestions.has(currentQuestionIndex) ? "default" : "outline"}
                    size="lg"
                    onClick={() => {
                      setFlaggedQuestions(prev => {
                        const next = new Set(prev);
                        if (next.has(currentQuestionIndex)) {
                          next.delete(currentQuestionIndex);
                        } else {
                          next.add(currentQuestionIndex);
                        }
                        return next;
                      });
                    }}
                    className={`flex-shrink-0 ${
                      flaggedQuestions.has(currentQuestionIndex) 
                        ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                        : ''
                    }`}
                    title={flaggedQuestions.has(currentQuestionIndex) ? "Unflag question" : "Flag question for review"}
                  >
                    <Flag className={`w-5 h-5 ${flaggedQuestions.has(currentQuestionIndex) ? 'fill-current' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 px-8 pb-8">
                {Object.entries(currentQuestion.options).map(([key, value]) => {
                  const optionKey = key as "A" | "B" | "C" | "D";
                  const isSelected = selectedAnswer === optionKey;

                  return (
                    <button
                      key={key}
                      onClick={() => handleAnswerSelect(optionKey)}
                      className={`w-full p-6 rounded-2xl border-2 text-left transition-all duration-200 flex items-start gap-5
                        ${isSelected 
                          ? 'border-secondary bg-secondary/15 shadow-md ring-2 ring-secondary/20' 
                          : 'border-border bg-card hover:border-secondary/50 hover:bg-secondary/5 hover:shadow-sm'
                        }
                      `}
                    >
                      <span className={`w-14 h-14 rounded-xl flex items-center justify-center font-extrabold text-xl flex-shrink-0 transition-all
                        ${isSelected 
                          ? 'bg-secondary text-secondary-foreground shadow-lg scale-110' 
                          : 'bg-muted text-muted-foreground'
                        }
                      `}>
                        {key}
                      </span>
                      <div className="flex-1 font-medium text-lg md:text-xl whitespace-pre-wrap leading-relaxed pt-1">
                        <MathText text={value} />
                      </div>
                    </button>
                  );
                })}


                {/* Navigation Buttons - Sticky positioning */}
                <div className="sticky bottom-0 bg-card pt-4 pb-2 border-t-2 border-border/50 -mx-8 px-8">
                  <div className="flex gap-4 items-center justify-center mb-4">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        if (currentQuestionIndex > 0) {
                          jumpToQuestion(currentQuestionIndex - 1);
                        }
                      }}
                      disabled={currentQuestionIndex === 0}
                      className="flex-shrink-0 px-8 py-6 text-lg font-semibold"
                    >
                      <ChevronLeft className="w-6 h-6 mr-2" />
                      Previous
                    </Button>
                    
                    <div className="text-lg font-medium text-foreground px-6 py-2 bg-muted/50 rounded-lg">
                      Question {currentQuestionIndex + 1} of {testData.questions.length}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        if (currentQuestionIndex < testData.questions.length - 1) {
                          jumpToQuestion(currentQuestionIndex + 1);
                        }
                      }}
                      disabled={currentQuestionIndex === testData.questions.length - 1}
                      className="flex-shrink-0 px-8 py-6 text-lg font-semibold"
                    >
                      Next
                      <ChevronRight className="w-6 h-6 ml-2" />
                    </Button>
                  </div>

                  {/* Submit Test Button */}
                  {answeredCount === testData.questions.length && (
                    <Button
                      variant="default"
                      size="lg"
                      className="w-full py-6 text-xl font-bold"
                      onClick={handleSubmitTest}
                    >
                      Submit Test
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

        {isTimeLow && (
          <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive font-medium">
              Less than 5 minutes remaining! Consider reviewing your answers and submitting soon.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
