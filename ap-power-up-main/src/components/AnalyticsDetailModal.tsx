import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdvancedAnalytics } from "@/lib/advancedAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

// Format label: convert underscores to spaces and title case
const formatLabel = (label: string): string => {
  return label
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

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
}

export function AnalyticsDetailModal({ analytics, open, onClose }: Props) {
  // Format chart data with formatted labels and abbreviations
  const formattedDifficulties = analytics.difficulties.map(d => ({
    ...d,
    formattedKey: formatLabel(d.key),
    displayKey: abbreviateLabel(formatLabel(d.key), 18),
    fullKey: formatLabel(d.key)
  }));
  
  const formattedCognitive = analytics.cognitive.map(c => ({
    ...c,
    formattedKey: formatLabel(c.key),
    displayKey: abbreviateLabel(formatLabel(c.key), 12),
    fullKey: formatLabel(c.key)
  }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] sm:max-w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-8 pt-8 pb-6 flex-shrink-0">
          <DialogTitle className="text-3xl">Overall Performance Details</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 px-8 pb-8">
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-6">
              <Card className="p-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium text-muted-foreground">Overall Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold">{Math.round(analytics.summary.avgAccuracy * 100)}%</div>
                </CardContent>
              </Card>
              <Card className="p-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium text-muted-foreground">Attempted</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold">{analytics.summary.attemptedQuestions}</div>
                  <div className="text-lg text-muted-foreground mt-2">of {analytics.summary.totalQuestions}</div>
                </CardContent>
              </Card>
              <Card className="p-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium text-muted-foreground">Avg Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold">{analytics.summary.avgTimeSeconds.toFixed(1)}s</div>
                  <div className="text-lg text-muted-foreground mt-2">per question</div>
                </CardContent>
              </Card>
              <Card className="p-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium text-muted-foreground">Unanswered</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold">{analytics.summary.unanswered}</div>
                </CardContent>
              </Card>
            </div>

            {/* Breakdown by Difficulty */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Performance by Difficulty</CardTitle>
                <CardDescription className="text-base">Accuracy across difficulty levels</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={550}>
                  <BarChart data={formattedDifficulties} margin={{ left: 80, right: 40, bottom: 100, top: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis 
                      dataKey="displayKey" 
                      tick={{ fontSize: 20, fill: 'hsl(var(--foreground))', fontWeight: 400, fontFamily: 'system-ui, -apple-system, sans-serif' }}
                      interval={0}
                      angle={0}
                      height={100}
                      label={{ value: 'Difficulty Level', position: 'insideBottom', offset: -5, style: { fontSize: 18, fontWeight: 500, fontFamily: 'system-ui, -apple-system, sans-serif', fill: 'hsl(var(--muted-foreground))' } }}
                    />
                    <YAxis 
                      tickFormatter={(v) => `${Math.round(v * 100)}%`}
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
                        return data?.fullKey || label;
                      }}
                      formatter={(value: any) => [`${Math.round(value * 100)}%`, 'Accuracy']}
                      labelStyle={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', fontFamily: 'system-ui, -apple-system, sans-serif' }}
                    />
                    <Bar dataKey="accuracy" fill="hsl(var(--chart-1))" name="Accuracy" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Breakdown by Cognitive Level */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Performance by Cognitive Level</CardTitle>
                <CardDescription className="text-base">Accuracy across different cognitive demands</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={600}>
                  <BarChart data={formattedCognitive} margin={{ left: 80, right: 40, bottom: 120, top: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis 
                      dataKey="displayKey" 
                      angle={0}
                      textAnchor="middle" 
                      height={120}
                      interval={0}
                      tick={{ fontSize: 18, fill: 'hsl(var(--foreground))', fontWeight: 400, fontFamily: 'system-ui, -apple-system, sans-serif' }}
                      label={{ value: 'Cognitive Level', position: 'insideBottom', offset: -5, style: { fontSize: 18, fontWeight: 500, fontFamily: 'system-ui, -apple-system, sans-serif', fill: 'hsl(var(--muted-foreground))' } }}
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
                        return data?.fullKey || label;
                      }}
                      formatter={(value: any) => [`${Math.round(value * 100)}%`, 'Accuracy']}
                      labelStyle={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', fontFamily: 'system-ui, -apple-system, sans-serif' }}
                    />
                    <Bar dataKey="accuracy" fill="hsl(var(--chart-3))" name="Accuracy" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Improvement Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Improvement Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.weakSkills.length > 0 && (
                    <div className="flex items-start gap-3">
                      <TrendingDown className="w-7 h-7 text-red-500 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-xl mb-1">Focus on Weak Skills</div>
                        <div className="text-lg text-muted-foreground">
                          Practice these skills: {analytics.weakSkills.slice(0, 5).map(s => formatLabel(s.skill)).join(", ")}
                        </div>
                      </div>
                    </div>
                  )}
                  {analytics.summary.unanswered > 0 && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-7 h-7 text-yellow-500 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-xl mb-1">Complete Unanswered Questions</div>
                        <div className="text-lg text-muted-foreground">
                          {analytics.summary.unanswered} questions haven't been attempted yet
                        </div>
                      </div>
                    </div>
                  )}
                  {analytics.summary.avgAccuracy >= 0.8 && (
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-7 h-7 text-green-500 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-xl mb-1">Great Progress!</div>
                        <div className="text-lg text-muted-foreground">
                          Keep up the excellent work. Consider challenging yourself with harder questions.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

