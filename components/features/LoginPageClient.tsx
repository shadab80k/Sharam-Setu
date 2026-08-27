"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Hammer, Shield, Wallet, Sparkles, Phone, ChevronRight, CheckCircle2 } from "lucide-react";
import { ToastViewport } from "@/components/ui/Toast";

type Mode = "phone" | "otp" | "email";

export default function LoginPageClient() {
  const router = useRouter();
  const login = useStore((s) => s.login);
  const loginByEmail = useStore((s) => s.loginByEmail);
  const switchUser = useStore((s) => s.switchUser);
  const pushToast = useStore((s) => s.pushToast);

  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>("phone");
  const [phone, setPhone] = useState("9876543210");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleSendOtp() {
    if (phone.length < 10) {
      pushToast("error", "Please enter a valid phone number");
      return;
    }
    setMode("otp");
    pushToast("info", "OTP sent. Use 123456 to verify (demo).");
  }

  function handleOtpChange(i: number, v: string) {
    if (v.length > 1) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) {
      const next = document.getElementById(`otp-${i + 1}`);
      next?.focus();
    }
  }

  function handleVerifyOtp() {
    const code = otp.join("");
    if (code !== "123456") {
      pushToast("error", "That code doesn't look right. Try 123456.");
      return;
    }
    setLoading(true);
    login("usr_w_1");
    pushToast("success", "Welcome back, Ramesh!");
    window.location.href = "/worker/dashboard";
  }

  function handleEmailLogin() {
    if (!email) {
      pushToast("error", "Enter an email address");
      return;
    }
    const user = loginByEmail(email);
    if (!user) {
      pushToast("error", "No account found for that email");
      return;
    }
    setLoading(true);
    pushToast("success", `Welcome back, ${user.name}!`);
    window.location.href = `/${user.role}/dashboard`;
  }

  function handleGoogle() {
    setLoading(true);
    login("usr_w_1");
    pushToast("success", "Signed in with Google");
    window.location.href = "/worker/dashboard";
  }

  function handleDemoAccess(role: "worker" | "contractor" | "admin") {
    switchUser(role);
    pushToast("success", `Entering ${role} demo…`);
    window.location.href = `/${role}/dashboard`;
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row" suppressHydrationWarning>
      <ToastViewport />
      {/* Left brand panel */}
      <section className="hidden lg:flex lg:w-1/2 bg-navy-900 text-white p-12 flex-col justify-between relative overflow-hidden" aria-label="Brand Overview">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-orange-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-orange-600 flex items-center justify-center">
              <Hammer className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-xl font-bold">ShramSetu</div>
              <div className="text-[11px] font-semibold text-orange-400 tracking-widest">AI</div>
            </div>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
            The digital identity for<br />
            <span className="text-orange-400">India's informal workforce</span>
          </h1>
          <p className="text-lg text-gray-200 max-w-md">
            Verify your work, find better jobs, get fair wages, and build a reputation that travels with you.
          </p>
          <div className="grid grid-cols-1 gap-3 pt-4">
            {[
              { icon: <Shield className="h-5 w-5" />, text: "Verified digital identity & trust score" },
              { icon: <Wallet className="h-5 w-5" />, text: "Track income, expenses, and savings" },
              { icon: <Sparkles className="h-5 w-5" />, text: "AI-matched jobs and career guidance" },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center">
                  {b.icon}
                </div>
                <span className="text-sm text-gray-100">{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-gray-300">
          © ShramSetu AI · Prototype mode · All services are simulated
        </div>
      </section>

      {/* Right login panel */}
      <section className="flex-1 flex flex-col p-6 sm:p-10 bg-cream-50" aria-label="Sign In">
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-orange-600 text-white flex items-center justify-center">
            <Hammer className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-lg font-bold text-navy-900 leading-none">ShramSetu</div>
            <div className="text-[10px] font-semibold text-orange-600 tracking-wider mt-0.5">AI</div>
          </div>
        </div>

        <div className="m-auto w-full max-w-md">
          {mode === "phone" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold text-navy-900">Welcome to ShramSetu AI</h2>
                <p className="text-sm text-gray-800 mt-1.5">
                  Your trusted digital identity for better work.
                </p>
              </div>

              <div className="space-y-3">
                <Input
                  label="Mobile number"
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  iconLeft={<Phone className="h-4 w-4" />}
                />
                <Button fullWidth size="lg" onClick={handleSendOtp} iconRight={<ChevronRight className="h-4 w-4" />}>
                  Send OTP
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-300" />
                <span className="text-xs text-gray-700 font-medium uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>

              <Button fullWidth size="lg" variant="secondary" onClick={handleGoogle}>
                <GoogleIcon className="h-4 w-4 mr-2" />
                Continue with Google
              </Button>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <div className="text-sm font-semibold text-navy-900">Demo Access</div>
                </div>
                <p className="text-xs text-gray-700 mb-3">
                  One-click entry for evaluators. No real verification required.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleDemoAccess("worker")}>
                    Worker
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleDemoAccess("contractor")}>
                    Contractor
                  </Button>
                  <Button variant="ai" size="sm" onClick={() => handleDemoAccess("admin")}>
                    Admin
                  </Button>
                </div>
              </div>
            </div>
          )}

          {mode === "otp" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold text-navy-900">Verify your number</h2>
                <p className="text-sm text-gray-800 mt-1.5">
                  We sent a 6-digit code to <span className="font-semibold">+91 {phone}</span>
                </p>
              </div>

              <div className="flex gap-2">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    aria-label={`Digit ${i + 1} of verification code`}
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    className="h-12 w-12 text-center text-lg font-bold rounded-lg border border-gray-300 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <button onClick={() => setMode("phone")} className="text-orange-700 font-semibold underline-offset-2 hover:underline">
                  Change number
                </button>
                <button className="text-gray-700 font-medium">Resend in 28s</button>
              </div>

              <Button fullWidth size="lg" onClick={handleVerifyOtp} loading={loading}>
                Verify and continue
              </Button>

              <div className="rounded-lg bg-blue-100 border border-blue-200 p-3 text-xs text-blue-800 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-700" />
                <span>Demo OTP is <span className="font-bold">123456</span>. In production, this would be sent via SMS.</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-gray-700 font-medium">
          Prototype mode — verification and external services are simulated.
        </div>
      </section>
    </main>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
