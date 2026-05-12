import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, MoreHorizontal, Edit, Trash, Copy, PowerOff } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const clients = [
    { id: "1", username: "john_doe_99", maxConns: 2, activeConns: 1, expDate: "2024-12-31", status: "Active" },
    { id: "2", username: "alice_s", maxConns: 1, activeConns: 0, expDate: "2024-06-15", status: "Active" },
    { id: "3", username: "bob_tv_home", maxConns: 5, activeConns: 5, expDate: "2024-10-22", status: "Active" },
    { id: "4", username: "charlie_test", maxConns: 1, activeConns: 0, expDate: "2024-02-14", status: "Expired" },
    { id: "5", username: "dave_premium", maxConns: 3, activeConns: 0, expDate: "2025-01-01", status: "Banned" },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Clients</h2>
            <p className="text-muted-foreground mt-1">Manage proxy access for your users.</p>
          </div>
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus size={16} />
            Generate Line
          </Button>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Client Subscriptions</CardTitle>
                <CardDescription>Active proxy lines assigned to users.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search username..."
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
                  <TableHead>Username</TableHead>
                  <TableHead>Connections</TableHead>
                  <TableHead>Expiration Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} className="border-border/50">
                    <TableCell className="font-medium text-foreground">
                      {client.username}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className={client.activeConns >= client.maxConns ? "text-amber-500 font-medium" : ""}>
                          {client.activeConns}
                        </span>
                        <span>/</span>
                        <span>{client.maxConns}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {client.expDate}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        client.status === "Active" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                        client.status === "Expired" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                        "bg-red-500/10 text-red-500 border border-red-500/20"
                      }`}>
                        {client.status}
                      </span>
                    </TableCell>
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
                            <Copy className="h-4 w-4 text-muted-foreground" /> Copy Proxy URL
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer gap-2">
                            <Edit className="h-4 w-4 text-muted-foreground" /> Edit Client
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuItem className="cursor-pointer gap-2 text-amber-500 focus:text-amber-500 focus:bg-amber-500/10">
                            <PowerOff className="h-4 w-4" /> Kill Connections
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer gap-2 text-red-500 focus:text-red-500 focus:bg-red-500/10">
                            <Trash className="h-4 w-4" /> Ban Client
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
