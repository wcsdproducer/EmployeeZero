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

/* ─── Google Search ─── */

export async function webSearch(
  query: string
): Promise<{ results: { title: string; url: string; snippet: string }[] }> {
  // Use Google's pagead-free search endpoint for structured results
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=5`;

  const res = await fetch(searchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(10000),
  });

  const html = await res.text();

  // Extract search results (simplified parsing)
  const results: { title: string; url: string; snippet: string }[] = [];
  const resultBlocks = html.split('<div class="g"');

  for (const block of resultBlocks.slice(1, 6)) {
    const urlMatch = block.match(/href="(https?:\/\/[^"]+)"/);
    const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    const snippetMatch = block.match(/<span[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/span>/);

    if (urlMatch && titleMatch) {
      results.push({
        title: titleMatch[1].replace(/<[^>]*>/g, "").trim(),
        url: urlMatch[1],
        snippet: snippetMatch
          ? snippetMatch[1].replace(/<[^>]*>/g, "").trim().substring(0, 200)
          : "",
      });
    }
  }

  return { results };
}
