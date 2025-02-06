import { useQuery } from "@tanstack/react-query";
import { type Notification } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export function RemindersLog() {
  const { t } = useTranslation();
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications/log"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-500";
      case "sent":
        return "bg-blue-500";
      case "pending":
        return "bg-yellow-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">{t('reminders.log.title')}</h2>
      <ScrollArea className="h-[600px] rounded-md border">
        <Table>
          <TableCaption>{t('reminders.log.caption')}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{t('reminders.log.time')}</TableHead>
              <TableHead>{t('reminders.log.message')}</TableHead>
              <TableHead>{t('reminders.log.status')}</TableHead>
              <TableHead>{t('reminders.log.attempts')}</TableHead>
              <TableHead>{t('reminders.log.error')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.map((notification) => (
              <TableRow key={notification.id}>
                <TableCell>
                  {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                </TableCell>
                <TableCell>{notification.message}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(notification.deliveryStatus)}>
                    {notification.deliveryStatus}
                  </Badge>
                </TableCell>
                <TableCell>{notification.deliveryAttempts}</TableCell>
                <TableCell className="text-red-500">
                  {notification.deliveryError || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
