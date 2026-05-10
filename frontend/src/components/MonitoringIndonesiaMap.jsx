const numberFormatter = new Intl.NumberFormat('id-ID');

const MAP_VIEWBOX = {
  width: 960,
  height: 420,
  paddingX: 34,
  paddingY: 26,
};

const MAP_BOUNDS = {
  minLongitude: 94,
  maxLongitude: 142,
  minLatitude: -11.5,
  maxLatitude: 6.5,
};

const MAIN_ISLAND_POLYGONS = [
  {
    id: 'sumatra',
    points: [
      [95.0, 5.7],
      [96.4, 5.1],
      [97.9, 4.0],
      [99.2, 2.6],
      [100.6, 1.1],
      [102.0, -0.7],
      [103.0, -2.3],
      [103.9, -4.2],
      [104.1, -5.7],
      [102.8, -5.8],
      [101.2, -4.7],
      [99.9, -3.2],
      [98.6, -1.6],
      [97.2, 0.5],
      [96.0, 2.4],
      [95.2, 4.2],
    ],
  },
  {
    id: 'java',
    points: [
      [104.9, -5.8],
      [106.7, -5.9],
      [108.8, -6.2],
      [110.9, -6.7],
      [112.9, -7.3],
      [114.8, -7.9],
      [113.8, -8.4],
      [111.5, -8.5],
      [109.1, -8.1],
      [107.2, -7.6],
      [105.4, -6.8],
      [104.6, -6.1],
    ],
  },
  {
    id: 'kalimantan',
    points: [
      [108.0, 3.1],
      [110.1, 4.1],
      [112.8, 4.5],
      [115.4, 3.7],
      [117.2, 2.2],
      [118.0, 0.1],
      [117.5, -2.2],
      [116.0, -3.8],
      [113.6, -4.5],
      [111.1, -4.2],
      [109.1, -3.1],
      [107.9, -1.0],
      [107.6, 1.1],
    ],
  },
  {
    id: 'sulawesi',
    points: [
      [118.0, 1.5],
      [119.9, 3.0],
      [122.1, 3.9],
      [123.8, 3.0],
      [123.3, 1.2],
      [122.2, 0.2],
      [123.5, -0.9],
      [124.9, -2.2],
      [124.2, -3.8],
      [122.6, -3.3],
      [121.7, -1.8],
      [120.9, -2.7],
      [119.7, -4.3],
      [118.7, -3.0],
      [119.0, -1.4],
      [118.1, 0.0],
    ],
  },
  {
    id: 'papua',
    points: [
      [131.0, -2.2],
      [133.4, -1.4],
      [136.5, -1.3],
      [139.2, -1.9],
      [141.0, -3.5],
      [141.3, -5.8],
      [140.2, -7.9],
      [137.4, -8.7],
      [134.0, -8.2],
      [131.8, -6.8],
      [130.9, -4.8],
    ],
  },
  {
    id: 'halmahera',
    points: [
      [127.0, 1.9],
      [128.1, 2.2],
      [129.0, 1.1],
      [128.8, -0.2],
      [127.9, -0.9],
      [126.9, -0.1],
      [126.8, 1.0],
    ],
  },
  {
    id: 'seram',
    points: [
      [128.6, -2.6],
      [130.6, -2.7],
      [131.7, -3.3],
      [130.3, -3.9],
      [128.7, -3.5],
    ],
  },
];

const SMALL_ISLANDS = [
  { id: 'bali', longitude: 115.19, latitude: -8.45, radius: 4.4 },
  { id: 'lombok', longitude: 116.32, latitude: -8.64, radius: 4.2 },
  { id: 'sumbawa', longitude: 118.1, latitude: -8.72, radius: 4.8 },
  { id: 'flores', longitude: 121.1, latitude: -8.69, radius: 5.3 },
  { id: 'sumba', longitude: 119.8, latitude: -9.8, radius: 4.7 },
  { id: 'timor', longitude: 124.3, latitude: -9.3, radius: 5.8 },
  { id: 'ambon', longitude: 128.18, latitude: -3.69, radius: 4.1 },
  { id: 'ternate', longitude: 127.4, latitude: 0.79, radius: 3.6 },
  { id: 'biak', longitude: 136.08, latitude: -1.18, radius: 4.3 },
  { id: 'bangka', longitude: 106.0, latitude: -2.13, radius: 4.2 },
  { id: 'belitung', longitude: 108.0, latitude: -2.75, radius: 3.8 },
];

const statusLabelByTone = {
  success: 'Normal',
  warning: 'Perlu review',
  danger: 'Butuh tindakan',
};

const MARKER_COLLISION_GAP = 10;
const MARKER_OFFSET_STEP = 18;
const MARKER_OFFSET_RING_COUNT = 7;

