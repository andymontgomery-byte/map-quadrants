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
      <div className="chart-title">Achievement Status and Growth Quadrant Chart</div>
      <div className="chart-svg-container">
        <svg width={CHART_WIDTH} height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
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

          {/* Quadrant labels */}
          <text x={toPixelX(25)} y={toPixelY(75)} className="quadrant-label">
            Low Achievement
          </text>
          <text x={toPixelX(25)} y={toPixelY(72)} className="quadrant-label">
            High Growth
          </text>

          <text x={toPixelX(75)} y={toPixelY(75)} className="quadrant-label">
            High Achievement
          </text>
          <text x={toPixelX(75)} y={toPixelY(72)} className="quadrant-label">
            High Growth
          </text>

          <text x={toPixelX(25)} y={toPixelY(28)} className="quadrant-label">
            Low Achievement
          </text>
          <text x={toPixelX(25)} y={toPixelY(25)} className="quadrant-label">
            Low Growth
          </text>

          <text x={toPixelX(75)} y={toPixelY(28)} className="quadrant-label">
            High Achievement
          </text>
          <text x={toPixelX(75)} y={toPixelY(25)} className="quadrant-label">
            Low Growth
          </text>

          {/* Data points */}
          <g className="data-points">
            {points.map(point => (
              <g key={point.id}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={5}
                  fill={point.color}
                  className="student-point"
                >
                  <title>{`${point.fullName}\n${point.subject}\nAchievement: ${point.percentileX}%\nGrowth: ${point.percentileY}%`}</title>
                </circle>
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
