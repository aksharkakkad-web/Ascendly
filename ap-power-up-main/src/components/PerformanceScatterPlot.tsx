import React, { useEffect } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { PlotPoint, calculateGradientScore, getColorForScore, getConfidenceLabel } from "@/lib/performanceAnalytics";
import { PerformanceTooltip } from "./PerformanceTooltip";

interface PerformanceScatterPlotProps {
  data: PlotPoint[];
  useConfidence: boolean;
  onPointClick?: (point: PlotPoint) => void;
  selectedUnit?: string | null;
  showQuadrants?: boolean;
  onChartClick?: () => void;
  height?: number;
}

export function PerformanceScatterPlot({
  data,
  useConfidence,
  onPointClick,
  selectedUnit,
  showQuadrants = false,
  onChartClick,
  height = 500,
}: PerformanceScatterPlotProps) {
  // Filter data by unit if selected
  const filteredData = selectedUnit
    ? data.filter(p => p.unitName === selectedUnit)
    : data;

  // Calculate max time in dataset for relative normalization
  // This ensures higher time = lower score (more red/yellow)
  // Use actual timeSpentSeconds from filtered data
  const times = filteredData.map(d => d.timeSpentSeconds).filter(t => t > 0);
  const maxTimeInDataset = times.length > 0 ? Math.max(...times) : 300;

  // Calculate X-axis maximum: max time in dataset + 10 seconds buffer
  // This ensures the X-axis scale updates dynamically as user's max time increases
  const maxX = maxTimeInDataset > 0 ? maxTimeInDataset + 10 : 300;
  const maxY = useConfidence ? 5 : 1;

  // Prepare data for Recharts with pre-calculated RGB-based gradient colors
  // Each point gets a unique color calculated from the performance score
  // The gradient smoothly interpolates RGB values: Red -> Yellow -> Green
  const chartData = filteredData.map((point, index) => {
    // Calculate performance score using the weighted formula
    const score = calculateGradientScore(
      point.timeSpentSeconds,
      point.confidence,
      point.isCorrect,
      !useConfidence,
      maxTimeInDataset
    );
    
    // Convert score to RGB hex color using smooth interpolation
    // Score 0.0 = Red (#ff0000), Score 0.5 = Yellow (#ffff00), Score 1.0 = Green (#00ff00)
    const color = getColorForScore(score);
    
    return {
      x: point.x,
      y: point.y,
      ...point, // Spread all point properties for tooltip access
      _calculatedColor: color, // RGB hex color from gradient formula
      _calculatedScore: score, // Performance score (0-1) for debugging
    };
  });

  // Custom dot renderer - returns SVG circle with RGB-based gradient color
  // The color is calculated from the performance score using smooth RGB interpolation
  // Formula: Red (score 0) -> Yellow (score 0.5) -> Green (score 1.0)
  // This function is called by Recharts for each data point
  const renderDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || !payload) return null;

    const point = payload as PlotPoint & { _calculatedColor?: string; _calculatedScore?: number };
    
    // Get the pre-calculated RGB-based gradient color
    // This color comes from getColorForScore() which interpolates RGB values
    // based on the performance score (0-1 range)
    // The color is a hex string like "#ff0000" (red) or "#00ff00" (green)
    const color = point._calculatedColor || '#8884d8';

    // Normalize correctness in case data comes through as non-boolean
    // Only a literal boolean true counts as correct here
    const isCorrect = point.isCorrect === true;

    // Incorrect answers: a single hollow circle with one colored outline.
    if (!isCorrect) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={6}
          // Fill with chart background so the center appears empty,
          // while still having only one visible colored outline.
          fill="hsl(var(--background))"
          stroke={color}
          strokeWidth={2.5}
          style={{ cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            onPointClick?.(point);
          }}
        />
      );
    }

    // Correct answers: single filled circle with gradient color
    return (
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={color}
        stroke={color}
        strokeWidth={0}
        style={{ 
          cursor: "pointer",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onPointClick?.(point);
        }}
      />
    );
  };
  
  // Debug: Log color calculations to verify gradient is working
  useEffect(() => {
    if (chartData.length > 0) {
      // Show sample of actual data points with their calculated colors
      const samples = chartData.slice(0, 10).map((point: any) => ({
        time: point.timeSpentSeconds,
        confidence: point.confidence,
        isCorrect: point.isCorrect,
        score: point._calculatedScore?.toFixed(3) || 'N/A',
        color: point._calculatedColor || 'N/A',
        maxTime: maxTimeInDataset
      }));
      console.log('=== Performance Scatter Plot - Color Gradient Debug ===');
      console.log('Max time in dataset:', maxTimeInDataset);
      console.log('Total data points:', chartData.length);
      console.log('Sample points with calculated colors:', samples);
      
      // Test gradient function with sample scores to verify RGB interpolation
      const testScores = [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1.0];
      const testColors = testScores.map(s => getColorForScore(s));
      console.log('Gradient function test (score -> RGB hex color):');
      testScores.forEach((s, i) => {
        console.log(`  Score ${s.toFixed(2)} -> ${testColors[i]}`);
      });
      
      // Check if we have color variation in actual data
      const uniqueColors = new Set(chartData.map((p: any) => p._calculatedColor));
      console.log(`Unique colors in dataset: ${uniqueColors.size} out of ${chartData.length} points`);
      if (uniqueColors.size < 3) {
        console.warn('⚠️ Low color variation detected - all points may have similar scores');
      }
    }
  }, [chartData, maxTimeInDataset, useConfidence]);

  // Y-axis formatter for confidence labels
  const yAxisFormatter = (value: number) => {
    if (useConfidence) {
      return getConfidenceLabel(value);
    }
    return value === 1 ? "Correct" : "Incorrect";
  };

  // Y-axis ticks for confidence
  const yAxisTicks = useConfidence ? [1, 2, 3, 4, 5] : [0, 1];

  // Handle empty data
  if (chartData.length === 0) {
    return (
      <div className="w-full flex items-center justify-center border rounded-lg bg-muted/50" style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">No Data Available</div>
          <div className="text-sm text-muted-foreground">
            {selectedUnit 
              ? `No attempts found for ${selectedUnit}`
              : "No attempts found. Complete some questions to see your performance."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full" 
      onClick={onChartClick}
      style={{ cursor: onChartClick ? 'pointer' : 'default' }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
          data={chartData}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          
          <XAxis
            type="number"
            dataKey="x"
            name="Time"
            unit="s"
            domain={[0, maxX]}
            label={{ value: "Time Spent (seconds)", position: "insideBottom", offset: -10, style: { fontSize: 15.96 } }}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 15.96 }}
          />
          
          <YAxis
            type="number"
            dataKey="y"
            name={useConfidence ? "Confidence" : "Accuracy"}
            domain={useConfidence ? [0.5, 5.5] : [-0.1, 1.1]}
            ticks={yAxisTicks}
            tickFormatter={yAxisFormatter}
            label={{ 
              value: useConfidence ? "Confidence Level" : "Accuracy", 
              angle: -90, 
              position: "left",
              offset: -70,
              style: { textAnchor: "middle", fontWeight: "bold", fontSize: 15.96 }
            }}
            tick={{ fill: "hsl(var(--muted-foreground))", fontWeight: "bold", fontSize: 15.96 }}
          />
          
          <Tooltip
            content={<PerformanceTooltip useConfidence={useConfidence} />}
            cursor={{ strokeDasharray: "3 3" }}
          />
          
          {/* Quadrant overlay lines (optional) */}
          {showQuadrants && useConfidence && (
            <>
              <ReferenceLine y={2} stroke="hsl(var(--border))" strokeDasharray="2 2" opacity={0.5} label={{ value: "Medium Confidence", position: "right", style: { fontSize: 15.96 } }} />
              <ReferenceLine x={maxX / 2} stroke="hsl(var(--border))" strokeDasharray="2 2" opacity={0.5} label={{ value: "Medium Time", position: "top", style: { fontSize: 15.96 } }} />
            </>
          )}
          
          <Scatter
            name="Performance"
            data={chartData}
            shape={renderDot}
            isAnimationActive={false}
          />
        </ScatterChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-4 space-y-3">
        <div className="text-center text-[18.62px] font-semibold mb-2">
          Legend
        </div>
        <div className="flex flex-wrap gap-6 justify-center text-[18.62px]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#00ff00' }}></div>
            <span>Bright Green → Best (fast + high confidence + correct)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ffff00' }}></div>
            <span>Yellow → Intermediate performance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ff0000' }}></div>
            <span>Red → Worst (slow + low confidence + wrong)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-red-500 bg-transparent"></div>
            <span>Hollow dot = Incorrect answer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>Filled dot = Correct answer</span>
          </div>
        </div>
        <div className="text-center text-[15.96px] text-muted-foreground mt-2">
          Dot color = Combined performance score (40% accuracy + 30% time + 30% confidence)
        </div>
      </div>
    </div>
  );
}

