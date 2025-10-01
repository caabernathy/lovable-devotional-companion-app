import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Loader2, LogOut, BookText, MessageCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast({
      title: "Signed out successfully",
      description: "See you next time!",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Daily Devotional</h1>
              <p className="text-sm text-muted-foreground">Your spiritual companion</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-4xl text-balance">
              Welcome, {user?.user_metadata?.display_name || 'Friend'}
            </h2>
            <p className="text-lg text-muted-foreground">
              Your personalized spiritual companion powered by Gloo AI
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="shadow-soft hover:shadow-lifted transition-smooth cursor-pointer group" onClick={() => navigate("/devotional")}>
              <CardHeader>
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="flex items-center justify-between">
                  Daily Devotional
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-smooth" />
                </CardTitle>
                <CardDescription>
                  Generate personalized devotionals based on topics or Scripture passages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate("/devotional")}>
                  Create Devotional
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-soft hover:shadow-lifted transition-smooth cursor-pointer group" onClick={() => navigate("/chat")}>
              <CardHeader>
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="flex items-center justify-between">
                  Spiritual Chat
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-smooth" />
                </CardTitle>
                <CardDescription>
                  Ask questions about faith, get biblical guidance, and explore spiritual topics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate("/chat")}>
                  Start Conversation
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-soft hover:shadow-lifted transition-smooth cursor-pointer group" onClick={() => navigate("/journal")}>
              <CardHeader>
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
                  <BookText className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="flex items-center justify-between">
                  Faith Journal
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-smooth" />
                </CardTitle>
                <CardDescription>
                  Reflect on your journey, receive prompts, and generate prayers from your entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate("/journal")}>
                  Open Journal
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-soft bg-gradient-peaceful text-primary-foreground">
            <CardHeader>
              <CardTitle>Powered by Gloo AI</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Your spiritual companion uses advanced AI to provide thoughtful, biblically-grounded guidance tailored to your journey
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
}
