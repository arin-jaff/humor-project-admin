import { createSupabaseServerClient } from "@/lib/supabase-server";
import CaptionStatsCharts from "./caption-stats-charts";

export const dynamic = "force-dynamic";

const STOPWORDS = new Set([
  "the","and","for","are","but","not","you","all","any","can","had","her","was","one","our","out",
  "day","get","has","him","his","how","man","new","now","old","see","two","way","who","boy","did",
  "its","let","put","say","she","too","use","that","this","with","from","they","them","their","have",
  "been","were","will","what","when","your","just","like","only","some","more","than","then","very",
  "into","over","such","also","back","down","here","much","even","well","ever","many","most","upon",
  "these","those","about","after","again","before","being","every","first","great","other","right",
  "still","thing","think","three","under","where","while","would","could","should","never","always",
  "its","you","yes","no","pov","when","nobody","me","is","it","a","i","to","of","in","on","at","as","or","an","by","we","am","do","if","so","up","my","be","he","us","go",
]);

function containsEmoji(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // BMP symbol/dingbat ranges (☀ ★ ✓ etc.)
    if (code >= 0x2600 && code <= 0x27BF) return true;
    // High surrogate — beginning of an astral-plane char (most emoji live here)
    if (code >= 0xD83C && code <= 0xD83E) return true;
  }
  return false;
}

function isMostlyCaps(text: string): boolean {
  const letters = text.match(/[a-zA-Z]/g) || [];
  if (letters.length < 4) return false;
  const uppers = text.match(/[A-Z]/g) || [];
  return uppers.length / letters.length > 0.6;
}

