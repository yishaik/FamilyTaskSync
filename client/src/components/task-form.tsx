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
import { Calendar as CalendarIcon, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { FormLayout, FormSection, FormGroup } from "@/components/ui/form-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TaskFormProps {
  currentUser: User | null;
}

export function TaskForm({ currentUser }: TaskFormProps) {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
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
        <div className="mb-6">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
            {t('tasks.form.createTask')}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t('tasks.form.createTaskDescription')}
          </p>
        </div>
        
        <FormSection>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormGroup className="md:col-span-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      {t('tasks.form.title.label')} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('tasks.form.title.placeholder')} 
                        className="h-12 text-base" 
                        {...field} 
                      />
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
                    <FormLabel className="text-base">
                      {t('tasks.form.assignTo.label')}
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      value={field.value?.toString() ?? "unassigned"}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 text-base">
                          <SelectValue placeholder={t('tasks.form.assignTo.placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">{t('tasks.form.assignTo.unassigned')}</SelectItem>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback style={{ backgroundColor: user.color || '#4f46e5', color: 'white' }}>
                                  {user.name?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              {user.name}
                            </div>
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">{t('tasks.form.priority.label')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 text-base">
                          <SelectValue placeholder={t('tasks.form.priority.placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {taskPriorities.map(priority => (
                          <SelectItem key={priority} value={priority}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${
                                priority === 'low' ? 'bg-green-500' : 
                                priority === 'medium' ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}></div>
                              {t(`tasks.priority.${priority}`)}
                            </div>
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
            
            <FormGroup className="md:col-span-2">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">{t('tasks.form.description.label')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('tasks.form.description.placeholder')}
                        className="min-h-[100px] text-base"
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
          </div>
        </FormSection>

        <FormSection>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormGroup>
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">{t('tasks.form.dueDate.label')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-12 px-3 text-left font-normal bg-background",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value as string), "PPP")
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
                          selected={field.value ? new Date(field.value as string) : undefined}
                          onSelect={(date) => field.onChange(date?.toISOString() ?? null)}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
                    <FormLabel className="text-base">{t('tasks.form.reminder.label')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-12 px-3 text-left font-normal bg-background",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value as string), "PPP HH:mm")
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
                            selected={field.value ? new Date(field.value as string) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const currentValue = field.value ? new Date(field.value as string) : new Date();
                                date.setHours(currentValue.getHours());
                                date.setMinutes(currentValue.getMinutes());
                                field.onChange(date.toISOString());
                              } else {
                                field.onChange(null);
                              }
                            }}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                          <div className="flex items-center gap-2">
                            <FormLabel className="text-sm">{t('tasks.form.reminder.timeLabel')}</FormLabel>
                            <Input
                              type="time"
                              className="w-32"
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                const date = field.value ? new Date(field.value as string) : new Date();
                                if (!isNaN(hours) && !isNaN(minutes)) {
                                  date.setHours(hours);
                                  date.setMinutes(minutes);
                                  field.onChange(date.toISOString());
                                }
                              }}
                              value={field.value ? format(new Date(field.value as string), "HH:mm") : ""}
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
          </div>
        </FormSection>

        <FormSection>
          <div className="grid grid-cols-1 gap-6">
            <FormGroup>
              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/50">
                    <FormControl>
                      <Checkbox
                        checked={field.value as boolean}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-base">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-l-2 border-primary/30 pl-4 ml-2">
                <FormGroup>
                  <FormField
                    control={form.control}
                    name="recurrencePattern"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">{t('tasks.form.recurrencePattern.label')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value as string}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12">
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
                        <FormLabel className="text-base">{t('tasks.form.recurrenceEndDate.label')}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full h-12 px-3 text-left font-normal bg-background",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value as string), "PPP")
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
                              selected={field.value ? new Date(field.value as string) : undefined}
                              onSelect={(date) => field.onChange(date?.toISOString() ?? null)}
                              disabled={(date) => {
                                const dueDate = form.getValues("dueDate");
                                return date < (dueDate ? new Date(dueDate as string) : new Date());
                              }}
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
              </div>
            )}
          </div>
        </FormSection>

        <div className="mt-8 flex items-center justify-end space-x-4">
          <Button variant="outline" onClick={() => form.reset()} type="button" disabled={isPending}>
            {t('common.reset')}
          </Button>
          <Button type="submit" disabled={isPending} className="px-8">
            {isPending ? t('common.creating') : t('common.create')}
          </Button>
        </div>
      </FormLayout>
    </Form>
  );
}