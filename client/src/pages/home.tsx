import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { TaskList } from "@/components/task-list";
import { TaskForm } from "@/components/task-form";
import { UserSwitcher } from "@/components/user-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function Home() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { data: users } = useQuery<User[]>({ 
    queryKey: ["/api/users"]
  });
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 p-3 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background/80 backdrop-blur-sm p-4 rounded-lg shadow-sm border border-border/40">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {t('app.title')}
          </h1>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <NotificationBell currentUser={selectedUser} />
            <UserSwitcher
              users={users || []}
              selected={selectedUser}
              onSelect={setSelectedUser}
            />
          </div>
        </div>

        <Card className="p-4 md:p-6 shadow-md border-border/40">
          <TaskForm currentUser={selectedUser} />
        </Card>

        <TaskList currentUser={selectedUser} />
      </div>
    </div>
  );
}