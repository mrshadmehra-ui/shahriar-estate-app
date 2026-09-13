import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/landing/Logo";
import { ArrowLeft, KeyRound, Loader2, Lock, Mail, UserRound } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { cn } from "@/lib/utils";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function passwordErrorMessage(err: unknown): string {
  const raw =
    err instanceof Error ? err.message : "خطا در ورود. لطفا دوباره تلاش کنید.";
  const lower = raw.toLowerCase();
  if (lower.includes("invalid") || lower.includes("incorrect") || lower.includes("wrong")) {
    return "ایمیل یا رمز عبور اشتباه است.";
  }
  if (lower.includes("already exists")) {
    return "این ایمیل قبلاً ثبت شده است — وارد شوید.";
  }
  if (lower.includes("password")) {
    return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
  }
  return raw;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [method, setMethod] = useState<"password" | "otp">("password");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");

  // password form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [signupRole, setSignupRole] = useState<"owner" | "tenant">("owner");

  // otp flow
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "signUp") {
      if (!name.trim()) {
        setError("نام و نام خانوادگی را وارد کنید.");
        return;
      }
      const digits = phone
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[^0-9]/g, "");
      if (digits.length < 10) {
        setError("شماره تلفن الزامی است و باید حداقل ۱۰ رقم باشد (مثلاً ۰۹۱۲۱۲۳۴۵۶۷).");
        return;
      }
    }
    setIsLoading(true);
    setError(null);
    try {
      if (mode === "signIn") {
        await signIn("password", { flow: "signIn", email, password });
      } else {
        await signIn("password", {
          flow: "signUp",
          email,
          password,
          name,
          phone,
          signupRole,
        });
      }
      // success → the effect above navigates
    } catch (e) {
      console.error("Password sign-in error:", e);
      setError(passwordErrorMessage(e));
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "ارسال کد تایید با خطا مواجه شد. لطفا دوباره تلاش کنید.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("کد تایید وارد شده صحیح نیست.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const tabClass = (active: boolean) =>
    cn(
      "flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition",
      active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center justify-center h-full flex-col px-4">
          <Card className="min-w-[350px] max-w-[400px] pb-0 border shadow-md">
            <CardHeader className="text-center">
              <div className="mb-3 flex cursor-pointer justify-center" onClick={() => navigate("/")}>
                <Logo subtitle={false} />
              </div>
              <CardTitle className="text-xl text-navy">ورود به پنل مجتمع</CardTitle>
              <CardDescription>
                برای مشاهده شارژها، فاکتورها و وضعیت مالی واحد خود وارد شوید
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* method tabs */}
              <div className="flex items-center gap-1 rounded-full border border-border bg-muted/50 p-1">
                <button type="button" className={tabClass(method === "password")} onClick={() => { setMethod("password"); setError(null); }}>
                  <KeyRound className="me-1 inline size-3.5" />
                  رمز عبور
                </button>
                <button type="button" className={tabClass(method === "otp")} onClick={() => { setMethod("otp"); setError(null); }}>
                  <Mail className="me-1 inline size-3.5" />
                  کد یکبارمصرف
                </button>
              </div>

              {method === "password" ? (
                <>
                  {mode === "signUp" && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] leading-5 text-emerald-800">
                      ثبت‌نام برای مالکین و مستأجرین مجتمع (شماره تلفن الزامی است).
                      اولین کاربر ثبت‌نام‌شده «مدیر ارشد» می‌شود؛ حسابدار و سایر نقش‌ها فقط توسط مدیر ارشد ساخته می‌شوند.
                    </div>
                  )}
                  <form onSubmit={handlePasswordSubmit} className="space-y-3">
                    {mode === "signUp" && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">نام و نام خانوادگی</Label>
                          <div className="relative">
                            <UserRound className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              dir="rtl"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="مثلاً: محمد رضایی"
                              className="pr-9"
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">
                            نوع حساب
                          </Label>
                          <div className="flex items-center gap-1 rounded-full border border-border bg-muted/50 p-1">
                            <button
                              type="button"
                              onClick={() => setSignupRole("owner")}
                              className={cn(
                                "flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition",
                                signupRole === "owner"
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              مالک واحد
                            </button>
                            <button
                              type="button"
                              onClick={() => setSignupRole("tenant")}
                              className={cn(
                                "flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition",
                                signupRole === "tenant"
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              مستأجر
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">
                            تلفن همراه <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            dir="ltr"
                            className="text-end"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="0912…"
                            disabled={isLoading}
                            required
                            inputMode="tel"
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">ایمیل (نام کاربری)</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          dir="ltr"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="pl-9 text-end"
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">رمز عبور</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          dir="ltr"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={mode === "signUp" ? "حداقل ۸ کاراکتر" : "••••••••"}
                          className="pl-9 text-end"
                          disabled={isLoading}
                          required
                          minLength={mode === "signUp" ? 8 : undefined}
                        />
                      </div>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          در حال بررسی...
                        </>
                      ) : mode === "signIn" ? (
                        <>
                          ورود
                          <ArrowLeft className="size-4" />
                        </>
                      ) : signupRole === "tenant" ? (
                        "ساخت حساب مستأجر"
                      ) : (
                        "ساخت حساب مالک"
                      )}
                    </Button>
                  </form>
                  <p className="text-center text-xs text-muted-foreground">
                    {mode === "signIn" ? (
                      <>
                        حساب ندارید؟{" "}
                        <Button variant="link" className="h-auto p-0 text-xs font-bold" onClick={() => { setMode("signUp"); setError(null); }}>
                          ثبت‌نام (مالک / مستأجر)
                        </Button>
                      </>
                    ) : (
                      <>
                        قبلاً ثبت‌نام کرده‌اید؟{" "}
                        <Button variant="link" className="h-auto p-0 text-xs font-bold" onClick={() => { setMode("signIn"); setError(null); }}>
                          ورود
                        </Button>
                      </>
                    )}
                  </p>
                </>
              ) : (
                <>
                  {step === "signIn" ? (
                    <form onSubmit={handleEmailSubmit} className="space-y-3">
                      <div className="relative flex items-center gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            name="email"
                            placeholder="ایمیل خود را وارد کنید"
                            type="email"
                            dir="ltr"
                            className="pl-9 text-end"
                            disabled={isLoading}
                            required
                          />
                        </div>
                        <Button
                          type="submit"
                          variant="outline"
                          size="icon"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowLeft className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {error && (
                        <p className="text-sm text-destructive">{error}</p>
                      )}
                    </form>
                  ) : (
                    <form onSubmit={handleOtpSubmit} className="space-y-3">
                      <input type="hidden" name="email" value={step.email} />
                      <input type="hidden" name="code" value={otp} />
                      <p className="text-center text-xs text-muted-foreground">
                        کد تایید به <span dir="ltr">{step.email}</span> ارسال شد
                      </p>
                      <div className="flex justify-center">
                        <InputOTP
                          value={otp}
                          onChange={setOtp}
                          maxLength={6}
                          disabled={isLoading}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                              const form = (e.target as HTMLElement).closest("form");
                              if (form) form.requestSubmit();
                            }
                          }}
                        >
                          <InputOTPGroup>
                            {Array.from({ length: 6 }).map((_, index) => (
                              <InputOTPSlot key={index} index={index} />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      {error && (
                        <p className="text-center text-sm text-destructive">{error}</p>
                      )}
                      <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                        {isLoading ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            در حال بررسی...
                          </>
                        ) : (
                          <>
                            تایید کد
                            <ArrowLeft className="size-4" />
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={() => { setStep("signIn"); setOtp(""); setError(null); }}
                        disabled={isLoading}
                      >
                        استفاده از ایمیل دیگر
                      </Button>
                    </form>
                  )}
                </>
              )}
            </CardContent>

            <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-muted border-t rounded-b-lg">
              مجتمع تجاری اداری شهریار | سامانه مدیریت مجتمع
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}