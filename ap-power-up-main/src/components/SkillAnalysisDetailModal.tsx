import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdvancedAnalytics } from "@/lib/advancedAnalytics";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatTag } from "@/lib/utils";

// Format label: convert underscores to spaces and title case (alias for formatTag for backward compatibility)
const formatLabel = formatTag;

// Abbreviate label for display while keeping full text for tooltips
const abbreviateLabel = (label: string, maxLength: number = 15): string => {
  if (label.length <= maxLength) return label;
  // Try to abbreviate intelligently - keep first word, abbreviate middle words
  const words = label.split(' ');
  if (words.length === 1) {
    return label.substring(0, maxLength - 3) + '...';
  }
  if (words.length === 2) {
    return words[0] + ' ' + words[1].substring(0, maxLength - words[0].length - 4) + '...';
  }
  // For multiple words, keep first word, abbreviate middle words to first letter
  const firstWord = words[0];
  const lastWord = words[words.length - 1];
  const middleWords = words.slice(1, -1).map(w => w[0].toUpperCase() + '.').join(' ');
  const abbreviated = `${firstWord} ${middleWords} ${lastWord}`;
  if (abbreviated.length <= maxLength) return abbreviated;
  return firstWord + ' ... ' + lastWord.substring(0, maxLength - firstWord.length - 7) + '...';
};

interface Props {
  analytics: AdvancedAnalytics;
  open: boolean;
  onClose: () => void;
  onSkillSelect?: (skill: AdvancedAnalytics['skills'][0]) => void;
}

