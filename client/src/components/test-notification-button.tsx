import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      const data = await response.json();

      if (data.success) {
        toast({
          title: t('notifications.test.success'),
          description: t('notifications.test.sent', { name: userName }),
        });
      } else {
        throw new Error(data.message || 'Failed to send notification');
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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={sendTestNotification}
          disabled={isSending}
          className="h-9 w-9 p-0"
        >
          <Bell className={`h-4 w-4 ${isSending ? 'animate-pulse' : ''}`} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('notifications.test.send')}</p>
      </TooltipContent>
    </Tooltip>
  );
}