import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { baseMiddleware } from '@/shared/middleware';
import { authMiddleware } from '@/shared/auth/middleware';
import { createSuccessResponse } from '@/shared/utils/response';
import { TemplatesRepository } from '@/shared/database/dynamodb/templates-repository';

/**
 * List user's templates with pagination
 */
const listTemplatesHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Get authenticated user from context (added by authMiddleware)
  const user = (context as any).user;

  // Parse query parameters
  const limit = parseInt(event.queryStringParameters?.['limit'] || '20', 10);
  const search = event.queryStringParameters?.['search'];
  const includePublic = event.queryStringParameters?.['includePublic'] === 'true';
  
  // Handle pagination cursor
  let lastEvaluatedKey: Record<string, any> | undefined;
  const cursor = event.queryStringParameters?.['cursor'];
  if (cursor) {
    try {
      lastEvaluatedKey = JSON.parse(Buffer.from(cursor, 'base64').toString());
    } catch (error) {
      // Invalid cursor, ignore it
    }
  }

  try {
    const templatesRepo = new TemplatesRepository();
    let result;

    if (search) {
      // Search templates by name or tags
      result = await templatesRepo.searchTemplates(user.userId, search, {
        limit,
        lastEvaluatedKey,
      });
    } else {
      // List user's templates
      result = await templatesRepo.findByUserId(user.userId, {
        limit,
        lastEvaluatedKey,
      });
      
      // If includePublic is true, also fetch public templates
      if (includePublic && result.items.length < limit) {
        const publicResult = await templatesRepo.findPublicTemplates({
          limit: limit - result.items.length,
        });
        
        // Merge results (user templates first, then public)
        result.items = [...result.items, ...publicResult.items];
        result.count += publicResult.count;
        
        // Use public result's pagination if user templates are exhausted
        if (!result.hasMore && publicResult.hasMore) {
          result.hasMore = true;
          result.lastEvaluatedKey = publicResult.lastEvaluatedKey;
        }
      }
    }

    // Encode the cursor for next page
    let nextCursor: string | undefined;
    if (result.lastEvaluatedKey) {
      nextCursor = Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64');
    }

    return createSuccessResponse({
      templates: result.items,
      pagination: {
        count: result.count,
        hasMore: result.hasMore,
        nextCursor,
      },
    }, 'Templates retrieved successfully');

  } catch (error) {
    console.error('List templates error:', error);
    throw error;
  }
};

// Export the handler with authentication middleware
export const main = baseMiddleware(listTemplatesHandler)
  .use(authMiddleware);
