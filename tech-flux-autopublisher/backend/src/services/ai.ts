export interface AIAdapterOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ScriptGenerationRequest {
  topic: string;
  sources?: string[];
  tone?: string;
  durationSeconds?: number;
  language?: string;
}

export interface GeneratedScript {
  hook: string;
  body: string;
  callToAction: string;
  fullText: string;
  wordCount: number;
  estimatedDurationSeconds: number;
  scenes: Array<{
    narration: string;
    visualPrompt: string;
    sceneType: string;
    durationSeconds: number;
  }>;
}

export interface AIProvider {
  name: string;
  generateText(prompt: string, options?: AIAdapterOptions): Promise<string>;
  generateScript(request: ScriptGenerationRequest, options?: AIAdapterOptions): Promise<GeneratedScript>;
  generateVisualPrompts(scriptText: string, sceneCount: number): Promise<string[]>;
  generateSEOMetadata(topic: string, scriptText: string): Promise<{
    title: string;
    description: string;
    tags: string[];
    hashtags: string[];
  }>;
}

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private defaultModel = 'gemini-1.5-flash';

  async generateText(prompt: string, options: AIAdapterOptions = {}): Promise<string> {
    const apiKey = options.apiKey;
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    const model = options.model || this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 1000,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async generateScript(request: ScriptGenerationRequest, options: AIAdapterOptions = {}): Promise<GeneratedScript> {
    const prompt = `
Create a compelling, high-converting 30-second YouTube Short script about: "${request.topic}".

Target Audience: Tech-savvy young viewers in the United States (US English).
Channel: Tech Flux.
Duration: Exactly ~30 seconds (around 65-75 words total).
Tone: ${request.tone || 'Engaging, fast-paced, insightful'}.

Sources/Context:
${request.sources?.join('\n') || 'None provided.'}

Requirements:
1. HOOK (0-3s): Must grab attention instantly. Shocking fact, question, or bold claim.
2. BODY (3-25s): High-value concise insights. 4-5 quick scenes.
3. CALL TO ACTION (25-30s): Subscribe to Tech Flux for daily tech updates.
4. Total length: 60-80 words maximum for perfect 30-second narration.

Format your response as valid JSON with this exact schema:
{
  "hook": "Strong hook text",
  "body": "Body paragraph text",
  "callToAction": "CTA text",
  "fullText": "Full complete script combining hook + body + CTA",
  "wordCount": 70,
  "estimatedDurationSeconds": 30,
  "scenes": [
    {
      "sceneType": "intro",
      "narration": "Hook narration text",
      "visualPrompt": "Detailed visual description of high-tech 3D cinematic animation for scene 1",
      "durationSeconds": 5
    },
    {
      "sceneType": "content",
      "narration": "Point 1 narration",
      "visualPrompt": "Detailed visual description scene 2",
      "durationSeconds": 5
    },
    {
      "sceneType": "content",
      "narration": "Point 2 narration",
      "visualPrompt": "Detailed visual description scene 3",
      "durationSeconds": 5
    },
    {
      "sceneType": "content",
      "narration": "Point 3 narration",
      "visualPrompt": "Detailed visual description scene 4",
      "durationSeconds": 5
    },
    {
      "sceneType": "content",
      "narration": "Point 4 narration",
      "visualPrompt": "Detailed visual description scene 5",
      "durationSeconds": 5
    },
    {
      "sceneType": "outro",
      "narration": "CTA narration",
      "visualPrompt": "Tech Flux branding animation and subscribe prompt",
      "durationSeconds": 5
    }
  ]
}
`;

    const text = await this.generateText(prompt, { ...options, temperature: 0.7, maxTokens: 2000 });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse script JSON from AI response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  async generateVisualPrompts(scriptText: string, sceneCount: number = 6): Promise<string[]> {
    const prompt = `
Generate ${sceneCount} highly detailed, visual prompts for cinematic 3D high-tech animations to accompany this YouTube Short script:

"${scriptText}"

Visual Style: Cyberpunk neon cyan/teal (#00d4aa), ultra-modern, dark background, 3D futuristic tech aesthetics, 9:16 vertical aspect ratio frame, crisp, high contrast.

Return JSON array of strings:
["Visual prompt 1", "Visual prompt 2", ...]
`;

    const text = await this.generateText(prompt, { temperature: 0.8 });
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return Array(sceneCount).fill('High-tech futuristic digital circuit board with cyan neon light pulses, 3D render, vertical format');
    }

    return JSON.parse(jsonMatch[0]);
  }

  async generateSEOMetadata(topic: string, scriptText: string) {
    const prompt = `
Generate YouTube SEO metadata for a 30-second Short based on topic: "${topic}" and script: "${scriptText}".

Target Audience: US tech enthusiasts. Channel: Tech Flux.

Requirements:
- Title: Catchy, under 60 characters, includes high-volume keywords, ends with #Shorts.
- Description: Engaging 2-sentence summary + call to subscribe + relevant hashtags.
- Tags: 15-20 relevant search keywords.
- Hashtags: 5 high-performing hashtags (e.g., #Shorts #Tech #AI).

Return JSON:
{
  "title": "Shocking AI Breakthrough Changes Everything! #Shorts",
  "description": "Discover how the latest AI breakthrough is revolutionizing technology. Subscribe to Tech Flux for daily tech updates! #Shorts #TechFlux #AI #Tech #Innovation",
  "tags": ["AI", "Artificial Intelligence", "Tech Flux", "Technology", "Future Tech", "AI Breakthrough", "Tech News"],
  "hashtags": ["#Shorts", "#TechFlux", "#AI", "#Tech", "#Innovation"]
}
`;

    const text = await this.generateText(prompt, { temperature: 0.7 });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        title: `${topic} Explained! #Shorts`,
        description: `Everything you need to know about ${topic}. Subscribe to Tech Flux for more! #Shorts #Tech`,
        tags: ['Tech', 'Technology', 'Tech Flux', 'Shorts', topic],
        hashtags: ['#Shorts', '#Tech', '#TechFlux'],
      };
    }

    return JSON.parse(jsonMatch[0]);
  }
}

