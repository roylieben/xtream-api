import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings</h2>
          <p className="text-muted-foreground mt-1">Configure your proxy instance.</p>
        </div>

        <div className="grid gap-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Proxy Server Configuration</CardTitle>
              <CardDescription>Core settings for how the proxy behaves.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="domain">Public Proxy Domain</Label>
                <Input id="domain" defaultValue="http://my-proxy.com" className="bg-background/50 border-border/50" />
                <p className="text-[0.8rem] text-muted-foreground">The domain name given to your clients.</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="port">Proxy Port</Label>
                <Input id="port" defaultValue="80" type="number" className="bg-background/50 border-border/50 max-w-[200px]" />
              </div>

              <div className="flex items-center justify-between border-t border-border/30 pt-6">
                <div className="space-y-0.5">
                  <Label>Enable Caching</Label>
                  <p className="text-[0.8rem] text-muted-foreground">
                    Cache VOD and catchup streams locally to save bandwidth.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between border-t border-border/30 pt-6">
                <div className="space-y-0.5">
                  <Label>Anti-Restream Protection</Label>
                  <p className="text-[0.8rem] text-muted-foreground">
                    Detect and block clients sharing their streams with multiple IPs.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Save size={16} />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
