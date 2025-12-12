import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdvancedAnalytics } from "@/lib/advancedAnalytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { loadClassData } from "@/lib/jsonLoader";

// Format label: convert underscores to spaces and title case
const formatLabel = (label: string): string => {
  return label
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

interface Props {
  analytics: AdvancedAnalytics;
  open: boolean;
  onClose: () => void;
  onUnitSelect?: (unit: typeof analytics.units[0]) => void;
  className?: string;
}

export function UnitProgressDetailModal({ analytics, open, onClose, onUnitSelect, className }: Props) {
  const [selectedUnit, setSelectedUnit] = useState<typeof analytics.units[0] | null>(
    (analytics as any).selectedUnit || null
  );
  const [unitIdMap, setUnitIdMap] = useState<Record<string, string>>({});

  // Load class data to get unitId mapping
  useEffect(() => {
    if (!className) {
      setUnitIdMap({});
      return;
    }
    loadClassData(className).then((classData) => {
      if (classData) {
        const map: Record<string, string> = {};
        classData.units.forEach((unit) => {
          // Use exact unitName as key (should match unit.key from analytics)
          map[unit.unitName] = unit.unitId;
        });
        setUnitIdMap(map);
      } else {
        setUnitIdMap({});
      }
    }).catch((error) => {
      console.error('Error loading class data for unitId mapping:', error);
      setUnitIdMap({});
    });
  }, [className]);

  const handleUnitClick = (unit: typeof analytics.units[0]) => {
    setSelectedUnit(unit);
    if (onUnitSelect) onUnitSelect(unit);
  };

  // Transform units data to include unitId labels
  const chartData = useMemo(() => {
    if (!analytics?.units) return [];
    
    return analytics.units.map(unit => {
      // Get unitId from mapping - unit.key should match unit.unitName from classData
      let unitId = unitIdMap[unit.key];
      
      // If not found in mapping, try case-insensitive lookup
      if (!unitId && Object.keys(unitIdMap).length > 0) {
        const matchedKey = Object.keys(unitIdMap).find(
          key => key.toLowerCase().trim() === unit.key.toLowerCase().trim()
        );
        if (matchedKey) {
          unitId = unitIdMap[matchedKey];
        }
      }
      
      // If still no unitId found, use fallback
      if (!unitId) {
        // Try to extract from unit name pattern (e.g., "Unit 1" -> "U1")
        const unitMatch = unit.key.match(/Unit\s+(\d+)/i);
        if (unitMatch) {
          unitId = `U${unitMatch[1]}`;
        } else if (Object.keys(unitIdMap).length === 0) {
          // Mapping hasn't loaded yet - show placeholder temporarily
          unitId = '...';
        } else {
          // Mapping loaded but unit not found - show unit key (full name) as fallback
          // This should not happen if keys match correctly
          unitId = unit.key;
        }
      }
      
      return {
        ...unit,
        abbrevKey: unitId,
        fullKey: unit.key, // Keep original unit name for tooltips
      };
    });
  }, [analytics?.units, unitIdMap]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] sm:max-w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-8 pt-8 pb-6 flex-shrink-0">
          <DialogTitle className="text-3xl">
            {selectedUnit ? `${selectedUnit.key} - Details` : "Unit Progress Overview"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 px-8 pb-8">
          <div className="space-y-6">
            {!selectedUnit ? (
              <>
                {/* Unit List View */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">All Units</CardTitle>
                    <CardDescription className="text-base">Click on a unit to see detailed breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={600}>
                      <BarChart data={chartData} margin={{ left: 80, right: 40, bottom: 80, top: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                        <XAxis 
                          dataKey="abbrevKey" 
                          angle={0}
                          textAnchor="middle" 
                          height={80}
                          interval={0}
                          tick={{ fontSize: 18, fill: 'hsl(var(--foreground))', fontWeight: 500, fontFamily: 'system-ui, -apple-system, sans-serif' }}
                          label={{ value: 'Unit', position: 'insideBottom', offset: -5, style: { fontSize: 18, fontWeight: 500, fontFamily: 'system-ui, -apple-system, sans-serif', fill: 'hsl(var(--muted-foreground))' } }}
                          allowDataOverflow={false}
                          tickLine={false}
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
                          formatter={(value: any) => [`${Math.round(value * 100)}%`, 'Accuracy']}
                          labelFormatter={(label, payload) => {
                            // Show full unit name in tooltip
                            if (payload && payload.length > 0 && payload[0].payload) {
                              return payload[0].payload.fullKey || label;
                            }
                            return label;
                          }}
                          labelStyle={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', fontFamily: 'system-ui, -apple-system, sans-serif' }}
                        />
                        <Bar 
                          dataKey="accuracy" 
                          fill="hsl(var(--chart-1))" 
                          name="Accuracy"
                          radius={[8, 8, 0, 0]}
                          onClick={(data: any) => {
                            const unit = analytics.units.find(u => u.key === data.fullKey || u.key === data.key);
                            if (unit) handleUnitClick(unit);
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Unit Cards */}
                <div className="grid grid-cols-2 gap-4">
                  {analytics.units.map((unit) => (
                    <Card 
                      key={unit.key} 
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleUnitClick(unit)}
                    >
                      <CardHeader>
                        <CardTitle className="text-xl">{unit.key}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-base text-muted-foreground">Accuracy</span>
                            <span className={`text-2xl font-bold ${
                              unit.accuracy >= 0.8 ? 'text-green-600' : 
                              unit.accuracy >= 0.5 ? 'text-yellow-600' : 
                              'text-red-600'
                            }`}>
                              {Math.round(unit.accuracy * 100)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-base text-muted-foreground">Avg Time</span>
                            <span className="text-lg font-medium">{unit.avgTimeSeconds.toFixed(1)}s</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-base text-muted-foreground">Completion</span>
                            <span className="text-lg font-medium">
                              {unit.attemptedQuestions}/{unit.totalQuestions}
                            </span>
                          </div>
                          {unit.unanswered > 0 && (
                            <Badge variant="outline" className="w-fit text-base px-3 py-1">
                              {unit.unanswered} unanswered
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Selected Unit Details */}
                <div className="flex items-center gap-4 mb-4">
                  <Button variant="outline" onClick={() => setSelectedUnit(null)}>
                    ← Back to All Units
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">{selectedUnit.key}</CardTitle>
                    <CardDescription className="text-base">Detailed performance metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-6 mb-8">
                      <div>
                        <div className="text-lg text-muted-foreground mb-2">Accuracy</div>
                        <div className={`text-4xl font-bold ${
                          selectedUnit.accuracy >= 0.8 ? 'text-green-600' : 
                          selectedUnit.accuracy >= 0.5 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {Math.round(selectedUnit.accuracy * 100)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-lg text-muted-foreground mb-2">Completion</div>
                        <div className="text-4xl font-bold">
                          {selectedUnit.attemptedQuestions}/{selectedUnit.totalQuestions}
                        </div>
                      </div>
                      <div>
                        <div className="text-lg text-muted-foreground mb-2">Avg Time</div>
                        <div className="text-4xl font-bold">{selectedUnit.avgTimeSeconds.toFixed(1)}s</div>
                      </div>
                      <div>
                        <div className="text-lg text-muted-foreground mb-2">Unanswered</div>
                        <div className="text-4xl font-bold">{selectedUnit.unanswered}</div>
                      </div>
                    </div>

                    {/* Subtopic Breakdown */}
                    {selectedUnit.subtopics && selectedUnit.subtopics.length > 0 && (
                      <div>
                        <div className="text-base font-medium mb-4">Subtopic Breakdown</div>
                        <div className="space-y-3">
                          {selectedUnit.subtopics.map((subtopic) => (
                            <div key={subtopic.key} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium text-base">{formatLabel(subtopic.key.split(' → ')[1] || subtopic.key)}</div>
                                <div className="text-base text-muted-foreground">
                                  {subtopic.attemptedQuestions}/{subtopic.totalQuestions} attempted
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className={`text-xl font-bold ${
                                    subtopic.accuracy >= 0.8 ? 'text-green-600' : 
                                    subtopic.accuracy >= 0.5 ? 'text-yellow-600' : 
                                    'text-red-600'
                                  }`}>
                                    {Math.round(subtopic.accuracy * 100)}%
                                  </div>
                                  <div className="text-sm text-muted-foreground">accuracy</div>
                                </div>
                                {subtopic.unanswered > 0 && (
                                  <Badge variant="outline" className="text-sm">{subtopic.unanswered} left</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

