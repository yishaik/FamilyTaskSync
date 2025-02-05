import { useQuery, useMutation } from "@tanstack/react-query";
import { type Task, type User } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle, Clock, Calendar, Bell, User as UserIcon } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";

interface TaskListProps {
  currentUser: User | null;
}

export function TaskList({ currentUser }: TaskListProps) {
  const { t } = useTranslation();
  const timeZone = 'Asia/Jerusalem';

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"]
  });

  const { data: users = [] } = useQuery<User[]>({ 
    queryKey: ["/api/users"]
  });

  const { mutate: toggleComplete } = useMutation({
    mutationFn: async (task: Task) => {
      const res = await apiRequest(
        "PATCH",
        `/api/tasks/${task.id}`,
        { completed: !task.completed }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    }
  });

  const { mutate: deleteTask } = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    }
  });

  const filteredTasks = tasks?.filter(task =>
    !currentUser || task.assignedTo === currentUser.id
  );

  const getAssignedUser = (taskId: number | null) => {
    if (!taskId) return null;
    return users.find(user => user.id === taskId);
  };

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>{t('app.loading')}</p>
        </div>
      </Card>
    );
  }

  const priorityColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800"
  };

  const getTaskStatus = (task: Task) => {
    const zonedDate = task.dueDate ? toZonedTime(new Date(task.dueDate), timeZone) : null;

    if (task.completed) return { color: "bg-gray-100 text-gray-800", text: t('tasks.status.completed') };
    if (zonedDate && isPast(zonedDate) && !isToday(zonedDate)) {
      return { color: "bg-red-100 text-red-800", text: t('tasks.status.overdue') };
    }
    if (zonedDate && isToday(zonedDate)) {
      return { color: "bg-orange-100 text-orange-800", text: t('tasks.status.dueToday') };
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {filteredTasks?.map(task => {
        const status = getTaskStatus(task);
        const assignedUser = getAssignedUser(task.assignedTo);
        const zonedDueDate = task.dueDate ? toZonedTime(new Date(task.dueDate), timeZone) : null;
        const zonedReminderTime = task.reminderTime ? toZonedTime(new Date(task.reminderTime), timeZone) : null;

        return (
          <Card key={task.id} className={cn(
            "p-4 transition-colors",
            task.completed ? "bg-gray-50" : "hover:bg-primary/5"
          )}>
            <div className="flex items-start gap-4">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleComplete(task)}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </h3>
                  {assignedUser && (
                    <Avatar className="h-6 w-6">
                      <AvatarFallback style={{ backgroundColor: assignedUser.color, color: 'white' }}>
                        {assignedUser.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {task.description}
                  </p>
                )}
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className={priorityColors[task.priority as keyof typeof priorityColors]}>
                    {t(`tasks.priority.${task.priority}`)}
                  </Badge>

                  {status && (
                    <Badge variant="outline" className={status.color}>
                      {status.text}
                    </Badge>
                  )}

                  {zonedDueDate && (
                    <Badge variant="outline" className="flex items-center gap-1 ltr-text">
                      <Calendar className="h-3 w-3" />
                      Due {formatTz(zonedDueDate, 'MMM d', { timeZone })}
                    </Badge>
                  )}

                  {zonedReminderTime && (
                    <Badge variant="outline" className="flex items-center gap-1 ltr-text">
                      <Bell className="h-3 w-3" />
                      Reminder: {formatTz(zonedReminderTime, 'MMM d, h:mm a', { timeZone })}
                    </Badge>
                  )}

                  {!assignedUser && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      {t('tasks.status.unassigned')}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteTask(task.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        );
      })}

      {(!filteredTasks || filteredTasks.length === 0) && (
        <Card className="p-8 flex flex-col items-center text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mb-4" />
          <h3 className="font-medium text-lg">{t('app.noTasks.title')}</h3>
          <p>{currentUser ? t('app.noTasks.userDescription', { name: currentUser.name }) : t('app.noTasks.description')}</p>
          <p className="text-sm mt-2">{t('app.noTasks.cta')}</p>
        </Card>
      )}
    </div>
  );
}