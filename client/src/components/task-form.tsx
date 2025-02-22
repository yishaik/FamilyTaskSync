import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertTaskSchema, taskPriorities, recurrencePatterns, type User, type InsertTask } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { FormLayout, FormSection, FormGroup } from "@/components/ui/form-layout";

interface TaskFormProps {
  currentUser: User | null;
}

export function TaskForm({ currentUser }: TaskFormProps) {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const defaultValues: InsertTask = {
    title: "",
    description: "",
    priority: "medium",
    completed: false,
    assignedTo: currentUser?.id || null,
    dueDate: null,
    reminderTime: null,
    recurrencePattern: null,
    recurrenceEndDate: null,
    isRecurring: false
  };

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues
  });

  const isRecurring = form.watch("isRecurring");
  const isRTL = i18n.dir() === 'rtl';

  const { mutate: createTask, isPending } = useMutation({
    mutationFn: async (data: InsertTask) => {
      const formattedData = {
        ...data,
        dueDate: data.dueDate,
        reminderTime: data.reminderTime,
        recurrenceEndDate: data.recurrenceEndDate,
        assignedTo: data.assignedTo || null
      };
      const res = await apiRequest("POST", "/api/tasks", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      form.reset(defaultValues);
      toast({
        title: t('notifications.success.taskCreated.title'),
        description: t('notifications.success.taskCreated.description'),
      });
    }
  });

  return (
    <Form {...form}>
      <FormLayout onSubmit={form.handleSubmit((data) => createTask(data))} dir={i18n.dir()}>
        <FormSection>
          <FormGroup>
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
          </FormGroup>

          <FormGroup>
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
          </FormGroup>

          <FormGroup>
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
                    />
                  </FormControl>
                  <FormDescription>
                    {t('tasks.form.description.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormGroup>
        </FormSection>

        <FormSection>
          <FormGroup>
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tasks.form.priority.label')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
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
          </FormGroup>

          <FormGroup>
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tasks.form.dueDate.label')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-10 px-3 text-left font-normal bg-background",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>{t('tasks.form.dueDate.placeholder')}</span>
                          )}
                          <CalendarIcon className={`h-4 w-4 opacity-50 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align={isRTL ? "end" : "start"}>
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date?.toISOString() ?? null)}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    {t('tasks.form.dueDate.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormGroup>

          <FormGroup>
            <FormField
              control={form.control}
              name="reminderTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tasks.form.reminder.label')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-10 px-3 text-left font-normal bg-background",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), "PPP HH:mm")
                          ) : (
                            <span>{t('tasks.form.reminder.placeholder')}</span>
                          )}
                          <Bell className={`h-4 w-4 opacity-50 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align={isRTL ? "end" : "start"}>
                      <div className="space-y-4">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const currentValue = field.value ? new Date(field.value) : new Date();
                              date.setHours(currentValue.getHours());
                              date.setMinutes(currentValue.getMinutes());
                              field.onChange(date.toISOString());
                            } else {
                              field.onChange(null);
                            }
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                        <div className="flex items-center gap-2">
                          <FormLabel className="text-sm">{t('tasks.form.reminder.timeLabel')}</FormLabel>
                          <Input
                            type="time"
                            className="w-32"
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const date = field.value ? new Date(field.value) : new Date();
                              if (!isNaN(hours) && !isNaN(minutes)) {
                                date.setHours(hours);
                                date.setMinutes(minutes);
                                field.onChange(date.toISOString());
                              }
                            }}
                            value={field.value ? format(new Date(field.value), "HH:mm") : ""}
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    {t('tasks.form.reminder.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormGroup>
        </FormSection>

        <FormSection>
          <FormGroup>
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t('tasks.form.recurring.label')}
                    </FormLabel>
                    <FormDescription>
                      {t('tasks.form.recurring.description')}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </FormGroup>

          {isRecurring && (
            <>
              <FormGroup>
                <FormField
                  control={form.control}
                  name="recurrencePattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tasks.form.recurrencePattern.label')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('tasks.form.recurrencePattern.placeholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {recurrencePatterns.map(pattern => (
                            <SelectItem key={pattern} value={pattern}>
                              {t(`tasks.recurrencePattern.${pattern}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t('tasks.form.recurrencePattern.description')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>

              <FormGroup>
                <FormField
                  control={form.control}
                  name="recurrenceEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tasks.form.recurrenceEndDate.label')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-10 px-3 text-left font-normal bg-background",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
                              ) : (
                                <span>{t('tasks.form.recurrenceEndDate.placeholder')}</span>
                              )}
                              <CalendarIcon className={`h-4 w-4 opacity-50 ${isRTL ? 'mr-auto' : 'ml-auto'}`} />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align={isRTL ? "end" : "start"}>
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date?.toISOString() ?? null)}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        {t('tasks.form.recurrenceEndDate.description')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
            </>
          )}
        </FormSection>

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
      </FormLayout>
    </Form>
  );
}