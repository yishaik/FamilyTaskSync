import { useQuery, useMutation } from "@tanstack/react-query";
import { type Task, type User } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
    return <div>Loading tasks...</div>;
  }

  const priorityColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800"
  };

  return (
    <div className="space-y-4">
      {filteredTasks?.map(task => (
        <Card key={task.id} className="p-4">
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
                  {task.priority}
                </Badge>
                {task.dueDate && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(task.dueDate), 'MMM d')}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteTask(task.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}

      {(!filteredTasks || filteredTasks.length === 0) && (
        <Card className="p-8 flex flex-col items-center text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mb-4" />
          <h3 className="font-medium text-lg">No tasks found</h3>
          <p>Create a new task to get started!</p>
        </Card>
      )}
    </div>
  );
}