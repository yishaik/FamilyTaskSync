import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

export default function LoginPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  const [step, setStep] = useState<'phone' | 'setup' | 'verify'>('phone');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [qrCode, setQrCode] = useState<string>("");
  const [secretKey, setSecretKey] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      console.log("User is authenticated, redirecting to home:", user);
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast({
        variant: "destructive",
        description: t('auth.login.errors.invalidCode')
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log("Submitting verification:", { phoneNumber: formattedPhone, code: otpCode });

      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          code: otpCode
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || t('auth.login.errors.invalidCode'));
      }

      console.log("Verification successful:", data);

      // Clear all queries and force refetch auth status
      await queryClient.clear();
      await queryClient.resetQueries();

      // Add a small delay to ensure session is saved
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force a refetch of auth status
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] });

      // Redirect will be handled by the useEffect hook after auth state updates
    } catch (error) {
      console.error("Verification error:", error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : t('auth.login.errors.invalidCode')
      });
      setOtpCode('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log("Submitting phone number:", formattedPhone);

      const res = await fetch('/api/auth/phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ phoneNumber: formattedPhone })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || t('auth.login.errors.userNotFound'));
      }

      if (data.requiresSetup) {
        setQrCode(data.qrCode);
        setSecretKey(data.secret);
        setStep('setup');
      } else {
        setStep('verify');
      }
    } catch (error) {
      console.error("Phone submission error:", error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : t('auth.login.errors.userNotFound')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetupComplete = () => {
    setStep('verify');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                {t('auth.login.title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('auth.login.description')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                {t('auth.login.phoneNumber.label')}
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t('auth.login.phoneNumber.placeholder')}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">
                {t('auth.login.phoneNumber.description')}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? t('common.loading')
                : t('auth.login.buttons.continue')}
            </Button>
          </form>
        )}

        {step === 'setup' && (
          <div className="space-y-4">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                {t('auth.login.setupQR.title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('auth.login.setupQR.description')}
              </p>
            </div>

            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code" className="w-48 h-48" />
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('auth.login.setupQR.manual')}
              </p>
              <code className="bg-muted px-2 py-1 rounded text-sm">
                {secretKey}
              </code>
            </div>

            <Button
              onClick={handleSetupComplete}
              className="w-full"
              disabled={isSubmitting}
            >
              {t('auth.login.setupQR.continueButton')}
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                {t('auth.login.verifyOTP.title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('auth.login.verifyOTP.description')}
              </p>
            </div>

            <div className="space-y-4">
              <Label htmlFor="otp">
                {t('auth.login.verifyOTP.label')}
              </Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={(value) => setOtpCode(value)}
                  disabled={isSubmitting}
                  id="otp"
                  placeholder="○"
                  pattern="\d*"
                  type="tel"
                  render={({ slots }) => (
                    <InputOTPGroup>
                      {slots.map((slot, idx) => (
                        <InputOTPSlot
                          key={idx}
                          {...slot}
                          index={idx}
                        />
                      ))}
                    </InputOTPGroup>
                  )}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-6"
              disabled={isSubmitting || otpCode.length !== 6}
            >
              {isSubmitting
                ? t('common.loading')
                : t('auth.login.buttons.verify')}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}