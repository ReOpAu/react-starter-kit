export type Language = 'en' | 'zh' | 'el' | 'id' | 'ja' | 'vi';

export type Message = {
  text: string;
  sender: 'user' | 'agent';
  isTranscribed: boolean;
};

export const languages: { code: Language; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese' },
  { code: 'el', name: 'Greek' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'vi', name: 'Vietnamese' },
];

export const CONVERSATION_CONFIG = {
  INACTIVE_THRESHOLD: 1000, // 1 second of silence before considering inactive
  AGENT_ID: 'agent_01jwsxt8vseg6933dfd2jb4vkd',
  AUDIO_THRESHOLD: 5,
} as const; 