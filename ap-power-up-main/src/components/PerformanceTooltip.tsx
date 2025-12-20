import React from "react";
import { getConfidenceLabel } from "@/lib/performanceAnalytics";
import { PlotPoint } from "@/lib/performanceAnalytics";

interface PerformanceTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PlotPoint }>;
  useConfidence: boolean;
}

export function PerformanceTooltip({ active, payload, useConfidence }: PerformanceTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0].payload as PlotPoint;

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-4 max-w-sm">
      <div className="space-y-2">
        {point.studentName && (
          <div className="font-semibold text-lg border-b pb-2">
            {point.studentName}
          </div>
        )}
        
        <div>
          <div className="text-xs text-muted-foreground mb-1">Question</div>
          <div className="text-sm font-medium line-clamp-2">
            {point.questionText}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Unit</div>
            <div className="font-medium">{point.unitName}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Subtopic</div>
            <div className="font-medium">{point.subtopicName}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Time Spent</div>
            <div className="font-medium">{Math.round(point.timeSpentSeconds)}s</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {useConfidence ? "Confidence" : "Accuracy"}
            </div>
            <div className="font-medium">
              {useConfidence
                ? getConfidenceLabel(point.confidence)
                : point.isCorrect
                ? "Correct"
                : "Incorrect"}
            </div>
          </div>
        </div>
        
        <div>
          <div className="text-xs text-muted-foreground">Result</div>
          <div className={`font-medium ${point.isCorrect ? "text-green-600" : "text-red-600"}`}>
            {point.isCorrect ? "✓ Correct" : "✗ Incorrect"}
          </div>
        </div>
      </div>
    </div>
  );
}

