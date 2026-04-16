import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { SolutionTab } from './SolutionTab'
import { DefectTypeTab } from './DefectTypeTab'
import { StationTab } from './StationTab'
import { TankLineTab } from './TankLineTab'
import { ImportSection } from './ImportSection'
import { ExportSection } from './ExportSection'

export function DataManagementPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Data Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage solutions, defect types, stations, and tank lines
        </p>
      </div>

      <Tabs defaultValue="solutions">
        <TabsList>
          <TabsTrigger value="solutions">Solutions</TabsTrigger>
          <TabsTrigger value="defect-types">Defect Types</TabsTrigger>
          <TabsTrigger value="stations">Stations</TabsTrigger>
          <TabsTrigger value="tank-lines">Tank Lines</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="solutions" className="mt-4">
          <SolutionTab />
        </TabsContent>

        <TabsContent value="defect-types" className="mt-4">
          <DefectTypeTab />
        </TabsContent>

        <TabsContent value="stations" className="mt-4">
          <StationTab />
        </TabsContent>

        <TabsContent value="tank-lines" className="mt-4">
          <TankLineTab />
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <div className="max-w-2xl">
            <ImportSection />
          </div>
        </TabsContent>

        <TabsContent value="export" className="mt-4">
          <div className="max-w-2xl">
            <Separator className="mb-6" />
            <ExportSection />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
