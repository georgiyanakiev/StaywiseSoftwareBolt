import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useActiveHotel } from '../contexts/ActiveHotelContext';
import { useAuth } from '../contexts/AuthContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useAIConcierge() {
  const { session } = useActiveHotel();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const hotelId = session?.hotelId;
  const tenantId = session?.tenantId;

  const loadConversations = useCallback(async () => {
    if (!hotelId) return;
    const { data } = await supabase
      .from('ai_conversations')
      .select('id, title, created_at, updated_at')
      .eq('hotel_id', hotelId)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (data) setConversations(data);
  }, [hotelId]);

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from('ai_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data as ChatMessage[]);
      setConversationId(convId);
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!hotelId || !user) return;
    setError(null);
    setLoading(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      let convId = conversationId;
      if (!convId) {
        const { data: conv, error: convErr } = await supabase
          .from('ai_conversations')
          .insert({
            hotel_id: hotelId,
            tenant_id: tenantId,
            user_id: user.id,
            title: content.slice(0, 80),
          })
          .select('id')
          .single();
        if (convErr || !conv) throw new Error(convErr?.message ?? 'Failed to create conversation');
        convId = conv.id;
        setConversationId(convId);
      }

      await supabase.from('ai_messages').insert({
        conversation_id: convId,
        role: 'user',
        content,
      });

      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      abortRef.current = new AbortController();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-concierge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify({
          message: content,
          hotel_id: hotelId,
          conversation_history: conversationHistory,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errBody.details || errBody.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      const assistantContent = data.response;

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContent,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      await supabase.from('ai_messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: assistantContent,
      });

      await supabase
        .from('ai_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to get AI response');
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [hotelId, tenantId, user, conversationId, messages]);

  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const deleteConversation = useCallback(async (convId: string) => {
    await supabase.from('ai_conversations').delete().eq('id', convId);
    if (convId === conversationId) {
      startNewConversation();
    }
    setConversations(prev => prev.filter(c => c.id !== convId));
  }, [conversationId, startNewConversation]);

  return {
    messages,
    loading,
    error,
    conversationId,
    conversations,
    sendMessage,
    cancelRequest,
    loadConversations,
    loadMessages,
    startNewConversation,
    deleteConversation,
  };
}
