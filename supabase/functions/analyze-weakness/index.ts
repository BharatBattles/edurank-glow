import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuestionAttempt {
  questionText: string;
  isCorrect: boolean;
  timeTakenSeconds: number;
  difficulty: string;
  topicName?: string;
}

interface TopicPerformance {
  topicId: string;
  topicName: string;
  totalQuestions: number;
  correctAnswers: number;
  totalTimeSeconds: number;
  wrongOnEasy: number;
  wrongOnMedium: number;
  wrongOnHard: number;
  repeatedMistakes: number;
}

// Compute weakness score using the algorithm from requirements
function computeWeaknessScore(
  accuracy: number,
  avgTimeUser: number,
  avgTimeGlobal: number,
  repeatedMistakes: number,
  wrongOnEasy: number,
  wrongOnMedium: number,
  wrongOnHard: number
): number {
  // Accuracy penalty (0-50)
  const accuracyPenalty = (1 - accuracy) * 50;
  
  // Time penalty (0-20)
  let timePenalty = 0;
  if (avgTimeGlobal > 0 && avgTimeUser > avgTimeGlobal) {
    timePenalty = Math.min(20, ((avgTimeUser - avgTimeGlobal) / avgTimeGlobal) * 20);
  }
  
  // Consistency penalty for repeated mistakes
  const consistencyPenalty = repeatedMistakes >= 2 ? 15 : 0;
  
  // Difficulty penalty
  let difficultyPenalty = 0;
  if (wrongOnHard > 0) {
    difficultyPenalty = 15;
  } else if (wrongOnMedium > 0) {
    difficultyPenalty = 8;
  } else if (wrongOnEasy > 0) {
    difficultyPenalty = 5;
  }
  
  return Math.min(100, accuracyPenalty + timePenalty + consistencyPenalty + difficultyPenalty);
}

