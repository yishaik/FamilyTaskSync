import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { useTranslation } from "react-i18next";
import "./i18n/i18n";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'he' : 'en';
    i18n.changeLanguage(newLang);
    // Update HTML dir attribute for RTL support
    document.documentElement.dir = newLang === 'he' ? 'rtl' : 'ltr';
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="fixed top-4 right-4"
      onClick={toggleLanguage}
    >
      <Languages className="h-5 w-5" />
    </Button>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageSwitcher />
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;