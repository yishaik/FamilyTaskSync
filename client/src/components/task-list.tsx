import { useQuery, useMutation } from "@tanstack/react-query";
import { type Task, type User } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle, Clock, Calendar, Bell, User as UserIcon, RepeatIcon } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { SwipeAction } from "@/components/ui/swipe-action";
import { Check, X } from "lucide-react";

interface TaskListProps {
  currentUser: User | null;
}

export function TaskList({ currentUser }: TaskListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const timeZone = 'Asia/Jerusalem';

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
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
      const res = await apiRequest("DELETE", `/api/tasks/${taskId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete task");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: t('tasks.toast.deleteSuccess'),
        description: t('tasks.toast.deleteSuccessDescription'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('tasks.toast.deleteError'),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Organize tasks by assignee
  const organizedTasks = tasks.reduce((acc: Record<string, Array<Task & { nextOccurrence?: Task }>>, task) => {
    // Only include tasks for current user if specified
    if (currentUser && task.assignedTo !== currentUser.id) {
      return acc;
    }

    // Skip child tasks of recurring tasks
    if (task.parentTaskId) {
      return acc;
    }

    const assignedUser = task.assignedTo ? users.find(u => u.id === task.assignedTo) : null;
    const bucketKey = assignedUser ? assignedUser.id.toString() : 'unassigned';

    if (!acc[bucketKey]) {
      acc[bucketKey] = [];
    }

    // If it's a recurring task, find its next occurrence
    if (task.isRecurring) {
      const futureInstances = tasks
        .filter(t => t.parentTaskId === task.id && t.dueDate && new Date(t.dueDate) >= new Date())
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

      if (futureInstances.length > 0) {
        acc[bucketKey].push({ ...task, nextOccurrence: futureInstances[0] });
      } else {
        acc[bucketKey].push(task);
      }
    } else {
      acc[bucketKey].push(task);
    }

    return acc;
  }, {});

  const getAssignedUser = (userId: number | null) => {
    if (!userId) return null;
    return users.find(user => user.id === userId);
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
    low: "bg-green-100 text-green-800 border-green-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    high: "bg-red-100 text-red-800 border-red-200"
  };
  
  const priorityIndicators = {
    low: "bg-green-500",
    medium: "bg-yellow-500",
    high: "bg-red-500"
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

  const renderTaskCard = (task: Task, isNextOccurrence = false) => {
    const status = getTaskStatus(task);
    const assignedUser = getAssignedUser(task.assignedTo);
    const zonedDueDate = task.dueDate ? toZonedTime(new Date(task.dueDate), timeZone) : null;
    const zonedReminderTime = task.reminderTime ? toZonedTime(new Date(task.reminderTime), timeZone) : null;

    const cardContent = (
      <Card
        key={task.id}
        className={cn(
          "transition-all relative overflow-hidden group",
          task.completed ? "bg-gray-50/80" : "hover:bg-primary/5",
          isNextOccurrence && "border-l-4 border-l-blue-500"
        )}
      >
        {/* Priority indicator */}
        <div 
          className={cn(
            "absolute top-0 left-0 w-1 h-full",
            priorityIndicators[task.priority as keyof typeof priorityIndicators]
          )}
        />
        
        <div className="p-4 pl-5">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => toggleComplete(task)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                <h3 className={cn(
                  "font-medium text-base transition-colors", 
                  task.completed ? 'line-through text-muted-foreground' : ''
                )}>
                  {task.title}
                  {task.isRecurring && !isNextOccurrence && (
                    <RepeatIcon className="h-4 w-4 text-blue-500 inline-block ml-1 mb-0.5" />
                  )}
                </h3>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn(
                    "border py-0 px-2 h-5 text-xs", 
                    priorityColors[task.priority as keyof typeof priorityColors]
                  )}>
                    {t(`tasks.priority.${task.priority}`)}
                  </Badge>

                  {status && (
                    <Badge variant="outline" className={cn("border py-0 px-2 h-5 text-xs", status.color)}>
                      {status.text}
                    </Badge>
                  )}
                </div>
              </div>
              
              {task.description && (
                <p className="text-sm text-muted-foreground my-2 line-clamp-2 group-hover:line-clamp-none transition-all">
                  {task.description}
                </p>
              )}
              
              <div className="flex flex-wrap gap-1.5 mt-3 text-xs">
                {task.isRecurring && task.recurrencePattern && !isNextOccurrence && (
                  <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    <RepeatIcon className="h-3 w-3" />
                    {t(`tasks.recurrencePattern.${task.recurrencePattern}`)}
                  </div>
                )}

                {zonedDueDate && (
                  <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full ltr-text">
                    <Calendar className="h-3 w-3" />
                    {formatTz(zonedDueDate, 'MMM d', { timeZone })}
                  </div>
                )}

                {zonedReminderTime && (
                  <div className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full ltr-text">
                    <Bell className="h-3 w-3" />
                    {formatTz(zonedReminderTime, 'MMM d, h:mm a', { timeZone })}
                  </div>
                )}
                
                {assignedUser && (
                  <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    <UserIcon className="h-3 w-3" />
                    {assignedUser.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );

    // Only add swipe actions to non-recurring tasks
    if (isNextOccurrence) {
      return cardContent;
    }

    return (
      <SwipeAction
        key={task.id}
        onSwipeLeft={() => deleteTask(task.id)}
        onSwipeRight={() => toggleComplete(task)}
        leftAction={
          <div className="flex items-center">
            <X className="h-5 w-5" />
            <span className="ml-2">{t('tasks.actions.delete')}</span>
          </div>
        }
        rightAction={
          <div className="flex items-center">
            <Check className="h-5 w-5" />
            <span className="mr-2">{t('tasks.actions.toggleComplete')}</span>
          </div>
        }
      >
        {cardContent}
      </SwipeAction>
    );
  };

  const allBuckets = Object.entries(organizedTasks);
  const hasAnyTasks = allBuckets.length > 0 && allBuckets.some(([_, tasks]) => tasks.length > 0);

  if (!hasAnyTasks) {
    return (
      <Card className="p-8 flex flex-col items-center text-center">
        <div className="bg-primary/5 rounded-full p-6 mb-4">
          <AlertCircle className="h-14 w-14 text-primary" />
        </div>
        <h3 className="font-semibold text-xl mb-2">{t('app.noTasks.title')}</h3>
        <p className="text-muted-foreground max-w-md">
          {currentUser ? t('app.noTasks.userDescription', { name: currentUser.name }) : t('app.noTasks.description')}
        </p>
        <div className="mt-6 mb-2 flex flex-col items-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 mb-2">
            <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
          </div>
          <p className="text-sm font-medium text-primary">{t('app.noTasks.cta')}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {allBuckets.map(([userId, tasks]) => {
        const user = userId === 'unassigned' ? null : getAssignedUser(parseInt(userId));

        return (
          <div key={userId} className="w-full md:min-w-[300px]">
            <div className="flex items-center gap-2 mb-4 p-2 bg-background rounded-lg shadow-sm">
              {user ? (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback style={{ backgroundColor: user.color, color: 'white' }}>
                      {user.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold">{user.name}'s Tasks</h2>
                </>
              ) : (
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <UserIcon className="h-6 w-6" />
                  {t('tasks.status.unassigned')}
                </h2>
              )}
            </div>

            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="space-y-4">
                  {renderTaskCard(task)}
                  {'nextOccurrence' in task && task.nextOccurrence && (
                    renderTaskCard(task.nextOccurrence, true)
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}