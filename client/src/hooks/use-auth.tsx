import { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, error, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/status"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/status", {
          credentials: 'include'
        });

        if (!res.ok) {
          if (res.status === 401) {
            return null;
          }
          throw new Error(`Failed to fetch auth status: ${res.status}`);
        }

        const data = await res.json();
        return data.authenticated ? { id: data.userId } : null;
      } catch (error) {
        console.error("Auth error:", error);
        return null;
      }
    },
    staleTime: 0,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}