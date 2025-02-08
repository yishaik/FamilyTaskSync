import { FileText } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useQuery } from "@tanstack/react-query"

export function ReadmeViewer() {
  const { t } = useTranslation()
  const { data: readme } = useQuery({
    queryKey: ['/api/readme'],
    staleTime: Infinity,
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title={t('app.readme.title')}>
          <FileText className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t('app.readme.title')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('app.readme.heading')}</DialogTitle>
        </DialogHeader>
        <div className="prose dark:prose-invert max-h-[70vh] overflow-auto">
          {readme ? (
            <div dangerouslySetInnerHTML={{ __html: readme }} />
          ) : (
            <p>{t('app.loading')}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
