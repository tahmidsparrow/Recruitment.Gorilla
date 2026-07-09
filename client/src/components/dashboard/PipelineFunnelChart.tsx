import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../theme/ThemeContext';
import { chartChrome, statusColorMap, NEGATIVE_TERMINAL } from '../../utils/chartColors';
import type { StatusCount } from '../../types';

/**
 * Horizontal bars of candidate counts per active pipeline stage, ordered by the
 * status SortOrder. Negative-terminal statuses (rejected/dropped) are excluded —
 * they show in the status donut instead. Bars use the status tone colors so they
 * match the StatusBadge pills.
 */
export default function PipelineFunnelChart({ data }: { data: StatusCount[] }) {
  const { theme } = useTheme();
  const chrome = chartChrome(theme);

  const stages = useMemo(
    () => data.filter((d) => !NEGATIVE_TERMINAL.has(d.status)).sort((a, b) => a.sortOrder - b.sortOrder),
    [data]
  );
  const colors = useMemo(
    () => statusColorMap(stages.map((s) => s.status)),
    // recompute colors when the theme flips
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stages, theme]
  );

  if (stages.length === 0) {
    return <p className="text-muted mb-0">No candidates in the pipeline yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, stages.length * 38)}>
      <BarChart layout="vertical" data={stages} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fill: chrome.axis, fontSize: 12 }} stroke={chrome.grid} />
        <YAxis
          type="category"
          dataKey="status"
          width={140}
          tick={{ fill: chrome.axis, fontSize: 12 }}
          stroke={chrome.grid}
        />
        <Tooltip
          cursor={{ fill: chrome.grid }}
          contentStyle={{
            background: chrome.tooltipBg,
            border: `1px solid ${chrome.tooltipBorder}`,
            borderRadius: 8,
            color: chrome.tooltipText,
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Candidates">
          {stages.map((s) => (
            <Cell key={s.status} fill={colors[s.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
