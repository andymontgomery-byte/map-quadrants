import { useMemo } from 'react';
import { QUADRANT_COLORS, getQuadrant, getSubjectColor, getSubjectShape, resolveOverlaps } from '../utils/quadrantLogic';

const CHART_WIDTH = 700;
const CHART_HEIGHT = 500;
const PADDING = 60;
const CHART_AREA_X = CHART_WIDTH - 2 * PADDING;
const CHART_AREA_Y = CHART_HEIGHT - 2 * PADDING;

function QuadrantChart({ data, showNames, showQuadrantColors, thresholds, onThresholdsChange }) {
  const achievementThreshold = thresholds?.achievement ?? 50;
  const growthThreshold = thresholds?.growth ?? 50;
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
      shape: getSubjectShape(student),
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
      <div className="chart-layout">
        {/* Y-axis label with threshold input */}
        <div className="y-axis-label">
          <span>Conditional<br />Growth<br />Percentile</span>
          <input
            type="number"
            className="threshold-input"
            value={growthThreshold}
            min={1}
            max={99}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= 99) {
                onThresholdsChange?.({ ...thresholds, growth: val });
              }
            }}
          />
        </div>

        <div className="chart-svg-container">
          <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="chart-svg">
          {/* Quadrant backgrounds */}
          {showQuadrantColors && (
            <g className="quadrant-backgrounds">
              {/* Bottom-left: Low Achievement / Low Growth */}
              <rect
                x={PADDING}
                y={toPixelY(growthThreshold)}
                width={toPixelX(achievementThreshold) - PADDING}
                height={CHART_HEIGHT - PADDING - toPixelY(growthThreshold)}
                fill={QUADRANT_COLORS.lowLow}
                className="quadrant-bg"
              />
              {/* Bottom-right: High Achievement / Low Growth */}
              <rect
                x={toPixelX(achievementThreshold)}
                y={toPixelY(growthThreshold)}
                width={CHART_WIDTH - PADDING - toPixelX(achievementThreshold)}
                height={CHART_HEIGHT - PADDING - toPixelY(growthThreshold)}
                fill={QUADRANT_COLORS.highLow}
                className="quadrant-bg"
              />
              {/* Top-left: Low Achievement / High Growth */}
              <rect
                x={PADDING}
                y={PADDING}
                width={toPixelX(achievementThreshold) - PADDING}
                height={toPixelY(growthThreshold) - PADDING}
                fill={QUADRANT_COLORS.lowHigh}
                className="quadrant-bg"
              />
              {/* Top-right: High Achievement / High Growth */}
              <rect
                x={toPixelX(achievementThreshold)}
                y={PADDING}
                width={CHART_WIDTH - PADDING - toPixelX(achievementThreshold)}
                height={toPixelY(growthThreshold) - PADDING}
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

          {/* Threshold divider lines - dashed */}
          <line
            x1={toPixelX(achievementThreshold)}
            y1={PADDING}
            x2={toPixelX(achievementThreshold)}
            y2={CHART_HEIGHT - PADDING}
            className="center-line"
          />
          <line
            x1={PADDING}
            y1={toPixelY(growthThreshold)}
            x2={CHART_WIDTH - PADDING}
            y2={toPixelY(growthThreshold)}
            className="center-line"
          />

          {/* Axes — box frame */}
          {/* Bottom */}
          <line
            x1={PADDING}
            y1={CHART_HEIGHT - PADDING}
            x2={CHART_WIDTH - PADDING}
            y2={CHART_HEIGHT - PADDING}
            className="axis-line"
          />
          {/* Left */}
          <line
            x1={PADDING}
            y1={PADDING}
            x2={PADDING}
            y2={CHART_HEIGHT - PADDING}
            className="axis-line"
          />
          {/* Top */}
          <line
            x1={PADDING}
            y1={PADDING}
            x2={CHART_WIDTH - PADDING}
            y2={PADDING}
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

          {/* Y-axis ticks and labels (left) */}
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

          {/* Right-side Y-axis line and ticks */}
          <line
            x1={CHART_WIDTH - PADDING}
            y1={PADDING}
            x2={CHART_WIDTH - PADDING}
            y2={CHART_HEIGHT - PADDING}
            className="axis-line"
          />
          {ticks.map(val => (
            <g key={`yr-${val}`}>
              <line
                x1={CHART_WIDTH - PADDING}
                y1={toPixelY(val)}
                x2={CHART_WIDTH - PADDING + 5}
                y2={toPixelY(val)}
                stroke="#333"
                strokeWidth={1}
              />
              <text
                x={CHART_WIDTH - PADDING + 10}
                y={toPixelY(val) + 4}
                className="tick-label"
                textAnchor="start"
              >
                {val}
              </text>
            </g>
          ))}

          {/* Axis titles removed — replaced by HTML labels below */}

          {/* Data points — shape markers matching NWEA ASG report */}
          <g className="data-points">
            {points.map(point => (
              <g key={point.id} className="student-point">
                <title>{`${point.fullName}\n${point.subject}\nAchievement: ${point.percentileX}%\nGrowth: ${point.percentileY}%`}</title>
                {point.shape === 'cross' && (
                  <>
                    <line x1={point.x - 5} y1={point.y} x2={point.x + 5} y2={point.y} stroke={point.color} strokeWidth={2} />
                    <line x1={point.x} y1={point.y - 5} x2={point.x} y2={point.y + 5} stroke={point.color} strokeWidth={2} />
                  </>
                )}
                {point.shape === 'square' && (
                  <rect x={point.x - 4} y={point.y - 4} width={8} height={8} fill={point.color} stroke={point.color} strokeWidth={1} />
                )}
                {point.shape === 'circle' && (
                  <circle cx={point.x} cy={point.y} r={4} fill={point.color} stroke={point.color} strokeWidth={1} />
                )}
                {point.shape === 'diamond' && (
                  <polygon points={`${point.x},${point.y - 5} ${point.x + 5},${point.y} ${point.x},${point.y + 5} ${point.x - 5},${point.y}`} fill={point.color} stroke={point.color} strokeWidth={1} />
                )}
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

          {/* X-axis label with threshold input */}
          <div className="x-axis-label">
            <span>Achievement Percentile</span>
            <input
              type="number"
              className="threshold-input"
              value={achievementThreshold}
              min={1}
              max={99}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= 99) {
                  onThresholdsChange?.({ ...thresholds, achievement: val });
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuadrantChart;
