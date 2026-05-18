import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listUsers,
  updateUserPassword,
  updateUserEmail,
  createUser,
  deleteUser,
} from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, KeyRound, Mail, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
};

function UsersPage() {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const setPassword = useServerFn(updateUserPassword);
  const setEmail = useServerFn(updateUserEmail);
  const addUser = useServerFn(createUser);
  const removeUser = useServerFn(deleteUser);

  const [pwTarget, setPwTarget] = useState<UserRow | null>(null);
  const [emailTarget, setEmailTarget] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers(),
  });

  const pwMut = useMutation({
    mutationFn: (vars: { userId: string; password: string }) => setPassword({ data: vars }),
    onSuccess: () => {
      toast.success("Password updated");
      setPwTarget(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const emailMut = useMutation({
    mutationFn: (vars: { userId: string; email: string }) => setEmail({ data: vars }),
    onSuccess: () => {
      toast.success("Email updated");
      setEmailTarget(null);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: (vars: { email: string; password: string }) => addUser({ data: vars }),
    onSuccess: () => {
      toast.success("User created");
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (userId: string) => removeUser({ data: { userId } }),
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : "—");

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage accounts that can sign in to the admin app.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <UserPlus className="size-4" />
          Add user
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">
              <Loader2 className="inline size-4 animate-spin" /> Loading…
            </div>
          ) : (users ?? []).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No users yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Created</th>
                  <th className="text-left p-3 font-medium">Last sign-in</th>
                  <th className="text-right p-3 font-medium w-72">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map((u: UserRow) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-3">
                      <div className="font-medium">{u.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {u.email_confirmed_at ? "Verified" : "Unverified"}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{fmt(u.created_at)}</td>
                    <td className="p-3 text-muted-foreground">{fmt(u.last_sign_in_at)}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEmailTarget(u)}>
                          <Mail className="size-4" />
                          Email
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setPwTarget(u)}>
                          <KeyRound className="size-4" />
                          Password
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`Delete user "${u.email}"? This cannot be undone.`))
                              delMut.mutate(u.id);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {pwTarget && (
        <PasswordDialog
          user={pwTarget}
          onClose={() => setPwTarget(null)}
          onSubmit={(password) => pwMut.mutate({ userId: pwTarget.id, password })}
          pending={pwMut.isPending}
        />
      )}
      {emailTarget && (
        <EmailDialog
          user={emailTarget}
          onClose={() => setEmailTarget(null)}
          onSubmit={(email) => emailMut.mutate({ userId: emailTarget.id, email })}
          pending={emailMut.isPending}
        />
      )}
      {creating && (
        <CreateUserDialog
          onClose={() => setCreating(false)}
          onSubmit={(email, password) => createMut.mutate({ email, password })}
          pending={createMut.isPending}
        />
      )}
    </div>
  );
}

function PasswordDialog({
  user,
  onClose,
  onSubmit,
  pending,
}: {
  user: UserRow;
  onClose: () => void;
  onSubmit: (password: string) => void;
  pending: boolean;
}) {
  const [pw, setPw] = useState("");
  const valid = pw.length >= 6;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set password</DialogTitle>
          <DialogDescription>For {user.email}. Minimum 6 characters.</DialogDescription>
        </DialogHeader>
        <Input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="New password"
          maxLength={200}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || pending} onClick={() => onSubmit(pw)}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmailDialog({
  user,
  onClose,
  onSubmit,
  pending,
}: {
  user: UserRow;
  onClose: () => void;
  onSubmit: (email: string) => void;
  pending: boolean;
}) {
  const [email, setEmail] = useState(user.email);
  const valid = /.+@.+\..+/.test(email) && email !== user.email;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change email</DialogTitle>
          <DialogDescription>Current: {user.email}</DialogDescription>
        </DialogHeader>
        <Input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="new@example.com"
          maxLength={255}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || pending} onClick={() => onSubmit(email)}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateUserDialog({
  onClose,
  onSubmit,
  pending,
}: {
  onClose: () => void;
  onSubmit: (email: string, password: string) => void;
  pending: boolean;
}) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const valid = /.+@.+\..+/.test(email) && pw.length >= 6;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>Creates a verified account that can sign in immediately.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            maxLength={255}
          />
          <Input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Password (min 6 chars)"
            maxLength={200}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || pending} onClick={() => onSubmit(email, pw)}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
