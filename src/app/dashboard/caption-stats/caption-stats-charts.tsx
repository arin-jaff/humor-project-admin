"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList,
} from "recharts";

interface Caption {
  id: string;
  content: string;
  up: number;
  down: number;
  total: number;
  net: number;
}

interface Props {
  goat: (Caption & { imageUrl?: string }) | null;
  bombProof: Caption[];
  unanimouslyHated: Caption[];
  winnerWords: { word: string; count: number; avgNet: number; lift: number }[];
  loserWords: { word: string; count: number; avgNet: number; lift: number }[];
  punctData: { name: string; avgNet: number; count: number }[];
  emojiEffect: {
    withEmoji: { count: number; avgNet: number };
    withoutEmoji: { count: number; avgNet: number };
  };
  capsEffect: {
    caps: { count: number; avgNet: number };
    normal: { count: number; avgNet: number };
  };
  sweetSpot: { words: number; label: string; avgNet: number; count: number }[];
  heatmap: { matrix: number[][]; max: number };
  controversyChampions: { id: string; url: string; avg: number }[];
  headline: { analyzed: number; totalWords: number; perfectCaptions: number; approvalRate: number };
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TOOLTIP_STYLE = { background: "#18181b", border: "1px solid #ec489933", borderRadius: 12, color: "#fff" };

export default function CaptionStatsCharts(props: Props) {
  const {
    goat, bombProof, unanimouslyHated, winnerWords, loserWords, punctData,
    emojiEffect, capsEffect, sweetSpot, heatmap, controversyChampions, headline,
  } = props;

  if (headline.analyzed === 0) {
    return (
      <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-12 text-center">
        <p className="text-gray-500">No captions have been voted on yet. Check back once users start rating!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Headline metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HeadlineCard emoji="📝" label="Captions Analyzed" value={headline.analyzed.toLocaleString()} />
        <HeadlineCard emoji="💬" label="Words Analyzed" value={headline.totalWords.toLocaleString()} />
        <HeadlineCard emoji="✨" label="Perfect-Score Captions" value={headline.perfectCaptions.toString()} sub="100% agreement" />
        <HeadlineCard emoji="👍" label="Overall Approval Rate" value={`${headline.approvalRate}%`} sub="of all votes are upvotes" />
      </div>

      {/* GOAT Caption */}
      {goat && (
        <div className="bg-gradient-to-br from-pink-500/10 via-zinc-900 to-zinc-900 border border-pink-500/30 rounded-2xl p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">🐐</span>
            <div>
              <h2 className="text-lg font-semibold text-white">Caption of All Time</h2>
              <p className="text-xs text-gray-500">The single highest-scoring caption in the database</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {goat.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={goat.imageUrl} alt="" className="w-48 h-48 object-cover rounded-2xl border border-pink-500/30 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-xl md:text-2xl text-white font-medium italic leading-snug mb-4">
                &ldquo;{goat.content}&rdquo;
              </p>
              <div className="flex flex-wrap gap-3">
                <Pill color="pink" label="Net Score" value={`+${goat.net}`} />
                <Pill color="green" label="Upvotes" value={goat.up.toString()} />
                <Pill color="red" label="Downvotes" value={goat.down.toString()} />
                <Pill color="gray" label="Approval" value={`${Math.round((goat.up / goat.total) * 100)}%`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Perfect Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerfectList
          title="🛡️ Bomb-Proof Club"
          subtitle="Captions with zero downvotes (min 3 votes)"
          captions={bombProof}
          accent="green"
          metric={(c) => `${c.up} up`}
          emptyText="Nobody has locked in a perfect streak yet."
        />
        <PerfectList
          title="💀 Unanimously Hated"
          subtitle="Captions with zero upvotes (min 3 votes)"
          captions={unanimouslyHated}
          accent="red"
          metric={(c) => `${c.down} down`}
          emptyText="No one has been universally rejected. Yet."
        />
      </div>

      {/* Word Power Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WordPowerChart
          title="🔥 Winner Words"
          subtitle="Words that boost a caption's score the most when used"
          words={winnerWords}
          color="#22c55e"
          positive
        />
        <WordPowerChart
          title="🧊 Flop Words"
          subtitle="Words that drag a caption's score down when used"
          words={loserWords}
          color="#ef4444"
          positive={false}
        />
      </div>

      {/* Punctuation Power + Style Comparisons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Punctuation Power</h2>
          <p className="text-xs text-gray-500 mb-4">Avg net score by how captions end</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={punctData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, _n: any, p: any) => [`${v} avg (${p?.payload?.count ?? 0} captions)`, "Net Score"]} />
              <Bar dataKey="avgNet" radius={[4, 4, 0, 0]}>
                {punctData.map((d, i) => (
                  <Cell key={i} fill={d.avgNet >= 0 ? "#ec4899" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <ComparisonCard
          title="The Emoji Effect"
          emoji="🎉"
          a={{ label: "With emoji", count: emojiEffect.withEmoji.count, avgNet: emojiEffect.withEmoji.avgNet }}
          b={{ label: "No emoji", count: emojiEffect.withoutEmoji.count, avgNet: emojiEffect.withoutEmoji.avgNet }}
        />

        <ComparisonCard
          title="The CAPS LOCK Effect"
          emoji="🔊"
          a={{ label: "MOSTLY CAPS", count: capsEffect.caps.count, avgNet: capsEffect.caps.avgNet }}
          b={{ label: "Normal case", count: capsEffect.normal.count, avgNet: capsEffect.normal.avgNet }}
        />
      </div>

      {/* Word Count Sweet Spot */}
      <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Word Count Sweet Spot</h2>
        <p className="text-xs text-gray-500 mb-4">Avg net score at every exact word count. Bars are colored by caption volume.</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={sweetSpot}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="label" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any, _n: any, p: any) => [`${v} (${p?.payload?.count ?? 0} captions)`, "Avg Net"]}
              labelFormatter={(l) => `${l} word${l === "1" ? "" : "s"}`}
            />
            <Bar dataKey="avgNet" radius={[4, 4, 0, 0]}>
              {sweetSpot.map((d, i) => (
                <Cell key={i} fill={d.avgNet >= 0 ? "#ec4899" : "#6b7280"} fillOpacity={Math.min(1, 0.35 + d.count / 20)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Activity Heatmap */}
      <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold text-white mb-1">When Are People Voting?</h2>
        <p className="text-xs text-gray-500 mb-4">Votes cast per hour of each day (darker = hotter)</p>
        <Heatmap matrix={heatmap.matrix} max={heatmap.max} />
      </div>

      {/* Controversy Champion Images */}
      {controversyChampions.length > 0 && (
        <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">⚔️ Most Polarizing Images</h2>
          <p className="text-xs text-gray-500 mb-4">Images whose captions spark the fiercest vote disagreement</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {controversyChampions.map((img, i) => (
              <div key={img.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="w-full aspect-square object-cover rounded-xl border border-zinc-800" />
                <div className="absolute top-2 left-2 bg-pink-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">#{i + 1}</div>
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                  {img.avg.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HeadlineCard({ emoji, label, value, sub }: { emoji: string; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{emoji}</span>
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function Pill({ color, label, value }: { color: "pink" | "green" | "red" | "gray"; label: string; value: string }) {
  const colors = {
    pink: "bg-pink-500/15 text-pink-300 border-pink-500/30",
    green: "bg-green-500/15 text-green-400 border-green-500/30",
    red: "bg-red-500/15 text-red-400 border-red-500/30",
    gray: "bg-zinc-800 text-gray-300 border-zinc-700",
  }[color];
  return (
    <div className={`inline-flex items-center gap-2 border rounded-full px-3 py-1 ${colors}`}>
      <span className="text-xs uppercase tracking-wider opacity-70">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function PerfectList({
  title, subtitle, captions, accent, metric, emptyText,
}: {
  title: string; subtitle: string; captions: Caption[]; accent: "green" | "red"; metric: (c: Caption) => string; emptyText: string;
}) {
  const badgeColor = accent === "green" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400";
  const borderColor = accent === "green" ? "border-green-500/20" : "border-red-500/20";
  return (
    <div className={`bg-zinc-900 border ${borderColor} rounded-2xl p-6`}>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="text-xs text-gray-500 mb-4">{subtitle}</p>
      {captions.length === 0 ? (
        <p className="text-sm text-gray-500 italic">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {captions.map((c) => (
            <li key={c.id} className="flex items-start gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badgeColor}`}>{metric(c)}</span>
              <p className="text-sm text-gray-300 line-clamp-2">&ldquo;{c.content}&rdquo;</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WordPowerChart({
  title, subtitle, words, color, positive,
}: {
  title: string; subtitle: string; words: { word: string; count: number; avgNet: number; lift: number }[]; color: string; positive: boolean;
}) {
  const data = words.map((w) => ({ ...w, lift: Number(w.lift.toFixed(2)) }));
  return (
    <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="text-xs text-gray-500 mb-4">{subtitle}</p>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Not enough data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis type="number" stroke="#9ca3af" />
            <YAxis type="category" dataKey="word" width={90} stroke="#9ca3af" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any, _n: any, p: any) => [
                `${positive ? "+" : ""}${v} (${p?.payload?.count ?? 0} captions)`,
                "Score Lift",
              ]}
            />
            <Bar dataKey="lift" fill={color} radius={positive ? [0, 4, 4, 0] : [4, 0, 0, 4]}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <LabelList dataKey="count" position="right" fill="#6b7280" fontSize={11} formatter={(v: any) => `×${v}`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function ComparisonCard({
  title, emoji, a, b,
}: {
  title: string; emoji: string;
  a: { label: string; count: number; avgNet: number };
  b: { label: string; count: number; avgNet: number };
}) {
  const winner = a.count > 0 && b.count > 0 ? (a.avgNet > b.avgNet ? "a" : a.avgNet < b.avgNet ? "b" : null) : null;
  const diff = a.count > 0 && b.count > 0 ? (a.avgNet - b.avgNet).toFixed(2) : null;
  return (
    <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{emoji}</span>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <p className="text-xs text-gray-500 mb-5">Avg net score comparison</p>
      <div className="space-y-4">
        {[{ side: "a", d: a }, { side: "b", d: b }].map(({ side, d }) => {
          const isWinner = winner === side;
          return (
            <div key={side} className={`p-3 rounded-xl border ${isWinner ? "border-pink-500/40 bg-pink-500/5" : "border-zinc-800 bg-zinc-950"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300">{d.label}</span>
                {isWinner && <span className="text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full">Winner</span>}
              </div>
              <p className={`text-2xl font-bold ${d.avgNet >= 0 ? "text-green-400" : "text-red-400"}`}>
                {d.avgNet >= 0 ? "+" : ""}{d.avgNet.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{d.count} captions</p>
            </div>
          );
        })}
      </div>
      {diff !== null && (
        <p className="text-xs text-gray-500 mt-3 text-center">Gap: <span className="text-gray-300 font-semibold">{diff}</span> points</p>
      )}
    </div>
  );
}

function Heatmap({ matrix, max }: { matrix: number[][]; max: number }) {
  return (
    <div className="inline-block min-w-full">
      <div className="flex items-center gap-1 mb-1 pl-10">
        {Array.from({ length: 24 }).map((_, h) => (
          <div key={h} className="w-7 text-[10px] text-gray-500 text-center">
            {h % 3 === 0 ? h : ""}
          </div>
        ))}
      </div>
      {matrix.map((row, d) => (
        <div key={d} className="flex items-center gap-1 mb-1">
          <div className="w-10 text-xs text-gray-400">{DAY_LABELS[d]}</div>
          {row.map((count, h) => {
            const intensity = count === 0 ? 0 : Math.min(1, 0.1 + (count / max) * 0.9);
            return (
              <div
                key={h}
                className="w-7 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: `rgba(236, 72, 153, ${intensity})`, border: "1px solid #27272a" }}
                title={`${DAY_LABELS[d]} ${h}:00 — ${count} vote${count === 1 ? "" : "s"}`}
              >
                {count > 0 && count === max && <span className="text-[9px] text-white font-bold">{count}</span>}
              </div>
            );
          })}
        </div>
      ))}
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
        <span>Cooler</span>
        <div className="flex">
          {[0.1, 0.25, 0.45, 0.7, 1.0].map((o, i) => (
            <div key={i} className="w-6 h-3" style={{ backgroundColor: `rgba(236, 72, 153, ${o})` }} />
          ))}
        </div>
        <span>Hotter (max: {max})</span>
      </div>
    </div>
  );
}
