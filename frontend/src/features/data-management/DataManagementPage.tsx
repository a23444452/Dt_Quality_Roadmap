import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { SolutionTab } from './SolutionTab'
import { DefectCategoryTab } from './DefectCategoryTab'
import { DefectTypeTab } from './DefectTypeTab'
import { ProcessTab } from './ProcessTab'
import { StationTab } from './StationTab'
import { PlantTab } from './PlantTab'
import { TankLineTab } from './TankLineTab'
import { ImportSection } from './ImportSection'
import { ExportSection } from './ExportSection'

export function DataManagementPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Data Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage solutions, defects, processes, plants, and tank lines
        </p>
      </div>

      <Tabs defaultValue="solutions">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="solutions">Solutions</TabsTrigger>
          <TabsTrigger value="defect-categories">Defect Categories</TabsTrigger>
          <TabsTrigger value="defect-types">Defect Types</TabsTrigger>
          <TabsTrigger value="processes">Processes</TabsTrigger>
          <TabsTrigger value="stations">Stations</TabsTrigger>
          <TabsTrigger value="plants">Plants</TabsTrigger>
          <TabsTrigger value="tank-lines">Tank Lines</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="solutions" className="mt-4">
          <SolutionTab />
        </TabsContent>

        <TabsContent value="defect-categories" className="mt-4">
          <DefectCategoryTab />
        </TabsContent>

        <TabsContent value="defect-types" className="mt-4">
          <DefectTypeTab />
        </TabsContent>

        <TabsContent value="processes" className="mt-4">
          <ProcessTab />
        </TabsContent>

        <TabsContent value="stations" className="mt-4">
          <StationTab />
        </TabsContent>

        <TabsContent value="plants" className="mt-4">
          <PlantTab />
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
