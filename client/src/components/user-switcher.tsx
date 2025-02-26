import { useState } from "react";
import { type User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCog, Pencil, Phone, Users } from "lucide-react";
import { SiWhatsapp } from 'react-icons/si';
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TestNotificationButton } from "./test-notification-button";

interface UserSwitcherProps {
  users: User[];
  selected: User | null;
  onSelect: (user: User | null) => void;
}

export function UserSwitcher({ users, selected, onSelect }: UserSwitcherProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editNotificationPreference, setEditNotificationPreference] = useState<"sms" | "whatsapp">("sms");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { mutate: updateUser, isPending } = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<User> }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, updates);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update user');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingId(null);
      setDialogOpen(false);
      toast({
        description: t('users.updated', { name: data.name })
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        description: error.message
      });
    }
  });

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditName(user.name);
    setEditPhoneNumber(user.phoneNumber || "");
    setEditNotificationPreference(user.notificationPreference as "sms" | "whatsapp");
    setDialogOpen(true);
  };

  const handleSave = (id: number) => {
    if (editName.trim()) {
      updateUser({
        id,
        updates: {
          name: editName.trim(),
          phoneNumber: editPhoneNumber.trim() || null,
          notificationPreference: editNotificationPreference
        }
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditName("");
    setEditPhoneNumber("");
    setEditNotificationPreference("sms");
    setDialogOpen(false);
  };


  return (
    <div className="relative">
      <Button 
        variant="outline" 
        className="flex items-center gap-2 w-full sm:w-auto border border-border/40 shadow-sm"
        onClick={() => setDialogOpen(true)}
      >
        {selected ? (
          <>
            <Avatar className="h-5 w-5">
              <AvatarFallback style={{ backgroundColor: selected.color, color: 'white' }}>
                {selected.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[100px]">{selected.name}</span>
          </>
        ) : (
          <>
            <Users className="h-5 w-5" />
            <span>{t('common.everyone')}</span>
          </>
        )}
        <UserCog className="h-4 w-4 ml-1 opacity-60" />
      </Button>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {editingId ? (
          // Edit user dialog
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('users.edit')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('users.name')}</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t('users.namePlaceholder')}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('users.phoneNumber')}</Label>
                <Input
                  value={editPhoneNumber}
                  onChange={(e) => setEditPhoneNumber(e.target.value)}
                  placeholder={t('users.phoneNumberPlaceholder')}
                  type="tel"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('users.notificationPreference')}</Label>
                <Select
                  value={editNotificationPreference}
                  onValueChange={(value: "sms" | "whatsapp") => setEditNotificationPreference(value)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('users.notificationPreferencePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">
                      <span className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        SMS
                      </span>
                    </SelectItem>
                    <SelectItem value="whatsapp">
                      <span className="flex items-center gap-2">
                        <SiWhatsapp className="h-4 w-4" />
                        WhatsApp
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isPending}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => editingId && handleSave(editingId)} disabled={isPending}>
                {t('common.save')}
              </Button>
            </div>
          </DialogContent>
        ) : (
          // User selection dialog
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('users.select')}</DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-3 mt-4 max-h-[60vh] overflow-y-auto p-1">
              <Button
                variant={!selected ? "default" : "outline"}
                className="justify-start gap-2 h-12"
                onClick={() => {
                  onSelect(null);
                  setDialogOpen(false);
                }}
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{t('common.everyone')}</span>
                  <span className="text-xs text-muted-foreground">{t('common.showAllTasks')}</span>
                </div>
              </Button>
              
              {users.map(user => (
                <div key={user.id} className="flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    <Button
                      variant={selected?.id === user.id ? "default" : "outline"}
                      className="justify-start gap-2 flex-1 h-12"
                      onClick={() => {
                        onSelect(user);
                        setDialogOpen(false);
                      }}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback style={{ backgroundColor: user.color, color: 'white' }}>
                          {user.name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start overflow-hidden">
                        <span className="font-medium truncate max-w-[150px]">{user.name}</span>
                        <span className="text-xs text-muted-foreground flex items-center">
                          {user.phoneNumber ? (
                            <>
                              {user.notificationPreference === 'whatsapp' ? (
                                <SiWhatsapp className="h-3 w-3 mr-1" />
                              ) : (
                                <Phone className="h-3 w-3 mr-1" />
                              )}
                              {user.phoneNumber}
                            </>
                          ) : t('users.noPhone')}
                        </span>
                      </div>
                    </Button>
                    
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleEdit(user)}
                        className="h-12 w-12"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <TestNotificationButton userId={user.id} userName={user.name} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}