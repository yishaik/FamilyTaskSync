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
      <div className="flex min-h-screen flex-col md:flex-row bg-gradient-to-br from-background to-background/80">
        <Sidebar 
          variant="inset" 
          className="backdrop-blur-sm w-full md:w-auto"
        >
          <SidebarHeader className="flex h-14 items-center justify-between border-b border-border/10 px-2 sm:px-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <ReadmeViewer />
              <div className="h-4 w-[1px] bg-border/30 hidden sm:block" />
              <div className="flex items-center space-x-2">
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
        <SidebarInset className="flex-1 transition-all duration-200 p-2 sm:p-4 md:p-6">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}