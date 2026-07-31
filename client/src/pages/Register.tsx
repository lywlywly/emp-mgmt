import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authMeQueryOptions, queryClient, trpc } from "@/lib/trpc";

export default function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const register = useMutation(
    trpc.auth.register.mutationOptions({
      onSuccess: (session) => {
        queryClient.setQueryData(authMeQueryOptions().queryKey, session);
        navigate("/employee/onboarding", {
          replace: true,
          state: { registrationComplete: true },
        });
      },
    }),
  );
  const token = params.get("token") ?? "";
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-6">
      <form
        className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (password !== repeatPassword) {
            setPasswordError("Passwords do not match.");
            return;
          }
          setPasswordError(null);
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
          required
          value={username}
        />
        <div className="relative">
          <Input
            className="pr-10"
            disabled={!token}
            onChange={(event) => {
              setPassword(event.target.value);
              if (passwordError) setPasswordError(null);
            }}
            placeholder="Password"
            required
            type={showPasswords ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
            onClick={() => setShowPasswords((visible) => !visible)}
            type="button"
          >
            {showPasswords ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        <Input
          disabled={!token}
          onChange={(event) => {
            setRepeatPassword(event.target.value);
            if (passwordError) setPasswordError(null);
          }}
          placeholder="Repeat password"
          required
          type={showPasswords ? "text" : "password"}
          value={repeatPassword}
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
        {passwordError && (
          <p className="text-sm text-destructive" role="alert">
            {passwordError}
          </p>
        )}
      </form>
    </main>
  );
}
