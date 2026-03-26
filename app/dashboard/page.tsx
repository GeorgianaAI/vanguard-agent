"use client";

import { useState } from "react";
import { CommandInput } from "./components/CommandInput";
import { DashboardHeader } from "./components/DashboardHeader";
import { MessageFeed } from "./components/MessageFeed";
import { TargetInput } from "./components/TargetInput";
import { useVanguardChat } from "./hooks/useVanguardChat";

export default function VanguardDashboard() {
  const [target, setTarget] = useState<string>("");
  const [input, setInput] = useState<string>("");

  const {
    messages,
    error,
    loading,
    onSubmit,
    authorizeTool,
    abortTool,
    setInputValue,
  } = useVanguardChat({ target, input, setInput });

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-24">
        {/* Header */}
        <DashboardHeader loading={loading} />

        <main className="mx-auto grid max-w-4xl gap-6">
          {/* Target */}
          <TargetInput target={target} setTarget={setTarget} />

          {/* Feed */}
          <MessageFeed
            messages={messages}
            error={error}
            onAuthorize={authorizeTool}
            onAbort={abortTool}
          />

          {/* Command */}
          <CommandInput
            input={input}
            loading={loading}
            setInput={setInputValue}
            onSubmit={onSubmit}
          />
        </main>
      </div>
    </div>
  );
}
