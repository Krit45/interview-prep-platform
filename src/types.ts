export type InterviewType = 'HR' | 'Technical' | 'Coding';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  resumeText?: string;
  skills?: string[];
  experienceKeywords?: string[];
  createdAt: string;
}

export interface Interview {
  id: string;
  userId: string;
  type: InterviewType;
  role: string;
  difficulty: Difficulty;
  status: 'pending' | 'completed';
  isPracticeMode?: boolean;
  score?: number;
  feedback?: string;
  createdAt: string;
}

export interface Response {
  id: string;
  interviewId: string;
  question: string;
  answer: string;
  score?: number;
  feedback?: string;
  createdAt: string;
}

export interface Question {
  id: string;
  text: string;
  category: string;
}
