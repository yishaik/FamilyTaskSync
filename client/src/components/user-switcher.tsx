import { type User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
        className="gap-2"
        onClick={() => onSelect(null)}
      >
        <Avatar className="h-6 w-6">
          <AvatarFallback>All</AvatarFallback>
        </Avatar>
        All Tasks
      </Button>

      {users.map(user => (
        <Button
          key={user.id}
          variant={selected?.id === user.id ? "secondary" : "outline"}
          className="gap-2"
          onClick={() => onSelect(user)}
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback style={{ backgroundColor: user.color }}>
              {user.name[0]}
            </AvatarFallback>
          </Avatar>
          {user.name}
        </Button>
      ))}
    </div>
  );
}