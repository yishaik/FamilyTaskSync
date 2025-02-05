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
import { useTranslation } from "react-i18next";
import { toZonedTime } from 'date-fns-tz';

interface TaskFormProps {
  currentUser: User | null;
}

export function TaskForm({ currentUser }: TaskFormProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
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
        dueDate: data.dueDate ? toZonedTime(new Date(data.dueDate), 'Asia/Jerusalem').toISOString() : null,
        reminderTime: data.reminderTime ? toZonedTime(new Date(data.reminderTime), 'Asia/Jerusalem').toISOString() : null,
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
        title: t('notifications.success.taskCreated.title'),
        description: t('notifications.success.taskCreated.description'),
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
                <FormLabel>{t('tasks.form.title.label')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('tasks.form.title.placeholder')} {...field} />
                </FormControl>
                <FormDescription>
                  {t('tasks.form.title.description')}
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
                <FormLabel>{t('tasks.form.assignTo.label')}</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                  value={field.value?.toString() ?? "unassigned"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('tasks.form.assignTo.placeholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="unassigned">{t('tasks.form.assignTo.unassigned')}</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t('tasks.form.assignTo.description')}
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
              <FormLabel>{t('tasks.form.description.label')}</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder={t('tasks.form.description.placeholder')}
                  className="min-h-[100px]"
                  {...field} 
                  value={field.value || ''} 
                />
              </FormControl>
              <FormDescription>
                {t('tasks.form.description.description')}
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
                <FormLabel>{t('tasks.form.priority.label')}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('tasks.form.priority.placeholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {taskPriorities.map(priority => (
                      <SelectItem key={priority} value={priority}>
                        {t(`tasks.priority.${priority}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t('tasks.form.priority.description')}
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
                <FormLabel>{t('tasks.form.dueDate.label')}</FormLabel>
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
                  {t('tasks.form.dueDate.description')}
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
                <FormLabel>{t('tasks.form.reminder.label')}</FormLabel>
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
                  {t('tasks.form.reminder.description')}
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
              {t('tasks.form.submit.loading')}
            </>
          ) : (
            t('tasks.form.submit.default')
          )}
        </Button>
      </form>
    </Form>
  );
}