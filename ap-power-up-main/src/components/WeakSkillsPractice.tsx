import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WeakSkill } from "@/lib/advancedAnalytics";
import { Target, Loader2, BookOpen } from "lucide-react";
import { getQuestionsForUnit } from "@/lib/jsonLoader";

interface Props {
  weakSkills: WeakSkill[];
  practiceQuestions: string[];
  selectedClass: string;
  selectedUnit?: string;
  userId: string;
}

export function WeakSkillsPractice({ weakSkills, practiceQuestions, selectedClass, selectedUnit, userId }: Props) {
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [showUnitChoiceDialog, setShowUnitChoiceDialog] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const handleOpenPractice = async () => {
    // If there are no practice questions, show message
    if (practiceQuestions.length === 0) {
      setShowPracticeModal(true);
      return;
    }

    // Always show the unit choice dialog to let user choose
    setShowUnitChoiceDialog(true);
  };

  const startPracticeQuiz = async (questionIds: string[]) => {
    if (questionIds.length === 0) {
      setShowPracticeModal(true);
      return;
    }

    // Dispatch a custom event that StudentDashboard can listen to
    const event = new CustomEvent("startPracticeQuiz", {
      detail: { questionIds }
    });
    window.dispatchEvent(event);
    setShowPracticeModal(false);
    setShowUnitChoiceDialog(false);
  };

  const handlePracticeInCurrentUnit = async () => {
    if (!selectedUnit || !selectedClass) {
      return;
    }

    setLoadingQuestions(true);
    try {
      // Get all questions for the current unit
      const unitQuestions = await getQuestionsForUnit(selectedClass, selectedUnit);
      
      // Build a set of question IDs from the unit
      // Question IDs can be either question.id or constructed as `${className}:${unitName}:${subtopicName}:${index}`
      const unitQuestionIds = new Set<string>();
      const { loadClassData } = await import("@/lib/jsonLoader");
      const classData = await loadClassData(selectedClass);
      
      if (classData) {
        const unit = classData.units.find(u => u.unitName === selectedUnit);
        if (unit) {
          unit.subtopics.forEach((subtopic, subtopicIdx) => {
            subtopic.questions.forEach((q, qIdx) => {
              // Add the actual question ID if it exists
              if (q.id) {
                unitQuestionIds.add(q.id);
              }
              // Also add the constructed ID format that might be used
              const constructedId = `${selectedClass}:${selectedUnit}:${subtopic.subtopicName}:${qIdx}`;
              unitQuestionIds.add(constructedId);
            });
          });
        }
      }
      
      // Also add IDs from unitQuestions directly
      unitQuestions.forEach(q => {
        if (q.id) {
          unitQuestionIds.add(q.id);
        }
      });
      
      // Filter practice questions to only include those in the current unit
      const filteredIds = practiceQuestions.filter(qId => {
        // Check if the question ID matches any unit question ID
        // Also check if it contains the unit name (for constructed IDs)
        if (unitQuestionIds.has(qId)) {
          return true;
        }
        // Check if the ID contains the unit name (for constructed IDs like "className:unitName:...")
        if (qId.includes(`:${selectedUnit}:`)) {
          return true;
        }
        return false;
      });

      if (filteredIds.length > 0) {
        await startPracticeQuiz(filteredIds);
      } else {
        // If no questions match, fall back to whole class
        await startPracticeQuiz(practiceQuestions);
      }
    } catch (error) {
      console.error("Error filtering questions by unit:", error);
      // Fallback to whole class on error
      await startPracticeQuiz(practiceQuestions);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handlePracticeWholeClass = async () => {
    await startPracticeQuiz(practiceQuestions);
  };

  return (
    <>
      <Card variant="elevated" className="border-2 border-secondary/20 shadow-lg">
        <CardHeader className="pb-8 pt-8 px-8">
          <CardTitle className="flex items-center gap-4 text-3xl md:text-4xl font-bold">
            <Target className="w-8 h-8 text-secondary" />
            Practice Weak Skills
          </CardTitle>
          <CardDescription className="text-lg md:text-xl mt-3">
            {weakSkills.length > 0 
              ? `Focus on ${weakSkills.length} skill${weakSkills.length !== 1 ? 's' : ''} to improve your performance`
              : "Keep practicing to identify areas for improvement"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 pb-8 px-8">
          <div className="space-y-8">
            {weakSkills.length > 0 && (
              <div>
                <div className="text-xl font-bold mb-4 text-foreground">Top Skills to Practice:</div>
                <div className="flex flex-wrap gap-3">
                  {weakSkills.map((skill) => (
                    <Badge 
                      key={skill.skill} 
                      variant="outline" 
                      className="bg-red-50 text-red-700 border-red-300 text-xl py-4 px-6"
                    >
                      {skill.skill} ({Math.round(skill.accuracy * 100)}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Practice Button - Always show as a tappable button */}
            <Button 
              onClick={handleOpenPractice}
              className="w-full h-16 text-xl font-bold"
              variant="student"
              size="lg"
              disabled={practiceQuestions.length === 0 || loadingQuestions}
            >
              {loadingQuestions ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Target className="w-6 h-6 mr-3" />
                  Practice Weak Skills
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unit Choice Dialog */}
      <Dialog open={showUnitChoiceDialog} onOpenChange={setShowUnitChoiceDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[85vh] flex flex-col p-6 gap-4 overflow-hidden">
          <DialogHeader className="flex-shrink-0 pb-1">
            <DialogTitle className="text-lg sm:text-xl pr-6">Practice Weak Skills</DialogTitle>
            <DialogDescription className="text-sm mt-1.5">
              Where would you like to practice your weak skills?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 flex-shrink-0">
            <Button
              onClick={handlePracticeInCurrentUnit}
              variant="outline"
              size="lg"
              className="w-full justify-start h-auto py-3.5 px-4 min-h-[4.5rem]"
              disabled={loadingQuestions || !selectedUnit}
            >
              <div className="flex items-center gap-3 w-full min-w-0">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex-1 text-left min-w-0 overflow-hidden">
                  <div className="font-semibold text-sm sm:text-base mb-1 break-words">Current Unit</div>
                  {selectedUnit ? (
                    <div className="text-xs sm:text-sm text-muted-foreground break-words leading-relaxed">
                      Practice weak skills in <span className="font-medium">{selectedUnit}</span>
                    </div>
                  ) : (
                    <div className="text-xs sm:text-sm text-muted-foreground italic">
                      Please select a unit first
                    </div>
                  )}
                </div>
              </div>
            </Button>
            <Button
              onClick={handlePracticeWholeClass}
              variant="outline"
              size="lg"
              className="w-full justify-start h-auto py-3.5 px-4 min-h-[4.5rem]"
              disabled={loadingQuestions}
            >
              <div className="flex items-center gap-3 w-full min-w-0">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex-1 text-left min-w-0 overflow-hidden">
                  <div className="font-semibold text-sm sm:text-base mb-1 break-words">Whole Class</div>
                  <div className="text-xs sm:text-sm text-muted-foreground break-words leading-relaxed">
                    Practice weak skills across all units in <span className="font-medium">{selectedClass}</span>
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Practice Questions Modal (for showing no questions available) */}
      <Dialog open={showPracticeModal} onOpenChange={setShowPracticeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>No Practice Questions Available</DialogTitle>
            <DialogDescription>
              {practiceQuestions.length === 0 
                ? "Keep practicing more questions to identify areas that need improvement."
                : "Unable to start practice session. Please try again."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowPracticeModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

