import { QUADRANT_COLORS, QUADRANT_LABELS } from '../utils/quadrantLogic';

function QuadrantLegend() {
  const quadrants = [
    { key: 'highHigh', ...QUADRANT_LABELS.highHigh, color: QUADRANT_COLORS.highHigh },
    { key: 'lowHigh', ...QUADRANT_LABELS.lowHigh, color: QUADRANT_COLORS.lowHigh },
    { key: 'lowLow', ...QUADRANT_LABELS.lowLow, color: QUADRANT_COLORS.lowLow },
    { key: 'highLow', ...QUADRANT_LABELS.highLow, color: QUADRANT_COLORS.highLow },
  ];

  return (
    <div className="quadrant-legend">
      {quadrants.map(q => (
        <div key={q.key} className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: q.color }}
          />
          <span className="legend-label">{q.name}</span>
        </div>
      ))}
    </div>
  );
}

export default QuadrantLegend;
