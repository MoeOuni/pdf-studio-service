/**
 * AWS Cognito Authentication Service
 * Handles user registration, login, and token verification using AWS Cognito User Pools
 */

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  InitiateAuthCommand,
  GetUserCommand,
  AdminGetUserCommand,
  AuthFlowType,
  MessageActionType,
} from '@aws-sdk/client-cognito-identity-provider';

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env['AWS_REGION'] || 'us-east-1',
});

// Configuration
const USER_POOL_ID = process.env['COGNITO_USER_POOL_ID'] || '';
const CLIENT_ID = process.env['COGNITO_CLIENT_ID'] || '';

export interface CognitoUser {
  userId: string;
  email: string;
  name?: string;
  emailVerified: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterUserInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
  user: CognitoUser;
}

export class CognitoAuthService {
  
  /**
   * Register a new user in Cognito User Pool
   */
  async registerUser(input: RegisterUserInput): Promise<CognitoUser> {
    try {
      // Create user in Cognito
      await cognitoClient.send(new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: input.email,
        UserAttributes: [
          {
            Name: 'email',
            Value: input.email,
          },
          {
            Name: 'email_verified',
            Value: 'true', // Auto-verify for simplicity
          },
          ...(input.name ? [{
            Name: 'name',
            Value: input.name,
          }] : []),
        ],
        TemporaryPassword: this.generateTemporaryPassword(),
        MessageAction: MessageActionType.SUPPRESS, // Don't send welcome email
      }));

      // Set permanent password
      await cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: input.email,
        Password: input.password,
        Permanent: true,
      }));

      // Get user details
      const userDetails = await this.getUserByEmail(input.email);
      
      return userDetails;
    } catch (error: any) {
      console.error('Cognito registration error:', error);
      
      if (error.name === 'UsernameExistsException') {
        throw new Error('User with this email already exists');
      }
      
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Authenticate user with email and password
   */
  async loginUser(input: LoginUserInput): Promise<AuthResult> {
    try {
      const authResponse = await cognitoClient.send(new InitiateAuthCommand({
        ClientId: CLIENT_ID,
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        AuthParameters: {
          USERNAME: input.email,
          PASSWORD: input.password,
        },
      }));

      if (!authResponse.AuthenticationResult) {
        throw new Error('Authentication failed');
      }

      const { AccessToken, RefreshToken, IdToken, ExpiresIn } = authResponse.AuthenticationResult;

      if (!AccessToken || !RefreshToken || !IdToken) {
        throw new Error('Invalid authentication response');
      }

      // Get user details
      const user = await this.getUserByAccessToken(AccessToken);

      return {
        accessToken: AccessToken,
        refreshToken: RefreshToken,
        idToken: IdToken,
        expiresIn: ExpiresIn || 3600,
        user,
      };
    } catch (error: any) {
      console.error('Cognito login error:', error);
      
      if (error.name === 'NotAuthorizedException') {
        throw new Error('Invalid email or password');
      }
      
      if (error.name === 'UserNotConfirmedException') {
        throw new Error('Please verify your email address');
      }
      
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Get user details by access token
   */
  async getUserByAccessToken(accessToken: string): Promise<CognitoUser> {
    try {
      const userResponse = await cognitoClient.send(new GetUserCommand({
        AccessToken: accessToken,
      }));

      return this.formatCognitoUser(userResponse);
    } catch (error: any) {
      console.error('Get user by token error:', error);
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Get user details by email (admin operation)
   */
  async getUserByEmail(email: string): Promise<CognitoUser> {
    try {
      const userResponse = await cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
      }));

      return this.formatCognitoUser(userResponse);
    } catch (error: any) {
      console.error('Get user by email error:', error);
      
      if (error.name === 'UserNotFoundException') {
        throw new Error('User not found');
      }
      
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  /**
   * Verify access token and return user details
   */
  async verifyToken(accessToken: string): Promise<CognitoUser> {
    return this.getUserByAccessToken(accessToken);
  }

  /**
   * Format Cognito user response to our user interface
   */
  private formatCognitoUser(userResponse: any): CognitoUser {
    const attributes = userResponse.UserAttributes || [];
    const getAttributeValue = (name: string) => {
      const attr = attributes.find((a: any) => a.Name === name);
      return attr?.Value;
    };

    return {
      userId: userResponse.Username,
      email: getAttributeValue('email') || userResponse.Username,
      name: getAttributeValue('name'),
      emailVerified: getAttributeValue('email_verified') === 'true',
      status: userResponse.UserStatus || 'CONFIRMED',
      createdAt: userResponse.UserCreateDate?.toISOString() || new Date().toISOString(),
      updatedAt: userResponse.UserLastModifiedDate?.toISOString() || new Date().toISOString(),
    };
  }

  /**
   * Generate a temporary password for new users
   */
  private generateTemporaryPassword(): string {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    
    // Ensure at least one of each type
    password += "A"; // uppercase
    password += "a"; // lowercase  
    password += "1"; // number
    password += "!"; // special
    
    for (let i = 4; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    // Shuffle the password
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }
}

// Export singleton instance
export const cognitoAuth = new CognitoAuthService();
