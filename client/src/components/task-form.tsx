import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertTaskSchema, taskPriorities, type User, type InsertTask } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, Bell } from "lucide-react";

interface TaskFormProps {
  currentUser: User | null;
}

export function TaskForm({ currentUser }: TaskFormProps) {
  const { toast } = useToast();
  const { data: users = [] } = useQuery<User[]>({ 
    queryKey: ["/api/users"]
  });

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      completed: false,
      assignedTo: currentUser?.id || null,
      dueDate: "",
      reminderTime: ""
    }
  });

  const { mutate: createTask, isPending } = useMutation({
    mutationFn: async (data: InsertTask) => {
      const formattedData = {
        ...data,
        dueDate: data.dueDate ? data.dueDate : null,
        reminderTime: data.reminderTime ? data.reminderTime : null,
        assignedTo: data.assignedTo || null
      };
      const res = await apiRequest("POST", "/api/tasks", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      form.reset({
        ...form.formState.defaultValues,
        assignedTo: currentUser?.id || null
      });
      toast({
        title: "Task created",
        description: "Your task has been added to the list.",
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => createTask(data))} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task Title</FormLabel>
                <FormControl>
                  <Input placeholder="What needs to be done?" {...field} />
                </FormControl>
                <FormDescription>
                  Enter a clear, descriptive title for the task
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assignedTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign To</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                  value={field.value?.toString() ?? "unassigned"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select family member" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose who should complete this task
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add some details about what needs to be done..." 
                  className="min-h-[100px]"
                  {...field} 
                  value={field.value || ''} 
                />
              </FormControl>
              <FormDescription>
                Include any additional details that would help complete the task
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-3">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority Level</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {taskPriorities.map(priority => (
                      <SelectItem key={priority} value={priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Set the importance level of this task
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field}
                      value={field.value || ''}
                      className="pl-10"
                    />
                  </FormControl>
                  <CalendarIcon className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                </div>
                <FormDescription>
                  When does this task need to be completed?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reminderTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Set Reminder</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      {...field}
                      value={field.value || ''}
                      className="pl-10"
                    />
                  </FormControl>
                  <Bell className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                </div>
                <FormDescription>
                  When should we remind you about this task?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button 
          type="submit" 
          disabled={isPending} 
          className="w-full"
        >
          {isPending ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Creating Task...
            </>
          ) : (
            'Create Task'
          )}
        </Button>
      </form>
    </Form>
  );
}