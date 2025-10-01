import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Devotional() {
  const [topic, setTopic] = useState("");
  const [verseReference, setVerseReference] = useState("");
  const [devotional, setDevotional] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const generateDevotional = async () => {
    if (!topic && !verseReference) {
      toast({
        title: "Input required",
        description: "Please enter a topic or verse reference",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gloo-devotional', {
        body: { topic, verseReference },
      });

      if (error) throw error;

      setDevotional(data.devotional);
      toast({
        title: "Devotional generated!",
        description: "Your personalized devotional is ready",
      });
    } catch (error) {
      console.error('Error generating devotional:', error);
      toast({
        title: "Error",
        description: "Failed to generate devotional. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Daily Devotional</h1>
              <p className="text-sm text-muted-foreground">AI-powered spiritual reflection</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Generate Your Devotional
              </CardTitle>
              <CardDescription>
                Enter a topic or Bible verse reference to create a personalized devotional
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Topic (Optional)
                </label>
                <Input
                  placeholder="e.g., Finding peace, Overcoming fear..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Bible Verse Reference (Optional)
                </label>
                <Input
                  placeholder="e.g., John 3:16, Psalm 23:1-4..."
                  value={verseReference}
                  onChange={(e) => setVerseReference(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button 
                onClick={generateDevotional} 
                disabled={loading || (!topic && !verseReference)}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Devotional
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {devotional && (
            <Card className="shadow-lifted">
              <CardHeader>
                <CardTitle>Your Devotional</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                  {devotional}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
