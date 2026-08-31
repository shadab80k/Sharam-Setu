"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Hammer, Shield, Wallet, Sparkles, Phone, ChevronRight, CheckCircle2, UserPlus, Mail } from "lucide-react";
import { ToastViewport } from "@/components/ui/Toast";

type Mode = "phone" | "otp" | "email" | "signup";

const DEMO_ACCOUNTS = [
  { role: "Worker", email: "worker@shramsetu.local" },
  { role: "Contractor", email: "contractor@shramsetu.local" },
  { role: "Admin", email: "admin@shramsetu.local" },
];

export default function LoginPageClient() {
  const loginByEmail = useStore((s) => s.loginByEmail);
  const sendOtp = useStore((s) => s.sendOtp);
  const verifyOtp = useStore((s) => s.verifyOtp);
  const signup = useStore((s) => s.signup);
  const pushToast = useStore((s) => s.pushToast);

  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>("phone");
  const [phone, setPhone] = useState("9876543210");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"worker" | "contractor">("worker");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  function handleOtpChange(i: number, v: string) {
    if (v.length > 1) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) {
      document.getElementById(`otp-${i + 1}`)?.focus();
    }
  }

  async function handleSendOtp() {
    if (phone.length !== 10 || !/^[6-9]/.test(phone)) {
      pushToast("error", "Enter a valid 10-digit Indian mobile number");
      return;
    }
    setLoading(true);
    try {
      const devCode = await sendOtp(phone);
      setDevOtp(devCode);
      setMode("otp");
      setResendTimer(60);
      if (devCode) {
        pushToast("info", `OTP sent. Dev mode code: ${devCode}`);
      } else {
        pushToast("success", "OTP sent to your phone");
      }
    } catch (e: any) {
      pushToast("error", e.message ?? "Could not send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    const code = otp.join("");
    if (code.length !== 6) {
      pushToast("error", "Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const user = await verifyOtp(phone, code);
      if (!user) throw new Error("Login failed");
      pushToast("success", `Welcome back, ${user.name}!`);
      window.location.href = `/${user.role}/dashboard`;
    } catch (e: any) {
      if (e.signupRequired) {
        setMode("signup");
        pushToast("info", "Number not registered — create your account");
        return;
      }
      pushToast("error", e.message ?? "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin() {
    if (!email || !password) {
      pushToast("error", "Enter email and password");
      return;
    }
    setLoading(true);
    try {
      const user = await loginByEmail(email, password);
      if (!user) throw new Error("Login failed");
      pushToast("success", `Welcome back, ${user.name}!`);
      window.location.href = `/${user.role}/dashboard`;
    } catch (e: any) {
      pushToast("error", e.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    if (!name || !email || password.length < 6) {
      pushToast("error", "Fill all fields (password min 6 characters)");
      return;
    }
    setLoading(true);
    try {
      const user = await signup({ name, email, password, role, phone: phone || undefined });
      if (!user) throw new Error("Signup failed");
      pushToast("success", `Account created. Welcome, ${user.name}!`);
      window.location.href = `/${user.role}/dashboard`;
    } catch (e: any) {
      pushToast("error", e.message ?? "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoAccess(demoEmail: string) {
    setLoading(true);
    try {
      const user = await loginByEmail(demoEmail, "demo1234");
      if (!user) throw new Error("Demo login failed");
      pushToast("success", `Entering ${user.role} demo…`);
      window.location.href = `/${user.role}/dashboard`;
    } catch (e: any) {
      pushToast("error", e.message ?? "Demo login failed");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle() {
    window.location.href = "/api/auth/google";
  }

  if (!mounted) return null;

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
            <span className="text-orange-400">India&apos;s informal workforce</span>
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
          © ShramSetu AI · Secure platform · Server-verified trust scores
        </div>
      </section>

      {/* Right login panel */}
      <section className="flex-1 flex flex-col p-6 sm:p-10 bg-cream-50 overflow-y-auto" aria-label="Sign In">
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-orange-600 text-white flex items-center justify-center">
            <Hammer className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-lg font-bold text-navy-900 leading-none">ShramSetu</div>
            <div className="text-[10px] font-semibold text-orange-600 tracking-wider mt-0.5">AI</div>
          </div>
        </div>

        <div className="m-auto w-full max-w-md py-8">
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
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  iconLeft={<Phone className="h-4 w-4" />}
                />
                <Button fullWidth size="lg" onClick={handleSendOtp} loading={loading} iconRight={<ChevronRight className="h-4 w-4" />}>
                  Send OTP
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-300" />
                <span className="text-xs text-gray-700 font-medium uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button size="lg" variant="secondary" onClick={handleGoogle}>
                  <GoogleIcon className="h-4 w-4 mr-2" />
                  Google
                </Button>
                <Button size="lg" variant="secondary" onClick={() => setMode("email")}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email Login
                </Button>
              </div>

              <button
                onClick={() => { setMode("signup"); setEmail(""); }}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-orange-700 hover:text-orange-800"
              >
                <UserPlus className="h-4 w-4" />
                New here? Create an account
              </button>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <div className="text-sm font-semibold text-navy-900">Demo Accounts</div>
                </div>
                <p className="text-xs text-gray-700 mb-3">
                  Seeded evaluator accounts with realistic data (password: demo1234).
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_ACCOUNTS.map((d) => (
                    <Button key={d.role} variant="secondary" size="sm" onClick={() => handleDemoAccess(d.email)} disabled={loading}>
                      {d.role}
                    </Button>
                  ))}
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
                    onChange={(e) => handleOtpChange(i, e.target.value.replace(/\D/g, ""))}
                    className="h-12 w-12 text-center text-lg font-bold rounded-lg border border-gray-300 bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <button onClick={() => setMode("phone")} className="text-orange-700 font-semibold underline-offset-2 hover:underline">
                  Change number
                </button>
                <button
                  className={`font-medium ${resendTimer > 0 ? "text-gray-500" : "text-orange-700 font-semibold underline-offset-2 hover:underline"}`}
                  disabled={resendTimer > 0 || loading}
                  onClick={handleSendOtp}
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
                </button>
              </div>

              <Button fullWidth size="lg" onClick={handleVerifyOtp} loading={loading}>
                Verify and continue
              </Button>

              {devOtp && (
                <div className="rounded-lg bg-blue-100 border border-blue-200 p-3 text-xs text-blue-800 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-700" />
                  <span>
                    SMS provider not configured — your code is{" "}
                    <button
                      className="font-bold underline"
                      onClick={() => { setOtp(devOtp.split("")); }}
                    >
                      {devOtp}
                    </button>{" "}
                    (tap to fill). Add MSG91/Twilio keys to switch to real SMS.
                  </span>
                </div>
              )}
            </div>
          )}

          {mode === "email" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold text-navy-900">Sign in with email</h2>
                <p className="text-sm text-gray-800 mt-1.5">Use your account email and password.</p>
              </div>
              <div className="space-y-3">
                <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button fullWidth size="lg" onClick={handleEmailLogin} loading={loading}>
                  Sign in
                </Button>
              </div>
              <button onClick={() => setMode("phone")} className="text-sm font-semibold text-orange-700 hover:text-orange-800">
                ← Back to phone login
              </button>
            </div>
          )}

          {mode === "signup" && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold text-navy-900">Create your account</h2>
                <p className="text-sm text-gray-800 mt-1.5">Join as a worker or a contractor.</p>
              </div>
              <div className="space-y-3">
                <Input label="Full name / Company name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ramesh Kumar" />
                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                <Input label="Password (min 6 characters)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <Input
                  label="Mobile number (optional)"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="98765 43210"
                  iconLeft={<Phone className="h-4 w-4" />}
                />
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1.5">I am a</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(["worker", "contractor"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={`px-4 py-2.5 rounded-lg border text-sm font-semibold capitalize transition ${
                          role === r
                            ? "border-orange-600 bg-orange-100 text-orange-700"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-cream-100"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <Button fullWidth size="lg" onClick={handleSignup} loading={loading}>
                  Create account
                </Button>
              </div>
              <button onClick={() => setMode("phone")} className="text-sm font-semibold text-orange-700 hover:text-orange-800">
                ← Back to login
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-gray-700 font-medium">
          Secured by InsForge · Sessions, RLS-protected data & server-side trust verification.
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