// Classify topic strength based on weakness score
function classifyStrength(weaknessScore: number, totalQuestions: number): string {
  if (totalQuestions < 3) return "insufficient_data";
  if (weaknessScore <= 25) return "strong";
  if (weaknessScore <= 50) return "moderate";
  return "weak";
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

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

    const userId = claimsData.claims.sub as string;
    const { todoId, videoId, quizId, questions } = await req.json();

    if (!todoId || !videoId || !questions || !Array.isArray(questions)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: todoId, videoId, questions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing ${questions.length} questions for user ${userId}, video ${videoId}`);

    // Step 1: Use AI to extract topics from each question
    const questionsWithTopics: QuestionAttempt[] = [];
    
    if (lovableApiKey && questions.length > 0) {
      try {
        const questionTexts = questions.map((q: any) => q.questionText).join("\n---\n");
        
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are an educational topic classifier. For each question, identify the main concept/topic being tested. 
Return a JSON array of topic names, one for each question.
Topics should be concise (2-4 words), educational, and specific.
Examples: "Neural Networks", "Backpropagation", "Activation Functions", "Gradient Descent", "Data Preprocessing"

IMPORTANT: Return ONLY a valid JSON array of strings, nothing else.`
              },
              {
                role: "user",
                content: `Extract the main topic for each of these ${questions.length} questions (separated by ---):

${questionTexts}`
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const topicsText = aiData.choices?.[0]?.message?.content || "";
          
          // Parse topics from AI response
          const jsonMatch = topicsText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const topics = JSON.parse(jsonMatch[0]);
            questions.forEach((q: any, i: number) => {
              questionsWithTopics.push({
                ...q,
                topicName: topics[i] || "General Knowledge"
              });
            });
          }
        }
      } catch (aiError) {
        console.error("AI topic extraction failed:", aiError);
      }
    }

    // Fallback if AI failed
    if (questionsWithTopics.length === 0) {
      questions.forEach((q: any) => {
        questionsWithTopics.push({
          ...q,
          topicName: "General Knowledge"
        });
      });
    }

    // Step 2: Create or get topics
    const uniqueTopics = [...new Set(questionsWithTopics.map(q => q.topicName || "General Knowledge"))];
    const topicIdMap: Record<string, string> = {};

    for (const topicName of uniqueTopics) {
      // Try to get existing topic
      let { data: topic } = await serviceClient
        .from("topics")
        .select("id")
        .eq("name", topicName)
        .maybeSingle();

      if (!topic) {
        // Create new topic
        const { data: newTopic, error } = await serviceClient
          .from("topics")
          .insert({ name: topicName })
          .select("id")
          .single();
        
        if (error) {
          console.error("Error creating topic:", error);
          continue;
        }
        topic = newTopic;
      }
      
      if (topic) {
        topicIdMap[topicName] = topic.id;
      }
    }

    // Step 3: Get attempt number for this quiz
    const { count: existingAttempts } = await supabaseClient
      .from("question_attempts")
      .select("*", { count: "exact", head: true })
      .eq("todo_id", todoId);

    const attemptNumber = Math.floor((existingAttempts || 0) / questions.length) + 1;

    // Step 4: Save question attempts
    const attemptsToInsert = questionsWithTopics.map(q => ({
      user_id: userId,
      quiz_id: quizId,
      todo_id: todoId,
      video_id: videoId,
      topic_id: topicIdMap[q.topicName || "General Knowledge"] || null,
      question_text: q.questionText,
      is_correct: q.isCorrect,
      time_taken_seconds: q.timeTakenSeconds || 0,
      difficulty_level: q.difficulty || "medium",
      attempt_number: attemptNumber,
    }));

    const { error: insertError } = await supabaseClient
      .from("question_attempts")
      .insert(attemptsToInsert);

    if (insertError) {
      console.error("Error inserting attempts:", insertError);
    }

    // Step 5: Aggregate performance by topic
    const topicPerformance: Record<string, TopicPerformance> = {};

    questionsWithTopics.forEach(q => {
      const topicName = q.topicName || "General Knowledge";
      const topicId = topicIdMap[topicName];
      
      if (!topicId) return;

      if (!topicPerformance[topicId]) {
        topicPerformance[topicId] = {
          topicId,
          topicName,
          totalQuestions: 0,
          correctAnswers: 0,
          totalTimeSeconds: 0,
          wrongOnEasy: 0,
          wrongOnMedium: 0,
          wrongOnHard: 0,
          repeatedMistakes: 0,
        };
      }

      const perf = topicPerformance[topicId];
      perf.totalQuestions++;
      if (q.isCorrect) {
        perf.correctAnswers++;
      } else {
        if (q.difficulty === "easy") perf.wrongOnEasy++;
        else if (q.difficulty === "hard") perf.wrongOnHard++;
        else perf.wrongOnMedium++;
      }
      perf.totalTimeSeconds += q.timeTakenSeconds || 0;
    });

    // Step 6: Get historical data and compute weakness scores
    const weakTopics: any[] = [];
    const recommendations: any[] = [];

    for (const [topicId, perf] of Object.entries(topicPerformance)) {
      // Get existing user performance for this topic
      const { data: existingPerf } = await supabaseClient
        .from("user_topic_performance")
        .select("*")
        .eq("topic_id", topicId)
        .maybeSingle();

      // Get global stats for benchmarking
      const { data: globalStats } = await serviceClient
        .from("global_topic_stats")
        .select("*")
        .eq("topic_id", topicId)
        .maybeSingle();

      const globalAvgTime = globalStats?.avg_time_seconds || 30;

      // Compute cumulative stats (weight = 1/attempt_number for decay)
      const weight = 1 / attemptNumber;
      const newTotalQuestions = (existingPerf?.total_questions || 0) + perf.totalQuestions;
      const newCorrectAnswers = (existingPerf?.correct_answers || 0) + perf.correctAnswers;
      const newTotalTime = (existingPerf?.total_time_seconds || 0) + perf.totalTimeSeconds;
      const newAvgTime = newTotalTime / newTotalQuestions;
      
      // Track repeated mistakes
      let repeatedMistakes = existingPerf?.repeated_mistakes || 0;
      if (!perf.correctAnswers && existingPerf && !existingPerf.correct_answers) {
        repeatedMistakes++;
      }

      const newWrongEasy = (existingPerf?.wrong_on_easy || 0) + perf.wrongOnEasy;
      const newWrongMedium = (existingPerf?.wrong_on_medium || 0) + perf.wrongOnMedium;
      const newWrongHard = (existingPerf?.wrong_on_hard || 0) + perf.wrongOnHard;

      // Compute accuracy
      const accuracy = newCorrectAnswers / newTotalQuestions;

      // Compute weakness score
      const weaknessScore = computeWeaknessScore(
        accuracy,
        newAvgTime,
        globalAvgTime,
        repeatedMistakes,
        newWrongEasy,
        newWrongMedium,
        newWrongHard
      );

      const previousScore = existingPerf?.weakness_score || 0;
      const strengthStatus = classifyStrength(weaknessScore, newTotalQuestions);

      // Upsert user topic performance
      const { error: upsertError } = await supabaseClient
        .from("user_topic_performance")
        .upsert({
          user_id: userId,
          topic_id: topicId,
          total_questions: newTotalQuestions,
          correct_answers: newCorrectAnswers,
          total_time_seconds: newTotalTime,
          avg_time_seconds: newAvgTime,
          wrong_on_easy: newWrongEasy,
          wrong_on_medium: newWrongMedium,
          wrong_on_hard: newWrongHard,
          repeated_mistakes: repeatedMistakes,
          weakness_score: weaknessScore,
          strength_status: strengthStatus,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: "user_id,topic_id"
        });

      if (upsertError) {
        console.error("Error upserting performance:", upsertError);
      }

      // Update video topic analysis
      const videoAccuracy = perf.correctAnswers / perf.totalQuestions;
      const isWeakInVideo = (1 - videoAccuracy) * 100 > 50;

      await supabaseClient
        .from("video_topic_analysis")
        .upsert({
          user_id: userId,
          video_id: videoId,
          todo_id: todoId,
          topic_id: topicId,
          questions_count: perf.totalQuestions,
          correct_count: perf.correctAnswers,
          mastery_score: videoAccuracy * 100,
          is_weak_topic: isWeakInVideo,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,video_id,topic_id"
        });

      // Update global stats
      await serviceClient
        .from("global_topic_stats")
        .upsert({
          topic_id: topicId,
          total_attempts: (globalStats?.total_attempts || 0) + perf.totalQuestions,
          total_correct: (globalStats?.total_correct || 0) + perf.correctAnswers,
          avg_accuracy: ((globalStats?.total_correct || 0) + perf.correctAnswers) / 
                       ((globalStats?.total_attempts || 0) + perf.totalQuestions) * 100,
          avg_time_seconds: ((globalStats?.avg_time_seconds || 30) * (globalStats?.total_attempts || 1) + perf.totalTimeSeconds) /
                           ((globalStats?.total_attempts || 0) + perf.totalQuestions),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "topic_id"
        });

      // Track weak topics for recommendations
      if (strengthStatus === "weak") {
        weakTopics.push({
          topicId,
          topicName: perf.topicName,
          weaknessScore,
          accuracy: accuracy * 100,
        });

        // Generate recommendation
        const recommendationTitle = `Fix: ${perf.topicName}`;
        const minutes = Math.max(3, Math.ceil(weaknessScore / 20));
        const description = `You're losing marks in ${perf.topicName} — fix it in ${minutes} minutes.`;

        recommendations.push({
          user_id: userId,
          topic_id: topicId,
          todo_id: todoId,
          recommendation_type: "weak_topic_quiz",
          title: recommendationTitle,
          description,
          priority: Math.round(weaknessScore),
          weakness_score: weaknessScore,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });
      }

      // Check for Comeback King achievement (30% improvement)
      if (previousScore > 0 && weaknessScore > 0) {
        const improvement = ((previousScore - weaknessScore) / previousScore) * 100;
        if (improvement >= 30) {
          console.log(`User ${userId} achieved Comeback King! Improvement: ${improvement}%`);
          // Trigger achievement check
          await serviceClient.rpc("check_achievements", { uid: userId });
        }
      }
    }

    // Insert recommendations (remove old ones first)
    if (recommendations.length > 0) {
      // Clear old recommendations for same topics
      const topicIds = recommendations.map(r => r.topic_id);
      await supabaseClient
        .from("recommendation_queue")
        .delete()
        .eq("user_id", userId)
        .in("topic_id", topicIds);

      // Insert new
      await supabaseClient
        .from("recommendation_queue")
        .insert(recommendations);
    }

    console.log(`Analysis complete. Weak topics: ${weakTopics.length}, Recommendations: ${recommendations.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        weakTopics,
        recommendations: recommendations.length,
        topicsAnalyzed: Object.keys(topicPerformance).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-weakness:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
