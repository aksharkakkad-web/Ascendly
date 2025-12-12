import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { computeAdvancedAnalytics, AdvancedAnalytics } from "@/lib/advancedAnalytics";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { Skeleton } from "./ui/skeleton";
import { TrendingUp, TrendingDown, Target, AlertCircle, ChevronRight, BarChart3 } from "lucide-react";
import { AnalyticsDetailModal } from "./AnalyticsDetailModal";
import { UnitProgressDetailModal } from "./UnitProgressDetailModal";
import { SkillAnalysisDetailModal } from "./SkillAnalysisDetailModal";
import { WeakSkillsPractice } from "./WeakSkillsPractice";

type Props = {
  userId: string;
  classNames: string[];
};

export function AnalyticsDashboard({ userId, classNames }: Props) {
  const [selectedClass, setSelectedClass] = useState<string>(classNames[0] || "");
  const [data, setData] = useState<AdvancedAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<{
    type: "accuracy" | "unit" | "skill";
    data?: any;
  } | null>(null);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    computeAdvancedAnalytics(userId, selectedClass)
      .then(setData)
      .finally(() => setLoading(false));
  }, [selectedClass, userId]);

  // Dynamic visualization helpers
  const shouldUseCompactView = (dataLength: number) => dataLength >= 10;
  const getOptimalChartHeight = (dataLength: number) => {
    if (dataLength < 5) return 200;
    if (dataLength < 10) return 300;
    return 400;
  };
  const groupUnitsForDisplay = (units: AdvancedAnalytics['units'] | undefined) => {
    if (!units) return [];
    if (units.length <= 10) return units;
    // Show top 5, bottom 3, and summary for large datasets
    const sorted = [...units].sort((a, b) => b.accuracy - a.accuracy);
    const top = sorted.slice(0, 5);
    const bottom = sorted.slice(-3);
    const middle = sorted.slice(5, -3);
    const middleAvg = middle.reduce((sum, u) => sum + u.accuracy, 0) / (middle.length || 1);
    return [
      ...top,
      { key: `... ${middle.length} more units (avg ${Math.round(middleAvg * 100)}%)`, accuracy: middleAvg, avgTimeSeconds: 0, attemptedQuestions: 0 } as any,
      ...bottom,
    ];
  };

  const mistakeChartData = useMemo(() => {
    if (!data) return [];
    return data.mistakePatterns.map((p) => ({
      skill: p.skill,
      pattern: p.pattern,
      count: p.count,
      label: `${p.skill}: ${p.pattern}`,
    }));
  }, [data]);

  return (
    <Card variant="elevated" className="w-full">
      <CardHeader className="pb-8 px-8 md:px-10 pt-8 md:pt-10 min-h-[150px]">
        <CardTitle className="text-4xl md:text-5xl lg:text-6xl font-bold">Performance Analytics</CardTitle>
        <CardDescription className="text-lg md:text-xl lg:text-2xl mt-3">
          Deep dive into skills, units, pace, streaks, and recommended next questions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 px-8 md:px-10 pb-10">
        <div className="grid gap-6 md:grid-cols-2">
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
        </div>

        {loading && (
          <div className="grid gap-8 md:grid-cols-3">
            {[...Array(3)].map((_, idx) => (
              <Skeleton key={idx} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!loading && data && (
          <>
            {/* High-Level Metrics - Clean Overview */}
            <div className="grid gap-8 md:grid-cols-3">
              {/* Overall Accuracy - Interactive */}
              <Card 
                className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-secondary"
                onClick={() => setSelectedDetail({ type: "accuracy", data })}
              >
                <CardHeader className="pb-5 px-6 pt-6">
                  <CardTitle className="text-2xl md:text-3xl font-bold flex items-center justify-between">
                    <span>Overall Accuracy</span>
                    <ChevronRight className="w-7 h-7 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 px-6 pb-6">
                  <div className="text-6xl md:text-7xl font-bold text-secondary mb-4">
                    {Math.round(data.summary.avgAccuracy * 100)}%
                  </div>
                  <div className="flex items-center gap-2 text-lg text-muted-foreground">
                    <span>{data.summary.attemptedQuestions} of {data.summary.totalQuestions} attempted</span>
                  </div>
                </CardContent>
              </Card>

              {/* Unit Progress - Interactive */}
              <Card 
                className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-secondary"
                onClick={() => setSelectedDetail({ type: "unit", data })}
              >
                <CardHeader className="pb-5 px-6 pt-6">
                  <CardTitle className="text-2xl md:text-3xl font-bold flex items-center justify-between">
                    <span>Progress by Unit</span>
                    <ChevronRight className="w-7 h-7 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 px-6 pb-6">
                  <div className="space-y-4">
                    {shouldUseCompactView(data.units.length) ? (
                      <div className="text-lg text-muted-foreground">
                        {data.units.length} units tracked
                      </div>
                    ) : (
                      data.units.slice(0, 3).map((unit) => (
                        <div key={unit.key} className="flex items-center justify-between gap-4">
                          <span className="text-lg truncate flex-1 font-semibold">{unit.key}</span>
                          <div className="flex items-center gap-4 ml-2">
                            <div className={`w-24 h-4 rounded-full ${
                              unit.accuracy >= 0.8 ? 'bg-green-500' : 
                              unit.accuracy >= 0.5 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`} style={{ width: `${Math.max(unit.accuracy * 100, 5)}%` }} />
                            <span className="text-lg font-bold w-16 text-right">
                              {Math.round(unit.accuracy * 100)}%
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Skill Strengths vs Weaknesses - Interactive */}
              <Card 
                className="cursor-pointer hover:shadow-xl transition-all border-2 hover:border-secondary"
                onClick={() => setSelectedDetail({ type: "skill", data })}
              >
                <CardHeader className="pb-5 px-6 pt-6">
                  <CardTitle className="text-2xl md:text-3xl font-bold flex items-center justify-between">
                    <span>Skills Overview</span>
                    <ChevronRight className="w-7 h-7 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 px-6 pb-6">
                  <div className="space-y-6">
                    {/* All Skills Covered - Skills that have been attempted - SHOWN FIRST */}
                    <div>
                      <div className="text-xl font-bold text-foreground mb-4">All Skills Covered</div>
                      <div className="flex flex-wrap gap-3 min-h-[3rem]">
                        {(() => {
                          // Skills that have been attempted (at least 1 attempt)
                          const allSkillsCovered = data.skills.filter((skill) => skill.attemptedQuestions > 0);
                          
                          return allSkillsCovered.length > 0 ? (
                            allSkillsCovered.map((skill) => (
                              <Badge key={skill.skill} variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-base py-2 px-4">
                                {skill.skill}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-lg text-muted-foreground italic">No skills to show here yet</span>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Top Strengths */}
                    <div>
                      <div className="text-xl font-bold text-foreground mb-4">Top Strengths</div>
                      <div className="flex flex-wrap gap-3 min-h-[3rem]">
                        {data.strengthSkills.length > 0 ? (
                          data.strengthSkills.map((skill) => (
                            <Badge key={skill.skill} variant="outline" className="bg-green-50 text-green-700 border-green-300 text-base py-2 px-4">
                              {skill.skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-lg text-muted-foreground italic">No skills to show here yet</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Keep Practicing - Skills that are not strong but not weak */}
                    <div>
                      <div className="text-xl font-bold text-foreground mb-4">Keep Practicing</div>
                      <div className="flex flex-wrap gap-3 min-h-[3rem]">
                        {(() => {
                          // Skills that have attempts, are not in strengths (accuracy < 80% or mastery < 70%), and not in weak skills
                          const keepPracticingSkills = data.skills.filter((skill) => {
                            const isStrength = data.strengthSkills.some(s => s.skill === skill.skill);
                            const isWeak = data.weakSkills.some(s => s.skill === skill.skill);
                            return skill.attemptedQuestions > 0 && !isStrength && !isWeak;
                          });
                          
                          return keepPracticingSkills.length > 0 ? (
                            keepPracticingSkills.map((skill) => (
                              <Badge key={skill.skill} variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-base py-2 px-4">
                                {skill.skill}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-lg text-muted-foreground italic">No skills to show here yet</span>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Needs Practice */}
                    <div>
                      <div className="text-xl font-bold text-foreground mb-4">Needs Practice</div>
                      <div className="flex flex-wrap gap-3 min-h-[3rem]">
                        {data.weakSkills.length > 0 ? (
                          data.weakSkills.map((skill) => (
                            <Badge key={skill.skill} variant="outline" className="bg-red-50 text-red-700 border-red-300 text-base py-2 px-4">
                              {skill.skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-lg text-muted-foreground italic">No skills to show here yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Practice Weak Skills Section */}
            <WeakSkillsPractice 
              weakSkills={data.weakSkills}
              practiceQuestions={data.practiceQuestions}
              selectedClass={selectedClass}
              userId={userId}
            />

            {/* Detail Modals */}
            {selectedDetail?.type === "accuracy" && (
              <AnalyticsDetailModal
                analytics={data}
                open={true}
                onClose={() => setSelectedDetail(null)}
              />
            )}
            {selectedDetail?.type === "unit" && (
              <UnitProgressDetailModal
                analytics={data}
                open={true}
                onClose={() => setSelectedDetail(null)}
                onUnitSelect={(unit) => setSelectedDetail({ type: "unit", data: { ...data, selectedUnit: unit } })}
                className={selectedClass}
              />
            )}
            {selectedDetail?.type === "skill" && (
              <SkillAnalysisDetailModal
                analytics={data}
                open={true}
                onClose={() => setSelectedDetail(null)}
                onSkillSelect={(skill) => setSelectedDetail({ type: "skill", data: { ...data, selectedSkill: skill } })}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ title, value, accent = false }: { title: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className={`text-2xl font-bold ${accent ? "text-secondary" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

