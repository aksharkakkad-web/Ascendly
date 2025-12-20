import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Trophy, Clock, Target, TrendingUp, TrendingDown, CheckCircle, XCircle, ArrowRight, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { APTestAttempt, APTestData, calculatePredictedAPScoreWithTier } from "@/lib/apTestData";
import { MathText } from "@/components/Latex";
import { formatTag } from "@/lib/utils";

interface APTestResultsProps {
  attempt: APTestAttempt;
  testData: APTestData | null; // Original test data to show question details
  onViewAnalytics: () => void;
  onRetake: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function APTestResults({ attempt, testData, onViewAnalytics, onRetake }: APTestResultsProps) {
  const { summary } = attempt;
  const percentage = Math.round(summary.overallAccuracy * 100);
  const [showIncorrectQuestions, setShowIncorrectQuestions] = useState(true);
  
  // Calculate predicted score with tier information
  const scoreInfo = calculatePredictedAPScoreWithTier(summary.overallAccuracy);
  
  // Get incorrect questions with full details
  const incorrectQuestions = attempt.responses
    .filter(r => !r.isCorrect && r.userAnswer !== null)
    .map(response => {
      const question = testData?.questions.find(q => q.id === response.questionId);
      return {
        response,
        question,
        questionIndex: testData?.questions.findIndex(q => q.id === response.questionId) ?? -1
      };
    })
    .filter(item => item.question !== undefined)
    .sort((a, b) => (a.questionIndex ?? 0) - (b.questionIndex ?? 0));

  // Prepare data for skill type chart
  const skillTypeData = Object.entries(summary.accuracyBySkillType).map(([skill, data]) => ({
    skill,
    accuracy: Math.round(data.accuracy * 100),
    correct: data.correct,
    total: data.total,
  }));

  // Prepare data for tag chart (top 10)
  const tagData = Object.entries(summary.accuracyByTag)
    .map(([tag, data]) => ({
      tag,
      accuracy: Math.round(data.accuracy * 100),
      correct: data.correct,
      total: data.total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);


  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number): string => {
    if (score === 5) return 'Excellent';
    if (score === 4) return 'Good';
    if (score === 3) return 'Qualifying';
    if (score === 2) return 'Needs Improvement';
    return 'Needs Significant Improvement';
  };

  const getTierColor = (tier: string): string => {
    if (tier === 'Secure') return 'text-green-600';
    if (tier === 'On Track') return 'text-blue-600';
    return 'text-yellow-600';
  };

  const getTierBgColor = (tier: string): string => {
    if (tier === 'Secure') return 'bg-green-50 border-green-200';
    if (tier === 'On Track') return 'bg-blue-50 border-blue-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card variant="elevated" className="text-center">
          <CardHeader>
            <div className="w-20 h-20 mx-auto rounded-full gradient-secondary flex items-center justify-center mb-4">
              <Trophy className="w-10 h-10 text-secondary-foreground" />
            </div>
            <CardTitle className="text-3xl">AP Test Complete!</CardTitle>
            <CardDescription className="text-lg">{attempt.apClass} • Practice {attempt.testId}</CardDescription>
          </CardHeader>
        </Card>

        {/* Prominent Predicted Score Display */}
        <Card variant="elevated" className={`border-2 ${getTierBgColor(scoreInfo.tier)}`}>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-4xl md:text-5xl font-bold mb-2">
              Predicted AP Score: <span className={getScoreColor(scoreInfo.score)}>{scoreInfo.score}</span>
            </CardTitle>
            <div className="space-y-2">
              <Badge variant="outline" className={`text-lg px-4 py-2 ${getTierColor(scoreInfo.tier)}`}>
                {scoreInfo.tier} {scoreInfo.score}
              </Badge>
              <p className="text-lg text-muted-foreground">
                Based on your MCQ performance: {scoreInfo.percentage}% ({scoreInfo.range})
              </p>
              <p className="text-sm text-muted-foreground italic">
                *This is a predicted score based only on your multiple-choice performance. 
                Your actual AP exam score will also include free-response questions.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-background/50">
                <div className="text-2xl font-bold text-secondary">
                  {summary.correctAnswers}/{summary.totalQuestions}
                </div>
                <div className="text-sm text-muted-foreground">Correct Answers</div>
              </div>
              <div className="p-4 rounded-xl bg-background/50">
                <div className="text-2xl font-bold text-secondary">{percentage}%</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
              <div className="p-4 rounded-xl bg-background/50">
                <div className="text-2xl font-bold text-secondary">
                  {summary.incorrectAnswers}
                </div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Incorrect Questions List */}
        {incorrectQuestions.length > 0 && (
          <Card variant="elevated">
            <Collapsible open={showIncorrectQuestions} onOpenChange={setShowIncorrectQuestions}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <XCircle className="w-6 h-6 text-destructive" />
                        Questions You Missed ({incorrectQuestions.length})
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        Review the questions you got wrong to improve your understanding
                      </CardDescription>
                    </div>
                    {showIncorrectQuestions ? (
                      <ChevronUp className="w-6 h-6 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-6">
                      {incorrectQuestions.map((item, index) => {
                        const { question, response } = item;
                        if (!question) return null;
                        
                        return (
                          <div key={response.questionId} className="p-6 rounded-lg border-2 border-destructive/20 bg-destructive/5">
                            <div className="flex items-start justify-between mb-4">
                              <Badge variant="destructive" className="text-base px-3 py-1">
                                Question {item.questionIndex + 1}
                              </Badge>
                              <div className="flex gap-2">
                                {question.tags.map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xl">
                                    {formatTag(tag)}
                                  </Badge>
                                ))}
                                <Badge variant="secondary" className="text-xs">
                                  {question.skill_type}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="mb-4">
                              <p className="text-lg font-medium text-foreground leading-relaxed">
                                <MathText text={question.question_text} />
                              </p>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                                <div className="text-sm font-medium text-red-900 mb-2">Your Answer</div>
                                <div className="text-lg font-bold text-red-700">
                                  {response.userAnswer || 'No answer'}
                                </div>
                                {response.userAnswer && (
                                  <div className="text-sm text-red-600 mt-1">
                                    {question.options[response.userAnswer as "A" | "B" | "C" | "D"]}
                                  </div>
                                )}
                              </div>
                              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                                <div className="text-sm font-medium text-green-900 mb-2">Correct Answer</div>
                                <div className="text-lg font-bold text-green-700">
                                  {question.correct_answer}
                                </div>
                                <div className="text-sm text-green-600 mt-1">
                                  {question.options[question.correct_answer]}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4 text-sm text-muted-foreground">
                              Time spent: {Math.round(response.timeSpentSeconds)}s 
                              {response.estimatedTimeSeconds && (
                                <span> (Estimated: {response.estimatedTimeSeconds}s)</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {incorrectQuestions.length === 0 && (
          <Card variant="elevated" className="text-center">
            <CardContent className="py-12">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <CardTitle className="text-2xl mb-2">Perfect Score!</CardTitle>
              <CardDescription className="text-lg">
                You answered all questions correctly. Excellent work!
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {/* Accuracy by Skill Type */}
        {skillTypeData.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-2xl">Accuracy by Skill Type</CardTitle>
              <CardDescription>Performance breakdown by cognitive skill</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={skillTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="skill" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="accuracy" fill="#8884d8">
                    {skillTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {skillTypeData.map((item) => (
                  <div key={item.skill} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="font-medium">{item.skill}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {item.correct}/{item.total}
                      </span>
                      <Badge variant={item.accuracy >= 70 ? "default" : item.accuracy >= 50 ? "secondary" : "destructive"}>
                        {item.accuracy}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accuracy by Topic Tags */}
        {tagData.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-2xl">Accuracy by Topic (Top 10)</CardTitle>
              <CardDescription>Performance breakdown by topic tags</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tagData.map((item) => (
                  <div key={item.tag} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="font-medium text-base">{formatTag(item.tag)}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {item.correct}/{item.total}
                      </span>
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            item.accuracy >= 70 ? 'bg-green-500' :
                            item.accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${item.accuracy}%` }}
                        />
                      </div>
                      <Badge variant={item.accuracy >= 70 ? "default" : item.accuracy >= 50 ? "secondary" : "destructive"}>
                        {item.accuracy}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Time Management */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Time Management
            </CardTitle>
            <CardDescription>How you managed your time during the test</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-muted text-center">
                <div className="text-2xl font-bold">{formatTime(summary.timeManagement.totalActualTime)}</div>
                <div className="text-sm text-muted-foreground">Total Time Used</div>
              </div>
              <div className="p-4 rounded-xl bg-muted text-center">
                <div className="text-2xl font-bold">{formatTime(summary.timeManagement.averageTimePerQuestion)}</div>
                <div className="text-sm text-muted-foreground">Avg per Question</div>
              </div>
              <div className="p-4 rounded-xl bg-muted text-center">
                <div className="text-2xl font-bold text-green-600">{summary.timeManagement.questionsUnderTime}</div>
                <div className="text-sm text-muted-foreground">Under Time</div>
              </div>
              <div className="p-4 rounded-xl bg-muted text-center">
                <div className="text-2xl font-bold text-orange-600">{summary.timeManagement.questionsOverTime}</div>
                <div className="text-sm text-muted-foreground">Over Time</div>
              </div>
            </div>
            {summary.timeManagement.questionsOverTime > summary.timeManagement.questionsUnderTime && (
              <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  You spent more time than estimated on several questions. Consider practicing time management.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button variant="outline" size="lg" className="flex-1 h-16 text-xl" onClick={onRetake}>
            Retake Test
          </Button>
          <Button variant="student" size="lg" className="flex-1 h-16 text-xl" onClick={onViewAnalytics}>
            <BookOpen className="w-5 h-5 mr-2" />
            View Full AP Test Analytics
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
        <Card variant="elevated" className="bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Click "View Full AP Test Analytics" to see detailed performance breakdowns including accuracy by skill type, 
              topic tags, time management analysis, and your predicted score history across multiple attempts.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
