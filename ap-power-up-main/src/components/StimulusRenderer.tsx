import { StimulusItem } from "@/lib/questionData";
import { MathText } from "./Latex";
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent } from "./ui/card";

interface StimulusRendererProps {
  stimulus?: StimulusItem[];
}

export function StimulusRenderer({ stimulus }: StimulusRendererProps) {
  if (!stimulus || stimulus.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8 mb-6">
      {stimulus.map((item, index) => {
        switch (item.type) {
          case "text":
            return (
              <Card key={index} className="border-l-4 border-l-secondary shadow-md">
                <CardContent className="pt-10 pb-10 px-10">
                  <div className="font-bold mb-8 text-secondary" style={{ fontSize: '2.49375rem' }}>
                    {item.label}:
                  </div>
                  <div className="leading-relaxed text-foreground" style={{ fontSize: '1.995rem' }}>
                    <MathText text={item.content} />
                  </div>
                </CardContent>
              </Card>
            );

          case "table":
            return (
              <Card key={index} className="overflow-x-auto shadow-md">
                <CardContent className="pt-10 pb-10 px-10">
                  <div className="font-bold mb-8 text-secondary" style={{ fontSize: '2.49375rem' }}>
                    {item.label}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border-2 border-border" style={{ fontSize: '1.6625rem' }}>
                      <thead>
                        <tr className="bg-muted">
                          {item.columns.map((col, colIndex) => (
                            <th
                              key={colIndex}
                              className="border-2 border-border px-10 py-6 text-left font-bold"
                              style={{ fontSize: '1.995rem' }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {item.rows.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className={rowIndex % 2 === 0 ? "bg-card" : "bg-muted/30"}
                          >
                            {row.map((cell, cellIndex) => (
                              <td
                                key={cellIndex}
                                className="border-2 border-border px-10 py-6"
                                style={{ fontSize: '1.6625rem' }}
                              >
                                {typeof cell === "number" ? cell.toLocaleString() : cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );

          case "graph":
            return (
              <Card key={index} className="shadow-md">
                <CardContent className="pt-10 pb-10 px-10">
                  <div className="font-bold mb-8 text-secondary" style={{ fontSize: '2.49375rem' }}>
                    {item.label}
                  </div>
                  <div className="w-full" style={{ height: "500px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {item.graphType === "line" ? (
                        <LineChart data={item.data}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="x" label={{ value: item.xLabel, position: "insideBottom", offset: -5, style: { fontSize: '1.6625rem' } }} tick={{ style: { fontSize: '1.6625rem' } }} />
                          <YAxis label={{ value: item.yLabel, angle: -90, position: "insideLeft", style: { fontSize: '1.6625rem' } }} tick={{ style: { fontSize: '1.6625rem' } }} />
                          <Tooltip contentStyle={{ fontSize: '1.6625rem' }} />
                          <Legend wrapperStyle={{ fontSize: '1.6625rem' }} />
                          <Line type="monotone" dataKey="y" stroke="#8884d8" strokeWidth={2} />
                        </LineChart>
                      ) : item.graphType === "bar" ? (
                        <BarChart data={item.data}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="x" label={{ value: item.xLabel, position: "insideBottom", offset: -5, style: { fontSize: '1.6625rem' } }} tick={{ style: { fontSize: '1.6625rem' } }} />
                          <YAxis label={{ value: item.yLabel, angle: -90, position: "insideLeft", style: { fontSize: '1.6625rem' } }} tick={{ style: { fontSize: '1.6625rem' } }} />
                          <Tooltip contentStyle={{ fontSize: '1.6625rem' }} />
                          <Legend wrapperStyle={{ fontSize: '1.6625rem' }} />
                          <Bar dataKey="y" fill="#8884d8" />
                        </BarChart>
                      ) : (
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="x" type="number" name={item.xLabel} label={{ value: item.xLabel, position: "insideBottom", offset: -5, style: { fontSize: '1.6625rem' } }} tick={{ style: { fontSize: '1.6625rem' } }} />
                          <YAxis dataKey="y" type="number" name={item.yLabel} label={{ value: item.yLabel, angle: -90, position: "insideLeft", style: { fontSize: '1.6625rem' } }} tick={{ style: { fontSize: '1.6625rem' } }} />
                          <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ fontSize: '1.6625rem' }} />
                          <Scatter data={item.data} fill="#8884d8" />
                        </ScatterChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
