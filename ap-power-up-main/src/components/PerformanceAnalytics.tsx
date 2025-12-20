import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PerformanceScatterPlot } from "./PerformanceScatterPlot";
import { PerformanceDetailModal } from "./PerformanceDetailModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  getIndividualPerformanceData, 
  getClassPerformanceData,
  PerformanceData,
  PlotPoint,
  getConfidenceLabel,
} from "@/lib/performanceAnalytics";
import { loadClassData } from "@/lib/jsonLoader";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, TrendingUp, Clock, Target, Users } from "lucide-react";

interface PerformanceAnalyticsProps {
  userId: string;
  classNames: string[];
  isTeacher?: boolean;
  teacherId?: string;
  compact?: boolean; // For thumbnail view
  onExpand?: () => void;
}

export function PerformanceAnalytics({
  userId,
  classNames,
  isTeacher = false,
  teacherId,
  compact = false,
  onExpand,
}: PerformanceAnalyticsProps) {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState<string>(classNames[0] || "");
  const [viewMode, setViewMode] = useState<"individual" | "class">("individual");
  const [showConfidence, setShowConfidence] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<PlotPoint | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [units, setUnits] = useState<string[]>([]);
  const [showQuadrants, setShowQuadrants] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);

  // Load units for selected class
  useEffect(() => {
    if (!selectedClass) {
      setUnits([]);
      return;
    }
    loadClassData(selectedClass).then((classData) => {
      if (classData) {
        const loadedUnits = classData.units.map(u => u.unitName);
        setUnits(loadedUnits);
      } else {
        setUnits([]);
      }
    });
  }, [selectedClass]);

  // Load performance data
  useEffect(() => {
    if (!selectedClass) {
      setData(null);
      return;
    }

        setLoading(true);
    const loadData = async () => {
      try {
        let performanceData: PerformanceData | null = null;
        
        if (viewMode === "individual") {
          performanceData = await getIndividualPerformanceData(userId, selectedClass);
        } else if (viewMode === "class" && isTeacher && teacherId) {
          performanceData = await getClassPerformanceData(selectedClass, teacherId);
        }
        
        console.log("Performance data loaded:", {
          hasData: !!performanceData,
          plotPointsCount: performanceData?.plotPoints.length || 0,
          viewMode,
          selectedClass
        });
        
        setData(performanceData);
      } catch (error) {
        console.error("Error loading performance data:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedClass, viewMode, userId, isTeacher, teacherId]);

  // Filter plot points by unit
  const filteredPlotPoints = useMemo(() => {
    if (!data) return [];
    if (!selectedUnit) return data.plotPoints;
    return data.plotPoints.filter(p => p.unitName === selectedUnit);
  }, [data, selectedUnit]);

  // Transform plot points for accuracy view if needed, and filter by confidence requirement
  const transformedPlotPoints = useMemo(() => {
    // Filter by confidence requirement first
    let points = filteredPlotPoints;
    if (showConfidence) {
      // Only show points with confidence data when confidence mode is on
      points = filteredPlotPoints.filter(p => p.confidence !== null);
    }
    
    // Transform Y values based on view mode
    return points.map(point => ({
      ...point,
      y: showConfidence 
                        ? (point.confidence || 0) // 1-5 scale for confidence
        : (point.isCorrect ? 1 : 0), // 0 or 1 for accuracy
    }));
  }, [filteredPlotPoints, showConfidence]);

  const handlePointClick = (point: PlotPoint) => {
    setSelectedPoint(point);
    setShowDetailModal(true);
  };

  const handleChartClick = () => {
    setShowZoomModal(true);
  };

  // Summary stats for selected unit or all units
  const summaryStats = useMemo(() => {
    if (!data) return null;
    
    const unitData = selectedUnit
      ? filteredPlotPoints
      : data.plotPoints;
    
    const falseMastery = unitData.filter(p => p.confidence !== null && p.confidence >= 4 && !p.isCorrect).length;
    const hesitation = unitData.filter(p => p.confidence !== null && p.confidence <= 2 && p.isCorrect).length;
    
    const avgTime = unitData.length > 0
      ? unitData.reduce((sum, p) => sum + p.timeSpentSeconds, 0) / unitData.length
      : 0;
    
    const confidences = unitData.filter(p => p.confidence !== null).map(p => p.confidence!);
    const avgConfidence = confidences.length > 0
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : 0;
    
    const accuracy = unitData.length > 0
      ? unitData.filter(p => p.isCorrect).length / unitData.length
      : 0;
    
    return {
      falseMastery,
      hesitation,
      avgTime,
      avgConfidence,
      accuracy,
      totalAttempted: unitData.length,
    };
  }, [data, filteredPlotPoints, selectedUnit]);

  if (compact) {
    // Thumbnail view
    return (
      <Card variant="elevated" className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onExpand}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Performance Visualization</span>
            <Button variant="ghost" size="sm">View Full</Button>
          </CardTitle>
          <CardDescription>
            Visualize performance with time, confidence, and correctness
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : data && data.plotPoints.length > 0 ? (
            <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold">{data.plotPoints.length}</div>
                <div className="text-sm text-muted-foreground">Data Points</div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="w-full">
      <CardHeader>
        <CardTitle className="text-[39.9px] md:text-[53.2px] font-bold">Performance Visualization</CardTitle>
        <CardDescription className="text-[23.94px] md:text-[26.6px] mt-2">
          Visualize student performance using time spent, confidence, and correctness
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Class Selector */}
          <div className="space-y-2">
            <Label className="text-[24.76px] font-medium">Class</Label>
            <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedUnit(null); }}>
              <SelectTrigger className="text-[24.76px]">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classNames.map((name) => (
                  <SelectItem key={name} value={name} className="text-[24.76px]">
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle (only for teachers) */}
          {isTeacher && (
            <div className="space-y-2">
              <Label className="text-[18.62px] font-medium">View</Label>
              <Select value={viewMode} onValueChange={(v) => { setViewMode(v as "individual" | "class"); setSelectedUnit(null); }}>
                <SelectTrigger className="text-[18.62px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual" className="text-[18.62px]">Individual</SelectItem>
                  <SelectItem value="class" className="text-[18.62px]">Class</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Confidence Toggle */}
          <div className="space-y-2">
            <Label className="text-[24.76px] font-medium">Y-Axis</Label>
            <div className="flex items-center space-x-2 h-10 px-3 border rounded-md">
              <Switch
                id="confidence-toggle"
                checked={showConfidence}
                onCheckedChange={setShowConfidence}
              />
              <Label htmlFor="confidence-toggle" className="cursor-pointer text-[24.76px]">
                {showConfidence ? "Confidence" : "Accuracy"}
              </Label>
            </div>
          </div>

          {/* Quadrant Overlay Toggle */}
          <div className="space-y-2">
            <Label className="text-[24.76px] font-medium">Quadrants</Label>
            <div className="flex items-center space-x-2 h-10 px-3 border rounded-md">
              <Switch
                id="quadrant-toggle"
                checked={showQuadrants}
                onCheckedChange={setShowQuadrants}
              />
              <Label htmlFor="quadrant-toggle" className="cursor-pointer text-[24.76px]">
                Show Zones
              </Label>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        {summaryStats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="text-[31.92px] font-bold">{summaryStats.falseMastery}</div>
                    <div className="text-[15.96px] text-muted-foreground">False Mastery</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-[31.92px] font-bold">{summaryStats.hesitation}</div>
                    <div className="text-[15.96px] text-muted-foreground">Hesitation Points</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="text-[31.92px] font-bold">{Math.round(summaryStats.avgTime)}s</div>
                    <div className="text-[15.96px] text-muted-foreground">Avg Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {showConfidence && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="text-[31.92px] font-bold">
                        {summaryStats.avgConfidence > 0 
                          ? getConfidenceLabel(Math.round(summaryStats.avgConfidence))
                          : "N/A"}
                      </div>
                      <div className="text-[15.96px] text-muted-foreground">Avg Confidence</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="text-[31.92px] font-bold">{Math.round(summaryStats.accuracy * 100)}%</div>
                    <div className="text-[15.96px] text-muted-foreground">Accuracy</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Unit Drilldown Tabs */}
        {units.length > 0 && (
          <Tabs value={selectedUnit || "all"} onValueChange={(v) => setSelectedUnit(v === "all" ? null : v)}>
            <TabsList className="grid w-full grid-cols-auto" style={{ gridTemplateColumns: `repeat(${Math.min(units.length + 1, 6)}, minmax(0, 1fr))` }}>
              <TabsTrigger value="all" className="text-lg">All Units</TabsTrigger>
              {units.slice(0, 5).map((unit) => (
                <TabsTrigger key={unit} value={unit} className="truncate text-lg">
                  {unit}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Scatter Plot */}
        {loading ? (
          <Skeleton className="h-[500px] w-full" />
        ) : data && transformedPlotPoints.length > 0 ? (
          <div className="border rounded-lg p-4 bg-background">
            <PerformanceScatterPlot
              data={transformedPlotPoints}
              useConfidence={showConfidence}
              onPointClick={handlePointClick}
              selectedUnit={selectedUnit}
              showQuadrants={showQuadrants}
              onChartClick={handleChartClick}
            />
          </div>
        ) : data && transformedPlotPoints.length === 0 ? (
          <div className="h-[500px] flex items-center justify-center border rounded-lg bg-muted/50">
            <div className="text-center">
              <div className="text-lg font-semibold mb-2">No Data Points Available</div>
              <div className="text-sm text-muted-foreground">
                {showConfidence 
                  ? "No questions with confidence data found. Try toggling to Accuracy view or complete more questions with confidence ratings."
                  : selectedUnit 
                    ? `No attempts found for ${selectedUnit}`
                    : "No attempts found for this class. Complete some questions to see your performance."}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[500px] flex items-center justify-center border rounded-lg bg-muted/50">
            <div className="text-center">
              <div className="text-lg font-semibold mb-2">No Data Available</div>
              <div className="text-sm text-muted-foreground">
                {selectedUnit 
                  ? `No attempts found for ${selectedUnit}`
                  : "No attempts found for this class. Complete some questions to see your performance."}
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        <PerformanceDetailModal
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          point={selectedPoint}
          useConfidence={showConfidence}
          isClassView={viewMode === "class"}
        />

        {/* Zoom Modal */}
        {showZoomModal && (
          <Dialog open={showZoomModal} onOpenChange={setShowZoomModal}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] w-full">
              <DialogHeader>
                <DialogTitle>Performance Visualization - Zoomed View</DialogTitle>
                <DialogDescription>
                  Enlarged view of your performance scatter plot. Click on individual points for details.
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-auto max-h-[85vh]">
                <PerformanceScatterPlot
                  data={transformedPlotPoints}
                  useConfidence={showConfidence}
                  onPointClick={handlePointClick}
                  selectedUnit={selectedUnit}
                  showQuadrants={showQuadrants}
                  height={800}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

