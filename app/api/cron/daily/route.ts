import { NextRequest } from 'next/server';
import { runDailyTasks, runHourlyTasks, healthCheck } from '@/lib/server/cron';
import { apiResponse, apiError } from '@/lib/server/apiResponse';

// This endpoint should be protected with a secret key in production
const CRON_SECRET = process.env.CRON_SECRET || 'development-secret-change-in-production';

/**
 * POST /api/cron/daily
 * Trigger daily tasks manually or via external cron service (e.g., Vercel Cron, GitHub Actions)
 * 
 * In production, protect this with:
 * 1. A secret header/query parameter
 * 2. IP whitelist
 * 3. Vercel Cron Job authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const secretParam = new URL(request.url).searchParams.get('secret');

    if (authHeader !== `Bearer ${CRON_SECRET}` && secretParam !== CRON_SECRET) {
      return apiError('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const taskType = searchParams.get('task') || 'daily';

    if (taskType === 'daily') {
      await runDailyTasks();
      return apiResponse({ success: true }, 'Daily tasks completed successfully');
    } else if (taskType === 'hourly') {
      await runHourlyTasks();
      return apiResponse({ success: true }, 'Hourly tasks completed successfully');
    } else {
      return apiError('Invalid task type', 400);
    }

  } catch (error) {
    console.error('Cron job error:', error);
    return apiError('Failed to execute cron tasks', 500);
  }
}

/**
 * GET /api/cron/daily
 * Health check for cron service
 */
export async function GET() {
  try {
    const health = healthCheck();
    return apiResponse(health);
  } catch (error) {
    console.error('Health check error:', error);
    return apiError('Health check failed', 500);
  }
}
