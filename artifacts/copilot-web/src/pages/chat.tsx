import { SidebarLayout } from "@/components/sidebar-layout";
import { useGetBot, getGetBotQueryKey, useGetConversation, getGetConversationQueryKey } from "@workspace/api-client-react";
import { useParams, useSearch } from "wouter";
import { useStreamingChat } from "@/hooks/use-streaming-chat";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square, Bot as BotIcon, User } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { botId } = useParams();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const convId = searchParams.get('conv');

  const { data: bot } = useGetBot(botId!, { 
    query: { enabled: !!botId, queryKey: getGetBotQueryKey(botId!) } 
  });

  const { data: conversation } = useGetConversation(convId!, {
    query: { enabled: !!convId, queryKey: getGetConversationQueryKey(convId!) }
  });

  const { messages, setMessages, isStreaming, sendMessage, stopStreaming, setConversationId } = useStreamingChat(botId!, convId);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversation?.messages) {
      setMessages(conversation.messages.map(m => ({ id: m.id, role: m.role as 'USER' | 'ASSISTANT', content: m.content })));
    } else {
      setMessages([]);
    }
  }, [conversation, setMessages]);

  useEffect(() => {
    setConversationId(convId || null);
  }, [convId, setConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <SidebarLayout>
      <div className="flex-1 flex flex-col h-screen">
        <div className="border-b border-border p-4 flex items-center bg-background shrink-0">
          <div className="font-semibold">{bot?.name || "Loading..."}</div>
          <div className="text-xs text-muted-foreground ml-4 bg-muted px-2 py-1 rounded-full">{bot?.type}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                <BotIcon className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">{bot?.name}</h2>
              <p className="text-muted-foreground mb-8">
                {bot?.description || "Start a conversation to get started."}
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, i) => (
                <div key={msg.id || i} className={cn("flex gap-4", msg.role === 'USER' ? "justify-end" : "justify-start")}>
                  {msg.role === 'ASSISTANT' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <BotIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div className={cn(
                    "rounded-2xl px-4 py-3 max-w-[85%] prose prose-sm dark:prose-invert",
                    msg.role === 'USER' ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {msg.role === 'ASSISTANT' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                    {isStreaming && msg.role === 'ASSISTANT' && i === messages.length - 1 && (
                      <span className="inline-block w-1.5 h-4 ml-1 bg-foreground animate-pulse" />
                    )}
                  </div>
                  {msg.role === 'USER' && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="p-4 bg-background border-t border-border shrink-0">
          <div className="max-w-3xl mx-auto relative">
            <form onSubmit={handleSubmit} className="relative flex items-end shadow-sm bg-card border border-border rounded-xl focus-within:ring-1 focus-within:ring-ring focus-within:border-primary transition-all">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Copilot..."
                className="min-h-[60px] max-h-[200px] w-full resize-none border-0 focus-visible:ring-0 bg-transparent py-4 pl-4 pr-14 shadow-none"
                data-testid="input-message"
              />
              <div className="absolute right-2 bottom-2">
                {isStreaming ? (
                  <Button type="button" size="icon" variant="secondary" className="h-8 w-8 rounded-lg" onClick={stopStreaming} data-testid="button-stop">
                    <Square className="h-4 w-4 fill-current" />
                  </Button>
                ) : (
                  <Button type="submit" size="icon" className="h-8 w-8 rounded-lg" disabled={!input.trim()} data-testid="button-send">
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}