import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Server, ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const stats = [
    {
      title: "Active Connections",
      value: "1,248",
      change: "+12.5%",
      trend: "up",
      icon: Activity,
    },
    {
      title: "Total Clients",
      value: "8,432",
      change: "+4.2%",
      trend: "up",
      icon: Users,
    },
    {
      title: "Bandwidth Used",
      value: "4.2 TB",
      change: "-2.1%",
      trend: "down",
      icon: Zap,
    },
    {
      title: "Active Providers",
      value: "12",
      change: "0%",
      trend: "neutral",
      icon: Server,
    },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
            <p className="text-muted-foreground mt-1">Overview of your proxy server performance.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Zap size={16} className="text-primary" />
              Clear Cache
            </Button>
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Server size={16} />
              Add Provider
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center mt-1 space-x-1">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  ) : stat.trend === "down" ? (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  ) : null}
                  <p
                    className={`text-xs ${
                      stat.trend === "up"
                        ? "text-emerald-500"
                        : stat.trend === "down"
                        ? "text-red-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {stat.change} from last month
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Network Traffic</CardTitle>
              <CardDescription>Bandwidth consumption over the last 24 hours.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center border-t border-border/30 mt-4 pt-4">
              <div className="text-muted-foreground flex flex-col items-center gap-2">
                <Activity className="h-8 w-8 opacity-20" />
                <p>Traffic chart visualization will appear here.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Recent Clients</CardTitle>
              <CardDescription>Latest client connections.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 mt-4">
                {[
                  { name: "John Doe", status: "Active", ip: "192.168.1.45", time: "Just now" },
                  { name: "Alice Smith", status: "Active", ip: "10.0.0.12", time: "5m ago" },
                  { name: "Bob Johnson", status: "Offline", ip: "172.16.0.4", time: "1h ago" },
                  { name: "Charlie Brown", status: "Active", ip: "192.168.1.105", time: "2h ago" },
                ].map((client, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-xs font-medium border border-border">
                          {client.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        {client.status === "Active" && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card"></span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{client.name}</span>
                        <span className="text-xs text-muted-foreground">{client.ip}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{client.time}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
