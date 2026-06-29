import React, { useMemo, useState } from 'react';
import { LatencyPoint, ServiceStatus } from '../types';

interface ServiceChartProps {
  id?: string;
  history: LatencyPoint[];
  status: ServiceStatus;
  height?: number;
  width?: number;
  interactive?: boolean;
}

export const ServiceChart: React.FC<ServiceChartProps> = ({
  id,
  history,
  status,
  height = 160,
  width = 500,
  interactive = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);


  const points = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history;
  }, [history]);


  const { max, min, valuesRange } = useMemo(() => {
    if (points.length === 0) return { max: 100, min: 0, valuesRange: 100 };
    const values = points.map((p) => p.value);
    const maxVal = Math.max(...values, 10);
    const minVal = Math.min(...values, 0);
    const range = maxVal - minVal || 10;
    return { max: maxVal, min: minVal, valuesRange: range };
  }, [points]);


  const svgCoordinates = useMemo(() => {
    if (points.length === 0) return [];
    
    const paddingX = interactive ? 40 : 5;
    const paddingY = interactive ? 20 : 5;
    
    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY * 2;

    return points.map((point, index) => {

      const x =
        points.length > 1
          ? paddingX + (index / (points.length - 1)) * usableWidth
          : paddingX + usableWidth / 2;

      // DOWN services have latency 0, draw at bottom
      const yValue = point.status === 'DOWN' ? 0 : point.value;
      const pct = (yValue - min) / valuesRange;
      const y = paddingY + usableHeight - pct * usableHeight;

      return { x, y, value: point.value, time: point.timestamp, status: point.status };
    });
  }, [points, width, height, min, valuesRange, interactive]);


  const { pathD, areaD } = useMemo(() => {
    if (svgCoordinates.length === 0) return { pathD: '', areaD: '' };


    let d = `M ${svgCoordinates[0].x} ${svgCoordinates[0].y}`;
    for (let i = 1; i < svgCoordinates.length; i++) {
      d += ` L ${svgCoordinates[i].x} ${svgCoordinates[i].y}`;
    }


    const paddingY = interactive ? 20 : 5;
    const bottomY = height - paddingY;
    const startX = svgCoordinates[0].x;
    const endX = svgCoordinates[svgCoordinates.length - 1].x;
    
    const aD = `${d} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;

    return { pathD: d, areaD: aD };
  }, [svgCoordinates, height, interactive]);

  if (points.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-neutral-600 font-mono">
        NO METRIC HISTORY AVAILABLE
      </div>
    );
  }

  const isCurrentDown = status === 'DOWN';
  const strokeColor = isCurrentDown ? 'rgba(239, 68, 68, 0.85)' : 'rgba(16, 185, 129, 0.85)';
  const fillColor = isCurrentDown ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)';
  const glowId = `chart-glow-${status}-${Math.random().toString(36).substr(2, 4)}`;

  return (
    <div id={id} className="relative w-full">
      {interactive && (
        <div className="absolute top-2 left-10 flex gap-4 text-xs font-mono text-slate-500 dark:text-neutral-400">
          <div>
            MIN: <span className="text-slate-800 dark:text-neutral-200">{Math.round(min * 10) / 10}ms</span>
          </div>
          <div>
            PEAK: <span className="text-slate-800 dark:text-neutral-200">{Math.round(max * 10) / 10}ms</span>
          </div>
          {hoveredIndex !== null && (
            <div className="text-emerald-600 dark:text-emerald-400">
              TIME: <span className="text-slate-800 dark:text-neutral-200">{svgCoordinates[hoveredIndex].time}</span> |{' '}
              LATENCY:{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                {svgCoordinates[hoveredIndex].status === 'DOWN'
                  ? 'TIMEOUT'
                  : `${svgCoordinates[hoveredIndex].value}ms`}
              </span>
            </div>
          )}
        </div>
      )}

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHoveredIndex(null)}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={glowId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {interactive && (
          <g opacity="0.15">
            <line x1="40" y1="20" x2={width - 40} y2="20" stroke="#94a3b8" strokeDasharray="3,3" />
            <line
              x1="40"
              y1={(height - 40) / 2 + 20}
              x2={width - 40}
              y2={(height - 40) / 2 + 20}
              stroke="#94a3b8"
              strokeDasharray="3,3"
            />
            <line
              x1="40"
              y1={height - 20}
              x2={width - 40}
              y2={height - 20}
              stroke="#94a3b8"
              strokeDasharray="3,3"
            />
          </g>
        )}
        {pathD && <path d={areaD} fill={`url(#${glowId})`} />}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth={interactive ? 2 : 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {interactive && (
          <g className="fill-slate-500 dark:fill-neutral-500 font-mono text-[9px] font-medium" opacity="0.8">
            <text x="5" y="24">
              {Math.round(max)}ms
            </text>
            <text x="5" y={(height - 40) / 2 + 24}>
              {Math.round((max + min) / 2)}ms
            </text>
            <text x="5" y={height - 16}>
              {Math.round(min)}ms
            </text>
            <text x="40" y={height - 4} textAnchor="start">
              {svgCoordinates[0]?.time || ''}
            </text>
            <text x={width - 40} y={height - 4} textAnchor="end">
              {svgCoordinates[svgCoordinates.length - 1]?.time || ''}
            </text>
          </g>
        )}
        {interactive &&
          svgCoordinates.map((coord, idx) => (
            <g key={idx}>
              {hoveredIndex === idx && (
                <line
                  x1={coord.x}
                  y1="20"
                  x2={coord.x}
                  y2={height - 20}
                  stroke={strokeColor}
                  strokeWidth="1"
                  strokeDasharray="2,2"
                  opacity="0.4"
                />
              )}
              <rect
                x={coord.x - (width / points.length) / 2}
                y="0"
                width={width / points.length}
                height={height}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(idx)}
                className="cursor-crosshair"
              />
              {(hoveredIndex === idx || (!interactive && idx === points.length - 1)) && (
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={interactive ? 4.5 : 3.5}
                  fill={isCurrentDown ? '#ef4444' : '#10b981'}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-neutral-900 stroke-[1.5px] transition-all duration-150"
                  strokeWidth="1.5"
                />
              )}
            </g>
          ))}
      </svg>
    </div>
  );
};
