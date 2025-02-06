import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

interface TestNotificationButtonProps {
  userId: number;
  userName: string;
}

export function TestNotificationButton({ userId, userName }: TestNotificationButtonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const sendTestNotification = async () => {
    setIsSending(true);
    try {
      const response = await apiRequest(
        "POST",
        `/api/notifications/test/${userId}`
      );
      
      if (response.success) {
        toast({
          title: t('notifications.test.success'),
          description: t('notifications.test.sent', { name: userName }),
        });
      } else {
        throw new Error(response.message || 'Failed to send notification');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('notifications.test.error'),
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={sendTestNotification}
      disabled={isSending}
      className="ml-2"
    >
      <Bell className="h-4 w-4 mr-1" />
      {isSending ? t('notifications.test.sending') : t('notifications.test.send')}
    </Button>
  );
}
