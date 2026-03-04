"use client";

import { useState } from "react";
import { Mail, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeEmail } from "@/app/actions";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const result = await subscribeEmail(email);

    if (result.success) {
      setStatus("success");
      setEmail("");
    } else {
      setStatus("error");
      setErrorMsg(result.error || "Something went wrong");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 text-green-500 text-sm">
        <Check className="w-4 h-4" />
        <span>Subscribed! You'll get daily digests.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder="Get daily digest..."
            className="bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-green-500 w-64"
            required
          />
        </div>
        <Button type="submit" size="sm" disabled={status === "loading"}>
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Subscribe"
          )}
        </Button>
      </form>

      {status === "error" && (
        <div className="flex items-center gap-1 text-red-500 text-xs">
          <AlertCircle className="w-3 h-3" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
