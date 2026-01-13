import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, Flame, Target, Medal, Crown } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  user_id: string;
  display_name: string;
  total_quizzes: number;
  average_score: number;
  best_score: number;
  current_streak: number;
  longest_streak: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("score");

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("leaderboard_stats")
        .select("*")
        .order("average_score", { ascending: false })
        .limit(50);

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSortedEntries = () => {
    switch (activeTab) {
      case "streak":
        return [...entries].sort((a, b) => b.current_streak - a.current_streak);
      case "quizzes":
        return [...entries].sort((a, b) => b.total_quizzes - a.total_quizzes);
      default:
        return [...entries].sort((a, b) => b.average_score - a.average_score);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground font-medium w-5 text-center">{index + 1}</span>;
  };

  const sortedEntries = getSortedEntries();
  const userRank = sortedEntries.findIndex(e => e.user_id === user?.id) + 1;
  const userStats = entries.find(e => e.user_id === user?.id);

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Leaderboard</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* User's Stats Card */}
        {userStats && (
          <Card className="glass-card mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary">#{userRank || "-"}</p>
                  <p className="text-xs text-muted-foreground">Current Rank</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{userStats.average_score.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <p className="text-2xl font-bold">{userStats.current_streak}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{userStats.total_quizzes}</p>
                  <p className="text-xs text-muted-foreground">Quizzes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="score" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Top Scores
            </TabsTrigger>
            <TabsTrigger value="streak" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Streaks
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Most Active
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <Card className="glass-card">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Loading leaderboard...
                  </div>
                ) : sortedEntries.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No entries yet. Complete a quiz to join the leaderboard!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {sortedEntries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-4 p-4 transition-colors ${
                          entry.user_id === user?.id ? "bg-primary/10" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-center w-8">
                          {getRankIcon(index)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate flex items-center gap-2">
                            <span>{entry.display_name || 'Anonymous'}</span>
                            {entry.user_id === user?.id && (
                              <Badge variant="secondary" className="text-xs">You</Badge>
                            )}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{entry.total_quizzes} quizzes</span>
                            {entry.current_streak > 0 && (
                              <span className="flex items-center gap-1">
                                <Flame className="h-3 w-3 text-orange-500" />
                                {entry.current_streak} day streak
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          {activeTab === "score" && (
                            <p className="text-lg font-bold text-primary">
                              {entry.average_score.toFixed(1)}%
                            </p>
                          )}
                          {activeTab === "streak" && (
                            <div className="flex items-center gap-1 text-orange-500">
                              <Flame className="h-5 w-5" />
                              <span className="text-lg font-bold">{entry.current_streak}</span>
                            </div>
                          )}
                          {activeTab === "quizzes" && (
                            <p className="text-lg font-bold">{entry.total_quizzes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Leaderboard;
