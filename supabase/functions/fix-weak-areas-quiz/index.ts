import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TopicInput {
  name: string;
  weaknessScore: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const systemPrompt = `You are an educational quiz generator specialized in helping students improve their weak areas.

Your task is to generate targeted practice questions that:
1. Focus on the EXACT concepts the student is weak in
2. Start with easier questions to build confidence
3. Include clear explanations for each answer
4. Test understanding, not just memorization

CRITICAL: Generate questions that specifically target the weak concepts listed below.`;

    const userPrompt = `Generate ${totalQuestions} practice questions targeting these weak topics:

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate questions");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

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
