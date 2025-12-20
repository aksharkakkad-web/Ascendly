import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Target, Clock, Award } from "lucide-react";
import { getUserAPTestAttempts, getAPTestAttemptsByClass } from "@/lib/database";
import { APTestAttempt } from "@/lib/apTestData";
import { formatTag } from "@/lib/utils";

interface APTestAnalyticsProps {
  userId: string;
  classNames: string[];
}

export function APTestAnalytics({ userId, classNames }: APTestAnalyticsProps) {
  const [selectedClass, setSelectedClass] = useState<string>(classNames[0] || "");
  const [attempts, setAttempts] = useState<APTestAttempt[]>([]);

  useEffect(() => {
    const loadAttempts = async () => {
      try {
        if (selectedClass) {
          const classAttempts = await getAPTestAttemptsByClass(userId, selectedClass);
          setAttempts(Array.isArray(classAttempts) ? classAttempts : []);
        } else {
          const allAttempts = await getUserAPTestAttempts(userId);
          setAttempts(Array.isArray(allAttempts) ? allAttempts : []);
        }
      } catch (error) {
        console.error('Error loading AP test attempts:', error);
        setAttempts([]);
      }
    };
    loadAttempts();
  }, [userId, selectedClass]);

  if (attempts.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold">AP Test Analytics</CardTitle>
          <CardDescription className="text-lg md:text-xl">
            Track your performance across multiple AP test attempts
          </CardDescription>
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="outline" className="text-base px-4 py-1.5 bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300">
              Coming out soon
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg text-muted-foreground">
              No AP test attempts yet. Take an AP test from the Practice tab to see analytics here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for trend charts
  const trendData = attempts.map((attempt, index) => ({
    attempt: `Attempt ${index + 1}`,
    date: new Date(attempt.startTimestamp).toLocaleDateString(),
    accuracy: Math.round(attempt.summary.overallAccuracy * 100),
    score: attempt.summary.predictedAPScore,
    correct: attempt.summary.correctAnswers,
    total: attempt.summary.totalQuestions,
  }));

  // Aggregate accuracy by skill type across all attempts
  const skillTypeAccuracy: Record<string, { correct: number; total: number; accuracy: number }> = {};
  attempts.forEach(attempt => {
    Object.entries(attempt.summary.accuracyBySkillType).forEach(([skill, data]) => {
      if (!skillTypeAccuracy[skill]) {
        skillTypeAccuracy[skill] = { correct: 0, total: 0, accuracy: 0 };
      }
      skillTypeAccuracy[skill].correct += data.correct;
      skillTypeAccuracy[skill].total += data.total;
    });
  });
  Object.keys(skillTypeAccuracy).forEach(skill => {
    const data = skillTypeAccuracy[skill];
    data.accuracy = data.total > 0 ? data.correct / data.total : 0;
  });

  const skillTypeData = Object.entries(skillTypeAccuracy)
    .map(([skill, data]) => ({
      skill,
      accuracy: Math.round(data.accuracy * 100),
      correct: data.correct,
      total: data.total,
    }))
    .sort((a, b) => b.total - a.total);

  // Aggregate accuracy by tag across all attempts
  const tagAccuracy: Record<string, { correct: number; total: number; accuracy: number }> = {};
  attempts.forEach(attempt => {
    Object.entries(attempt.summary.accuracyByTag).forEach(([tag, data]) => {
      if (!tagAccuracy[tag]) {
        tagAccuracy[tag] = { correct: 0, total: 0, accuracy: 0 };
      }
      tagAccuracy[tag].correct += data.correct;
      tagAccuracy[tag].total += data.total;
    });
  });
  Object.keys(tagAccuracy).forEach(tag => {
    const data = tagAccuracy[tag];
    data.accuracy = data.total > 0 ? data.correct / data.total : 0;
  });

  const tagData = Object.entries(tagAccuracy)
    .map(([tag, data]) => ({
      tag,
      accuracy: Math.round(data.accuracy * 100),
      correct: data.correct,
      total: data.total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Time management trends
  const timeManagementData = attempts.map((attempt, index) => ({
    attempt: `Attempt ${index + 1}`,
    avgTime: Math.round(attempt.summary.timeManagement.averageTimePerQuestion),
    overTime: attempt.summary.timeManagement.questionsOverTime,
    underTime: attempt.summary.timeManagement.questionsUnderTime,
  }));

  // Calculate improvement
  const firstAccuracy = attempts.length > 0 ? attempts[attempts.length - 1].summary.overallAccuracy : 0;
  const lastAccuracy = attempts.length > 0 ? attempts[0].summary.overallAccuracy : 0;
  const improvement = lastAccuracy - firstAccuracy;
  const isImproving = improvement > 0;

  return (
    <Card variant="elevated" className="w-full">
      <CardHeader className="pb-8 px-8 md:px-10 pt-8 md:pt-10">
        <CardTitle className="text-4xl md:text-5xl lg:text-6xl font-bold">AP Test Analytics</CardTitle>
        <CardDescription className="text-lg md:text-xl lg:text-2xl mt-3">
          Track your performance across multiple AP test attempts
        </CardDescription>
        <div className="mt-4 flex items-center gap-2">
          <Badge variant="outline" className="text-base px-4 py-1.5 bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300">
            Coming out soon
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 px-8 md:px-10 pb-10">
        {/* Class Selector */}
        {classNames.length > 1 && (
          <div className="space-y-4">
            <label className="text-lg font-bold text-foreground">Class</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-16 text-lg">
                <SelectValue placeholder="Choose a class" />
              </SelectTrigger>
              <SelectContent>
                {classNames.map((name) => (
                  <SelectItem key={name} value={name} className="text-lg">
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-secondary">{attempts.length}</div>
              <div className="text-sm text-muted-foreground">Total Attempts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-secondary">
                {Math.round(lastAccuracy * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Latest Accuracy</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className={`text-3xl font-bold ${isImproving ? 'text-green-600' : 'text-red-600'}`}>
                {isImproving ? '+' : ''}{Math.round(improvement * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Improvement</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-secondary">
                {attempts[0]?.summary.predictedAPScore || '-'}
              </div>
              <div className="text-sm text-muted-foreground">Latest Predicted Score</div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Trend */}
        {attempts.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Performance Trend</CardTitle>
              <CardDescription>Your accuracy and predicted score over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="attempt" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[1, 5]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#8884d8"
                    name="Accuracy %"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="score"
                    stroke="#82ca9d"
                    name="Predicted Score"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Accuracy by Skill Type */}
        {skillTypeData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Accuracy by Skill Type (All Attempts)</CardTitle>
              <CardDescription>Combined performance across all test attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={skillTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="skill" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="accuracy" fill="#8884d8" />
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
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Accuracy by Topic (Top 10, All Attempts)</CardTitle>
              <CardDescription>Combined performance by topic across all attempts</CardDescription>
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

        {/* Time Management Trends */}
        {attempts.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Clock className="w-6 h-6" />
                Time Management Trends
              </CardTitle>
              <CardDescription>How your time management has changed</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeManagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="attempt" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="overTime" fill="#ff8042" name="Questions Over Time" />
                  <Bar dataKey="underTime" fill="#00c49f" name="Questions Under Time" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Recent Attempts List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Recent Attempts</CardTitle>
            <CardDescription>Details of your recent AP test attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attempts.slice(0, 5).map((attempt, index) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-lg">Attempt {attempts.length - index}</span>
                      <Badge variant="outline">
                        Practice {attempt.testId}
                      </Badge>
                      <Badge variant="outline">
                        {new Date(attempt.startTimestamp).toLocaleDateString()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {attempt.summary.correctAnswers}/{attempt.summary.totalQuestions} correct
                      </span>
                      <span>{Math.round(attempt.summary.overallAccuracy * 100)}% accuracy</span>
                      <span>Predicted Score: {attempt.summary.predictedAPScore}</span>
                    </div>
                  </div>
                  <Award className={`w-8 h-8 ${
                    attempt.summary.predictedAPScore >= 4 ? 'text-green-600' :
                    attempt.summary.predictedAPScore >= 3 ? 'text-yellow-600' : 'text-red-600'
                  }`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
