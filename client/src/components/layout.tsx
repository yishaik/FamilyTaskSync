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
      <div className="flex min-h-screen bg-gradient-to-br from-background to-background/80">
        <Sidebar variant="inset" className="backdrop-blur-sm">
          <SidebarHeader className="flex h-14 items-center justify-between border-b border-border/10 px-4">
            <div className="flex items-center gap-3">
              <ReadmeViewer />
              <div className="h-4 w-[1px] bg-border/30" />
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLanguage}
                title={i18n.language === 'en' ? 'Switch to Hebrew' : 'החלף לאנגלית'}
                className="transition-transform hover:scale-105 active:scale-95"
              >
                <Languages className="h-5 w-5" />
                <span className="sr-only">Switch language</span>
              </Button>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-4">
            {/* Existing sidebar content */}
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="flex-1 transition-all duration-200">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}