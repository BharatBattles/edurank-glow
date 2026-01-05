import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credit cost for this operation
const CREDIT_COST = 4;

// Input validation and sanitization constants
const MAX_NOTES_LENGTH = 50000;
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

const SYSTEM_PROMPT = `You are an assessment designer specializing in conceptual understanding.

Generate quiz questions that test deep comprehension, not surface recall.
Wrong options must be plausible but incorrect.

QUESTION DESIGN LOGIC:
1. Identify core concepts from the notes
2. Identify common misunderstandings
3. Turn them into distractor options
4. Ensure only one correct answer
5. Avoid trick questions or ambiguity

QUESTION TYPES TO INCLUDE:
1. Concept Check - Tests understanding of main idea
2. Mechanism Check - Tests how something works
3. Application Check - Tests real-world usage
4. Misconception Trap - Uses common wrong belief as an option
5. "Why" Question - Tests reasoning, not facts

QUALITY RULES:
- No "All of the above"
- No "None of the above"
- Avoid absolute words (always, never)
- Explanations must be simple and corrective

You must respond with ONLY a valid JSON array, no markdown, no code blocks.
Each question must have this structure:
{
  "id": 1,
  "type": "concept_check",
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "1-2 lines explaining why the correct answer is right and why common wrong answers are incorrect"
}

Types: concept_check, mechanism_check, application_check, misconception_trap, why_question
correctAnswer is the 0-based index of the correct option.`;

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

    const { todoId, notes } = await req.json();

    if (!todoId || !notes) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: todoId, notes" }),
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

    const notesValidation = sanitizeInput(notes, MAX_NOTES_LENGTH);
    if (!notesValidation.isValid) {
      return new Response(
        JSON.stringify({ error: notesValidation.error || "Invalid notes content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedNotes = notesValidation.sanitized;

    console.log(`Generating quiz for todo: ${todoId}`);

    // Check if quiz already exists (no credit charge for returning existing)
    const { data: existingQuiz } = await supabaseClient
      .from("quizzes")
      .select("*")
      .eq("todo_id", todoId)
      .maybeSingle();

    if (existingQuiz) {
      return new Response(
        JSON.stringify({ quiz: existingQuiz.questions, quizId: existingQuiz.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Consume credits atomically using service role (only for new quiz generation)
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!consumed) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits (4 required). Please wait for monthly reset.' }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Consumed ${CREDIT_COST} credit(s) for user ${user.id}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Generate 5 MCQ questions based on these study notes:\n\n${sanitizedNotes}`,
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
    let questionsContent = aiData.choices?.[0]?.message?.content;

    if (!questionsContent) {
      throw new Error("No content generated from AI");
    }

    let questions;
    try {
      let cleanContent = questionsContent.trim();
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
      if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
      questions = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse questions:", parseError);
      questions = [
        {
          id: 1,
          type: "concept_check",
          question: "What is the main concept covered in this material?",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: 0,
          explanation: "This tests your understanding of the core concept presented."
        },
        {
          id: 2,
          type: "mechanism_check",
          question: "How does this process work?",
          options: ["Statement A", "Statement B", "Statement C", "Statement D"],
          correctAnswer: 1,
          explanation: "Understanding the mechanism helps you apply the concept."
        },
        {
          id: 3,
          type: "application_check",
          question: "How can this knowledge be applied in practice?",
          options: ["Application A", "Application B", "Application C", "Application D"],
          correctAnswer: 2,
          explanation: "Real-world application demonstrates true understanding."
        },
        {
          id: 4,
          type: "misconception_trap",
          question: "Which of the following is a common misconception?",
          options: ["Misconception A", "Misconception B", "Misconception C", "Correct understanding"],
          correctAnswer: 3,
          explanation: "Identifying misconceptions helps solidify correct understanding."
        },
        {
          id: 5,
          type: "why_question",
          question: "Why is this concept important?",
          options: ["Reason A", "Reason B", "Reason C", "Reason D"],
          correctAnswer: 1,
          explanation: "Understanding 'why' deepens your comprehension."
        }
      ];
    }

    console.log("Quiz generated successfully");

    const { data: savedQuiz, error: saveError } = await supabaseClient
      .from("quizzes")
      .insert({
        user_id: user.id,
        todo_id: todoId,
        questions: questions,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving quiz:", saveError);
      return new Response(
        JSON.stringify({ quiz: questions, saved: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ quiz: questions, quizId: savedQuiz.id, saved: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-quiz function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});