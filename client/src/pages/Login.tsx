import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authMeQueryOptions, queryClient, trpc } from "@/lib/trpc";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation(
    trpc.auth.login.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: authMeQueryOptions().queryKey,
        }),
    }),
  );

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-6">
      <form
        className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6"
        onSubmit={(event) => {
          event.preventDefault();
          login.mutate({ username, password });
        }}
      >
        <div>
          <h1 className="text-xl font-semibold">Employee Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to continue.
          </p>
        </div>
        <Input
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username"
          value={username}
        />
        <Input
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
          value={password}
        />
        <Button className="w-full" disabled={login.isPending} type="submit">
          {login.isPending ? "Signing in..." : "Sign in"}
        </Button>
        {login.isError && (
          <p className="text-sm text-destructive">{login.error.message}</p>
        )}
      </form>
    </main>
  );
}
