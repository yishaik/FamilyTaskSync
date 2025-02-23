import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Only redirect if we're not loading and there's no user
    if (!isLoading && !user) {
      console.log("No authenticated user, redirecting to login");
      setLocation('/login');
    }
  }, [user, isLoading, setLocation]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Route>
    );
  }

  // If there's no user and we're not loading, don't render anything
  // (useEffect will handle the redirect)
  if (!user) {
    return null;
  }

  // If we have a user, render the protected component
  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}