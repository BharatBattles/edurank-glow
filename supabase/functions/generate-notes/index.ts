import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins for CORS - prevents CSRF attacks
const ALLOWED_ORIGINS = [
  // Production
  'https://edurank.app',
  'https://www.edurank.app',
  
  // Development
  'http://localhost:5173',
  'http://localhost:3000',
  
  // Fallback
  'https://lovable.dev',
];

function getCORSHeaders(originHeader: string | null): Record<string, string> {
  // Only allow requests from whitelisted origins
  const allowedOrigin = ALLOWED_ORIGINS.includes(originHeader || '')
    ? originHeader
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '3600',
  };
}

// Input validation and sanitization constants
const MAX_TITLE_LENGTH = 500;
const MAX_ID_LENGTH = 100;
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

function sanitizeInput(input: string, maxLength: number): { isValid: boolean; sanitized: string; error?: string } {
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

function validateId(id: string): { isValid: boolean; error?: string } {
  if (!id || typeof id !== 'string') {
    return { isValid: false, error: 'ID must be a non-empty string' };
  }
  if (id.length > MAX_ID_LENGTH) {
    return { isValid: false, error: `ID exceeds maximum length of ${MAX_ID_LENGTH} characters` };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return { isValid: false, error: 'Invalid ID format' };
  }
  return { isValid: true };
}

// Fetch video context using Perplexity API
async function fetchVideoContext(videoTitle: string, videoId: string): Promise<string> {
  const PERPLEXITY_API_KEY = Deno.env.get("perplexity_api_key");
  
  if (!PERPLEXITY_API_KEY) {
    console.log("Perplexity API key not configured, skipping context fetch");
    return "";
  }

  try {
    console.log("Fetching video context using Perplexity...");
    // Do NOT log the API key or embed it in URLs - use POST with headers instead
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are a research assistant. Provide comprehensive educational content and key concepts related to the given YouTube video topic. Focus on factual information that would be helpful for study notes."
          },
          {
            role: "user",
            content: `Research the topic of this YouTube video and provide key educational content:
Title: "${videoTitle}"
YouTube Video ID: ${videoId}

Provide:
1. Main concepts and definitions related to this topic
2. Key facts and important points
3. Related subtopics and their explanations
4. Study-worthy information

Focus on educational content that would help a student understand this topic thoroughly.`
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      // Don't log the full response as it might contain sensitive headers
      console.error("Perplexity API error:", response.status);
      return "";
    }

    const data = await response.json();
    const context = data.choices?.[0]?.message?.content || "";
    console.log("Video context fetched successfully, length:", context.length);
    return context;
  } catch (error) {
    console.error("Error fetching video context:", error instanceof Error ? error.message : "Unknown error");
    return "";
  }
}

// Bytez AI call function (using GPT-4.1-mini for notes generation)
async function callBytezAI(messages: { role: string; content: string }[]): Promise<string> {
  const BYTEZ_API_KEY = Deno.env.get('BYTEZ_API_KEY');
  if (!BYTEZ_API_KEY) {
    throw new Error('BYTEZ_API_KEY is not configured');
  }

  console.log('Calling Bytez AI (GPT-4.1-mini) for notes generation...');
  
  const response = await fetch('https://api.bytez.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BYTEZ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4.1-mini',
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Bytez AI error:', response.status);
    
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 401) {
      throw new Error('Invalid API key or authentication failed.');
    }
    throw new Error(`Bytez AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    const corsHeaders = getCORSHeaders(req.headers.get('origin'));
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const corsHeaders = getCORSHeaders(req.headers.get('origin'));
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`Processing notes request for user ${user.id}`);

    const { videoTitle, videoId, todoId } = await req.json();

    if (!videoTitle || !videoId || !todoId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: videoTitle, videoId, todoId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const titleValidation = sanitizeInput(videoTitle, MAX_TITLE_LENGTH);
    if (!titleValidation.isValid) {
      return new Response(
        JSON.stringify({ error: titleValidation.error || "Invalid video title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoIdValidation = validateId(videoId);
    if (!videoIdValidation.isValid) {
      return new Response(
        JSON.stringify({ error: videoIdValidation.error || "Invalid video ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const todoIdValidation = validateId(todoId);
    if (!todoIdValidation.isValid) {
      return new Response(
        JSON.stringify({ error: todoIdValidation.error || "Invalid todo ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedTitle = titleValidation.sanitized;

    console.log(`Generating notes for video: ${sanitizedTitle} (${videoId})`);

    // Fetch video context using Perplexity
    const videoContext = await fetchVideoContext(sanitizedTitle, videoId);

    // Generate notes using Lovable AI
    const generatedNotes = await callLovableAI([
      {
        role: 'user',
        content: `You are an expert educational content creator specializing in generating comprehensive, well-structured study notes. 

Your notes must be:
- Accurate and based on the provided context
- Well-organized with clear headings
- Student-friendly with practical examples
- Complete with key definitions and concepts

Format your response in clear markdown with:
## Key Concepts
## Important Points  
## Summary
## Study Tips

Generate detailed, comprehensive study notes for an educational video.

**Video Title:** "${sanitizedTitle}"
**Video ID:** ${videoId}

${videoContext ? `**Research Context:**
${videoContext}

Use the above research context to create accurate, detailed study notes.` : ""}

Create professional study notes that would help a student:
1. Understand the core concepts
2. Remember key facts and definitions
3. Apply the knowledge effectively
4. Prepare for exams on this topic

Make the notes comprehensive and educational.`
      },
    ]);

    if (!generatedNotes) {
      throw new Error("No content generated from AI");
    }

    console.log("Notes generated successfully using Bytez AI");

    // Check achievements after generating notes
    await serviceClient.rpc('check_achievements', { uid: user.id });

    const { data: savedNote, error: saveError } = await supabaseClient
      .from("notes")
      .insert({
        user_id: user.id,
        todo_id: todoId,
        video_id: videoId,
        content: generatedNotes,
        is_ai_generated: true,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving notes:", saveError);
      return new Response(
        JSON.stringify({ 
          notes: generatedNotes, 
          saved: false,
          error: "Notes generated but failed to save" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        notes: generatedNotes, 
        saved: true,
        noteId: savedNote.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-notes function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
