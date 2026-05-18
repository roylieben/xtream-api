import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Settings, ListFilter, Database, LogOut, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    // Skip during SSR/prerender — there's no client session available.
    // The client-side check below handles unauthenticated users.
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: AuthLayout,
});

function NavLink({ to, icon: Icon, children }: { to: string; icon: any; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors",
      )}
      activeProps={{ className: "bg-sidebar-accent text-sidebar-foreground font-medium" }}
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}

function AuthLayout() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar p-4 flex flex-col">
        <div className="flex items-center gap-2 px-2 pb-6">
          <div className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Radio className="size-4" />
          </div>
          <div className="font-semibold tracking-tight">XTream Proxy</div>
        </div>
        <nav className="flex flex-col gap-1">
          <NavLink to="/" icon={LayoutDashboard}>Dashboard</NavLink>
          <NavLink to="/settings" icon={Settings}>Settings</NavLink>
          <NavLink to="/categories" icon={ListFilter}>Categories</NavLink>
          <NavLink to="/content" icon={Database}>Content</NavLink>
        </nav>
        <div className="mt-auto pt-4 border-t border-sidebar-border">
          <div className="px-2 pb-2 text-xs text-muted-foreground truncate">{email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
