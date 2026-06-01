/**
 * Browser/Web tools for the agent.
 * Lightweight server-side web browsing — fetch pages, extract text, follow links.
 * No Puppeteer needed for basic operations.
 */

/* ─── Fetch & Parse Web Page ─── */

export async function browseUrl(
  url: string,
  options?: { extractLinks?: boolean; maxLength?: number }
): Promise<{
  title: string;
  url: string;
  text: string;
  links?: { text: string; href: string }[];
  statusCode: number;
}> {
  const maxLen = options?.maxLength || 5000;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  const html = await res.text();

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, " ") : "";

  // Strip script/style/nav/footer/header tags
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Extract links if requested
  let links: { text: string; href: string }[] | undefined;
  if (options?.extractLinks) {
    const linkRegex = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    links = [];
    let match;
    while ((match = linkRegex.exec(cleaned)) !== null && links.length < 50) {
      const href = match[1];
      const linkText = match[2].replace(/<[^>]*>/g, "").trim();
      if (href && linkText && !href.startsWith("#") && !href.startsWith("javascript:")) {
        // Resolve relative URLs
        try {
          const resolved = new URL(href, url).toString();
          links.push({ text: linkText.substring(0, 100), href: resolved });
        } catch {}
      }
    }
  }

  // Convert remaining HTML to text
  const text = cleaned
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim()
    .substring(0, maxLen);

  return {
    title,
    url: res.url, // Final URL after redirects
    text,
    links,
    statusCode: res.status,
  };
}

/* ─── Follow/Click a URL ─── */

export async function clickUrl(
  url: string
): Promise<{ success: boolean; finalUrl: string; statusCode: number; message: string }> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    return {
      success: res.ok,
      finalUrl: res.url,
      statusCode: res.status,
      message: res.ok
        ? `Successfully navigated to ${res.url}`
        : `Request returned status ${res.status}`,
    };
  } catch (err: any) {
    return {
      success: false,
      finalUrl: url,
      statusCode: 0,
      message: `Failed to reach URL: ${err.message}`,
    };
  }
}

/* ─── Submit a Form (POST) ─── */

export async function submitForm(
  url: string,
  data: Record<string, string>,
  contentType?: string
): Promise<{ success: boolean; statusCode: number; body: string }> {
  try {
    let body: string;
    let ct: string;

    if (contentType === "json") {
      body = JSON.stringify(data);
      ct = "application/json";
    } else {
      body = new URLSearchParams(data).toString();
      ct = "application/x-www-form-urlencoded";
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Content-Type": ct,
      },
      body,
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    const responseText = await res.text();

    return {
      success: res.ok,
      statusCode: res.status,
      body: responseText.substring(0, 2000),
    };
  } catch (err: any) {
    return {
      success: false,
      statusCode: 0,
      body: `Failed: ${err.message}`,
    };
  }
}

/* ─── Web Search (Gemini Grounding — detailed, ~1-3s) ─── */

export async function webSearch(
  query: string
): Promise<{ results: { title: string; url: string; snippet: string }[]; summary?: string }> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;

  if (apiKey) {
    try {
      // Use Gemini generateContent with google_search grounding
      const t0 = Date.now();
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Research and provide detailed, factual information about: ${query}\n\nProvide specific numbers, data points, and sources where possible. Be thorough and comprehensive.` }] }],
            tools: [{ google_search: {} }],
            generationConfig: { maxOutputTokens: 2048 },
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const groundingChunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const searchQueries = data.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

        const results = groundingChunks.slice(0, 8).map((chunk: any) => ({
          title: chunk.web?.title || "",
          url: chunk.web?.uri || "",
          snippet: chunk.web?.title || "",
        }));

        console.log(`[webSearch] Gemini grounding: ${Date.now() - t0}ms, ${results.length} sources, ${text.length} chars`);
        return { results, summary: text.substring(0, 3000) };
      }
    } catch (err) {
      console.warn("[webSearch] Gemini grounding failed, trying fallback:", err);
    }
  }

  // Fallback: DuckDuckGo Instant Answer API (no key needed, fast JSON)
  try {
    const t0 = Date.now();
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
    const res = await fetch(ddgUrl, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    console.log(`[webSearch] DuckDuckGo fallback: ${Date.now() - t0}ms`);

    const results: { title: string; url: string; snippet: string }[] = [];
    if (data.AbstractText) {
      results.push({ title: data.Heading || query, url: data.AbstractURL || "", snippet: data.AbstractText.substring(0, 500) });
    }
    (data.RelatedTopics || []).slice(0, 6).forEach((t: any) => {
      if (t.Text && t.FirstURL) results.push({ title: t.Text.substring(0, 100), url: t.FirstURL, snippet: t.Text.substring(0, 300) });
    });
    return { results, summary: data.AbstractText || undefined };
  } catch {
    return { results: [], summary: "Web search temporarily unavailable. Please try again." };
  }
}
