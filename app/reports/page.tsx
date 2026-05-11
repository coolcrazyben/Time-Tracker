import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TimeReportTable } from '@/components/time-report-table'
import { DriveReportTable } from '@/components/drive-report-table'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Weekly time and drive history</p>
      </div>

      <Tabs defaultValue="time">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="time" className="flex-1 sm:flex-none">Time</TabsTrigger>
          <TabsTrigger value="drives" className="flex-1 sm:flex-none">Drives</TabsTrigger>
        </TabsList>

        <TabsContent value="time" className="mt-6">
          <TimeReportTable />
        </TabsContent>

        <TabsContent value="drives" className="mt-6">
          <DriveReportTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
