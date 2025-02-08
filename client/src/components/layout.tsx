import { ThemeToggle } from "@/components/theme-toggle"
import { ReadmeViewer } from "@/components/readme-viewer"
import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar"

export function Layout({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'he' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'he' ? 'rtl' : 'ltr';
  };

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReadmeViewer />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLanguage}
              title={i18n.language === 'en' ? 'Switch to Hebrew' : 'החלף לאנגלית'}
            >
              <Languages className="h-5 w-5" />
              <span className="sr-only">Switch language</span>
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {/* Existing sidebar content */}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}