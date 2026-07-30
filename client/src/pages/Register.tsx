import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export default function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const register = useMutation(
    trpc.auth.register.mutationOptions({
      onSuccess: () => navigate("/login", { replace: true }),
    }),
  );
  const token = params.get("token") ?? "";
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-6">
      <form
        className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6"
        onSubmit={(event) => {
          event.preventDefault();
          register.mutate({ token, username, password });
        }}
      >
        <div>
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the invitation link sent by HR.
          </p>
        </div>
        <Input
          disabled={!token}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username"
          value={username}
        />
        <Input
          disabled={!token}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
          value={password}
        />
        <Button
          className="w-full"
          disabled={!token || register.isPending}
          type="submit"
        >
          {register.isPending ? "Creating..." : "Create account"}
        </Button>
        {!token && (
          <p className="text-sm text-destructive">
            This invitation link is missing its token.
          </p>
        )}
        {register.isError && (
          <p className="text-sm text-destructive">{register.error.message}</p>
        )}
      </form>
    </main>
  );
}
