"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { useState } from "react";

interface Props {
  top10: { id: string; content: string; net: number }[];
  controversial: { id: string; content: string; score: number; up: number; down: number; total: number }[];
  lengthData: { bucket: string; avg: number }[];
  personalityData: { name: string; value: number; color: string }[];
  topEngagedImages: { id: string; url: string; votes: number }[];
  totalUpvotes: number;
  totalDownvotes: number;
  formatData: { name: string; value: number }[];
  graveyardImages: { id: string; url: string; captions: { content: string; net: number }[] }[];
}

const PINK = "#ec4899";
const FORMAT_COLORS = ["#ec4899", "#8b5cf6", "#3b82f6", "#22c55e", "#eab308", "#f97316", "#6b7280"];

export default function DashboardCharts({
  top10, controversial, lengthData, personalityData,
  topEngagedImages, totalUpvotes, totalDownvotes, formatData, graveyardImages,
}: Props) {
  const [graveyardOpen, setGraveyardOpen] = useState(false);

  return (
    <div className="space-y-8">
      {/* Row 1: Top 10 Captions + Vote Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900 border border-pink-500/20 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top 10 Highest-Rated Captions</h2>
          {top10.length === 0 ? (
            <p className="text-gray-500">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={top10} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis
                  type="category"
                  dataKey="content"
                  width={200}
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickFormatter={(v: string) => v.length > 30 ? v.slice(0, 30) + "..." : v}
                />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #ec489933", borderRadius: 12, color: "#fff" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [value, "Net Score"]}
                />
                <Bar dataKey="net" fill={PINK} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Vote Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { type: "Upvotes", count: totalUpvotes },
              { type: "Downvotes", count: totalDownvotes },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="type" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #ec489933", borderRadius: 12, color: "#fff" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                <Cell fill="#22c55e" />
                <Cell fill="#ef4444" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <span className="text-green-400">+{totalUpvotes} upvotes</span>
            <span className="text-red-400">-{totalDownvotes} downvotes</span>
          </div>
        </div>
      </div>

      {/* Row 2: Most Controversial */}
      <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Most Controversial Captions</h2>
        {controversial.length === 0 ? (
          <p className="text-gray-500">Not enough votes yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {controversial.map((c) => (
              <div key={c.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <p className="text-sm text-gray-300 mb-3 line-clamp-3">&ldquo;{c.content}&rdquo;</p>
                <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden flex">
                  <div className="bg-green-500 h-full" style={{ width: `${(c.up / c.total) * 100}%` }} />
                  <div className="bg-red-500 h-full" style={{ width: `${(c.down / c.total) * 100}%` }} />
                </div>
                <div className="flex justify-between text-xs mt-1.5">
                  <span className="text-green-400">{c.up} up</span>
                  <span className="text-gray-500">{c.total} total</span>
                  <span className="text-red-400">{c.down} down</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Row 3: Caption Length + Voter Personality + Meme Formats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Caption Length vs Score</h2>
          <p className="text-xs text-gray-500 mb-4">Are shorter captions funnier?</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={lengthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="bucket" stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #ec489933", borderRadius: 12, color: "#fff" }} />
              <Bar dataKey="avg" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Avg Net Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Voter Personality</h2>
          {personalityData.every((d) => d.value === 0) ? (
            <p className="text-gray-500">No voters yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={personalityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {personalityData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #ec489933", borderRadius: 12, color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1 mt-2">
                {personalityData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-gray-400">{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Meme Format Prevalence</h2>
          {formatData.length === 0 ? (
            <p className="text-gray-500">No captions yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={formatData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {formatData.map((_, i) => <Cell key={i} fill={FORMAT_COLORS[i % FORMAT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #ec489933", borderRadius: 12, color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {formatData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: FORMAT_COLORS[i % FORMAT_COLORS.length] }} />
                    <span className="text-gray-400">{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 4: Top Engaged Images */}
      <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Top 10 Images by Engagement</h2>
        {topEngagedImages.length === 0 ? (
          <p className="text-gray-500">No data yet</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {topEngagedImages.map((img) => (
              <div key={img.id} className="flex-shrink-0 relative group">
                <img
                  src={img.url}
                  alt=""
                  className="w-32 h-32 object-cover rounded-xl border border-zinc-800"
                />
                <div className="absolute top-2 right-2 bg-pink-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {img.votes}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Row 5: Caption Graveyard */}
      <div className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Caption Graveyard</h2>
            <p className="text-sm text-gray-500">Images where every caption has a net negative score</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-red-400">{graveyardImages.length}</span>
            {graveyardImages.length > 0 && (
              <button
                onClick={() => setGraveyardOpen(!graveyardOpen)}
                className="text-sm text-pink-400 hover:text-pink-300 transition-colors"
              >
                {graveyardOpen ? "Collapse" : "Expand"}
              </button>
            )}
          </div>
        </div>
        {graveyardOpen && graveyardImages.length > 0 && (
          <div className="mt-4 space-y-3">
            {graveyardImages.map((img) => (
              <div key={img.id} className="flex gap-4 bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                {img.url && (
                  <img src={img.url} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="space-y-1">
                  {img.captions.map((c, i) => (
                    <p key={i} className="text-sm text-red-400">
                      &ldquo;{c.content}&rdquo; <span className="text-red-600">({c.net})</span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
