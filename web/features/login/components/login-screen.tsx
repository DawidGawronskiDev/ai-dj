"use client";

import { useState, type FormEvent } from "react";

type LoginScreenProps = {
  error: string;
  pending: boolean;
  onSignIn: (password: string) => Promise<boolean>;
};

export const LoginScreen = ({ error, pending, onSignIn }: LoginScreenProps) => {
  const [password, setPassword] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (await onSignIn(password)) setPassword("");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-[min(480px,calc(100vw-36px))] border border-foreground bg-card p-[38px] shadow-[13px_13px_0_var(--foreground)]">
        <span className="text-[11px] text-primary">OPERATOR ACCESS / 01</span>
        <h1 className="mt-[18px] mb-[26px] text-[92px] leading-[0.85] tracking-tighter">
          AI<span className="text-primary">/</span>DJ
        </h1>
        <p className="text-[13px] leading-[1.6]">
          The booth is yours. Sign in to control the set.
        </p>
        <form className="my-[38px] grid gap-2.5" onSubmit={submit}>
          <label className="text-[10px]" htmlFor="password">
            OPERATOR PASSWORD
          </label>
          <input
            className="w-full border border-foreground bg-background px-[15px] py-[13px] text-foreground"
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            autoFocus
          />
          <button
            className="flex justify-between border border-foreground bg-primary p-[15px] text-left"
            type="submit"
            disabled={pending}
          >
            ENTER THE BOOTH <span aria-hidden="true">↗</span>
          </button>
        </form>
        {error && (
          <p className="text-[11px] text-destructive" role="alert">
            {error}
          </p>
        )}
        <small className="text-[9px] text-muted-foreground">
          LIVE VENUE CONTROL · AUTHORISED OPERATORS ONLY
        </small>
      </div>
    </main>
  );
};
