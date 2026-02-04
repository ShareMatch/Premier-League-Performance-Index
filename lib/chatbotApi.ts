/**
 * Chatbot API - Frontend client for the RAG chatbot
 *
 * Uses Supabase Edge Function for all environments
 */

import { supabase } from "./supabase";

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface VideoInfo {
  id: string;
  url: string;
  title: string;
}

export interface ChatResponse {
  message: string;
  conversationId: string;
  video?: VideoInfo;
}

/**
 * Send a message to the chatbot and get a response
 */
export const sendChatMessage = async (
  request: ChatRequest,
): Promise<ChatResponse> => {
  try {
    return await sendViaSupabase(request);
  } catch (error) {
    // console.error('Chatbot API error:', error);

    // If backend is not available, return a helpful message
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        message: "I'm currently offline. Please try again later.",
        conversationId: "offline",
      };
    }

    throw error;
  }
};

/**
 * Send message via Supabase Edge Function
 */
async function sendViaSupabase(request: ChatRequest): Promise<ChatResponse> {
  const { data, error } = await supabase.functions.invoke("chatbot", {
    body: {
      message: request.message,
      conversation_id: request.conversationId,
    },
  });

  if (error) {
    // console.error('Supabase function error:', error);
    throw new Error(error.message || "Failed to get response from AI");
  }

  const response: ChatResponse = {
    message: data.message,
    conversationId: data.conversation_id,
  };

  // Include video if present
  if (data.video) {
    response.video = data.video;
  }

  return response;
}

/**
 * Check if the chatbot backend is healthy
 */
export const checkChatbotHealth = async (): Promise<boolean> => {
  // Supabase Edge Functions are always "available"
  return true;
};

/**
 * Clear the conversation (for future session management)
 */
export const clearConversation = async (): Promise<void> => {
  // Currently conversations are stateless, but this is here for future use
};
