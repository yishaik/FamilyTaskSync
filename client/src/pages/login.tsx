import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, PhoneCall, KeyRound, LockKeyhole, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

const slideVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
};

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const isRTL = i18n.dir() === 'rtl';

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

  const getStepProgress = () => {
    switch (step) {
      case 'phone':
        return 33;
      case 'setup':
        return 66;
      case 'verify':
        return 100;
      default:
        return 0;
    }
  };

  const goBack = () => {
    if (step === 'verify') {
      setStep('phone');
    } else if (step === 'setup') {
      setStep('phone');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-center text-muted-foreground animate-pulse">
          {t('common.loading')}...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/40">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {t('app.title')}
          </h1>
          <div className="mt-4 mb-6">
            <Progress value={getStepProgress()} className="h-1.5 w-full" />
          </div>
        </div>

        <Card className="w-full border shadow-lg">
          <CardHeader>
            {step !== 'phone' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="absolute left-2 top-2 h-8 w-8"
                type="button"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">{t('common.back')}</span>
              </Button>
            )}
            
            <div className="flex justify-center mb-2">
              {step === 'phone' && (
                <div className="bg-primary/10 p-3 rounded-full">
                  <PhoneCall className="h-6 w-6 text-primary" />
                </div>
              )}
              {step === 'setup' && (
                <div className="bg-primary/10 p-3 rounded-full">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
              )}
              {step === 'verify' && (
                <div className="bg-primary/10 p-3 rounded-full">
                  <LockKeyhole className="h-6 w-6 text-primary" />
                </div>
              )}
            </div>
            
            <CardTitle className="text-xl text-center">
              {step === 'phone' && t('auth.login.title')}
              {step === 'setup' && t('auth.login.setupQR.title')}
              {step === 'verify' && t('auth.login.verifyOTP.title')}
            </CardTitle>
            
            <CardDescription className="text-center">
              {step === 'phone' && t('auth.login.description')}
              {step === 'setup' && t('auth.login.setupQR.description')}
              {step === 'verify' && t('auth.login.verifyOTP.description')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={slideVariants}
              >
                {step === 'phone' && (
                  <form onSubmit={handlePhoneSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-base">
                        {t('auth.login.phoneNumber.label')}
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={t('auth.login.phoneNumber.placeholder')}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={isSubmitting}
                        className="h-12 text-base"
                        dir="ltr"
                      />
                      <p className="text-sm text-muted-foreground">
                        {t('auth.login.phoneNumber.description')}
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 mt-4"
                      disabled={isSubmitting || !phoneNumber.trim()}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('common.loading')}
                        </>
                      ) : (
                        t('auth.login.buttons.continue')
                      )}
                    </Button>
                  </form>
                )}

                {step === 'setup' && (
                  <div className="space-y-6">
                    <div className="flex justify-center bg-muted/50 p-4 rounded-xl">
                      <img 
                        src={qrCode} 
                        alt="QR Code" 
                        className="w-56 h-56 border border-border rounded-md bg-white"
                      />
                    </div>

                    <div className="text-center space-y-2 bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm font-medium">
                        {t('auth.login.setupQR.manual')}
                      </p>
                      <code className="bg-background px-3 py-1.5 rounded text-sm inline-block w-full overflow-x-auto max-w-full">
                        {secretKey}
                      </code>
                    </div>
                    
                    <Button
                      onClick={handleSetupComplete}
                      className="w-full h-12"
                      disabled={isSubmitting}
                    >
                      {t('auth.login.setupQR.continueButton')}
                    </Button>
                  </div>
                )}

                {step === 'verify' && (
                  <form onSubmit={handleVerifySubmit} className="space-y-6">
                    <div className="space-y-4">
                      <Label htmlFor="otp" className="text-base">
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
                                  className="w-12 h-12 text-lg"
                                />
                              ))}
                            </InputOTPGroup>
                          )}
                        />
                      </div>
                      
                      <p className="text-sm text-center text-muted-foreground pt-2">
                        {t('auth.login.verifyOTP.placeholder')}
                      </p>
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full h-12"
                      disabled={isSubmitting || otpCode.length !== 6}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('common.loading')}
                        </>
                      ) : (
                        <>
                          {otpCode.length === 6 && <CheckCircle2 className="mr-2 h-4 w-4" />}
                          {t('auth.login.buttons.verify')}
                        </>
                      )}
                    </Button>
                    
                    <div className="text-center">
                      <Button
                        variant="link"
                        type="button"
                        onClick={() => setStep('phone')}
                        className="text-sm mt-2"
                      >
                        {t('auth.login.buttons.retry')}
                      </Button>
                    </div>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
          
          <CardFooter className="flex justify-center border-t pt-4 text-sm text-muted-foreground">
            <p>{t('auth.login.securityNote')}</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}