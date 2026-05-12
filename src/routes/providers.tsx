import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Edit, Trash, Server, Shield } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/providers")({
  component: ProvidersPage,
});

function ProvidersPage() {
  const providers = [
    { id: "1", name: "Main IPTV Source", domain: "http://example-iptv.com", type: "Xtream", status: "Active", clients: 450, ping: "45ms" },
    { id: "2", name: "Backup Source A", domain: "http://backup-a.net:8080", type: "Xtream", status: "Active", clients: 120, ping: "68ms" },
    { id: "3", name: "Premium VOD", domain: "http://vod-server.xyz", type: "Xtream", status: "Down", clients: 0, ping: "Timeout" },
    { id: "4", name: "Sports Provider", domain: "http://sports-live.io:80", type: "M3U", status: "Active", clients: 310, ping: "32ms" },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Providers</h2>
            <p className="text-muted-foreground mt-1">Manage upstream Xtream Codes servers.</p>
          </div>
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus size={16} />
            Add Provider
          </Button>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Configured Providers</CardTitle>
                <CardDescription>Connect to your upstream IPTV sources.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search providers..."
                    className="w-64 pl-9 bg-background/50 border-border/50"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-[250px]">Name</TableHead>
                  <TableHead>Domain/IP</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ping</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id} className="border-border/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-primary/70" />
                        {provider.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{provider.domain}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-secondary/50 font-normal">
                        {provider.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {provider.status === "Active" ? (
                          <>
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="text-emerald-500 text-sm font-medium">Active</span>
                          </>
                        ) : (
                          <>
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            <span className="text-red-500 text-sm font-medium">Down</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{provider.ping}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer gap-2">
                            <Edit className="h-4 w-4 text-muted-foreground" /> Edit Connection
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" /> Test Connection
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuItem className="cursor-pointer gap-2 text-red-500 focus:text-red-500 focus:bg-red-500/10">
                            <Trash className="h-4 w-4" /> Delete Provider
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
