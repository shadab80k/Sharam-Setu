"use client";

import { useStore, SUGGESTED_PROMPTS } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, Send, Loader2, MessageSquare, BookOpen, Wallet, Shield, Briefcase, GraduationCap, AlertTriangle, ChevronRight, User2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { randomId, timeAgo, formatINR } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";
import Link from "next/link";

export default function WorkerAssistantPage() {
  const currentUserId = useStore((s) => s.currentUserId) || "usr_w_1";
  const user = useStore((s) => s.users.find((u) => u.id === currentUserId));
  const addChatMessage = useStore((s) => s.addChatMessage);
  const clearChat = useStore((s) => s.clearChat);
  const sendAssistantMessage = useStore((s) => s.sendAssistantMessage);
  const allChat = useStore((s) => s.chatHistory) ?? [];
  const chatHistory = allChat;
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === currentUserId));
  const jobs = useStore((s) => s.jobs.filter((j) => j.status === "active"));
  const applications = useStore((s) => s.applications);
  const payments = useStore((s) => s.payments.filter((p) => p.workerId === currentUserId));
  const expenses = useStore((s) => s.expenses.filter((e) => e.workerId === currentUserId));
  const savingsGoals = useStore((s) => s.savingsGoals.filter((g) => g.workerId === currentUserId));
  const unreadNotifications = useStore((s) => s.notifications.filter((n) => !n.read && n.userId === currentUserId));

  const pendingAmount = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const pendingCount = payments.filter((p) => p.status !== "paid").length;

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory, thinking]);

  async function send(text: string) {
    if (!text.trim() || !profile) return;
    // optimistic user bubble; server reply appends via the store
    const userMsg: ChatMessage = {
      id: randomId("msg"),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    addChatMessage(currentUserId, userMsg);
    setInput("");
    setThinking(true);
    try {
      await sendAssistantMessage(text);
    } finally {
      setThinking(false);
    }
  }

  const intentIcons: Record<string, React.ReactNode> = {
    JOB_SEARCH: <Briefcase className="h-3 w-3" />,
    WAGE_ESTIMATE: <Wallet className="h-3 w-3" />,
    TRUST_CHECK: <Shield className="h-3 w-3" />,
    PAYMENT_STATUS: <Wallet className="h-3 w-3" />,
    SAVINGS_ADVICE: <Wallet className="h-3 w-3" />,
    CAREER_GUIDANCE: <GraduationCap className="h-3 w-3" />,
    PROFILE_HELP: <User2 className="h-3 w-3" />,
    SAFETY_REPORT: <AlertTriangle className="h-3 w-3" />,
    GENERAL_HELP: <Sparkles className="h-3 w-3" />,
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="grid lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3 flex flex-col h-[calc(100vh-160px)] min-h-[500px]">
          <CardHeader className="border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Ask ShramSetu AI</CardTitle>
                <CardSubtitle>Your personal career, money, and jobs assistant</CardSubtitle>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {chatHistory.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => clearChat(currentUserId)}>
                  Clear
                </Button>
              )}
              <Badge variant="purple" size="sm">AI Coach</Badge>
            </div>
          </CardHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-cream-50">
            {chatHistory.length === 0 && (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-navy-900 mt-3">Hi {profile?.profession} {user?.name?.split(" ")[0]} 👋</h3>
                <p className="text-sm text-gray-600 mt-1 max-w-md mx-auto">
                  I'm here to help with jobs, wages, payments, and career growth. Try one of the suggestions below.
                </p>
              </div>
            )}

            {chatHistory.map((msg: ChatMessage) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex gap-2 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "assistant" ? (
                    <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  ) : (
                    <Avatar name={user?.name ?? "You"} size={32} className="flex-shrink-0" />
                  )}
                  <div>
                    {msg.intent && msg.role === "assistant" && (
                      <div className="mb-1 flex items-center gap-1 text-[10px] text-purple-600 uppercase tracking-wider font-semibold">
                        {intentIcons[msg.intent]} {msg.intent.replace("_", " ")}
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-orange-600 text-white"
                        : "bg-white border border-gray-200 text-navy-900"
                    }`}>
                      {msg.content}
                    </div>
                    {msg.cta && (
                      <Link href={msg.cta.link}>
                        <Button variant="ai" size="sm" className="mt-2" iconRight={<ChevronRight className="h-3.5 w-3.5" />}>
                          {msg.cta.label}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex gap-2">
                <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-white border border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-purple-600 rounded-full animate-pulse-slow" />
                    <span className="h-1.5 w-1.5 bg-purple-600 rounded-full animate-pulse-slow" style={{ animationDelay: "0.2s" }} />
                    <span className="h-1.5 w-1.5 bg-purple-600 rounded-full animate-pulse-slow" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {SUGGESTED_PROMPTS.slice(0, 4).map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="px-2.5 py-1 rounded-full bg-cream-100 hover:bg-orange-100 hover:text-orange-600 text-xs text-gray-700 border border-gray-200 transition"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Ask anything about jobs, money, skills…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                iconLeft={<MessageSquare className="h-4 w-4" />}
              />
              <Button onClick={() => send(input)} disabled={!input.trim() || thinking} iconLeft={<Send className="h-4 w-4" />}>
                Send
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick insights</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              <div className="p-3 rounded-lg bg-green-100">
                <div className="text-[10px] uppercase tracking-wider text-green-600 font-semibold">Pending payment</div>
                <div className="text-base font-bold text-navy-900 mt-1">{formatINR(pendingAmount)}</div>
                <div className="text-xs text-gray-600">{pendingCount} pending payment(s)</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <div className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Available jobs</div>
                <div className="text-base font-bold text-navy-900 mt-1">{jobs.length} jobs</div>
                <div className="text-xs text-gray-600">In your area</div>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <div className="text-[10px] uppercase tracking-wider text-purple-600 font-semibold">Trust score</div>
                <div className="text-base font-bold text-navy-900 mt-1">{profile?.trustScore}/100</div>
                <div className="text-xs text-gray-600">{profile?.trustLabel}</div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Topics I can help with</CardTitle>
            </CardHeader>
            <CardBody className="space-y-1.5 text-sm">
              {[
                { icon: <Briefcase className="h-3.5 w-3.5" />, label: "Find jobs near me" },
                { icon: <Wallet className="h-3.5 w-3.5" />, label: "What should I earn?" },
                { icon: <Shield className="h-3.5 w-3.5" />, label: "Trust score questions" },
                { icon: <BookOpen className="h-3.5 w-3.5" />, label: "Career growth" },
                { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "File a report" },
              ].map((t) => (
                <button
                  key={t.label}
                  onClick={() => send(t.label)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-cream-100 text-left text-navy-900"
                >
                  <span className="text-orange-600">{t.icon}</span>
                  <span className="text-xs">{t.label}</span>
                </button>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
