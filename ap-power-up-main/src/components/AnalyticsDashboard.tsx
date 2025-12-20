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
import { TrendingUp, TrendingDown, Target, AlertCircle, ChevronRight, ChevronDown, BarChart3 } from "lucide-react";
import { AnalyticsDetailModal } from "./AnalyticsDetailModal";
import { UnitProgressDetailModal } from "./UnitProgressDetailModal";
import { SkillAnalysisDetailModal } from "./SkillAnalysisDetailModal";
import { WeakSkillsPractice } from "./WeakSkillsPractice";
import { APTestAnalytics } from "./APTestAnalytics";
import { PerformanceAnalytics } from "./PerformanceAnalytics";
import { loadClassData, clearCache } from "@/lib/jsonLoader";
import { formatTag } from "@/lib/utils";

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
  const [unitNameMap, setUnitNameMap] = useState<Record<string, string>>({});
  const [expandedStimulusSections, setExpandedStimulusSections] = useState<{
    summary: boolean;
    byType: boolean;
    byComplexity: boolean;
  }>({
    summary: true,
    byType: false,
    byComplexity: false,
  });

  // Load class data to get exact unit names from dataset
  useEffect(() => {
    if (!selectedClass) {
      setUnitNameMap({});
      return;
    }
    // Clear cache to ensure we get latest unit names from dataset
    clearCache();
    loadClassData(selectedClass).then((classData) => {
      if (classData) {
        const map: Record<string, string> = {};
        classData.units.forEach((unit) => {
          // Map exact unitName to itself (primary mapping)
          map[unit.unitName] = unit.unitName;
          // Create case-insensitive and trimmed mappings for robustness
          const lowerTrimmed = unit.unitName.toLowerCase().trim();
          map[lowerTrimmed] = unit.unitName;
          // Map trimmed version if different
          const trimmed = unit.unitName.trim();
          if (trimmed !== unit.unitName) {
            map[trimmed] = unit.unitName;
          }
        });
        setUnitNameMap(map);
      }
    }).catch(() => {
      setUnitNameMap({});
    });
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass) {
      return;
    }
    setLoading(true);
    computeAdvancedAnalytics(userId, selectedClass)
      .then((analyticsData) => {
        setData(analyticsData);
      })
      .catch((error) => {
        console.error('Error computing analytics:', error);
      })
      .finally(() => {
        setLoading(false);
      });
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
        <CardTitle className="text-4xl md:text-5xl lg:text-6xl font-bold">Learning Analytics</CardTitle>
        <CardDescription className="text-lg md:text-xl lg:text-2xl mt-3">
          Deep dive into skills, units, pace, streaks, and recommended next questions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 px-8 md:px-10 pb-10">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <label className="text-[28.8px] font-bold text-foreground">Class</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-16 text-[28.8px]">
                <SelectValue placeholder="Choose a class" />
              </SelectTrigger>
              <SelectContent>
                {classNames.map((name) => (
                  <SelectItem key={name} value={name} className="text-[28.8px]">
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
                      data.units.slice(0, 3).map((unit) => {
                        // Use exact unitName from dataset if available, otherwise use unit.key
                        const displayName = unitNameMap[unit.key] || 
                                          unitNameMap[unit.key.toLowerCase().trim()] || 
                                          Object.keys(unitNameMap).find(k => k.toLowerCase().trim() === unit.key.toLowerCase().trim()) ||
                                          unit.key;
                        return (
                        <div key={unit.key} className="flex items-center justify-between gap-4">
                          <span className="text-2xl truncate flex-1 font-semibold">{displayName}</span>
                            <div className="flex items-center gap-4 ml-2">
                              <div className="w-36 h-6 rounded-full border-2 border-gray-300 bg-gray-200 overflow-hidden">
                                <div className={`h-full rounded-full ${
                                  unit.accuracy >= 0.8 ? 'bg-green-500' : 
                                  unit.accuracy >= 0.5 ? 'bg-yellow-500' : 
                                  'bg-red-500'
                                }`} style={{ width: `${Math.max(unit.accuracy * 100, 5)}%` }} />
                              </div>
                              <span className="text-2xl font-bold w-20 text-right">
                                {Math.round(unit.accuracy * 100)}%
                              </span>
                            </div>
                          </div>
                        );
                      })
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
                    {/* Top Strengths - Skills with >85% accuracy */}
                    <div>
                      <div className="text-xl font-bold text-foreground mb-4">Top Strengths</div>
                      <div className="flex flex-wrap gap-3 min-h-[3rem]">
                        {data.strengthSkills.length > 0 ? (
                          data.strengthSkills.map((skill) => (
                            <Badge key={skill.skill} variant="outline" className="bg-green-50 text-green-700 border-green-300 text-3xl py-6 px-12">
                              {formatTag(skill.skill)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-lg text-muted-foreground italic">No skills to show here yet</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Needs Practice - Skills with <70% accuracy */}
                    <div>
                      <div className="text-xl font-bold text-foreground mb-4">Needs Practice</div>
                      <div className="flex flex-wrap gap-3 min-h-[3rem]">
                        {data.weakSkills.length > 0 ? (
                          data.weakSkills.map((skill) => (
                            <Badge key={skill.skill} variant="outline" className="bg-red-50 text-red-700 border-red-300 text-3xl py-6 px-12">
                              {formatTag(skill.skill)}
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

            {/* Performance Visualization Section */}
            <PerformanceAnalytics
              userId={userId}
              classNames={classNames}
              compact={false}
            />

            {/* Stimulus Performance Section */}
            {data.stimulusAnalytics && (
              <Card variant="elevated" className="border-2">
                <CardHeader className="pb-6 px-8 pt-8">
                  <CardTitle className="text-3xl md:text-4xl font-bold">Stimulus Performance</CardTitle>
                  <CardDescription className="text-lg md:text-xl mt-3">
                    Analytics for questions with stimulus (text, tables, graphs)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-8 pb-10">
                  {/* Summary Stats - Collapsible */}
                  <div>
                    <button
                      onClick={() => setExpandedStimulusSections(prev => ({ ...prev, summary: !prev.summary }))}
                      className="w-full flex items-center justify-between text-2xl font-bold mb-4 hover:text-secondary transition-colors cursor-pointer"
                    >
                      <span>Summary Statistics</span>
                      {expandedStimulusSections.summary ? (
                        <ChevronDown className="w-6 h-6" />
                      ) : (
                        <ChevronRight className="w-6 h-6" />
                      )}
                    </button>
                    {expandedStimulusSections.summary && (
                      <div className="grid gap-6 md:grid-cols-4">
                        <StatCard
                          title="Total Stimulus Questions"
                          value={data.stimulusAnalytics.totalStimulusQuestions}
                        />
                        <StatCard
                          title="Attempted"
                          value={data.stimulusAnalytics.attemptedStimulusQuestions}
                        />
                        <StatCard
                          title="Accuracy"
                          value={`${Math.round(data.stimulusAnalytics.avgStimulusAccuracy * 100)}%`}
                          accent
                        />
                        <StatCard
                          title="Avg Struggle Score"
                          value={data.stimulusAnalytics.avgStimulusStruggleScore.toFixed(2)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Performance by Type - Collapsible */}
                  {Object.keys(data.stimulusAnalytics.byType).length > 0 && (
                    <div>
                      <button
                        onClick={() => setExpandedStimulusSections(prev => ({ ...prev, byType: !prev.byType }))}
                        className="w-full flex items-center justify-between text-2xl font-bold mb-4 hover:text-secondary transition-colors cursor-pointer"
                      >
                        <span>Performance by Stimulus Type</span>
                        {expandedStimulusSections.byType ? (
                          <ChevronDown className="w-6 h-6" />
                        ) : (
                          <ChevronRight className="w-6 h-6" />
                        )}
                      </button>
                      {expandedStimulusSections.byType && (
                        <div className="space-y-4">
                          {Object.entries(data.stimulusAnalytics.byType).map(([type, stats]) => (
                            <Card key={type} className="border">
                              <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-xl font-semibold capitalize">{type}</h4>
                                  <Badge variant="outline" className="text-lg px-4 py-2">
                                    {stats.attempted} / {stats.count} attempted
                                  </Badge>
                                </div>
                                <div className="grid gap-4 md:grid-cols-3">
                                  <div>
                                    <div className="text-sm text-muted-foreground">Accuracy</div>
                                    <div className="text-2xl font-bold">
                                      {Math.round(stats.accuracy * 100)}%
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-muted-foreground">Avg Struggle Score</div>
                                    <div className="text-2xl font-bold">
                                      {stats.avgStruggleScore.toFixed(2)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-muted-foreground">Avg Time (s)</div>
                                    <div className="text-2xl font-bold">
                                      {Math.round(stats.avgTimeSeconds)}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Performance by Complexity - Collapsible */}
                  {Object.keys(data.stimulusAnalytics.byComplexity).length > 0 && (
                    <div>
                      <button
                        onClick={() => setExpandedStimulusSections(prev => ({ ...prev, byComplexity: !prev.byComplexity }))}
                        className="w-full flex items-center justify-between text-2xl font-bold mb-4 hover:text-secondary transition-colors cursor-pointer"
                      >
                        <span>Performance by Complexity</span>
                        {expandedStimulusSections.byComplexity ? (
                          <ChevronDown className="w-6 h-6" />
                        ) : (
                          <ChevronRight className="w-6 h-6" />
                        )}
                      </button>
                      {expandedStimulusSections.byComplexity && (
                        <div className="space-y-4">
                          {Object.entries(data.stimulusAnalytics.byComplexity)
                            .sort(([a], [b]) => {
                              const order: Record<string, number> = { low: 0, medium: 1, high: 2 };
                              return (order[a.toLowerCase()] ?? 999) - (order[b.toLowerCase()] ?? 999);
                            })
                            .map(([complexity, stats]) => (
                            <Card key={complexity} className="border">
                              <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-xl font-semibold capitalize">{complexity}</h4>
                                  <Badge variant="outline" className="text-lg px-4 py-2">
                                    {stats.attempted} / {stats.count} attempted
                                  </Badge>
                                </div>
                                <div className="grid gap-4 md:grid-cols-3">
                                  <div>
                                    <div className="text-sm text-muted-foreground">Accuracy</div>
                                    <div className="text-2xl font-bold">
                                      {Math.round(stats.accuracy * 100)}%
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-muted-foreground">Avg Struggle Score</div>
                                    <div className="text-2xl font-bold">
                                      {stats.avgStruggleScore.toFixed(2)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-muted-foreground">Avg Time (s)</div>
                                    <div className="text-2xl font-bold">
                                      {Math.round(stats.avgTimeSeconds)}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* AP Test Analytics Section */}
            <APTestAnalytics userId={userId} classNames={classNames} />

            {/* Detail Modals */}
            {selectedDetail?.type === "accuracy" && (
              <AnalyticsDetailModal
                analytics={data}
                open={true}
                onClose={() => setSelectedDetail(null)}
                className={selectedClass}
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

