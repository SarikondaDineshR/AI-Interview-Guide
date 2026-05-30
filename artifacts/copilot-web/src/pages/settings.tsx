import { SidebarLayout } from "@/components/sidebar-layout";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/components/theme-provider";
import { useUpdateProfile, useDeleteAllChats, useDeleteAllDocuments, useDeleteAccount } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Trash2, Moon, Sun, Laptop } from "lucide-react";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  
  const updateProfile = useUpdateProfile();
  const deleteAllChats = useDeleteAllChats();
  const deleteAllDocs = useDeleteAllDocuments();
  const deleteAccount = useDeleteAccount();

  const [name, setName] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user]);

  const handleSaveProfile = () => {
    updateProfile.mutate({ data: { name } }, {
      onSuccess: () => {
        toast.success("Profile updated");
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      },
      onError: () => toast.error("Failed to update profile")
    });
  };

  const handleDeleteChats = () => {
    deleteAllChats.mutate(undefined, {
      onSuccess: () => {
        toast.success("All chats deleted");
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      },
      onError: () => toast.error("Failed to delete chats")
    });
  };

  const handleDeleteDocs = () => {
    deleteAllDocs.mutate(undefined, {
      onSuccess: () => {
        toast.success("All documents deleted");
        queryClient.invalidateQueries({ queryKey: ["/api/bots"] }); // documents are fetched by bot
      },
      onError: () => toast.error("Failed to delete documents")
    });
  };

  const handleDeleteAccount = () => {
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      },
      onError: () => toast.error("Failed to delete account")
    });
  };

  return (
    <SidebarLayout>
      <div className="max-w-3xl mx-auto w-full p-8 pt-16 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user?.image || ''} />
                <AvatarFallback className="text-xl"><UserCircle className="w-10 h-10" /></AvatarFallback>
              </Avatar>
            </div>
            
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} readOnly disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Your email cannot be changed.</p>
              </div>
              
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border pt-6">
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how the app looks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-md">
              <Label>Theme</Label>
              <ToggleGroup type="single" value={theme} onValueChange={(v) => v && setTheme(v as any)} className="justify-start">
                <ToggleGroupItem value="light" aria-label="Light" className="w-24">
                  <Sun className="w-4 h-4 mr-2" /> Light
                </ToggleGroupItem>
                <ToggleGroupItem value="dark" aria-label="Dark" className="w-24">
                  <Moon className="w-4 h-4 mr-2" /> Dark
                </ToggleGroupItem>
                <ToggleGroupItem value="system" aria-label="System" className="w-24">
                  <Laptop className="w-4 h-4 mr-2" /> System
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Privacy & Data</CardTitle>
            <CardDescription>Manage your data and account deletion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm mb-1">Delete all chats</h4>
                <p className="text-sm text-muted-foreground">Clear your entire conversation history across all bots.</p>
              </div>
              <Button variant="outline" onClick={handleDeleteChats} disabled={deleteAllChats.isPending}>
                Clear Chats
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm mb-1">Delete all documents</h4>
                <p className="text-sm text-muted-foreground">Remove all uploaded files from your knowledge base.</p>
              </div>
              <Button variant="outline" onClick={handleDeleteDocs} disabled={deleteAllDocs.isPending}>
                Clear Documents
              </Button>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm text-destructive mb-1">Delete Account</h4>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all data.</p>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      account and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}