import { APIGatewayProxyResult } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';
import { SuccessResponse, ErrorResponse } from '@/types';

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  statusCode: number = StatusCodes.OK
): APIGatewayProxyResult {
  const response: SuccessResponse<T> = {
    data,
    ...(message && { message }),
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(response),
  };
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  error: string,
  message?: string,
  statusCode: number = StatusCodes.BAD_REQUEST,
  details?: any
): APIGatewayProxyResult {
  const response: ErrorResponse = {
    error,
    ...(message && { message }),
    ...(details && { details }),
  };

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(response),
  };
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  message: string,
  details?: any
): APIGatewayProxyResult {
  return createErrorResponse(
    'Validation Error',
    message,
    StatusCodes.BAD_REQUEST,
    details
  );
}

/**
 * Create a not found error response
 */
export function createNotFoundResponse(
  resource: string = 'Resource'
): APIGatewayProxyResult {
  return createErrorResponse(
    'Not Found',
    `${resource} not found`,
    StatusCodes.NOT_FOUND
  );
}

/**
 * Create an unauthorized error response
 */
export function createUnauthorizedResponse(
  message: string = 'Unauthorized'
): APIGatewayProxyResult {
  return createErrorResponse(
    'Unauthorized',
    message,
    StatusCodes.UNAUTHORIZED
  );
}

/**
 * Create an internal server error response
 */
export function createInternalServerErrorResponse(
  message: string = 'Internal server error'
): APIGatewayProxyResult {
  return createErrorResponse(
    'Internal Server Error',
    message,
    StatusCodes.INTERNAL_SERVER_ERROR
  );
}