function endingPunctuation(text: string): "?" | "!" | "..." | "." | "none" {
  const trimmed = text.trim();
  if (trimmed.endsWith("...") || trimmed.endsWith("…")) return "...";
  if (trimmed.endsWith("?")) return "?";
  if (trimmed.endsWith("!")) return "!";
  if (trimmed.endsWith(".")) return ".";
  return "none";
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z']+/g) || []).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

export default async function CaptionStatsPage() {
  const supabase = createSupabaseServerClient();

  const [captionsRes, votesRes, imagesRes] = await Promise.all([
    supabase.from("captions").select("id, content, image_id"),
    supabase.from("caption_votes").select("id, caption_id, vote_value, created_datetime_utc"),
    supabase.from("images").select("id, url"),
  ]);

  const captions = captionsRes.data || [];
  const votes = votesRes.data || [];
  const images = imagesRes.data || [];
  const imageMap = new Map(images.map((i) => [i.id, i]));

  const captionScores: Record<string, { up: number; down: number; total: number }> = {};
  votes.forEach((v) => {
    if (!captionScores[v.caption_id]) captionScores[v.caption_id] = { up: 0, down: 0, total: 0 };
    captionScores[v.caption_id].total++;
    if (v.vote_value === 1) captionScores[v.caption_id].up++;
    else captionScores[v.caption_id].down++;
  });

  const enriched = captions
    .filter((c) => c.content)
    .map((c) => {
      const s = captionScores[c.id] || { up: 0, down: 0, total: 0 };
      return {
        id: c.id,
        content: c.content as string,
        image_id: c.image_id as string,
        up: s.up,
        down: s.down,
        total: s.total,
        net: s.up - s.down,
      };
    });

  const voted = enriched.filter((c) => c.total > 0);
  const overallAvgNet = voted.length > 0 ? voted.reduce((a, c) => a + c.net, 0) / voted.length : 0;

  // 🐐 GOAT caption — highest net score with at least 3 total votes
  const goatCandidates = voted.filter((c) => c.total >= 3);
  const goat = goatCandidates.sort((a, b) => b.net - a.net)[0] || null;
  const goatImage = goat ? imageMap.get(goat.image_id) : null;

  // Bomb-proof club (all upvotes, min 3 votes) + Unanimously Hated (all downvotes, min 3 votes)
  const bombProof = voted
    .filter((c) => c.down === 0 && c.up >= 3)
    .sort((a, b) => b.up - a.up)
    .slice(0, 8);
  const unanimouslyHated = voted
    .filter((c) => c.up === 0 && c.down >= 3)
    .sort((a, b) => b.down - a.down)
    .slice(0, 8);

  // Word power rankings
  const wordStats: Record<string, { total: number; sumNet: number }> = {};
  voted.forEach((c) => {
    const uniq = new Set(tokenize(c.content));
    uniq.forEach((w) => {
      if (!wordStats[w]) wordStats[w] = { total: 0, sumNet: 0 };
      wordStats[w].total++;
      wordStats[w].sumNet += c.net;
    });
  });
  const wordPower = Object.entries(wordStats)
    .filter(([, s]) => s.total >= 3)
    .map(([word, s]) => ({ word, count: s.total, avgNet: s.sumNet / s.total, lift: s.sumNet / s.total - overallAvgNet }));
  const winnerWords = [...wordPower].sort((a, b) => b.lift - a.lift).slice(0, 10);
  const loserWords = [...wordPower].sort((a, b) => a.lift - b.lift).slice(0, 10);

  // Punctuation power
  const punctAgg: Record<string, { total: number; sumNet: number }> = {
    "?": { total: 0, sumNet: 0 },
    "!": { total: 0, sumNet: 0 },
    "...": { total: 0, sumNet: 0 },
    ".": { total: 0, sumNet: 0 },
    "none": { total: 0, sumNet: 0 },
  };
  voted.forEach((c) => {
    const p = endingPunctuation(c.content);
    punctAgg[p].total++;
    punctAgg[p].sumNet += c.net;
  });
  const punctData = Object.entries(punctAgg)
    .filter(([, d]) => d.total > 0)
    .map(([name, d]) => ({
      name: name === "none" ? "No punct" : name,
      avgNet: Number((d.sumNet / d.total).toFixed(2)),
      count: d.total,
    }));

  // Emoji effect
  const emojiAgg = { with: { total: 0, sumNet: 0 }, without: { total: 0, sumNet: 0 } };
  voted.forEach((c) => {
    const key = containsEmoji(c.content) ? "with" : "without";
    emojiAgg[key].total++;
    emojiAgg[key].sumNet += c.net;
  });
  const emojiEffect = {
    withEmoji: { count: emojiAgg.with.total, avgNet: emojiAgg.with.total > 0 ? emojiAgg.with.sumNet / emojiAgg.with.total : 0 },
    withoutEmoji: { count: emojiAgg.without.total, avgNet: emojiAgg.without.total > 0 ? emojiAgg.without.sumNet / emojiAgg.without.total : 0 },
  };

  // Caps lock effect
  const capsAgg = { caps: { total: 0, sumNet: 0 }, normal: { total: 0, sumNet: 0 } };
  voted.forEach((c) => {
    const key = isMostlyCaps(c.content) ? "caps" : "normal";
    capsAgg[key].total++;
    capsAgg[key].sumNet += c.net;
  });
  const capsEffect = {
    caps: { count: capsAgg.caps.total, avgNet: capsAgg.caps.total > 0 ? capsAgg.caps.sumNet / capsAgg.caps.total : 0 },
    normal: { count: capsAgg.normal.total, avgNet: capsAgg.normal.total > 0 ? capsAgg.normal.sumNet / capsAgg.normal.total : 0 },
  };

  // Sweet spot: exact word count (1..20, 20+)
  const sweetAgg: Record<number, { total: number; sumNet: number }> = {};
  voted.forEach((c) => {
    const words = c.content.trim().split(/\s+/).length;
    const bucket = words >= 20 ? 20 : words;
    if (!sweetAgg[bucket]) sweetAgg[bucket] = { total: 0, sumNet: 0 };
    sweetAgg[bucket].total++;
    sweetAgg[bucket].sumNet += c.net;
  });
  const sweetSpot = Object.entries(sweetAgg)
    .map(([k, v]) => ({
      words: Number(k),
      label: Number(k) === 20 ? "20+" : String(k),
      avgNet: Number((v.sumNet / v.total).toFixed(2)),
      count: v.total,
    }))
    .sort((a, b) => a.words - b.words);

  // Voting activity heatmap (day of week × hour of day)
  const heat: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  votes.forEach((v) => {
    if (!v.created_datetime_utc) return;
    const d = new Date(v.created_datetime_utc);
    if (isNaN(d.getTime())) return;
    heat[d.getDay()][d.getHours()]++;
  });
  const heatmap = { matrix: heat, max: Math.max(1, ...heat.flat()) };

  // Controversy champion images — images whose captions are most polarizing overall
  const imageControversy: Record<string, { sumControversy: number; count: number; url: string }> = {};
  voted.forEach((c) => {
    if (c.total < 3) return;
    const controversy = c.total * (1 - Math.abs(c.up - c.down) / c.total);
    if (!imageControversy[c.image_id]) {
      imageControversy[c.image_id] = { sumControversy: 0, count: 0, url: imageMap.get(c.image_id)?.url || "" };
    }
    imageControversy[c.image_id].sumControversy += controversy;
    imageControversy[c.image_id].count++;
  });
  const controversyChampions = Object.entries(imageControversy)
    .filter(([, d]) => d.count >= 2 && d.url)
    .map(([id, d]) => ({ id, url: d.url, avg: d.sumControversy / d.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 6);

  // Headline numbers
  const analyzed = voted.length;
  const totalWordsAnalyzed = voted.reduce((a, c) => a + c.content.split(/\s+/).length, 0);
  const perfectCaptions = bombProof.length + unanimouslyHated.length;
  const approvalRate = voted.length > 0
    ? (voted.reduce((a, c) => a + c.up, 0) / voted.reduce((a, c) => a + c.total, 0)) * 100
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Caption Stats</h1>
        <p className="text-sm text-gray-500 mt-1">What makes a caption land? Let&rsquo;s find out.</p>
      </div>

      <CaptionStatsCharts
        goat={goat ? { ...goat, imageUrl: goatImage?.url } : null}
        bombProof={bombProof}
        unanimouslyHated={unanimouslyHated}
        winnerWords={winnerWords}
        loserWords={loserWords}
        punctData={punctData}
        emojiEffect={emojiEffect}
        capsEffect={capsEffect}
        sweetSpot={sweetSpot}
        heatmap={heatmap}
        controversyChampions={controversyChampions}
        headline={{
          analyzed,
          totalWords: totalWordsAnalyzed,
          perfectCaptions,
          approvalRate: Number(approvalRate.toFixed(1)),
        }}
      />
    </div>
  );
}
