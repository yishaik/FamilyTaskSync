import { useState } from "react";
import { type User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCog, Pencil, Check, X, Phone } from "lucide-react";
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
    <div className="flex gap-2 flex-wrap">
      <Button
        variant={!selected ? "secondary" : "outline"}
        className="gap-2 h-10"
        onClick={() => onSelect(null)}
      >
        <Avatar className="h-6 w-6">
          <AvatarFallback className="bg-primary/10">
            <UserCog className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <span>{t('tasks.filter.everyone')}</span>
      </Button>

      {users.map(user => (
        <div key={user.id} className="flex items-center gap-1">
          <Button
            variant={selected?.id === user.id ? "secondary" : "outline"}
            className="gap-2 h-10"
            onClick={() => onSelect(user)}
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback style={{ backgroundColor: user.color, color: 'white' }}>
                {user.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>{user.name}'s {t('tasks.label')}</span>
            {user.phoneNumber && (
              user.notificationPreference === 'whatsapp' ? (
                <SiWhatsapp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Phone className="h-4 w-4 text-muted-foreground" />
              )
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10"
            onClick={() => handleEdit(user)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
      </Dialog>
    </div>
  );
}