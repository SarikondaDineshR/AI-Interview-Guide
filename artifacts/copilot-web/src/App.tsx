import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import { useEffect } from "react";
import { useListBots, useCreateBot } from "@workspace/api-client-react";

import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ChatPage from "@/pages/chat";
import BuilderIndex from "@/pages/builder-index";
import ChatbotBuilder from "@/pages/chatbot-builder";
import InterviewCopilotBuilder from "@/pages/interview-copilot-builder";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function Initializer() {
  const { data: bots, isLoading: botsLoading } = useListBots();
  const createBot = useCreateBot();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!botsLoading && bots) {
      if (bots.length === 0) {
        // Create default bots
        Promise.all([
          createBot.mutateAsync({ data: { type: 'CHATBOT', name: "My Chatbot", description: "A document-grounded AI assistant", temperature: 0.7 } }),
          createBot.mutateAsync({ data: { type: 'INTERVIEW_COPILOT', name: "My Interview Copilot", description: "An AI that answers interviews as you", temperature: 0.8 } })
        ]).then(([chatbot]) => {
          queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
          setLocation(`/chat/${chatbot.id}`);
        });
      } else {
        const chatbot = bots.find(b => b.type === 'CHATBOT') || bots[0];
        if (chatbot) {
          setLocation(`/chat/${chatbot.id}`);
        }
      }
    }
  }, [bots, botsLoading, setLocation]);

  return <div className="min-h-screen flex items-center justify-center">Loading your workspace...</div>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      
      <Route path="/">
        <ProtectedRoute>
          <Initializer />
        </ProtectedRoute>
      </Route>

      <Route path="/chat/:botId">
        <ProtectedRoute>
          <ChatPage />
        </ProtectedRoute>
      </Route>

      <Route path="/builder">
        <ProtectedRoute>
          <BuilderIndex />
        </ProtectedRoute>
      </Route>

      <Route path="/builder/chatbot/:botId">
        <ProtectedRoute>
          <ChatbotBuilder />
        </ProtectedRoute>
      </Route>

      <Route path="/builder/interview-copilot/:botId">
        <ProtectedRoute>
          <InterviewCopilotBuilder />
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;