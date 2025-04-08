import React, { useState, useEffect } from "react";
import {
  Pie,
  PieChart,
  Cell,
  Label,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Define types for demographics data
interface ProgramCount {
  [program: string]: number;
}

interface DemographicsResponse {
  status: boolean;
  message: string;
  data: ProgramCount;
}

interface ChartDataItem {
  name: string;
  value: number;
  fill: string;
}

interface ProgramDemographicsChartProps {
  roomName: string;
}

// Color palette for the hash function to choose from
const COLOR_PALETTE: string[] = [
  "#8884d8", // Purple
  "#82ca9d", // Green
  "#ffc658", // Yellow
  "#ff8042", // Orange
  "#0088fe", // Blue
  "#00C49F", // Teal
  "#FFBB28", // Gold
  "#FF8042", // Coral
  "#a4de6c", // Light Green
  "#d0ed57", // Lime
  "#FF6B6B", // Red
  "#4ECDC4", // Cyan
  "#556270", // Dark Blue Gray
  "#C7F464", // Bright Lime
  "#FF9F80", // Peach
  "#512DA8", // Deep Purple
  "#00796B", // Dark Teal
  "#FFA000", // Amber
  "#D32F2F", // Dark Red
  "#7986CB", // Indigo
];

// Hash function to consistently map program names to colors
const getProgramColor = (programName: string): string => {
  // Simple hash function to convert program name to a number
  let hash = 0;
  for (let i = 0; i < programName.length; i++) {
    hash = programName.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Use the absolute value of hash to ensure positive number
  hash = Math.abs(hash);

  // Map the hash to an index in the color palette
  const colorIndex = hash % COLOR_PALETTE.length;

  return COLOR_PALETTE[colorIndex];
};

const ProgramDemographicsChart: React.FC<ProgramDemographicsChartProps> = ({
  roomName,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [programData, setProgramData] = useState<ChartDataItem[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  useEffect(() => {
    const fetchProgramDemographics = async (): Promise<void> => {
      if (!roomName) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch program demographics data for the current room using Next.js API route
        const response = await fetch(
          `/api/demographics/${encodeURIComponent(roomName)}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch program demographics: ${response.status}`
          );
        }

        const data: DemographicsResponse = await response.json();

        if (data.status && data.data) {
          // Format data for chart with consistent colors based on program name
          const formattedData: ChartDataItem[] = Object.entries(data.data).map(
            ([program, count]) => ({
              name: program || "Undeclared",
              value: count,
              fill: getProgramColor(program || "Undeclared"),
            })
          );

          setProgramData(formattedData);
          setTotalUsers(
            formattedData.reduce((sum, item) => sum + item.value, 0)
          );
        } else {
          setProgramData([]);
          setTotalUsers(0);
        }
      } catch (err) {
        console.error("Error fetching program demographics:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setProgramData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProgramDemographics();
  }, [roomName]);

  // Don't render anything if there's no data and not loading
  if (!loading && (!programData.length || totalUsers === 0)) {
    return (
      <Card className="w-full bg-[#1e2329] border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Check In Demographics for {roomName}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-center py-6 text-gray-400">
          No occupancy data available for this room
        </CardContent>
      </Card>
    );
  }

  // Custom tooltip for the pie chart
  const CustomTooltip: React.FC<TooltipProps<number, string>> = ({
    active,
    payload,
  }) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload as ChartDataItem;
      return (
        <div className="bg-[#1e2329] p-2 border border-gray-700 rounded shadow-md">
          <p className="text-sm">
            {name}: {value} student{value !== 1 ? "s" : ""}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full bg-[#1e2329] border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-center">
          Check In Demographics for {roomName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[200px]">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-400 text-center py-6">{error}</div>
        ) : (
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={programData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {programData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-white text-lg font-bold"
                            >
                              {totalUsers}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 20}
                              className="fill-gray-400 text-xs"
                            >
                              Students
                            </tspan>
                          </text>
                        );
                      }
                      return null;
                    }}
                  />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProgramDemographicsChart;
