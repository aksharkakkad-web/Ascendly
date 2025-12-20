import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PlotPoint, getConfidenceLabel } from "@/lib/performanceAnalytics";
// Simple text formatter (similar to StudentDashboard formatText)
const formatText = (text: string) => {
  if (!text) return "";
  return text
    .replace(/\$(.*?)\$/g, "$1")
    .replace(/\\\((.*?)\\\)/g, "$1")
    .replace(/\\\[(.*?)\\\]/g, "$1")
    .replace(/\\n/g, "\n");
};

interface PerformanceDetailModalProps {
  open: boolean;
  onClose: () => void;
  point: PlotPoint | null;
  useConfidence: boolean;
  isClassView?: boolean;
}

export function PerformanceDetailModal({
  open,
  onClose,
  point,
  useConfidence,
  isClassView = false,
}: PerformanceDetailModalProps) {
  if (!point) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Question Details</DialogTitle>
          <DialogDescription>
            {point.studentName && (
              <span className="block mb-2">Student: {point.studentName}</span>
            )}
            <span className="block">Unit: {point.unitName} • Subtopic: {point.subtopicName}</span>
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
          <div className="space-y-6">
            {/* Question Text */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Question</h3>
              <div className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
                {formatText(point.questionText)}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Time Spent</div>
                <div className="text-lg font-bold">{Math.round(point.timeSpentSeconds)}s</div>
              </div>
              
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">
                  {useConfidence ? "Confidence" : "Accuracy"}
                </div>
                <div className="text-lg font-bold">
                  {useConfidence
                    ? getConfidenceLabel(point.confidence)
                    : point.isCorrect
                    ? "Correct"
                    : "Incorrect"}
                </div>
              </div>
              
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Result</div>
                <div className={`text-lg font-bold ${point.isCorrect ? "text-green-600" : "text-red-600"}`}>
                  {point.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                </div>
              </div>
              
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Question ID</div>
                <div className="text-xs font-mono truncate">{point.questionId}</div>
              </div>
            </div>

            {/* Explanation */}
            {point.explanation && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Explanation</h3>
                <div className="text-sm whitespace-pre-wrap bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  {formatText(point.explanation)}
                </div>
              </div>
            )}

            {/* Common Mistake Patterns */}
            {point.commonMistakePatterns && point.commonMistakePatterns.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Common Mistakes</h3>
                <div className="space-y-2">
                  {point.commonMistakePatterns.map((mistake, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-sm bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800"
                    >
                      <span className="text-yellow-600 dark:text-yellow-400">⚠</span>
                      <span>{mistake}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Insights */}
            {!point.isCorrect && point.confidence !== null && point.confidence >= 4 && (
              <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 font-bold">⚠</span>
                  <div>
                    <div className="font-semibold text-red-900 dark:text-red-100 mb-1">
                      False Mastery Detected
                    </div>
                    <div className="text-sm text-red-800 dark:text-red-200">
                      High confidence but incorrect answer. This suggests overconfidence or misunderstanding of the concept.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {point.isCorrect && point.confidence !== null && point.confidence <= 2 && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">💡</span>
                  <div>
                    <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Hesitation Point
                    </div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      Correct answer but low confidence. Consider reviewing this topic to build confidence.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