const projectGeoPoint = (latitude, longitude) => {
  const usableWidth = MAP_VIEWBOX.width - MAP_VIEWBOX.paddingX * 2;
  const usableHeight = MAP_VIEWBOX.height - MAP_VIEWBOX.paddingY * 2;
  const normalizedX =
    (longitude - MAP_BOUNDS.minLongitude) /
    (MAP_BOUNDS.maxLongitude - MAP_BOUNDS.minLongitude);
  const normalizedY =
    (MAP_BOUNDS.maxLatitude - latitude) /
    (MAP_BOUNDS.maxLatitude - MAP_BOUNDS.minLatitude);

  return {
    x: MAP_VIEWBOX.paddingX + normalizedX * usableWidth,
    y: MAP_VIEWBOX.paddingY + normalizedY * usableHeight,
  };
};

const buildPolygonPath = (points) =>
  points
    .map(([longitude, latitude], index) => {
      const projected = projectGeoPoint(latitude, longitude);
      return `${index === 0 ? 'M' : 'L'} ${projected.x.toFixed(2)} ${projected.y.toFixed(2)}`;
    })
    .join(' ') + ' Z';

const getMarkerSize = (totalSignals) => {
  if (totalSignals >= 16) {
    return 26;
  }

  if (totalSignals >= 10) {
    return 22;
  }

  if (totalSignals >= 5) {
    return 19;
  }

  return 16;
};

