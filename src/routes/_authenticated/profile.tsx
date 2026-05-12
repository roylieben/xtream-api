import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialEmail, setInitialEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (data?.user?.email) {
        setEmail(data.user.email);
        setInitialEmail(data.user.email);
      }
    });
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updates: { email?: string; password?: string } = {};
      if (email && email !== initialEmail) updates.email = email;
      if (newPassword) updates.password = newPassword;

      if (Object.keys(updates).length === 0) {
        toast.info("No changes made");
        return;
      }

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      
      toast.success("Profile updated successfully");
      setNewPassword("");
      if (updates.email) {
        setInitialEmail(updates.email);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your admin account credentials.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Credentials</CardTitle>
          <CardDescription>Update your email address (username) or reset your password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (Login Username)</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Leave blank to keep current password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                Update Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-destructive">Sign Out</CardTitle>
          <CardDescription>Sign out of the admin panel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleSignOut}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
