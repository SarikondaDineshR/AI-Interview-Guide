import { SidebarLayout } from "@/components/sidebar-layout";
import { useGetBot, useUpdateBot, getGetBotQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { DocumentManager } from "@/components/document-manager";
import { useStreamingChat } from "@/hooks/use-streaming-chat";
import { Send, Square, Bot as BotIcon, Briefcase } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function InterviewCopilotBuilder() {
  const { botId } = useParams();
  const queryClient = useQueryClient();
  const { data: bot, isLoading } = useGetBot(botId!, { query: { enabled: !!botId, queryKey: getGetBotQueryKey(botId!) } });
  const updateBot = useUpdateBot();

  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [answerStyle, setAnswerStyle] = useState("");
  const [temperature, setTemperature] = useState([0.8]);

  const initializedForId = useRef<string | null>(null);

  useEffect(() => {
    if (bot && initializedForId.current !== botId) {
      initializedForId.current = botId!;
      setName(bot.name || "");
      setSystemPrompt(bot.systemPrompt || "");
      setJobDescription(bot.jobDescription || "");
      setAnswerStyle(bot.answerStyle || "natural human");
      setTemperature([bot.temperature ?? 0.8]);
    }
  }, [bot, botId]);

  const handleSave = () => {
    updateBot.mutate({
      botId: botId!,
      data: {
        name,
        systemPrompt,
        jobDescription,
        answerStyle,
        temperature: temperature[0]
      }
    }, {
      onSuccess: (updatedBot) => {
        toast.success("Copilot saved successfully");
        queryClient.setQueryData(getGetBotQueryKey(botId!), updatedBot);
      },
      onError: () => toast.error("Failed to save copilot")
    });
  };

  // Test Chat
  const { messages, isStreaming, sendMessage, stopStreaming } = useStreamingChat(botId!);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleChatSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || isStreaming) return;
    sendMessage(chatInput.trim());
    setChatInput("");
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  };

  const sendSampleQuestion = (question: string) => {
    if (isStreaming) return;
    sendMessage(question);
  };

  const sampleQuestions = [
    "Tell me about yourself",
    "Why are you a good fit?",
    "Explain your recent project",
    "What are your strengths?",
    "Tell me about a challenge you overcame"
  ];

  if (isLoading) return <SidebarLayout><div className="p-8 text-center">Loading...</div></SidebarLayout>;

  return (
    <SidebarLayout>
      <ResizablePanelGroup direction="horizontal" className="h-screen w-full rounded-none">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col border-r border-border">
            <div className="p-4 border-b border-border flex justify-between items-center bg-card">
              <h2 className="font-semibold flex items-center"><Briefcase className="w-4 h-4 mr-2" /> Edit Interview Copilot</h2>
              <Button onClick={handleSave} disabled={updateBot.isPending} data-testid="button-save-copilot">
                {updateBot.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Copilot Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} />
                </div>
                
                <div className="space-y-2">
                  <Label>Interview Behavior Prompt</Label>
                  <Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder="You are answering interview questions as me..." className="min-h-[100px]" />
                </div>

                <div className="space-y-2">
                  <Label>Target Job Description</Label>
                  <Textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste the job description here..." className="min-h-[120px]" />
                </div>

                <div className="space-y-2">
                  <Label>Answer Style</Label>
                  <Select value={answerStyle} onValueChange={setAnswerStyle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concise & Direct</SelectItem>
                      <SelectItem value="detailed">Detailed & Comprehensive</SelectItem>
                      <SelectItem value="natural human">Natural Human</SelectItem>
                      <SelectItem value="technical">Highly Technical</SelectItem>
                      <SelectItem value="behavioral">STAR Method (Behavioral)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <Label>Temperature: {temperature[0]}</Label>
                    <span className="text-xs text-muted-foreground">Higher = more adaptable</span>
                  </div>
                  <Slider value={temperature} onValueChange={setTemperature} min={0} max={2} step={0.1} />
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <div className="mb-2 text-sm text-muted-foreground">Upload your resume, past projects, or notes.</div>
                <DocumentManager botId={botId!} />
              </div>
            </div>
          </div>
        </ResizablePanel>
        
        <ResizableHandle />
        
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-background">
            <div className="p-4 border-b border-border bg-card">
              <h2 className="font-semibold text-muted-foreground flex items-center">
                <BotIcon className="w-4 h-4 mr-2" /> Live Test
              </h2>
            </div>
            
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 bg-muted/30 border-b border-border flex flex-wrap gap-2 shrink-0">
                <span className="text-xs text-muted-foreground w-full mb-1">Sample Questions:</span>
                {sampleQuestions.map(q => (
                  <Button key={q} variant="outline" size="sm" className="text-xs h-7" onClick={() => sendSampleQuestion(q)}>
                    {q}
                  </Button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Select a sample question or type your own
                  </div>
                 ) : (
                  messages.map((msg, i) => (
                    <div key={msg.id || i} className={cn("flex gap-3", msg.role === 'USER' ? "justify-end" : "justify-start")}>
                      {msg.role === 'ASSISTANT' && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <BotIcon className="w-4 h-4" />
                        </div>
                      )}
                      <div className={cn(
                        "rounded-2xl px-4 py-2.5 max-w-[85%] text-sm prose prose-sm dark:prose-invert",
                        msg.role === 'USER' ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {msg.role === 'ASSISTANT' ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        ) : (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        )}
                        {isStreaming && msg.role === 'ASSISTANT' && i === messages.length - 1 && (
                          <span className="inline-block w-1 h-3 ml-1 bg-foreground animate-pulse" />
                        )}
                      </div>
                    </div>
                  ))
                 )}
                 <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-4 border-t border-border bg-card shrink-0">
              <form onSubmit={handleChatSubmit} className="relative flex items-end shadow-sm bg-background border border-border rounded-xl focus-within:ring-1 focus-within:ring-ring">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Ask a custom interview question..."
                  className="min-h-[60px] max-h-[150px] w-full resize-none border-0 focus-visible:ring-0 bg-transparent py-4 pl-4 pr-12 shadow-none"
                  data-testid="input-test-chat"
                />
                <div className="absolute right-2 bottom-2">
                  {isStreaming ? (
                    <Button type="button" size="icon" variant="secondary" className="h-8 w-8 rounded-lg" onClick={stopStreaming}>
                      <Square className="h-4 w-4 fill-current" />
                    </Button>
                  ) : (
                    <Button type="submit" size="icon" className="h-8 w-8 rounded-lg" disabled={!chatInput.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarLayout>
  );
}