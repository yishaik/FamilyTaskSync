import { type User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCog } from "lucide-react";

interface UserSwitcherProps {
  users: User[];
  selected: User | null;
  onSelect: (user: User | null) => void;
}

export function UserSwitcher({ users, selected, onSelect }: UserSwitcherProps) {
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
        <span>Everyone's Tasks</span>
      </Button>

      {users.map(user => (
        <Button
          key={user.id}
          variant={selected?.id === user.id ? "secondary" : "outline"}
          className="gap-2 h-10"
          onClick={() => onSelect(user)}
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback style={{ backgroundColor: user.color, color: 'white' }}>
              {user.name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>{user.name}'s Tasks</span>
        </Button>
      ))}
    </div>
  );
}