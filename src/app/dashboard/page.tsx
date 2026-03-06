import { createSupabaseServerClient } from "@/lib/supabase-server";
import DashboardCharts from "./dashboard-charts";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();

  // Fetch all data in parallel
  const [imagesRes, captionsRes, votesRes, profilesRes] = await Promise.all([
    supabase.from("images").select("id, url, is_public, image_description"),
    supabase.from("captions").select("id, content, image_id"),
    supabase.from("caption_votes").select("id, caption_id, profile_id, vote_value"),
    supabase.from("profiles").select("id"),
  ]);

  const images = imagesRes.data || [];
  const captions = captionsRes.data || [];
  const votes = votesRes.data || [];
  const profiles = profilesRes.data || [];

  const totalImages = images.length;
  const publicImages = images.filter((i) => i.is_public).length;
  const totalCaptions = captions.length;
  const totalVotes = votes.length;
  const totalUsers = profiles.length;
  const avgCaptionsPerImage = totalImages > 0 ? (totalCaptions / totalImages).toFixed(1) : "0";

  // Orphaned images (no captions)
  const imageIdsWithCaptions = new Set(captions.map((c) => c.image_id));
  const orphanedImages = images.filter((i) => !imageIdsWithCaptions.has(i.id)).length;

  // Caption scores
  const captionScores: Record<string, { up: number; down: number; total: number }> = {};
  votes.forEach((v) => {
    if (!captionScores[v.caption_id]) captionScores[v.caption_id] = { up: 0, down: 0, total: 0 };
    captionScores[v.caption_id].total++;
    if (v.vote_value === 1) captionScores[v.caption_id].up++;
    else captionScores[v.caption_id].down++;
  });

  // Top 10 highest-rated captions
  const captionMap = new Map(captions.map((c) => [c.id, c]));
  const top10 = Object.entries(captionScores)
    .map(([id, s]) => ({ id, content: captionMap.get(id)?.content || "", net: s.up - s.down }))
    .sort((a, b) => b.net - a.net)
    .slice(0, 10);

  // Most controversial
  const controversial = Object.entries(captionScores)
    .filter(([, s]) => s.total >= 2)
    .map(([id, s]) => ({
      id,
      content: captionMap.get(id)?.content || "",
      score: s.total * (1 - Math.abs(s.up - s.down) / s.total),
      up: s.up,
      down: s.down,
      total: s.total,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Caption length vs avg vote score (bucketed by word count)
  const lengthBuckets: Record<string, { totalNet: number; count: number }> = {
    "1-3": { totalNet: 0, count: 0 },
    "4-6": { totalNet: 0, count: 0 },
    "7-10": { totalNet: 0, count: 0 },
    "11-15": { totalNet: 0, count: 0 },
    "16+": { totalNet: 0, count: 0 },
  };
  captions.forEach((c) => {
    const words = c.content.trim().split(/\s+/).length;
    const scores = captionScores[c.id];
    if (!scores) return;
    const net = scores.up - scores.down;
    let bucket: string;
    if (words <= 3) bucket = "1-3";
    else if (words <= 6) bucket = "4-6";
    else if (words <= 10) bucket = "7-10";
    else if (words <= 15) bucket = "11-15";
    else bucket = "16+";
    lengthBuckets[bucket].totalNet += net;
    lengthBuckets[bucket].count++;
  });
  const lengthData = Object.entries(lengthBuckets).map(([bucket, d]) => ({
    bucket,
    avg: d.count > 0 ? Number((d.totalNet / d.count).toFixed(2)) : 0,
  }));

  // Voter personality breakdown
  const voterStats: Record<string, { up: number; total: number }> = {};
  votes.forEach((v) => {
    if (!voterStats[v.profile_id]) voterStats[v.profile_id] = { up: 0, total: 0 };
    voterStats[v.profile_id].total++;
    if (v.vote_value === 1) voterStats[v.profile_id].up++;
  });
  let generous = 0, harsh = 0, balanced = 0;
  Object.values(voterStats).forEach((s) => {
    const ratio = s.up / s.total;
    if (ratio > 0.75) generous++;
    else if (ratio < 0.25) harsh++;
    else balanced++;
  });
  const personalityData = [
    { name: "Generous (>75% up)", value: generous, color: "#22c55e" },
    { name: "Harsh (<25% up)", value: harsh, color: "#ef4444" },
    { name: "Balanced", value: balanced, color: "#eab308" },
  ];

  // Top 10 images by engagement (total votes)
  const imageVoteCounts: Record<string, number> = {};
  captions.forEach((c) => {
    const scores = captionScores[c.id];
    if (!scores) return;
    imageVoteCounts[c.image_id] = (imageVoteCounts[c.image_id] || 0) + scores.total;
  });
  const imageMap = new Map(images.map((i) => [i.id, i]));
  const topEngagedImages = Object.entries(imageVoteCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id, count]) => ({ id, url: imageMap.get(id)?.url || "", votes: count }));

  // Vote distribution
  const totalUpvotes = votes.filter((v) => v.vote_value === 1).length;
  const totalDownvotes = votes.filter((v) => v.vote_value === -1).length;

  // Meme format detector
  const formats: Record<string, number> = {
    "POV:": 0, "Nobody:": 0, "When ": 0, "Me ": 0,
    "That feeling": 0, "The ": 0, "Other": 0,
  };
  captions.forEach((c) => {
    const text = c.content.trim();
    if (text.startsWith("POV:")) formats["POV:"]++;
    else if (text.startsWith("Nobody:")) formats["Nobody:"]++;
    else if (text.startsWith("When ")) formats["When "]++;
    else if (text.startsWith("Me ")) formats["Me "]++;
    else if (text.startsWith("That feeling")) formats["That feeling"]++;
    else if (text.startsWith("The ")) formats["The "]++;
    else formats["Other"]++;
  });
  const formatData = Object.entries(formats)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  // Caption graveyard — images where every caption has net negative
  const imagesCaptionScores: Record<string, { allNegative: boolean; captions: { content: string; net: number }[] }> = {};
  captions.forEach((c) => {
    const scores = captionScores[c.id];
    const net = scores ? scores.up - scores.down : 0;
    if (!imagesCaptionScores[c.image_id]) {
      imagesCaptionScores[c.image_id] = { allNegative: true, captions: [] };
    }
    imagesCaptionScores[c.image_id].captions.push({ content: c.content, net });
    if (net >= 0) imagesCaptionScores[c.image_id].allNegative = false;
  });
  const graveyardImages = Object.entries(imagesCaptionScores)
    .filter(([, d]) => d.allNegative && d.captions.length > 0 && d.captions.some((c) => c.net < 0))
    .map(([id, d]) => ({ id, url: imageMap.get(id)?.url || "", captions: d.captions }));

  const stats = [
    { label: "Total Images", value: totalImages, sub: `${publicImages} public` },
    { label: "Total Captions", value: totalCaptions },
    { label: "Total Votes", value: totalVotes },
    { label: "Total Users", value: totalUsers },
    { label: "Avg Captions/Image", value: avgCaptionsPerImage },
    { label: "Orphaned Images", value: orphanedImages },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-pink-500/20 rounded-2xl p-4">
            <p className="text-3xl font-bold text-white">{s.value}</p>
            <p className="text-sm text-gray-400 mt-1">{s.label}</p>
            {s.sub && <p className="text-xs text-pink-400 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      <DashboardCharts
        top10={top10}
        controversial={controversial}
        lengthData={lengthData}
        personalityData={personalityData}
        topEngagedImages={topEngagedImages}
        totalUpvotes={totalUpvotes}
        totalDownvotes={totalDownvotes}
        formatData={formatData}
        graveyardImages={graveyardImages}
      />
    </div>
  );
}
