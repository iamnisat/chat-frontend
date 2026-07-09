export type LoginType = "farmer" | "user";

export interface MessageSender {
  id: number;
  name: string;
  images?: string;
  base_image?: string;
}

export interface MessageResponse {
  id: string;
  thread_module_id: number;
  message: string;
  user_id: number | null;
  farmer_id: string | null;
  sender_type: LoginType | "ai_agent";
  sender_name: string;
  created_at: string;
  images?: string[];
  user?: MessageSender | null;
  farmer?: MessageSender | null;
}

export interface UserPayload {
  user_id?: number;
  farmer_id?: string;
  login_type?: LoginType;
  parent_id?: number;
  name?: string;
  token?: string;
  base_image?: string;
}

export interface SendMessagePayload {
  thread_module_id: number;
  message: string;
  farmer_id?: string;
  user_id?: number;
  sender_type?: LoginType | "ai_agent";
  client_id?: string;
  session_id?: string;
}

export interface TypingPayload {
  thread_module_id: number;
  user_id?: number;
  farmer_id?: string;
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
  created_at?: string;
  created_by?: string;
  last_message?: string;
  last_date_time?: number;
  is_seen?: boolean;
  conv_name?: string;
  thread?: {
    id: number;
    land: string | null;
    crop: string | null;
    year: string | null;
    type: string;
    season: number | null;
  };
}

export interface CreateThreadPayload {
  name: string;
}

export interface ChatUser {
  id: number;
  name: string;
  login_type: LoginType;
}
