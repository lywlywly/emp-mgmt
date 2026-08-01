import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryClient, trpc } from "@/lib/trpc";

export default function HrInvitations() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const invitations = useQuery(trpc.invitation.list.queryOptions());
  const create = useMutation(
    trpc.invitation.generateAndSend.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: trpc.invitation.list.queryKey(),
        }),
    }),
  );
  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">HR portal</p>
        <h1 className="mt-2 text-4xl font-bold">Invitations</h1>
      </div>
      <form
        className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate({ email, name });
        }}
      >
        <Input
          onChange={(e) => setName(e.target.value)}
          placeholder="Employee name"
          value={name}
        />
        <Input
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          value={email}
        />
        <Button disabled={create.isPending} type="submit">
          Send invitation
        </Button>
      </form>
      {create.isError && (
        <p className="text-sm text-destructive">{create.error.message}</p>
      )}
      <div className="rounded-lg border bg-card">
        {invitations.data?.length ? (
          invitations.data.map((invitation) => (
            <div className="border-b p-4 last:border-0" key={invitation.id}>
              <p className="font-medium">{invitation.name}</p>
              <p className="text-sm text-muted-foreground">
                {invitation.email} · {invitation.status}
              </p>
              <code className="mt-2 block break-all text-xs">
                {invitation.link}
              </code>
            </div>
          ))
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            Invitation history will appear here after you send an invitation.
          </p>
        )}
      </div>
    </section>
  );
}
