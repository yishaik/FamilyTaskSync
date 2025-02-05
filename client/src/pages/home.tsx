import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";
import { Card } from "@/components/ui/card";
import TaskList from "@/components/task-list";
import TaskForm from "@/components/task-form";
import UserSwitcher from "@/components/user-switcher";
import { useState } from "react";

export default function Home() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { data: users } = useQuery<User[]>({ 
    queryKey: ["/api/users"]
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Family Tasks
          </h1>
          <UserSwitcher
            users={users || []}
            selected={selectedUser}
            onSelect={setSelectedUser}
          />
        </div>

        <Card className="p-6">
          <TaskForm currentUser={selectedUser} />
        </Card>

        <TaskList currentUser={selectedUser} />
      </div>
    </div>
  );
}