// Fallback Provider when Gemini API key is unavailable or quota is exceeded
export class FallbackAIProvider implements AIProvider {
  name = 'fallback';

  async generateText(prompt: string): Promise<string> {
    return 'Fallback AI content generated locally.';
  }

  async generateScript(request: ScriptGenerationRequest): Promise<GeneratedScript> {
    const fullText = `Did you know this about ${request.topic}? Science and technology are advancing faster than ever. New innovations are changing how we live, work, and interact. From artificial intelligence to quantum computing, the future is unfolding today. Subscribe to Tech Flux for daily tech updates!`;

    return {
      hook: `Did you know this about ${request.topic}?`,
      body: 'Science and technology are advancing faster than ever. New innovations are changing how we live, work, and interact. From artificial intelligence to quantum computing, the future is unfolding today.',
      callToAction: 'Subscribe to Tech Flux for daily tech updates!',
      fullText,
      wordCount: 45,
      estimatedDurationSeconds: 30,
      scenes: [
        {
          sceneType: 'intro',
          narration: `Did you know this about ${request.topic}?`,
          visualPrompt: `High tech graphic revealing title: ${request.topic}`,
          durationSeconds: 5,
        },
        {
          sceneType: 'content',
          narration: 'Science and technology are advancing faster than ever.',
          visualPrompt: 'Accelerating digital data streams and glowing futuristic node networks',
          durationSeconds: 5,
        },
        {
          sceneType: 'content',
          narration: 'New innovations are changing how we live, work, and interact.',
          visualPrompt: 'Futuristic smart city holographic overlay with dark metallic design',
          durationSeconds: 5,
        },
        {
          sceneType: 'content',
          narration: 'From artificial intelligence to quantum computing, the future is unfolding today.',
          visualPrompt: 'Quantum processor core glowing with cyan energy pulses',
          durationSeconds: 5,
        },
        {
          sceneType: 'content',
          narration: 'Stay ahead of the curve with cutting-edge insights.',
          visualPrompt: 'Abstract 3D digital sphere rotating with high precision grid lines',
          durationSeconds: 5,
        },
        {
          sceneType: 'outro',
          narration: 'Subscribe to Tech Flux for daily tech updates!',
          visualPrompt: 'Tech Flux logo with subscribe button animation and neon accent pulse',
          durationSeconds: 5,
        },
      ],
    };
  }

  async generateVisualPrompts(scriptText: string, sceneCount: number = 6): Promise<string[]> {
    return Array(sceneCount).fill('Cyberpunk neon cyan high-tech 3D graphics vertical 9:16');
  }

  async generateSEOMetadata(topic: string) {
    return {
      title: `${topic} - Tech Flux #Shorts`,
      description: `Daily tech insights on ${topic}. Subscribe to Tech Flux! #Shorts #Tech`,
      tags: ['Tech', 'Technology', 'Shorts', 'Tech Flux', topic],
      hashtags: ['#Shorts', '#Tech', '#TechFlux'],
    };
  }
}

export class AIService {
  private provider: AIProvider;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.provider = new GeminiProvider();
    } else {
      this.provider = new FallbackAIProvider();
    }
  }

  async generateScript(request: ScriptGenerationRequest, apiKey?: string) {
    try {
      return await this.provider.generateScript(request, { apiKey });
    } catch (error) {
      console.warn('Primary AI provider failed, switching to fallback provider:', error);
      const fallback = new FallbackAIProvider();
      return await fallback.generateScript(request);
    }
  }

  async generateSEO(topic: string, scriptText: string, apiKey?: string) {
    try {
      return await this.provider.generateSEOMetadata(topic, scriptText);
    } catch (error) {
      const fallback = new FallbackAIProvider();
      return await fallback.generateSEOMetadata(topic, scriptText);
    }
  }
}