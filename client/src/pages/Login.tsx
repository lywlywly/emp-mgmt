import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authMeQueryOptions, queryClient, trpc } from "@/lib/trpc";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        <div className="relative">
          <Input
            className="pr-10"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
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
