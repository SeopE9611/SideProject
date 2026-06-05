import {
  PRODUCT_FEATURE_ITEMS,
  type ProductFeatureKey,
} from "@/lib/product-feature-score";

type Props = {
  scores: Record<ProductFeatureKey, number>;
};

const LEVELS = [20, 40, 60, 80, 100];

export default function ProductFeatureRadarChart({ scores }: Props) {
  const size = 320;
  const center = size / 2;
  const radius = 110;

  const axisPoints = PRODUCT_FEATURE_ITEMS.map((item, index) => {
    const angle =
      -Math.PI / 2 + (index * 2 * Math.PI) / PRODUCT_FEATURE_ITEMS.length;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { ...item, angle, x, y };
  });

  const levelPolygons = LEVELS.map((level) => {
    const ratio = level / 100;
    return axisPoints
      .map(
        (p) =>
          `${center + radius * ratio * Math.cos(p.angle)},${center + radius * ratio * Math.sin(p.angle)}`,
      )
      .join(" ");
  });

  const dataPolygon = axisPoints
    .map((p) => {
      const ratio = scores[p.key] / 100;
      return `${center + radius * ratio * Math.cos(p.angle)},${center + radius * ratio * Math.sin(p.angle)}`;
    })
    .join(" ");

  return (
    <div className="space-y-4">
      <div className="w-full overflow-x-auto">
        <svg
          viewBox="0 0 320 320"
          role="img"
          aria-label="스트링 성능 특성 레이더 차트"
          className="mx-auto h-auto w-full max-w-[360px]"
        >
          {levelPolygons.map((polygon, idx) => (
            <polygon
              key={LEVELS[idx]}
              points={polygon}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.15 + idx * 0.05}
            />
          ))}
          {axisPoints.map((point) => (
            <line
              key={point.key}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke="currentColor"
              strokeOpacity={0.2}
            />
          ))}
          <polygon
            points={dataPolygon}
            fill="hsl(var(--primary) / 0.2)"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
          />
          {axisPoints.map((point) => (
            <text
              key={`${point.key}-label`}
              x={center + (radius + 22) * Math.cos(point.angle)}
              y={center + (radius + 22) * Math.sin(point.angle)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-[11px]"
            >
              {point.label}
            </text>
          ))}
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        {PRODUCT_FEATURE_ITEMS.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 px-3 py-2"
          >
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-semibold text-foreground">
              {scores[item.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
