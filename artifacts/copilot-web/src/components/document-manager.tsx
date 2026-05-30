import { useState, useRef } from "react";
import { useListDocuments, useDeleteDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Upload, FileText, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DocumentVectorStatus } from "@workspace/api-client-react/src/generated/api.schemas";

export function DocumentManager({ botId }: { botId: string }) {
  const queryClient = useQueryClient();
  const { data: documents, isLoading } = useListDocuments(botId, {
    query: { enabled: !!botId, queryKey: getListDocumentsQueryKey(botId) }
  });
  const deleteDoc = useDeleteDocument();
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/bots/${botId}/documents`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      
      toast.success("Document uploaded successfully");
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(botId) });
    } catch (err) {
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (docId: string) => {
    deleteDoc.mutate({ documentId: docId }, {
      onSuccess: () => {
        toast.success("Document deleted");
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(botId) });
      },
      onError: () => toast.error("Failed to delete document")
    });
  };

  const getStatusIcon = (status: DocumentVectorStatus) => {
    switch (status) {
      case 'processed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'processing': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Knowledge Base</h3>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading} data-testid="button-upload-doc">
          <Upload className="w-4 h-4 mr-2" />
          {isUploading ? "Uploading..." : "Upload File"}
        </Button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleUpload}
          accept=".txt,.pdf,.md,.csv,.doc,.docx"
        />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-4">Loading documents...</div>
        ) : documents?.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-lg border border-dashed border-border">
            No documents uploaded yet.
          </div>
        ) : (
          documents?.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg group">
              <div className="flex items-center space-x-3 overflow-hidden">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate font-medium">{doc.originalName}</span>
                <div className="flex items-center space-x-1 shrink-0" title={doc.vectorStatus}>
                  {getStatusIcon(doc.vectorStatus)}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => handleDelete(doc.id)}
                data-testid={`button-delete-doc-${doc.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}