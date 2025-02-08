import { ThemeToggle } from "@/components/theme-toggle"
import { ReadmeViewer } from "@/components/readme-viewer"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar"

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReadmeViewer />
            <ThemeToggle />
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
