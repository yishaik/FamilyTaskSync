import { useQuery, useMutation } from "@tanstack/react-query";
import { type Task, type User } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle, Clock, Calendar, Bell } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface TaskListProps {
  currentUser: User | null;
}

export function TaskList({ currentUser }: TaskListProps) {
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"]
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

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading tasks...</p>
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
    if (task.completed) return { color: "bg-gray-100 text-gray-800", text: "Completed" };
    if (task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))) {
      return { color: "bg-red-100 text-red-800", text: "Overdue" };
    }
    if (task.dueDate && isToday(new Date(task.dueDate))) {
      return { color: "bg-orange-100 text-orange-800", text: "Due Today" };
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {filteredTasks?.map(task => {
        const status = getTaskStatus(task);

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
                <h3 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {task.description}
                  </p>
                )}
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className={priorityColors[task.priority as keyof typeof priorityColors]}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                  </Badge>

                  {status && (
                    <Badge variant="outline" className={status.color}>
                      {status.text}
                    </Badge>
                  )}

                  {task.dueDate && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due {format(new Date(task.dueDate), 'MMM d')}
                    </Badge>
                  )}

                  {task.reminderTime && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Bell className="h-3 w-3" />
                      Reminder: {format(new Date(task.reminderTime), 'MMM d, h:mm a')}
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
          <h3 className="font-medium text-lg">No tasks found</h3>
          <p>{currentUser ? `${currentUser.name} has no tasks yet.` : "No tasks have been created yet."}</p>
          <p className="text-sm mt-2">Create a new task to get started!</p>
        </Card>
      )}
    </div>
  );
}