import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ProcessZone } from './process-hotspots'
import { PROCESS_COLORS } from './process-hotspots'

interface StationInfo {
  name: string
  solutionCount: number
}

interface ProcessHotspotProps {
  zone: ProcessZone
  stationInfos: StationInfo[]
  onClick: (zone: ProcessZone) => void
  isSelected?: boolean
}

export function ProcessHotspot({ zone, stationInfos, onClick, isSelected = false }: ProcessHotspotProps) {
  const processColor = PROCESS_COLORS[zone.process] ?? '#6b7280'
  const totalSolutions = stationInfos.reduce((sum, s) => sum + s.solutionCount, 0)

  const dotSize = isSelected ? 32 : 24

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={`absolute rounded-full transition-all duration-200 cursor-pointer hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isSelected ? 'z-10 animate-pulse' : ''
          }`}
          style={{
            left: `${zone.x}%`,
            top: `${zone.y}%`,
            width: dotSize,
            height: dotSize,
            marginLeft: -dotSize / 2,
            marginTop: -dotSize / 2,
            backgroundColor: processColor,
            boxShadow: isSelected
              ? `0 0 20px ${processColor}, 0 0 40px ${processColor}66, 0 4px 12px rgba(0,0,0,0.4)`
              : `0 0 12px ${processColor}88, 0 2px 8px rgba(0,0,0,0.3)`,
            border: isSelected ? '4px solid white' : '3px solid white',
          }}
          onClick={() => onClick(zone)}
          aria-label={`View details for ${zone.displayName}`}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-gray-900 text-white p-3 max-w-xs">
        <div>
          <p className="font-semibold text-base mb-2" style={{ color: processColor }}>
            {zone.displayName}
          </p>
          <div className="space-y-1">
            {stationInfos.length > 0 ? (
              stationInfos.map((station) => (
                <div key={station.name} className="flex justify-between gap-4 text-sm">
                  <span className="text-gray-300">{station.name}</span>
                  <span className="text-gray-400">{station.solutionCount} Solutions</span>
                </div>
              ))
            ) : (
              zone.stations.map((station) => (
                <div key={station} className="flex justify-between gap-4 text-sm">
                  <span className="text-gray-300">{station}</span>
                  <span className="text-gray-400">0 Solutions</span>
                </div>
              ))
            )}
          </div>
          {totalSolutions > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700 text-sm font-medium">
              Total: {totalSolutions} Solutions
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
