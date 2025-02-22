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
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user", {
          headers: {
            'Accept': 'application/json'
          },
          credentials: 'include' // Ensure cookies are sent
        });

        // Check if response is not JSON (e.g. HTML redirect)
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          // If not authenticated, return null instead of throwing
          if (res.status === 401 || res.status === 302) {
            return null;
          }
          throw new Error("Invalid response format");
        }

        // Parse JSON response
        const data = await res.json();

        // If we got JSON but it indicates auth failure, return null
        if (!res.ok) {
          if (res.status === 401) {
            return null;
          }
          throw new Error(data.message || `Failed to fetch user: ${res.status}`);
        }

        return data;
      } catch (error) {
        console.error("Auth error:", error);
        // For network/parsing errors, return null instead of throwing
        return null;
      }
    },
    staleTime: 0, // Always fetch fresh data
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnReconnect: true // Refetch when network reconnects
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