export type Language = 'en' | 'zh' | 'el' | 'id' | 'ja' | 'vi';

export type Message = {
  text: string;
  sender: 'user' | 'agent';
  isTranscribed: boolean;
};

export const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: 'US' },
  { code: 'zh', name: 'Chinese', flag: 'CN' },
  { code: 'el', name: 'Greek', flag: 'GR' },
  { code: 'id', name: 'Indonesian', flag: 'ID' },
  { code: 'ja', name: 'Japanese', flag: 'JP' },
  { code: 'vi', name: 'Vietnamese', flag: 'VN' },
];

export const CONVERSATION_CONFIG = {
  INACTIVE_THRESHOLD: 1000, // 1 second of silence before considering inactive
  AGENT_ID: 'agent_01jwsxt8vseg6933dfd2jb4vkd',
  AUDIO_THRESHOLD: 5,
} as const; 