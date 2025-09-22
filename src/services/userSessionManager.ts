// VRAM Magic: User Session Manager Service
// Tracks individual user sessions throughout simulation

import { UserSession, RequestEvent, ThinkTimeDistribution } from '../types'
import { generateThinkTime } from './thinkTimeGenerator'

export class UserSessionManager {
  private sessions: Map<number, UserSession> = new Map()
  private activeRequests: Map<string, RequestEvent> = new Map()
  private requestCounter = 0

  constructor(
    private totalUsers: number,
    private maxThinkTime: number,
    private distribution: ThinkTimeDistribution,
    private requestDuration: number
  ) {
    this.initializeSessions()
  }

  private initializeSessions(): void {
    for (let userId = 0; userId < this.totalUsers; userId++) {
      // Use think time for initial delay (as specified)
      const initialDelay = generateThinkTime(this.maxThinkTime, this.distribution)

      this.sessions.set(userId, {
        userId,
        nextRequestTime: initialDelay,
        lastRequestEnd: 0,
        totalRequests: 0,
        currentThinkTime: initialDelay,
        isProcessingRequest: false,
      })
    }
  }

  /**
   * Get all users ready to start requests at given timestamp
   */
  getUsersReadyToStart(timestamp: number): number[] {
    const readyUsers: number[] = []

    for (const [userId, session] of this.sessions) {
      if (!session.isProcessingRequest && session.nextRequestTime <= timestamp) {
        readyUsers.push(userId)
      }
    }

    return readyUsers
  }

  /**
   * Start request for a user
   */
  startRequest(
    userId: number,
    timestamp: number,
    workloadTokens: { input: number; output: number }
  ): RequestEvent {
    const session = this.sessions.get(userId)!
    const requestId = `req_${userId}_${++this.requestCounter}`

    const request: RequestEvent = {
      userId,
      requestId,
      startTime: timestamp,
      endTime: timestamp + this.requestDuration,
      workloadId: 'default', // Will be set by caller
      inputTokens: workloadTokens.input,
      outputTokens: workloadTokens.output,
    }

    // Update session state
    session.isProcessingRequest = true
    session.totalRequests++

    // Store active request
    this.activeRequests.set(requestId, request)

    return request
  }

  /**
   * Complete requests that have finished
   */
  completeFinishedRequests(timestamp: number): RequestEvent[] {
    const completedRequests: RequestEvent[] = []

    for (const [requestId, request] of this.activeRequests) {
      if (request.endTime <= timestamp) {
        // Mark user as available for next request
        const session = this.sessions.get(request.userId)!
        session.isProcessingRequest = false
        session.lastRequestEnd = timestamp

        // Generate next think time
        const nextThinkTime = generateThinkTime(this.maxThinkTime, this.distribution)
        session.nextRequestTime = timestamp + nextThinkTime
        session.currentThinkTime = nextThinkTime

        completedRequests.push(request)
        this.activeRequests.delete(requestId)
      }
    }

    return completedRequests
  }

  /**
   * Get currently active requests
   */
  getActiveRequests(timestamp: number): RequestEvent[] {
    return Array.from(this.activeRequests.values()).filter(
      request => request.startTime <= timestamp && request.endTime > timestamp
    )
  }

  /**
   * Get current concurrency level
   */
  getCurrentConcurrency(timestamp: number): number {
    return this.getActiveRequests(timestamp).length
  }

  /**
   * Get queue length (users waiting to start)
   */
  getQueueLength(timestamp: number): number {
    return this.getUsersReadyToStart(timestamp).length
  }

  /**
   * Get session statistics
   */
  getStatistics(currentTime: number) {
    const totalRequests = Array.from(this.sessions.values()).reduce(
      (sum, session) => sum + session.totalRequests,
      0
    )

    return {
      totalUsers: this.totalUsers,
      activeRequests: this.activeRequests.size,
      queuedUsers: this.getQueueLength(currentTime),
      totalRequestsProcessed: totalRequests,
      averageRequestsPerUser: totalRequests / this.totalUsers,
    }
  }
}
