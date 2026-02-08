import { useEffect, useState } from "react";
import {
  Users,
  Quote,
  TrendingUp,
  MousePointer2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { getAdminStats } from "@/lib/api";

interface Stats {
  users: number;
  quotes: number;
  interactions: number;
  interactionBreakdown: { interaction_type: string; count: string }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );

  const cards = [
    {
      label: "Total Users",
      value: stats?.users || 0,
      icon: Users,
      color: "text-blue-500",
      trend: "+12%",
      positive: true,
    },
    {
      label: "Total Quotes",
      value: stats?.quotes || 0,
      icon: Quote,
      color: "text-purple-500",
      trend: "+5%",
      positive: true,
    },
    {
      label: "Interactions",
      value: stats?.interactions || 0,
      icon: MousePointer2,
      color: "text-emerald-500",
      trend: "+8%",
      positive: true,
    },
    {
      label: "Engagement Rate",
      value: "4.2%",
      icon: TrendingUp,
      color: "text-orange-500",
      trend: "-1.5%",
      positive: false,
    },
  ];

  const chartData =
    stats?.interactionBreakdown.map((item) => ({
      name:
        item.interaction_type.charAt(0).toUpperCase() +
        item.interaction_type.slice(1),
      value: parseInt(item.count),
    })) || [];

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">
            Plateform status and analytics at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-xl border shadow-sm">
          <Calendar size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Last 30 days</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div
            key={i}
            className="bg-card p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
          >
            <div className="flex justify-between items-start relative z-10">
              <div className={cn("p-3 rounded-2xl bg-muted/50", card.color)}>
                <card.icon size={24} />
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                  card.positive
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {card.trend}
                {card.positive ? (
                  <ArrowUpRight size={12} />
                ) : (
                  <ArrowDownRight size={12} />
                )}
              </div>
            </div>

            <div className="mt-4 relative z-10">
              <p className="text-sm font-medium text-muted-foreground">
                {card.label}
              </p>
              <h3 className="text-3xl font-bold mt-1 tracking-tight">
                {card.value}
              </h3>
            </div>

            {/* Decorative background shape */}
            <div
              className={cn(
                "absolute -bottom-4 -right-4 w-24 h-24 blur-3xl opacity-10 rounded-full",
                card.color.replace("text", "bg")
              )}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interaction Chart */}
        <div className="lg:col-span-2 bg-card p-8 rounded-3xl border shadow-sm">
          <h3 className="font-bold text-lg mb-6">Interaction Breakdown</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "currentColor", opacity: 0.5, fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Engagement Distribution */}
        <div className="bg-card p-8 rounded-3xl border shadow-sm flex flex-col">
          <h3 className="font-bold text-lg mb-6">Engagement Dist.</h3>
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold">
                {stats?.interactions || 0}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Total
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {chartData.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
