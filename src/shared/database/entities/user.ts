/**
 * User Entity Definition for DynamoDB
 */

export interface User {
  PK: string; // USER#${id}
  SK: string; // PROFILE
  GSI1PK: string; // EMAIL#${email}
  GSI1SK: string; // USER
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  emailVerified: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
  avatarUrl?: string;
  company?: string;
  timezone: string;
  language: string;
  preferences: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  password?: string; // For compatibility with existing functions
  passwordHash: string;
  name?: string;
  timezone?: string;
  language?: string;
  preferences?: Record<string, any>;
}

export interface UpdateUserInput {
  name?: string;
  emailVerified?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
  avatarUrl?: string;
  company?: string;
  timezone?: string;
  language?: string;
  preferences?: Record<string, any>;
}
