import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookText, ArrowLeft, Loader2, Sparkles, MessageSquare, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Journal() {
  const [journalEntry, setJournalEntry] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAction = async (action: 'reflect' | 'prompt' | 'prayer') => {
    if (action !== 'prompt' && !journalEntry.trim()) {
      toast({
        title: "Entry required",
        description: "Please write something in your journal first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gloo-journal', {
        body: { 
          action, 
          journalEntry: journalEntry.trim() || undefined,
          prompt: action === 'prompt' ? undefined : undefined
        },
      });

      if (error) throw error;

      setResult(data.result);
      
      const actionLabels = {
        reflect: 'Reflection',
        prompt: 'Prompt',
        prayer: 'Prayer'
      };
      
      toast({
        title: `${actionLabels[action]} generated!`,
        description: "Your spiritual guidance is ready",
      });
    } catch (error) {
      console.error('Error processing journal:', error);
      toast({
        title: "Error",
        description: "Failed to process request. Please try again.",
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
              <BookText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Spiritual Journal</h1>
              <p className="text-sm text-muted-foreground">Reflect on your faith journey</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Tabs defaultValue="write" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="write">Write & Reflect</TabsTrigger>
              <TabsTrigger value="prompt">Get a Prompt</TabsTrigger>
            </TabsList>

            <TabsContent value="write" className="space-y-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle>Your Journal Entry</CardTitle>
                  <CardDescription>
                    Write about your spiritual journey, prayers, or reflections
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Share your thoughts, prayers, or experiences..."
                    value={journalEntry}
                    onChange={(e) => setJournalEntry(e.target.value)}
                    disabled={loading}
                    className="min-h-[200px] resize-y"
                  />

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => handleAction('reflect')}
                      disabled={loading || !journalEntry.trim()}
                      variant="default"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2" />
                      )}
                      Get Reflection
                    </Button>

                    <Button
                      onClick={() => handleAction('prayer')}
                      disabled={loading || !journalEntry.trim()}
                      variant="secondary"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Heart className="h-4 w-4 mr-2" />
                      )}
                      Generate Prayer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prompt" className="space-y-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Get a Journaling Prompt
                  </CardTitle>
                  <CardDescription>
                    Receive inspiration for your spiritual reflection today
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleAction('prompt')}
                    disabled={loading}
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
                        Generate Prompt
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {result && (
            <Card className="shadow-lifted">
              <CardHeader>
                <CardTitle>Spiritual Guidance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                  {result}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