export function SkillAnalysisDetailModal({ analytics, open, onClose, onSkillSelect }: Props) {
  const [selectedSkill, setSelectedSkill] = useState<AdvancedAnalytics['skills'][0] | null>(
    (analytics as any).selectedSkill || null
  );

  const handleSkillClick = (skill: AdvancedAnalytics['skills'][0]) => {
    setSelectedSkill(skill);
    if (onSkillSelect) onSkillSelect(skill);
  };

  // Get mistake patterns for selected skill
  const skillMistakes = selectedSkill
    ? analytics.mistakePatterns.filter(m => m.skill === selectedSkill.skill)
    : [];

  // Get streak for selected skill
  const skillStreak = selectedSkill
    ? analytics.streaks.find(s => s.skill === selectedSkill.skill)
    : null;

  // Format skills data with formatted labels and abbreviations for chart
  // Only include skills that have actually been attempted in the accuracy chart.
  // This avoids showing 0% for skills with no data, which feels like a "score"
  // even though the student hasn't seen any questions for that skill yet.
  const formattedSkills = analytics.skills
    .filter(s => s.attemptedQuestions > 0)
    .slice(0, 20)
    .map(s => ({
      ...s,
      formattedSkill: formatLabel(s.skill),
      displaySkill: abbreviateLabel(formatLabel(s.skill), 12),
      fullSkill: formatLabel(s.skill)
    }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] sm:max-w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-8 pt-8 pb-6 flex-shrink-0">
          <DialogTitle className="text-3xl">
            {selectedSkill ? `${formatLabel(selectedSkill.skill)} - Analysis` : "Skills Analysis"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 px-8 pb-8">
          <div className="space-y-6">
            {!selectedSkill ? (
              <>
                {/* Skills Overview */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Strengths */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl">Top Strengths</CardTitle>
                      <CardDescription className="text-base">Your strongest skills</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.strengthSkills.slice(0, 5).map((skill) => (
                          <div 
                            key={skill.skill}
                            className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => {
                              const fullSkill = analytics.skills.find(s => s.skill === skill.skill);
                              if (fullSkill) handleSkillClick(fullSkill);
                            }}
                          >
                            <div>
                              <div className="font-medium text-lg">{formatLabel(skill.skill)}</div>
                              <div className="text-lg text-muted-foreground">
                                {Math.round(skill.accuracy * 100)}% accuracy, {Math.round(skill.mastery * 100)}% mastery
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xl px-6 py-3">
                              Strong
                            </Badge>
                          </div>
                        ))}
                        {analytics.strengthSkills.length === 0 && (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            Keep practicing to build your strengths
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Weaknesses */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl">Needs Practice</CardTitle>
                      <CardDescription className="text-base">Skills that need improvement</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.weakSkills.slice(0, 5).map((skill) => (
                          <div 
                            key={skill.skill}
                            className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => {
                              const fullSkill = analytics.skills.find(s => s.skill === skill.skill);
                              if (fullSkill) handleSkillClick(fullSkill);
                            }}
                          >
                            <div>
                              <div className="font-medium text-lg">{formatLabel(skill.skill)}</div>
                              <div className="text-lg text-muted-foreground">
                                {Math.round(skill.accuracy * 100)}% accuracy, {skill.mistakeCount} mistakes
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xl px-6 py-3">
                              Weak
                            </Badge>
                          </div>
                        ))}
                        {analytics.weakSkills.length === 0 && (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            Great work! No weak skills detected
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* All Skills Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">All Skills Performance</CardTitle>
                    <CardDescription className="text-base">Accuracy across all skill tags</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={650}>
                      <BarChart data={formattedSkills} margin={{ left: 80, right: 40, bottom: 120, top: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                        <XAxis 
                          dataKey="displaySkill" 
                          angle={0}
                          textAnchor="middle" 
                          height={120}
                          interval={0}
                          tick={{ fontSize: 18, fill: 'hsl(var(--foreground))', fontWeight: 400, fontFamily: 'system-ui, -apple-system, sans-serif' }}
                          label={{ value: 'Skill', position: 'insideBottom', offset: -5, style: { fontSize: 18, fontWeight: 500, fontFamily: 'system-ui, -apple-system, sans-serif', fill: 'hsl(var(--muted-foreground))' } }}
                          allowDataOverflow={false}
                          tickLine={false}
                        />
                        <YAxis 
                          tickFormatter={(v) => `${Math.round(v * 100)}%`}
                          domain={[0, 1]}
                          tick={{ fontSize: 20, fill: 'hsl(var(--foreground))', fontWeight: 400, fontFamily: 'system-ui, -apple-system, sans-serif' }}
                          width={75}
                          label={{ value: 'Accuracy (%)', angle: -90, position: 'left', offset: 10, style: { fontSize: 18, fontWeight: 500, fontFamily: 'system-ui, -apple-system, sans-serif', fill: 'hsl(var(--muted-foreground))', textAnchor: 'middle' } }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            fontSize: '16px', 
                            padding: '14px 16px', 
                            fontWeight: 400,
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          labelFormatter={(label, payload) => {
                            const data = payload && payload[0]?.payload;
                            return data?.fullSkill || label;
                          }}
                          formatter={(value: any) => [`${Math.round(value * 100)}%`, 'Accuracy']}
                          labelStyle={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', fontFamily: 'system-ui, -apple-system, sans-serif' }}
                        />
                        <Bar 
                          dataKey="accuracy" 
                          fill="hsl(var(--chart-1))" 
                          name="Accuracy"
                          radius={[8, 8, 0, 0]}
                          onClick={(data) => {
                            const skill = analytics.skills.find(s => formatLabel(s.skill) === data.fullSkill || formatLabel(s.skill) === data.displaySkill);
                            if (skill) handleSkillClick(skill);
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {/* Selected Skill Details */}
                <div className="flex items-center gap-4 mb-4">
                  <Button variant="outline" onClick={() => setSelectedSkill(null)}>
                    ← Back to All Skills
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">{formatLabel(selectedSkill.skill)}</CardTitle>
                    <CardDescription className="text-base">Detailed skill performance metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-6 mb-8">
                      <div>
                        <div className="text-lg text-muted-foreground mb-2">Accuracy</div>
                        <div className={`text-4xl font-bold ${
                          selectedSkill.accuracy >= 0.8 ? 'text-green-600' : 
                          selectedSkill.accuracy >= 0.5 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {Math.round(selectedSkill.accuracy * 100)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-lg text-muted-foreground mb-2">Mastery</div>
                        <div className="text-4xl font-bold">{Math.round(selectedSkill.mastery * 100)}%</div>
                      </div>
                      <div>
                        <div className="text-lg text-muted-foreground mb-2">Streak</div>
                        <div className="text-4xl font-bold">{skillStreak?.current || 0}</div>
                        <div className="text-base text-muted-foreground mt-1">Best: {skillStreak?.best || 0}</div>
                      </div>
                      <div>
                        <div className="text-lg text-muted-foreground mb-2">Questions</div>
                        <div className="text-4xl font-bold">{selectedSkill.attemptedQuestions}/{selectedSkill.totalQuestions}</div>
                      </div>
                    </div>

                    {/* Mistake Patterns */}
                    {skillMistakes.length > 0 && (
                      <div className="mb-8">
                        <div className="text-lg font-medium mb-4">Common Mistake Patterns</div>
                        <div className="space-y-3">
                          {skillMistakes.slice(0, 5).map((mistake, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium text-lg">{mistake.pattern}</div>
                              </div>
                              <Badge variant="destructive" className="text-base px-3 py-1">{mistake.count} times</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skill Recommendations */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-2xl">Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedSkill.accuracy < 0.7 && (
                          <div className="text-lg text-muted-foreground mb-3">
                            This skill needs practice. Focus on understanding the common mistake patterns above.
                          </div>
                        )}
                        {selectedSkill.mastery < 0.7 && (
                          <div className="text-lg text-muted-foreground mb-3">
                            Continue practicing to build mastery. Aim for consistent correct answers.
                          </div>
                        )}
                        {skillStreak && skillStreak.current < 3 && (
                          <div className="text-lg text-muted-foreground">
                            Build your streak by getting multiple questions correct in a row.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

