import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const tables = [
      process.env.DECISIONS_TABLE!,
      process.env.BRANCHES_TABLE!,
      process.env.CONVERSATIONS_TABLE!,
      process.env.COMPARISONS_TABLE!,
      process.env.EVENTS_TABLE!
    ];

    const results = [];

    for (const tableName of tables) {
      console.log(`Clearing table: ${tableName}`);
      
      // Scan all items from the table
      const scanCommand = new ScanCommand({
        TableName: tableName,
      });
      
      const scanResult = await docClient.send(scanCommand);
      const items = scanResult.Items || [];
      
      if (items.length === 0) {
        console.log(`Table ${tableName} is already empty`);
        results.push({ table: tableName, deleted: 0 });
        continue;
      }

      // Delete items in batches of 25 (DynamoDB limit)
      const batches = [];
      for (let i = 0; i < items.length; i += 25) {
        const batch = items.slice(i, i + 25);
        const deleteRequests = batch.map(item => ({
          DeleteRequest: {
            Key: getKeyFromItem(tableName, item)
          }
        }));
        
        batches.push({
          RequestItems: {
            [tableName]: deleteRequests
          }
        });
      }

      // Execute batch delete operations
      let deletedCount = 0;
      for (const batch of batches) {
        const batchCommand = new BatchWriteCommand(batch);
        await docClient.send(batchCommand);
        deletedCount += batch.RequestItems[tableName].length;
      }

      console.log(`Deleted ${deletedCount} items from ${tableName}`);
      results.push({ table: tableName, deleted: deletedCount });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,X-Amzn-Trace-Id,x-user-id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        status: 'success',
        message: 'All data cleared successfully',
        results: results,
        totalDeleted: results.reduce((sum, r) => sum + r.deleted, 0)
      })
    };
  } catch (error) {
    console.error('Error clearing data:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,X-Amzn-Trace-Id,x-user-id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        status: 'error',
        message: 'Failed to clear data',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

// Helper function to get the key from an item based on table structure
function getKeyFromItem(tableName: string, item: any): Record<string, any> {
  if (tableName.includes('decisions')) {
    return {
      DecisionId: item.DecisionId,
      UserId: item.UserId
    };
  } else if (tableName.includes('branches')) {
    return {
      BranchId: item.BranchId,
      DecisionId: item.DecisionId
    };
  } else if (tableName.includes('conversations')) {
    return {
      ConversationId: item.ConversationId,
      BranchId: item.BranchId
    };
  } else if (tableName.includes('comparisons')) {
    return {
      ComparisonId: item.ComparisonId,
      DecisionId: item.DecisionId
    };
  } else if (tableName.includes('events')) {
    return {
      EventId: item.EventId,
      UserId: item.UserId
    };
  }
  
  // Fallback - return the first two string properties as key
  const keys = Object.keys(item).filter(key => typeof item[key] === 'string').slice(0, 2);
  const key: Record<string, any> = {};
  keys.forEach(k => key[k] = item[k]);
  return key;
}


