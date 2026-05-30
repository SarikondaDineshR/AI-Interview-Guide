import { useAuth } from "@/lib/auth";
import { useListBots, useListConversations, useCreateConversation, useDeleteConversation, useLogout } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, Settings, UserCircle, LogOut, PanelLeft, Bot, Briefcase, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { data: bots } = useListBots();
  const { data: conversations, refetch: refetchConversations } = useListConversations();
  
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = '/login';
      }
    });
  };

  const chatbotBot = bots?.find(b => b.type === 'CHATBOT');
  const interviewBot = bots?.find(b => b.type === 'INTERVIEW_COPILOT');

  const handleNewChat = (botId?: string) => {
    if (!botId) return;
    createConversation.mutate({ data: { botId, title: "New Chat" } }, {
      onSuccess: (conv) => {
        setLocation(`/chat/${botId}?conv=${conv.id}`);
        refetchConversations();
      }
    });
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <motion.div 
        initial={false}
        animate={{ width: isCollapsed ? 64 : 260 }}
        className="flex flex-col border-r border-border bg-sidebar shrink-0"
      >
        <div className="p-3 flex items-center justify-between">
          {!isCollapsed && <span className="font-semibold px-2 text-sidebar-foreground truncate">Copilot</span>}
          <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="shrink-0 text-sidebar-foreground" data-testid="button-toggle-sidebar">
            <PanelLeft className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          <Button 
            className={cn("w-full justify-start", isCollapsed && "justify-center px-0")}
            onClick={() => handleNewChat(chatbotBot?.id)}
            data-testid="button-new-chat"
          >
            <Plus className="w-4 h-4 mr-2" />
            {!isCollapsed && <span>New Chat</span>}
          </Button>

          <div className="space-y-1">
            {chatbotBot && (
              <Button variant="ghost" className={cn("w-full justify-start", isCollapsed && "justify-center px-0")} asChild>
                <Link href={`/chat/${chatbotBot.id}`} data-testid="link-chatbot">
                  <Bot className="w-4 h-4 mr-2" />
                  {!isCollapsed && <span>Chatbot</span>}
                </Link>
              </Button>
            )}
            {interviewBot && (
              <Button variant="ghost" className={cn("w-full justify-start", isCollapsed && "justify-center px-0")} asChild>
                <Link href={`/chat/${interviewBot.id}`} data-testid="link-interview">
                  <Briefcase className="w-4 h-4 mr-2" />
                  {!isCollapsed && <span>Interview Copilot</span>}
                </Link>
              </Button>
            )}
          </div>

          {!isCollapsed && conversations && conversations.length > 0 && (
            <div className="pt-4">
              <div className="text-xs font-semibold text-muted-foreground px-2 mb-2">Previous Chats</div>
              <div className="space-y-1">
                {conversations.map(conv => (
                  <div key={conv.id} className="group relative flex items-center">
                    <Button variant="ghost" className="w-full justify-start text-sm truncate pr-8 h-8" asChild>
                      <Link href={`/chat/${conv.botId}?conv=${conv.id}`} data-testid={`link-conv-${conv.id}`}>
                        <MessageSquare className="w-3.5 h-3.5 mr-2 shrink-0 text-muted-foreground" />
                        <span className="truncate">{conv.title || "Untitled Chat"}</span>
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-0 opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        deleteConversation.mutate({ conversationId: conv.id }, {
                          onSuccess: () => refetchConversations()
                        });
                      }}
                      data-testid={`button-delete-conv-${conv.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border space-y-1">
          <Button variant="ghost" className={cn("w-full justify-start", isCollapsed && "justify-center px-0")} asChild>
            <Link href="/builder" data-testid="link-builder">
              <Settings className="w-4 h-4 mr-2" />
              {!isCollapsed && <span>Edit Bots</span>}
            </Link>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={cn("w-full justify-start mt-2", isCollapsed && "justify-center px-0")} data-testid="button-user-menu">
                <Avatar className="w-6 h-6 mr-2">
                  <AvatarImage src={user?.image || ''} />
                  <AvatarFallback><UserCircle className="w-6 h-6" /></AvatarFallback>
                </Avatar>
                {!isCollapsed && <span className="truncate">{user?.name || user?.email}</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer" data-testid="menu-settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer" data-testid="menu-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {children}
      </div>
    </div>
  );
}