export type LoginType = "farmer" | "user";

export interface MessageResponse {
  id: string;
  thread_module_id: number;
  message: string;
  user_id: number | null;
  farmer_id: number | null;
  sender_type: LoginType | "ai_agent";
  sender_name: string;
  created_at: string;
}

export interface UserPayload {
  user_id?: number;
  farmer_id?: number;
  login_type?: LoginType;
  parent_id?: number;
}

export interface SendMessagePayload {
  thread_module_id: number;
  message: string;
  farmer_id?: number;
  user_id?: number;
  sender_type?: LoginType | "ai_agent";
  client_id?: string;
  session_id?: string;
}

export interface TypingPayload {
  thread_module_id: number;
  user_id?: number;
  farmer_id?: number;
  sender_name?: string;
}

export interface SocketCallback {
  success: boolean;
  message?: string;
  data?: MessageResponse;
}

export interface ThreadModule {
  id: number;
  name: string;
}

export interface ChatUser {
  id: number;
  name: string;
  login_type: LoginType;
}
