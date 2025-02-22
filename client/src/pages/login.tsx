import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const formatPhoneNumber = (phone: string) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Add + if it's not there
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

export default function LoginPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<'phone' | 'setup' | 'verify'>('phone');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [qrCode, setQrCode] = useState<string>("");
  const [secretKey, setSecretKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const res = await apiRequest('POST', '/api/auth/phone', { phoneNumber: formattedPhone });
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
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : t('auth.login.errors.userNotFound')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await apiRequest('POST', '/api/auth/verify', {
        phoneNumber: formatPhoneNumber(phoneNumber),
        code: otpCode
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || t('auth.login.errors.invalidCode'));
      }

      setLocation('/');
    } catch (error) {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : t('auth.login.errors.invalidCode')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = async () => {
    setStep('verify');
  };

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
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                {t('auth.login.phoneNumber.description')}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
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
              disabled={isLoading}
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

            <div className="space-y-2">
              <Label htmlFor="otp">
                {t('auth.login.verifyOTP.label')}
              </Label>
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                disabled={isLoading}
                render={({ slots }) => (
                  <InputOTPGroup>
                    {slots.map((slot, index) => (
                      <InputOTPSlot key={index} {...slot} index={index} />
                    ))}
                  </InputOTPGroup>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? t('common.loading')
                : t('auth.login.buttons.verify')}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}