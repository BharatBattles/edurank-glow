import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credit cost for this operation (adaptive questions are part of quiz flow, no extra charge)
const CREDIT_COST = 0;

const MAX_NOTES_LENGTH = 50000;
const FORBIDDEN_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?previous/i,
  /system\s*:\s*/i,
  /\[\s*INST\s*\]/i,
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
      return { isValid: false, sanitized: '', error: 'Invalid input detected' };
    }
  }

  sanitized = sanitized
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\\/g, '')
    .trim();

  return { isValid: true, sanitized };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    const { notes, previousQuestion, wasCorrect, difficulty } = await req.json();

    if (!notes || !previousQuestion) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: notes, previousQuestion" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notesValidation = sanitizeInput(notes, MAX_NOTES_LENGTH);
    if (!notesValidation.isValid) {
      return new Response(
        JSON.stringify({ error: notesValidation.error || "Invalid notes content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentDifficulty = difficulty || 'medium';
    let newDifficulty: string;
    let difficultyInstruction: string;

    if (wasCorrect) {
      if (currentDifficulty === 'easy') {
        newDifficulty = 'medium';
        difficultyInstruction = 'Generate a MEDIUM difficulty question that requires deeper understanding.';
      } else if (currentDifficulty === 'medium') {
        newDifficulty = 'hard';
        difficultyInstruction = 'Generate a HARD difficulty question that requires complex reasoning or application.';
      } else {
        newDifficulty = 'hard';
        difficultyInstruction = 'Generate another challenging HARD question testing advanced understanding.';
      }
    } else {
      if (currentDifficulty === 'hard') {
        newDifficulty = 'medium';
        difficultyInstruction = 'Generate an EASIER MEDIUM difficulty question on the same concept.';
      } else if (currentDifficulty === 'medium') {
        newDifficulty = 'easy';
        difficultyInstruction = 'Generate an EASY question that helps reinforce the basic concept.';
      } else {
        newDifficulty = 'easy';
        difficultyInstruction = 'Generate another EASY foundational question to build understanding.';
      }
    }

    const systemPrompt = `You are an adaptive assessment designer. Generate a single follow-up question based on the student's performance.

${difficultyInstruction}

The question should:
- Test conceptual understanding, not memorization
- Have plausible but clearly incorrect distractors
- Include a brief explanation for the correct answer
- Be related to the topic but DIFFERENT from the previous question

QUALITY RULES:
- No "All of the above" or "None of the above"
- Avoid absolute words (always, never)
- Clear, unambiguous wording

Respond with ONLY valid JSON, no markdown:
{
  "id": 1,
  "type": "adaptive",
  "difficulty": "${newDifficulty}",
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Why this answer is correct"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Study Notes:\n${notesValidation.sanitized}\n\nPrevious Question: "${previousQuestion}"\nStudent answered: ${wasCorrect ? 'CORRECTLY' : 'INCORRECTLY'}\n\nGenerate an appropriate follow-up question.`
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
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
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    let questionContent = aiData.choices?.[0]?.message?.content;

    if (!questionContent) {
      throw new Error("No content generated from AI");
    }

    let question;
    try {
      let cleanContent = questionContent.trim();
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
      if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
      question = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse question:", parseError);
      throw new Error("Failed to generate adaptive question");
    }

    return new Response(
      JSON.stringify({ question, difficulty: newDifficulty }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in adaptive-question function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});