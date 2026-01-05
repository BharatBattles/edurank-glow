import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Credit cost for this operation
const CREDIT_COST = 1;

// Input validation and sanitization constants
const MAX_TOPIC_LENGTH = 200;
const FORBIDDEN_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?previous/i,
  /system\s*:\s*/i,
  /\[\s*INST\s*\]/i,
  /\<\s*\|\s*im_start\s*\|\s*\>/i,
  /\<\s*\|\s*im_end\s*\|\s*\>/i,
  /\{\{\s*system/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+if/i,
  /you\s+are\s+now/i,
  /new\s+instructions/i,
  /override\s+instructions/i,
];

function sanitizeInput(input: string, maxLength: number = MAX_TOPIC_LENGTH): { isValid: boolean; sanitized: string; error?: string } {
  if (!input || typeof input !== 'string') {
    return { isValid: false, sanitized: '', error: 'Input must be a non-empty string' };
  }

  let sanitized = input.trim();
  if (sanitized.length === 0) {
    return { isValid: false, sanitized: '', error: 'Input cannot be empty' };
  }
  if (sanitized.length > maxLength) {
    return { isValid: false, sanitized: '', error: `Input exceeds maximum length of ${maxLength} characters` };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sanitized)) {
      console.warn('Potential prompt injection detected:', sanitized.substring(0, 50));
      return { isValid: false, sanitized: '', error: 'Invalid input detected' };
    }
  }

  sanitized = sanitized
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[<>]/g, '')
    .replace(/\\/g, '')
    .trim();

  return { isValid: true, sanitized };
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  channel: string;
  viewCount: string;
  publishedAt: string;
  duration: string;
  durationFormatted: string;
  thumbnail: string;
  engagementScore: number;
}

function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function searchYouTube(query: string, apiKey: string, maxResults: number = 10): Promise<YouTubeVideo[]> {
  console.log(`Searching YouTube for: "${query}"`);
  
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=medium&videoEmbeddable=true&maxResults=${maxResults}&key=${apiKey}`;
  
  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    console.error('YouTube search error:', searchResponse.status, errorText);
    throw new Error(`YouTube API error: ${searchResponse.status}`);
  }
  
  const searchData = await searchResponse.json();
  const videoIds = searchData.items?.map((item: any) => item.id.videoId).join(',');
  
  if (!videoIds) {
    return [];
  }
  
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds}&key=${apiKey}`;
  
  const detailsResponse = await fetch(detailsUrl);
  if (!detailsResponse.ok) {
    console.error('YouTube details error:', detailsResponse.status);
    throw new Error('Failed to get video details');
  }
  
  const detailsData = await detailsResponse.json();
  
  const videos: YouTubeVideo[] = detailsData.items?.map((item: any) => {
    const viewCount = parseInt(item.statistics?.viewCount || '0');
    const likeCount = parseInt(item.statistics?.likeCount || '0');
    
    const publishDate = new Date(item.snippet.publishedAt);
    const daysSincePublish = Math.max(1, (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
    const engagementScore = Math.round(
      (viewCount / daysSincePublish * 0.5) + 
      (likeCount * 10) + 
      (viewCount > 100000 ? 50 : 0)
    );
    
    const thumbnails = item.snippet.thumbnails;
    const thumbnail = thumbnails?.medium?.url || thumbnails?.default?.url || '';
    
    return {
      videoId: item.id,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      viewCount: formatViewCount(viewCount),
      publishedAt: item.snippet.publishedAt,
      duration: item.contentDetails.duration,
      durationFormatted: formatDuration(item.contentDetails.duration),
      thumbnail,
      engagementScore: Math.min(100, Math.max(1, engagementScore / 1000)),
    };
  }) || [];
  
  return videos.sort((a, b) => b.engagementScore - a.engagementScore);
}

function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header and verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user context
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from auth header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Consume credits atomically using service role
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: consumed, error: creditError } = await serviceClient.rpc('consume_credits', { 
      uid: user.id, 
      amount: CREDIT_COST 
    });

    if (creditError) {
      console.error('Credit consumption error:', creditError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!consumed) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits. Please wait for monthly reset.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Consumed ${CREDIT_COST} credit(s) for user ${user.id}`);

    const { topic } = await req.json();
    
    const validation = sanitizeInput(topic);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: validation.error || 'Invalid topic' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const sanitizedTopic = validation.sanitized;

    const YOUTUBE_API_KEY = Deno.env.get('youtube_api_key');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!YOUTUBE_API_KEY) {
      throw new Error('YouTube API key is not configured');
    }
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Finding videos for topic:', sanitizedTopic);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an educational content planner. Break down learning topics into 3-5 logical subtasks/subtopics that someone would need to learn to master the main topic.

You must respond with ONLY a valid JSON object, no markdown, no code blocks.
The JSON must have this exact structure:
{
  "subtasks": [
    {
      "title": "Subtask title",
      "searchQuery": "optimized YouTube search query for this subtask"
    }
  ],
  "mainSearchQuery": "best YouTube search query for the main topic"
}`
          },
          {
            role: 'user',
            content: `Topic: "${sanitizedTopic}"

Break this into 3-5 subtasks and provide optimized YouTube search queries for educational videos on each. Add "tutorial", "explained", or "for beginners" to make searches more educational.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    console.log('AI response:', content);

    let parsedData;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
      if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
      parsedData = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      parsedData = {
        subtasks: [
          { title: `Introduction to ${sanitizedTopic}`, searchQuery: `${sanitizedTopic} introduction tutorial` },
          { title: `Core concepts of ${sanitizedTopic}`, searchQuery: `${sanitizedTopic} explained for beginners` },
          { title: `Practice ${sanitizedTopic}`, searchQuery: `${sanitizedTopic} examples practice` }
        ],
        mainSearchQuery: `${sanitizedTopic} tutorial explained`
      };
    }

    const mainVideos = await searchYouTube(parsedData.mainSearchQuery || `${sanitizedTopic} tutorial`, YOUTUBE_API_KEY, 5);
    const primaryVideo = mainVideos[0];

    if (!primaryVideo) {
      throw new Error('No videos found for this topic');
    }

    const subtasksWithVideos = await Promise.all(
      (parsedData.subtasks || []).slice(0, 5).map(async (subtask: any, idx: number) => {
        try {
          const videos = await searchYouTube(subtask.searchQuery || `${sanitizedTopic} ${subtask.title}`, YOUTUBE_API_KEY, 5);
          return {
            title: subtask.title || `Part ${idx + 1}`,
            description: subtask.searchQuery || '',
            videos: videos.map((v, i) => ({
              videoId: v.videoId,
              title: v.title,
              channel: v.channel,
              views: v.viewCount,
              duration: v.durationFormatted,
              thumbnail: v.thumbnail,
              engagementScore: v.engagementScore,
              reason: i === 0 ? 'Highest engagement for this topic' : `Recommended video #${i + 1}`
            }))
          };
        } catch (err) {
          console.error(`Error searching for subtask ${subtask.title}:`, err);
          return {
            title: subtask.title || `Part ${idx + 1}`,
            description: subtask.searchQuery || '',
            videos: []
          };
        }
      })
    );

    console.log(`Found ${mainVideos.length} main videos and ${subtasksWithVideos.length} subtasks`);

    return new Response(
      JSON.stringify({
        videoId: primaryVideo.videoId,
        title: primaryVideo.title,
        channel: primaryVideo.channel,
        reason: `Best educational video for "${sanitizedTopic}" with ${primaryVideo.viewCount} views`,
        subtasks: subtasksWithVideos,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in find-video function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});