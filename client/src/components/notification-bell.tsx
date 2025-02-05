import { useQuery } from "@tanstack/react-query";
import { type Notification, type User } from "@shared/schema";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface NotificationBellProps {
  currentUser: User | null;
}

export function NotificationBell({ currentUser }: NotificationBellProps) {
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", currentUser?.id],
    enabled: !!currentUser,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: number) => {
    await apiRequest("POST", `/api/notifications/${id}/read`);
    queryClient.invalidateQueries({ 
      queryKey: ["/api/notifications", currentUser?.id] 
    });
  };

  if (!currentUser) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <ScrollArea className="h-80">
          <div className="p-4 space-y-4">
            <h4 className="font-medium leading-none mb-4">Notifications</h4>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No notifications
              </p>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    !notification.read
                      ? "bg-primary/5 hover:bg-primary/10"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                  </p>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}