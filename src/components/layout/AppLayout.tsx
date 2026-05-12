import { Link, useLocation } from "@tanstack/react-router";
import { Activity, Users, Server, Settings, Tv } from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarRail, SidebarFooter } from "@/components/ui/sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const navItems = [
    { title: "Dashboard", href: "/", icon: Activity },
    { title: "Content", href: "/content", icon: Tv },
    { title: "Categories", href: "/categories", icon: Server },
    { title: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-sidebar-border bg-sidebar">
          <SidebarHeader className="flex h-16 items-center px-4">
            <div className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Tv size={18} />
              </div>
              XtreamProxy
            </div>
          </SidebarHeader>
          <SidebarContent className="px-2 py-4">
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link to={item.href} className="flex items-center gap-3 px-3 py-2">
                        <item.icon size={18} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
                AD
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">Admin</span>
                <span className="text-xs text-muted-foreground mt-1">admin@xtream.local</span>
              </div>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card/50 px-6 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex flex-1 items-center justify-between">
              <h1 className="text-sm font-medium text-muted-foreground">
                {navItems.find(item => item.href === location.pathname)?.title || "Proxy"}
              </h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Proxy Active
                </div>
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6 md:p-8">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
