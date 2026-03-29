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
    operatorNotice,
  } = useVanguardChat({ target, input, setInput });

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-32">
        <DashboardHeader loading={loading} />

        <main className="mx-auto grid max-w-4xl gap-6">
          <TargetInput target={target} setTarget={setTarget} />

          <MessageFeed
            messages={messages}
            error={error}
            operatorNotice={operatorNotice}
            onAuthorize={authorizeTool}
            onAbort={abortTool}
            approvalDisabled={loading}
          />

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
