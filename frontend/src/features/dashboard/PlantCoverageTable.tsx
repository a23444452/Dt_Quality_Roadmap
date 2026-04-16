import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PlantCoverage } from '@/types/dashboard'

interface PlantCoverageTableProps {
  data: PlantCoverage[]
}

export function PlantCoverageTable({ data }: PlantCoverageTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Coverage by Plant</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plant</TableHead>
              <TableHead className="text-right">MP %</TableHead>
              <TableHead className="text-right">Total Solutions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.plant}>
                <TableCell className="font-medium">{row.plant}</TableCell>
                <TableCell className="text-right">
                  <span className="text-green-600 font-semibold">
                    {row.mp_percentage.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right">{row.total.toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No plant data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
