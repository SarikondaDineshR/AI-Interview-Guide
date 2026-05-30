import { SidebarLayout } from "@/components/sidebar-layout";
import { useGetBot, useUpdateBot, getGetBotQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { DocumentManager } from "@/components/document-manager";
import { useStreamingChat } from "@/hooks/use-streaming-chat";
import { Send, Square, Bot as BotIcon, User } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function ChatbotBuilder() {
  const { botId } = useParams();
  const queryClient = useQueryClient();
  const { data: bot, isLoading } = useGetBot(botId!, { query: { enabled: !!botId, queryKey: getGetBotQueryKey(botId!) } });
  const updateBot = useUpdateBot();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState([0.7]);

  const initializedForId = useRef<string | null>(null);

  useEffect(() => {
    if (bot && initializedForId.current !== botId) {
      initializedForId.current = botId!;
      setName(bot.name || "");
      setDescription(bot.description || "");
      setSystemPrompt(bot.systemPrompt || "");
      setTemperature([bot.temperature ?? 0.7]);
    }
  }, [bot, botId]);

  const handleSave = () => {
    updateBot.mutate({
      botId: botId!,
      data: {
        name,
        description,
        systemPrompt,
        temperature: temperature[0]
      }
    }, {
      onSuccess: (updatedBot) => {
        toast.success("Bot saved successfully");
        queryClient.setQueryData(getGetBotQueryKey(botId!), updatedBot);
      },
      onError: () => toast.error("Failed to save bot")
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

  if (isLoading) return <SidebarLayout><div className="p-8 text-center">Loading...</div></SidebarLayout>;

  return (
    <SidebarLayout>
      <ResizablePanelGroup direction="horizontal" className="h-screen w-full rounded-none">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col border-r border-border">
            <div className="p-4 border-b border-border flex justify-between items-center bg-card">
              <h2 className="font-semibold">Edit Chatbot Configuration</h2>
              <Button onClick={handleSave} disabled={updateBot.isPending} data-testid="button-save-bot">
                {updateBot.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Custom Assistant" />
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this bot do?" className="resize-none" />
                </div>
                
                <div className="space-y-2">
                  <Label>System Prompt</Label>
                  <Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder="You are a helpful assistant..." className="min-h-[150px]" />
                </div>
                
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <Label>Temperature: {temperature[0]}</Label>
                    <span className="text-xs text-muted-foreground">Higher = more creative</span>
                  </div>
                  <Slider value={temperature} onValueChange={setTemperature} min={0} max={2} step={0.1} />
                </div>
              </div>

              <div className="pt-6 border-t border-border">
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
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Send a message to test your bot
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

            <div className="p-4 border-t border-border bg-card">
              <form onSubmit={handleChatSubmit} className="relative flex items-end shadow-sm bg-background border border-border rounded-xl focus-within:ring-1 focus-within:ring-ring">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Test message..."
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