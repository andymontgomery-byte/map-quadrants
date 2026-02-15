import { useMemo } from 'react';
import { QUADRANT_COLORS, getQuadrant, getSubjectColor, resolveOverlaps } from '../utils/quadrantLogic';

const CHART_WIDTH = 700;
const CHART_HEIGHT = 500;
const PADDING = 60;
const CHART_AREA_X = CHART_WIDTH - 2 * PADDING;
const CHART_AREA_Y = CHART_HEIGHT - 2 * PADDING;

function QuadrantChart({ data, showNames, showQuadrantColors }) {
  // Convert percentile to pixel coordinate
  const toPixelX = (percentile) => PADDING + (percentile / 100) * CHART_AREA_X;
  const toPixelY = (percentile) => PADDING + ((100 - percentile) / 100) * CHART_AREA_Y; // Invert Y

  // Prepare point data
  const points = useMemo(() => {
    const rawPoints = data.map(student => ({
      id: `${student.studentid}-${student.subject}`,
      x: toPixelX(student.winterPercentile),
      y: toPixelY(student.conditionalGrowthPercentile),
      label: student.studentNameShort,
      fullName: student.studentName,
      subject: student.subject,
      course: student.course,
      percentileX: student.winterPercentile,
      percentileY: student.conditionalGrowthPercentile,
      quadrant: getQuadrant(student.winterPercentile, student.conditionalGrowthPercentile),
      color: getSubjectColor(student),
    }));

    // Resolve overlapping labels
    return resolveOverlaps(rawPoints, 15);
  }, [data]);

  // Grid lines at 10% intervals
  const gridLines = [10, 20, 30, 40, 50, 60, 70, 80, 90];

  // Tick marks for axes
  const ticks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <div className="quadrant-chart">
      <div className="chart-svg-container">
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="chart-svg">
          {/* Quadrant backgrounds */}
          {showQuadrantColors && (
            <g className="quadrant-backgrounds">
              {/* Bottom-left: Low Achievement / Low Growth */}
              <rect
                x={PADDING}
                y={toPixelY(50)}
                width={CHART_AREA_X / 2}
                height={CHART_AREA_Y / 2}
                fill={QUADRANT_COLORS.lowLow}
                className="quadrant-bg"
              />
              {/* Bottom-right: High Achievement / Low Growth */}
              <rect
                x={toPixelX(50)}
                y={toPixelY(50)}
                width={CHART_AREA_X / 2}
                height={CHART_AREA_Y / 2}
                fill={QUADRANT_COLORS.highLow}
                className="quadrant-bg"
              />
              {/* Top-left: Low Achievement / High Growth */}
              <rect
                x={PADDING}
                y={PADDING}
                width={CHART_AREA_X / 2}
                height={CHART_AREA_Y / 2}
                fill={QUADRANT_COLORS.lowHigh}
                className="quadrant-bg"
              />
              {/* Top-right: High Achievement / High Growth */}
              <rect
                x={toPixelX(50)}
                y={PADDING}
                width={CHART_AREA_X / 2}
                height={CHART_AREA_Y / 2}
                fill={QUADRANT_COLORS.highHigh}
                className="quadrant-bg"
              />
            </g>
          )}

          {/* Grid lines */}
          <g className="grid-lines">
            {gridLines.map(val => (
              <g key={val}>
                {/* Vertical grid line */}
                <line
                  x1={toPixelX(val)}
                  y1={PADDING}
                  x2={toPixelX(val)}
                  y2={CHART_HEIGHT - PADDING}
                  className="grid-line"
                />
                {/* Horizontal grid line */}
                <line
                  x1={PADDING}
                  y1={toPixelY(val)}
                  x2={CHART_WIDTH - PADDING}
                  y2={toPixelY(val)}
                  className="grid-line"
                />
              </g>
            ))}
          </g>

          {/* Center lines (50%) - dashed */}
          <line
            x1={toPixelX(50)}
            y1={PADDING}
            x2={toPixelX(50)}
            y2={CHART_HEIGHT - PADDING}
            className="center-line"
          />
          <line
            x1={PADDING}
            y1={toPixelY(50)}
            x2={CHART_WIDTH - PADDING}
            y2={toPixelY(50)}
            className="center-line"
          />

          {/* Threshold "50" indicators on axes */}
          {/* X-axis threshold */}
          <rect
            x={toPixelX(50) - 12}
            y={CHART_HEIGHT - PADDING + 22}
            width={24}
            height={16}
            fill="#fff"
            stroke="#999"
            strokeWidth={1}
            rx={2}
          />
          <text
            x={toPixelX(50)}
            y={CHART_HEIGHT - PADDING + 34}
            className="threshold-label"
            textAnchor="middle"
          >
            50
          </text>
          {/* Y-axis threshold */}
          <rect
            x={PADDING - 34}
            y={toPixelY(50) - 8}
            width={24}
            height={16}
            fill="#fff"
            stroke="#999"
            strokeWidth={1}
            rx={2}
          />
          <text
            x={PADDING - 22}
            y={toPixelY(50) + 4}
            className="threshold-label"
            textAnchor="middle"
          >
            50
          </text>

          {/* Axes */}
          <line
            x1={PADDING}
            y1={CHART_HEIGHT - PADDING}
            x2={CHART_WIDTH - PADDING}
            y2={CHART_HEIGHT - PADDING}
            className="axis-line"
          />
          <line
            x1={PADDING}
            y1={PADDING}
            x2={PADDING}
            y2={CHART_HEIGHT - PADDING}
            className="axis-line"
          />

          {/* X-axis ticks and labels */}
          {ticks.map(val => (
            <g key={`x-${val}`}>
              <line
                x1={toPixelX(val)}
                y1={CHART_HEIGHT - PADDING}
                x2={toPixelX(val)}
                y2={CHART_HEIGHT - PADDING + 5}
                stroke="#333"
                strokeWidth={1}
              />
              <text
                x={toPixelX(val)}
                y={CHART_HEIGHT - PADDING + 18}
                className="tick-label"
                textAnchor="middle"
              >
                {val}
              </text>
            </g>
          ))}

          {/* Y-axis ticks and labels */}
          {ticks.map(val => (
            <g key={`y-${val}`}>
              <line
                x1={PADDING - 5}
                y1={toPixelY(val)}
                x2={PADDING}
                y2={toPixelY(val)}
                stroke="#333"
                strokeWidth={1}
              />
              <text
                x={PADDING - 10}
                y={toPixelY(val) + 4}
                className="tick-label"
                textAnchor="end"
              >
                {val}
              </text>
            </g>
          ))}

          {/* Axis titles */}
          <text
            x={CHART_WIDTH / 2}
            y={CHART_HEIGHT - 10}
            className="axis-title"
            textAnchor="middle"
          >
            Achievement Percentile
          </text>
          <text
            x={15}
            y={CHART_HEIGHT / 2}
            className="axis-title"
            textAnchor="middle"
            transform={`rotate(-90, 15, ${CHART_HEIGHT / 2})`}
          >
            Conditional Growth Percentile
          </text>

          {/* Data points — crosshair (+) markers like NWEA */}
          <g className="data-points">
            {points.map(point => (
              <g key={point.id} className="student-point">
                <title>{`${point.fullName}\n${point.subject}\nAchievement: ${point.percentileX}%\nGrowth: ${point.percentileY}%`}</title>
                <line
                  x1={point.x - 5} y1={point.y}
                  x2={point.x + 5} y2={point.y}
                  stroke={point.color}
                  strokeWidth={2}
                />
                <line
                  x1={point.x} y1={point.y - 5}
                  x2={point.x} y2={point.y + 5}
                  stroke={point.color}
                  strokeWidth={2}
                />
                {showNames && (
                  <text
                    x={point.x + point.labelOffsetX}
                    y={point.y + point.labelOffsetY}
                    className="student-label"
                  >
                    {point.label}
                  </text>
                )}
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

export default QuadrantChart;