const formatAliases = (aliases = []) => {
  if (aliases.length <= 1) {
    return '';
  }

  return aliases.slice(0, 3).join(', ');
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildMarkerOffsetCandidates = () =>
  [{ x: 0, y: 0 }].concat(
    Array.from({ length: MARKER_OFFSET_RING_COUNT }, (_, ringIndex) => {
      const radius = MARKER_OFFSET_STEP * (ringIndex + 1);
      const slotCount = 8 + ringIndex * 4;
      const ringRotation = ringIndex % 2 === 0 ? -90 : -75;

      return Array.from({ length: slotCount }, (_, slotIndex) => {
        const radians =
          ((ringRotation + (slotIndex * 360) / slotCount) * Math.PI) / 180;

        return {
          x: Math.cos(radians) * radius,
          y: Math.sin(radians) * radius,
        };
      });
    }).flat()
  );

const getMarkerClearance = (markerSize, placedMarkerSize) =>
  (markerSize + placedMarkerSize) / 2 + MARKER_COLLISION_GAP;

const buildProjectedPoints = (points) => {
  const placedMarkers = [];
  const offsetCandidates = buildMarkerOffsetCandidates();

  return points.map((point) => {
    const projected = projectGeoPoint(point.latitude, point.longitude);
    const markerSize = getMarkerSize(point.totalSignals);
    const markerMargin = markerSize / 2 + 8;
    let resolvedMarker = null;

    for (const candidate of offsetCandidates) {
      const markerX = clamp(
        projected.x + candidate.x,
        markerMargin,
        MAP_VIEWBOX.width - markerMargin
      );
      const markerY = clamp(
        projected.y + candidate.y,
        markerMargin,
        MAP_VIEWBOX.height - markerMargin
      );
      const collidesWithPlacedMarker = placedMarkers.some((placedMarker) => {
        const dx = markerX - placedMarker.markerX;
        const dy = markerY - placedMarker.markerY;

        return (
          Math.hypot(dx, dy) <
          getMarkerClearance(markerSize, placedMarker.markerSize)
        );
      });

      if (!collidesWithPlacedMarker) {
        resolvedMarker = {
          markerX,
          markerY,
          offsetX: markerX - projected.x,
          offsetY: markerY - projected.y,
        };
        break;
      }
    }

    if (!resolvedMarker) {
      const fallbackMarkerX = clamp(projected.x, markerMargin, MAP_VIEWBOX.width - markerMargin);
      const fallbackMarkerY = clamp(projected.y, markerMargin, MAP_VIEWBOX.height - markerMargin);

      resolvedMarker = {
        markerX: fallbackMarkerX,
        markerY: fallbackMarkerY,
        offsetX: fallbackMarkerX - projected.x,
        offsetY: fallbackMarkerY - projected.y,
      };
    }

    placedMarkers.push({
      markerX: resolvedMarker.markerX,
      markerY: resolvedMarker.markerY,
      markerSize,
    });

    return {
      ...point,
      projected,
      markerSize,
      anchorXPercent: (projected.x / MAP_VIEWBOX.width) * 100,
      anchorYPercent: (projected.y / MAP_VIEWBOX.height) * 100,
      offsetX: Number(resolvedMarker.offsetX.toFixed(2)),
      offsetY: Number(resolvedMarker.offsetY.toFixed(2)),
      connectorLength: Number(
        Math.hypot(resolvedMarker.offsetX, resolvedMarker.offsetY).toFixed(2)
      ),
      connectorAngle: `${Math.atan2(resolvedMarker.offsetY, resolvedMarker.offsetX)}rad`,
    };
  });
};

const MonitoringIndonesiaMap = ({
  points = [],
  selectedPointKey = '',
  onSelectPoint,
  unmappedLocations = [],
  formatDateTime,
}) => {
  const projectedPoints = buildProjectedPoints(points).map((point) => ({
    ...point,
    hasOffset: point.connectorLength >= 6,
  }));

  const selectedPoint =
    projectedPoints.find((point) => point.key === selectedPointKey) || projectedPoints[0] || null;

  const totalSignals = projectedPoints.reduce((sum, point) => sum + point.totalSignals, 0);
  const reviewHotspotsCount = projectedPoints.filter((point) => point.reviewCount > 0).length;
  const flaggedHotspotsCount = projectedPoints.filter((point) => point.flaggedJobCount > 0).length;

  if (projectedPoints.length === 0) {
    return (
      <div className="superadmin-empty-state is-panel">
        <div className="superadmin-empty-icon">⌁</div>
        <p>Belum ada lokasi yang bisa dipetakan untuk monitoring nasional.</p>
      </div>
    );
  }

  return (
    <>
      <div className="superadmin-panel-head superadmin-monitoring-map-head">
        <div>
          <h3>Peta Monitoring Indonesia</h3>
          <p>
            Marker dibangun dari koordinat kota untuk memantau preferensi kandidat, recruiter,
            lowongan aktif, dan lamaran masuk.
          </p>
        </div>
        <div className="superadmin-monitoring-map-summary">
          <span className="superadmin-monitoring-map-summary-chip">
            <strong>{numberFormatter.format(projectedPoints.length)}</strong>
            <span>Kota termonitor</span>
          </span>
          <span className="superadmin-monitoring-map-summary-chip">
            <strong>{numberFormatter.format(totalSignals)}</strong>
            <span>Sinyal lokasi</span>
          </span>
          <span className="superadmin-monitoring-map-summary-chip">
            <strong>{numberFormatter.format(reviewHotspotsCount)}</strong>
            <span>Hotspot review</span>
          </span>
        </div>
      </div>

      <div className="superadmin-monitoring-map-stage">
        <svg
          className="superadmin-monitoring-map-svg"
          viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
          role="img"
          aria-label="Peta monitoring Indonesia dengan penanda kota"
        >
          <rect
            x="0"
            y="0"
            width={MAP_VIEWBOX.width}
            height={MAP_VIEWBOX.height}
            className="superadmin-monitoring-map-water"
          />

          <g className="superadmin-monitoring-map-grid">
            {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
              <line
                key={`vertical-${ratio}`}
                x1={MAP_VIEWBOX.width * ratio}
                y1="0"
                x2={MAP_VIEWBOX.width * ratio}
                y2={MAP_VIEWBOX.height}
              />
            ))}
            {[0.25, 0.5, 0.75].map((ratio) => (
              <line
                key={`horizontal-${ratio}`}
                x1="0"
                y1={MAP_VIEWBOX.height * ratio}
                x2={MAP_VIEWBOX.width}
                y2={MAP_VIEWBOX.height * ratio}
              />
            ))}
          </g>

          <g className="superadmin-monitoring-map-land">
            {MAIN_ISLAND_POLYGONS.map((polygon) => (
              <path key={polygon.id} d={buildPolygonPath(polygon.points)} />
            ))}
            {SMALL_ISLANDS.map((island) => {
              const projected = projectGeoPoint(island.latitude, island.longitude);

              return (
                <circle
                  key={island.id}
                  cx={projected.x}
                  cy={projected.y}
                  r={island.radius}
                />
              );
            })}
          </g>
        </svg>

        <div className="superadmin-monitoring-marker-layer">
          {projectedPoints.map((point) => (
            <div
              key={point.key}
              className="superadmin-monitoring-point"
              style={{
                left: `${point.anchorXPercent}%`,
                top: `${point.anchorYPercent}%`,
              }}
            >
              <span className={`superadmin-monitoring-anchor is-${point.tone}`} />

              {point.hasOffset ? (
                <span
                  className="superadmin-monitoring-marker-connector"
                  style={{
                    '--connector-angle': point.connectorAngle,
                    '--connector-length': `${point.connectorLength}px`,
                  }}
                />
              ) : null}

              <button
                type="button"
                className={`superadmin-monitoring-marker is-${point.tone}${
                  selectedPoint?.key === point.key ? ' is-selected' : ''
                }`}
                style={{
                  '--marker-size': `${point.markerSize}px`,
                  '--marker-offset-x': `${point.offsetX}px`,
                  '--marker-offset-y': `${point.offsetY}px`,
                }}
                onMouseEnter={() => onSelectPoint?.(point.key)}
                onFocus={() => onSelectPoint?.(point.key)}
                onClick={() => onSelectPoint?.(point.key)}
                aria-label={`${point.label}: ${numberFormatter.format(
                  point.totalSignals
                )} sinyal lokasi, status ${statusLabelByTone[point.tone]}`}
                aria-pressed={selectedPoint?.key === point.key}
                title={`${point.label} • ${numberFormatter.format(point.totalSignals)} sinyal lokasi`}
              >
                <span className="superadmin-monitoring-marker-core" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="superadmin-monitoring-map-footer">
        <div className="superadmin-monitoring-map-legend">
          <span className="superadmin-monitoring-map-legend-item">
            <i className="is-success" />
            Lokasi normal
          </span>
          <span className="superadmin-monitoring-map-legend-item">
            <i className="is-warning" />
            Perlu review
          </span>
          <span className="superadmin-monitoring-map-legend-item">
            <i className="is-danger" />
            Butuh tindakan
          </span>
          <span className="superadmin-monitoring-map-legend-note">
            Ukuran marker mengikuti kepadatan sinyal lokasi.
          </span>
          <span className="superadmin-monitoring-map-legend-note">
            Hotspot berdekatan digeser tipis dari anchor agar tetap bisa diklik.
          </span>
        </div>

        {selectedPoint ? (
          <div className={`superadmin-monitoring-map-detail is-${selectedPoint.tone}`}>
            <div className="superadmin-monitoring-map-detail-head">
              <div>
                <span className="superadmin-monitoring-map-detail-kicker">Hotspot terpilih</span>
                <strong>{selectedPoint.label}</strong>
                {selectedPoint.hasOffset ? (
                  <p>
                    Marker ditarik sedikit dari titik koordinat asli agar hotspot terdekat tetap
                    terbaca tanpa saling menutup.
                  </p>
                ) : selectedPoint.aliases.length > 1 ? (
                  <p>Alias lokasi: {formatAliases(selectedPoint.aliases)}</p>
                ) : (
                  <p>Koordinat digunakan sebagai anchor monitoring kota ini.</p>
                )}
              </div>
              <span className={`superadmin-inline-badge is-${selectedPoint.tone}`}>
                {statusLabelByTone[selectedPoint.tone]}
              </span>
            </div>

            <div className="superadmin-monitoring-map-detail-metrics">
              <div>
                <span>Lamaran</span>
                <strong>{numberFormatter.format(selectedPoint.applicationCount)}</strong>
              </div>
              <div>
                <span>Lowongan</span>
                <strong>{numberFormatter.format(selectedPoint.jobCount)}</strong>
              </div>
              <div>
                <span>Recruiter</span>
                <strong>{numberFormatter.format(selectedPoint.recruiterCount)}</strong>
              </div>
              <div>
                <span>Preferensi kandidat</span>
                <strong>{numberFormatter.format(selectedPoint.candidateInterestCount)}</strong>
              </div>
              <div>
                <span>Flagged / review</span>
                <strong>{numberFormatter.format(selectedPoint.reviewCount)}</strong>
              </div>
            </div>

            <div className="superadmin-monitoring-map-detail-meta">
              <span>
                Lat {selectedPoint.latitude.toFixed(4)} • Lng {selectedPoint.longitude.toFixed(4)}
              </span>
              <span>
                Update terakhir:{' '}
                {selectedPoint.lastUpdatedAt ? formatDateTime(selectedPoint.lastUpdatedAt) : 'Belum ada'}
              </span>
            </div>
          </div>
        ) : null}

        {unmappedLocations.length > 0 ? (
          <div className="superadmin-monitoring-map-note">
            <strong>Koordinat belum tersedia:</strong>{' '}
            {unmappedLocations.slice(0, 5).join(', ')}
            {unmappedLocations.length > 5
              ? `, +${numberFormatter.format(unmappedLocations.length - 5)} lokasi lain`
              : ''}
          </div>
        ) : (
          <div className="superadmin-monitoring-map-note is-success">
            Semua lokasi aktif di monitoring sudah memiliki koordinat.
          </div>
        )}

        {flaggedHotspotsCount > 0 ? (
          <div className="superadmin-monitoring-map-note is-warning">
            {numberFormatter.format(flaggedHotspotsCount)} hotspot memiliki lowongan flagged dan
            perlu perhatian admin.
          </div>
        ) : null}
      </div>
    </>
  );
};

export default MonitoringIndonesiaMap;
