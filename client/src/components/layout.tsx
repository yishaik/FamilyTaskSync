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
      <div className="relative flex min-h-screen flex-col md:flex-row bg-gradient-to-br from-background to-background/80">
        <Sidebar 
          variant="inset" 
          className="backdrop-blur-sm w-full md:w-auto shrink-0"
        >
          <SidebarHeader className="flex h-14 items-center px-2 sm:px-4 border-b border-border/10">
            <div className="flex items-center justify-between w-full">
              <ReadmeViewer className="shrink-0" />
              <div className="flex items-center gap-2 shrink-0">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleLanguage}
                  title={i18n.language === 'en' ? 'Switch to Hebrew' : 'החלף לאנגלית'}
                  className="transition-transform hover:scale-105 active:scale-95"
                >
                  <Languages className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="sr-only">Switch language</span>
                </Button>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2 sm:p-4">
            {/* Sidebar content */}
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="flex-1 transition-all duration-200">
          <div className="mx-auto max-w-[1200px] w-full h-full p-2 sm:p-4 md:p-6">
            <div className="h-full w-full">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}