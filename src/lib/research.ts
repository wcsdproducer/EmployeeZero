/**
 * Deep Research Tool — Multi-query, multi-source research pipeline.
 * 
 * 1. Generates 4-5 targeted search queries from a broad research topic
 * 2. Runs all searches in parallel via Gemini grounding
 * 3. Browses the top source URLs for detailed data
 * 4. Synthesizes everything into a comprehensive, sourced report
 */

import { webSearch, browseUrl } from "@/lib/browser";

const SYNTH_MODEL = "gemini-2.5-flash";

interface ResearchResult {
  report: string;
  sources: { title: string; url: string; snippet: string }[];
  queriesUsed: string[];
}

/** Generate targeted sub-queries from a broad research topic */
async function generateSearchQueries(topic: string): Promise<string[]> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return [topic]; // fallback to raw topic

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${SYNTH_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `You are a research strategist. Given this research topic, generate exactly 5 specific, diverse search queries that would find comprehensive data from different angles. Cover: factual data/statistics, expert analysis, recent updates (2025-2026), practical/real-world examples, and comparison/context.

Topic: "${topic}"

Return ONLY the 5 queries, one per line, no numbering or bullets. Each query should be a specific Google search query.` }] }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const queries = text.split("\n").map((q: string) => q.trim()).filter((q: string) => q.length > 5 && q.length < 200);
      if (queries.length >= 3) return queries.slice(0, 5);
    }
  } catch (err) {
    console.warn("[Research] Query generation failed:", err);
  }
  // Fallback: manual query variations
  return [
    topic,
    `${topic} statistics data 2025 2026`,
    `${topic} detailed breakdown`,
    `${topic} expert analysis`,
    `${topic} real examples cost`,
  ];
}

/** Browse a URL and extract useful text content */
async function fetchPageContent(url: string): Promise<string> {
  try {
    const result = await browseUrl(url, { maxLength: 4000 });
    if (result.statusCode === 200 && result.text.length > 100) {
      return `[Source: ${result.title || url}]\n${result.text}`;
    }
  } catch (err) {
    console.warn(`[Research] Failed to browse ${url}:`, err);
  }
  return "";
}

/** Synthesize all gathered data into a comprehensive report */
async function synthesize(topic: string, searchResults: string[], pageContents: string[], sources: { title: string; url: string }[]): Promise<string> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return searchResults.join("\n\n");

  const allData = [
    ...searchResults.map((s, i) => `--- Search Result ${i + 1} ---\n${s}`),
    ...pageContents.filter(Boolean).map((p, i) => `--- Page Content ${i + 1} ---\n${p}`),
  ].join("\n\n");

  // Truncate to avoid token overflow
  const truncatedData = allData.substring(0, 25000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${SYNTH_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `You are a senior research analyst. Compile a comprehensive, detailed research report from the data below.

RESEARCH TOPIC: "${topic}"

GATHERED DATA:
${truncatedData}

INSTRUCTIONS:
1. Create a well-structured report with clear sections and headers
2. Include SPECIFIC numbers, prices, percentages, and data points — never be vague
3. Cross-reference data across sources. If sources disagree, note the range
4. Include practical breakdowns (e.g., monthly budgets with line items)
5. Cite which sources your data comes from
6. Add a "Key Takeaways" section at the end
7. If data is from different years, note the most recent figures
8. Format for readability with bullet points and tables where helpful
9. Provide ranges (low/mid/high) when appropriate
10. The report should be thorough enough that the user doesn't need to do additional research

Write the report now:` }] }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Research synthesis failed — raw data available in sources.";
    }
  } catch (err) {
    console.error("[Research] Synthesis failed:", err);
  }
  return `Research data gathered but synthesis failed. Raw summaries:\n\n${searchResults.join("\n\n")}`;
}

/** Main deep research function — runs the full pipeline */
export async function deepResearch(topic: string): Promise<ResearchResult> {
  const t0 = Date.now();
  console.log(`[Research] Starting deep research: "${topic}"`);

  // Step 1: Generate targeted search queries
  const queries = await generateSearchQueries(topic);
  console.log(`[Research] Generated ${queries.length} queries in ${Date.now() - t0}ms`);

  // Step 2: Run all searches in parallel
  const searchPromises = queries.map(q => webSearch(q).catch(() => ({ results: [], summary: "" })));
  const searchResults = await Promise.all(searchPromises);
  console.log(`[Research] All searches completed in ${Date.now() - t0}ms`);

  // Collect all unique sources
  const sourceMap = new Map<string, { title: string; url: string; snippet: string }>();
  const summaries: string[] = [];

  for (const result of searchResults) {
    if (result.summary) summaries.push(result.summary);
    for (const r of (result.results || [])) {
      if (r.url && !sourceMap.has(r.url)) {
        sourceMap.set(r.url, { title: r.title, url: r.url, snippet: r.snippet || "" });
      }
    }
  }

  // Step 3: Browse top source URLs for deeper content (max 6 pages, in parallel)
  const topUrls = Array.from(sourceMap.values())
    .filter(s => s.url && !s.url.includes("youtube.com") && !s.url.includes("reddit.com"))
    .slice(0, 6)
    .map(s => s.url);

  console.log(`[Research] Browsing ${topUrls.length} source pages...`);
  const pagePromises = topUrls.map(url => 
    Promise.race([
      fetchPageContent(url),
      new Promise<string>(resolve => setTimeout(() => resolve(""), 8000)), // 8s timeout per page
    ])
  );
  const pageContents = await Promise.all(pagePromises);
  const validPages = pageContents.filter(Boolean);
  console.log(`[Research] Browsed ${validPages.length}/${topUrls.length} pages in ${Date.now() - t0}ms`);

  // Step 4: Synthesize everything into a comprehensive report
  const sources = Array.from(sourceMap.values());
  const report = await synthesize(topic, summaries, validPages, sources);
  console.log(`[Research] Complete in ${Date.now() - t0}ms — report: ${report.length} chars, ${sources.length} sources`);

  return {
    report,
    sources: sources.slice(0, 12),
    queriesUsed: queries,
  };
}
