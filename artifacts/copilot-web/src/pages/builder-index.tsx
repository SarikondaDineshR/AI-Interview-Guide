import { SidebarLayout } from "@/components/sidebar-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Briefcase } from "lucide-react";
import { Link } from "wouter";
import { useListBots } from "@workspace/api-client-react";

export default function BuilderIndex() {
  const { data: bots } = useListBots();
  
  const chatbotBot = bots?.find(b => b.type === 'CHATBOT');
  const interviewBot = bots?.find(b => b.type === 'INTERVIEW_COPILOT');

  return (
    <SidebarLayout>
      <div className="max-w-4xl mx-auto w-full p-8 pt-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-3">What do you want to edit?</h1>
          <p className="text-muted-foreground text-lg">Configure your AI assistants</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover-elevate transition-all border-2 hover:border-primary/50 flex flex-col">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Bot className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">Chatbot</CardTitle>
              <CardDescription className="text-base">
                A general-purpose AI assistant grounded in your documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-6">
              {chatbotBot ? (
                <Button className="w-full" size="lg" asChild data-testid="button-edit-chatbot">
                  <Link href={`/builder/chatbot/${chatbotBot.id}`}>Edit Chatbot</Link>
                </Button>
              ) : (
                <Button className="w-full" size="lg" disabled>Loading...</Button>
              )}
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all border-2 hover:border-primary/50 flex flex-col">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">Interview Copilot</CardTitle>
              <CardDescription className="text-base">
                An AI that answers interview questions in-character as you.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-6">
              {interviewBot ? (
                <Button className="w-full" size="lg" asChild data-testid="button-edit-interview">
                  <Link href={`/builder/interview-copilot/${interviewBot.id}`}>Edit Interview Copilot</Link>
                </Button>
              ) : (
                <Button className="w-full" size="lg" disabled>Loading...</Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}