// /api/scan.js
// Vercel serverless function - scans a single prompt through Claude with web search
// Returns: brand mentions, competitor names, source URLs, full response
//
// Requires: ANTHROPIC_API_KEY in Vercel environment variables
// Usage: POST /api/scan { prompt: "best bernedoodle breeder Wisconsin" }

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: prompt
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();

    // Extract text from response
    const fullText = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    // Extract cited URLs from web search results
    const citations = [];
    data.content.forEach(block => {
      if (block.type === 'text' && block.citations) {
        block.citations.forEach(c => {
          if (c.url && !citations.includes(c.url)) citations.push(c.url);
        });
      }
    });

    // Also try to extract URLs from the text itself
    const urlMatches = fullText.match(/https?:\/\/[^\s\)]+/g) || [];
    urlMatches.forEach(u => {
      const clean = u.replace(/[.,;:!?\]]+$/, '');
      if (!citations.includes(clean)) citations.push(clean);
    });

    // Analyze for brand mentions
    const textLower = fullText.toLowerCase();

    // Stokeshire detection
    const stokeshireMentioned =
      textLower.includes('stokeshire') ||
      textLower.includes('wisconsin designer doodles') ||
      textLower.includes('wisconsindesignerdoodles') ||
      citations.some(u => u.includes('wisconsindesignerdoodles'));

    // Competitor detection - known competitors in the doodle space
    const COMPETITORS = [
      { name: 'Happy Doodle Farm', patterns: ['happy doodle', 'happydoodlefarm'] },
      { name: 'SwissRidge Kennels', patterns: ['swissridge'] },
      { name: 'Crockett Doodles', patterns: ['crockett doodle'] },
      { name: 'PuppySpot', patterns: ['puppyspot'] },
      { name: 'Premier Pups', patterns: ['premier pups', 'premierpups'] },
      { name: 'Greenfield Puppies', patterns: ['greenfield puppies', 'greenfieldpuppies'] },
      { name: 'Lancaster Puppies', patterns: ['lancaster puppies', 'lancasterpuppies'] },
      { name: 'Good Dog', patterns: ['gooddog.com', 'good dog'] },
      { name: 'Uptown Puppies', patterns: ['uptown puppies', 'uptownpuppies'] },
      { name: 'Jenna Lee Designer Doodles', patterns: ['jenna lee'] },
      { name: 'Highfalutin Furry Babies', patterns: ['highfalutin'] },
      { name: 'Fox Creek Farm', patterns: ['fox creek farm', 'foxcreekfarm'] },
      { name: 'Mountain Rose Doodles', patterns: ['mountain rose'] },
      { name: 'Blue Diamond Family Pups', patterns: ['blue diamond'] },
      { name: 'Trending Breeds', patterns: ['trendingbreeds', 'trending breeds'] },
      { name: 'AwesomeDoodle', patterns: ['awesomedoodle'] },
      { name: 'Texas Doodles', patterns: ['texas doodles'] },
      { name: 'Doodle Creek', patterns: ['doodle creek', 'doodlecreek'] },
      { name: 'Red Barn Aussiedoodles', patterns: ['red barn aussie'] },
      { name: 'Sierra Vista Doodles', patterns: ['sierra vista'] },
    ];

    const competitorsFound = [];
    COMPETITORS.forEach(comp => {
      const found = comp.patterns.some(p =>
        textLower.includes(p) || citations.some(u => u.toLowerCase().includes(p))
      );
      if (found) competitorsFound.push(comp.name);
    });

    // Also detect any breeder-like mentions we don't have in our list
    // by looking for patterns like "X Doodles", "X Kennels", "X Puppies"
    const unknownBreeders = [];
    const breederPatterns = fullText.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:Doodles|Kennels|Puppies|Pups|Breeders?)/g) || [];
    breederPatterns.forEach(match => {
      const name = match.trim();
      if (
        !competitorsFound.includes(name) &&
        !name.includes('Stokeshire') &&
        !unknownBreeders.includes(name) &&
        name.length < 50
      ) {
        unknownBreeders.push(name);
      }
    });

    // Source domains
    const sourceDomains = citations
      .map(u => {
        try { return new URL(u).hostname.replace('www.', ''); } catch { return null; }
      })
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);

    return res.status(200).json({
      prompt,
      stokeshireMentioned,
      stokeshireCited: citations.some(u => u.includes('wisconsindesignerdoodles')),
      competitorsFound,
      unknownBreeders,
      sourceDomains,
      citations,
      responseSnippet: fullText.substring(0, 600),
      fullResponse: fullText,
      scannedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ error: err.message });
  }
}
