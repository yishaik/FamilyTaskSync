import { useState } from "react";
import { type User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCog, Pencil, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface UserSwitcherProps {
  users: User[];
  selected: User | null;
  onSelect: (user: User | null) => void;
}

export function UserSwitcher({ users, selected, onSelect }: UserSwitcherProps) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const { mutate: updateName } = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingId(null);
    }
  });

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditName(user.name);
  };

  const handleSave = (id: number) => {
    if (editName.trim()) {
      updateName({ id, name: editName });
    }
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
            {editingId === user.id ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-7 w-24"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave(user.id);
                  }
                  e.stopPropagation();
                }}
              />
            ) : (
              <span>{user.name}'s {t('tasks.label')}</span>
            )}
          </Button>
          {editingId === user.id ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10"
              onClick={() => handleSave(user.id)}
            >
              <Check className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10"
              onClick={() => handleEdit(user)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}