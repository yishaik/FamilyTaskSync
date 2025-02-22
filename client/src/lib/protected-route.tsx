import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();

  // For now, we'll check session status from the /api/user endpoint
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/user');
        if (!res.ok) {
          setLocation('/login');
        }
      } catch (error) {
        setLocation('/login');
      }
    }
    checkAuth();
  }, [setLocation]);

  return <Component />;
}
