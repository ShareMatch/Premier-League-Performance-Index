/**
 * Chatbot API - Frontend client for the RAG chatbot
 * 
 * Supports two modes:
 * 1. Production: Supabase Edge Function (default)
 * 2. Development: Local Python backend
 */

import { supabase } from './supabase';

// Use Supabase Edge Function in production, local backend in development
const USE_SUPABASE_FUNCTION = import.meta.env.PROD || import.meta.env.VITE_USE_SUPABASE_CHATBOT === 'true';
const LOCAL_BACKEND_URL = import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:8000';

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  message: string;
  conversationId: string;
}

/**
 * Send a message to the chatbot and get a response
 */
export const sendChatMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  try {
    if (USE_SUPABASE_FUNCTION) {
      // Production: Use Supabase Edge Function
      return await sendViaSupabase(request);
    } else {
      // Development: Use local Python backend
      return await sendViaLocalBackend(request);
    }
  } catch (error) {
    console.error('Chatbot API error:', error);
    
    // If backend is not available, return a helpful message
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        message: "I'm currently offline. Please try again later.",
        conversationId: 'offline',
      };
    }
    
    throw error;
  }
};

/**
 * Send message via Supabase Edge Function (Production)
 */
async function sendViaSupabase(request: ChatRequest): Promise<ChatResponse> {
  const { data, error } = await supabase.functions.invoke('chatbot', {
    body: {
      message: request.message,
      conversation_id: request.conversationId,
    },
  });

  if (error) {
    console.error('Supabase function error:', error);
    throw new Error(error.message || 'Failed to get response from AI');
  }

  return {
    message: data.message,
    conversationId: data.conversation_id,
  };
}

/**
 * Send message via local Python backend (Development)
 */
async function sendViaLocalBackend(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${LOCAL_BACKEND_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: request.message,
      conversation_id: request.conversationId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    message: data.message,
    conversationId: data.conversation_id,
  };
}

/**
 * Check if the chatbot backend is healthy
 */
export const checkChatbotHealth = async (): Promise<boolean> => {
  try {
    if (USE_SUPABASE_FUNCTION) {
      // For Supabase, just return true (functions are always "available")
      return true;
    }
    
    const response = await fetch(`${LOCAL_BACKEND_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      return data.status === 'ok' && data.rag_initialized;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Clear the conversation (for future session management)
 */
export const clearConversation = async (): Promise<void> => {
  // Currently conversations are stateless, but this is here for future use
  if (!USE_SUPABASE_FUNCTION) {
    try {
      await fetch(`${LOCAL_BACKEND_URL}/clear`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  }
};
