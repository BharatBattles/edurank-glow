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

interface TopicInput {
  name: string;
  weaknessScore: number;
}

// Bytez AI call function (using Gemini-3-pro-preview for weak areas quiz)
async function callBytezAI(messages: { role: string; content: string }[]): Promise<string> {
  const BYTEZ_API_KEY = Deno.env.get('BYTEZ_API_KEY');
  if (!BYTEZ_API_KEY) {
    throw new Error('BYTEZ_API_KEY is not configured');
  }

  console.log('Calling Bytez AI (Gemini-3-pro-preview) for weak areas quiz...');
  
  const response = await fetch('https://api.bytez.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BYTEZ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-pro-preview',
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Bytez AI error:', response.status, errorText);
    
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
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { topics, notes, questionsPerTopic = 2 } = await req.json();

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return new Response(
        JSON.stringify({ error: "No topics provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedTopics = topics as TopicInput[];
    console.log(`Generating fix-weak-areas quiz for ${typedTopics.length} topics`);

    // Sort topics by weakness score (most weak first)
    const sortedTopics = [...typedTopics].sort((a, b) => b.weaknessScore - a.weaknessScore);
    
    // Build prompt
    const topicsDescription = sortedTopics
      .map(t => `- ${t.name} (weakness score: ${Math.round(t.weaknessScore)}%)`)
      .join('\n');

    let contentContext = "";
    if (notes) {
      contentContext = `

Here is study material related to these topics:

${notes.substring(0, 6000)}
`;
    }

    const totalQuestions = Math.min(sortedTopics.length * questionsPerTopic, 10);

    const prompt = `You are an educational quiz generator specialized in helping students improve their weak areas.

Your task is to generate targeted practice questions that:
1. Focus on the EXACT concepts the student is weak in
2. Start with easier questions to build confidence
3. Include clear explanations for each answer
4. Test understanding, not just memorization

CRITICAL: Generate questions that specifically target the weak concepts listed below.

Generate ${totalQuestions} practice questions targeting these weak topics:

${topicsDescription}
${contentContext}

For each question:
1. Clearly connect it to one of the weak topics
2. Match difficulty to weakness score (higher score = start easier)
3. Include a helpful explanation

Return ONLY a valid JSON object in this exact format:
{
  "questions": [
    {
      "topicName": "Topic Name",
      "difficulty": "easy|medium|hard",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct and what the student should remember."
    }
  ]
}`;

    const content = await callBytezAI([{ role: 'user', content: prompt }]);

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", content);
      throw new Error("Invalid AI response format");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const questions = parsed.questions || [];

    // Add topic IDs to questions (match by name)
    const questionsWithIds = questions.map((q: any, index: number) => {
      const matchingTopic = sortedTopics.find(
        t => t.name.toLowerCase() === (q.topicName || "").toLowerCase()
      );
      return {
        ...q,
        id: index + 1,
        topicId: matchingTopic ? q.topicName : undefined,
      };
    });

    console.log(`Generated ${questionsWithIds.length} questions for weak areas`);

    return new Response(
      JSON.stringify({ questions: questionsWithIds }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in fix-weak-areas-quiz:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
