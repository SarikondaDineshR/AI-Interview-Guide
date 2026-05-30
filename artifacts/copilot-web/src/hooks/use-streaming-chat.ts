import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getListConversationsQueryKey, getGetConversationQueryKey } from '@workspace/api-client-react';

type SSEMessage = {
  type: 'conversationId';
  conversationId: string;
} | {
  type: 'token';
  token: string;
} | {
  type: 'done';
};

export function useStreamingChat(botId: string, initialConversationId?: string | null) {
  const [messages, setMessages] = useState<{ id: string; role: 'USER' | 'ASSISTANT'; content: string }[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const sendMessage = useCallback(async (content: string) => {
    setIsStreaming(true);
    const userMessageId = Math.random().toString();
    setMessages(prev => [...prev, { id: userMessageId, role: 'USER', content }]);
    
    const assistantMessageId = Math.random().toString();
    setMessages(prev => [...prev, { id: assistantMessageId, role: 'ASSISTANT', content: '' }]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`/api/bots/${botId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, conversationId }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let isDone = false;
      let buffer = '';

      while (!isDone) {
        const { value, done } = await reader.read();
        if (done) {
          isDone = true;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr) as SSEMessage;
              if (data.type === 'token') {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: msg.content + data.token }
                    : msg
                ));
              } else if (data.type === 'conversationId') {
                setConversationId(data.conversationId);
                // Update URL if needed, but the caller will handle it via callback or useEffect
              } else if (data.type === 'done') {
                // Done
              }
            } catch (e) {
              console.error('Failed to parse SSE data', e);
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(conversationId) });
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted');
      } else {
        console.error('Streaming error', error);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [botId, conversationId, queryClient]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  return {
    messages,
    setMessages,
    isStreaming,
    sendMessage,
    stopStreaming,
    conversationId,
    setConversationId
  };
}