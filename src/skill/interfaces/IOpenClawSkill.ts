/**
 * OpenClaw Skill Interface
 *
 * This is the main contract that all OpenClaw skills must implement.
 * The OpenClaw runtime will interact with skills through this interface.
 */

import type {
  SkillConfig,
  SkillCapabilities,
  ConfigurationSchema,
  HealthStatus,

  MessageEvent,
  MessageResponse,
  SessionEvent,
  SessionEndedEvent,
  AgentAssignmentEvent,
  KnowledgeEvent,

  WebhookEndpoint,
} from '../types';

export interface IOpenClawSkill {
  // ========================================================================
  // Lifecycle Methods
  // ========================================================================

  /**
   * Initialize the skill with configuration.
   * This is called once when the skill is loaded by the OpenClaw runtime.
   * Perform all setup here: connect to databases, initialize clients, etc.
   *
   * @param config - Skill configuration object
   * @throws Error if initialization fails
   */
  initialize(config: SkillConfig): Promise<void>;

  /**
   * Start the skill and begin processing events.
   * This is called after initialization. Skills should begin listening for
   * events, start background services (polling, etc.), and be ready to handle requests.
   *
   * @throws Error if starting fails
   */
  start(): Promise<void>;

  /**
   * Stop the skill gracefully.
   * Called when the skill is being unloaded or the runtime is shutting down.
   * Close connections, stop background tasks, and clean up resources.
   *
   * @throws Error if stopping fails (but should attempt cleanup anyway)
   */
  stop(): Promise<void>;

  // ========================================================================
  // Event Handlers
  // Called by OpenClaw runtime when corresponding events occur
  // ========================================================================

  /**
   * Handle an incoming message event.
   * This is the primary event for message processing. The skill should:
   * - Store the message
   * - Generate a response (AI, rule-based, etc.)
   * - Return the response to be delivered to the user
   *
   * @param event - Message event with user message and context
   * @returns Response message to send back to the user
   */
  onMessageReceived(event: MessageEvent): Promise<MessageResponse>;

  /**
   * Handle session start event.
   * Called when a new conversation session is created.
   * Useful for logging, analytics, or session-specific initialization.
   */
  onSessionStarted(event: SessionEvent): Promise<void>;

  /**
   * Handle session end event.
   * Called when a session is closed (completed, transferred, timeout, etc.).
   * Useful for cleanup, finalizing session data, or analytics.
   */
  onSessionEnded(event: SessionEndedEvent): Promise<void>;

  /**
   * Handle agent assignment event.
   * Called when a human agent is assigned to a session.
   * Skills may adjust behavior (e.g., stop AI auto-reply) when agent takes over.
   */
  onAgentAssigned(event: AgentAssignmentEvent): Promise<void>;

  /**
   * Handle knowledge base update event.
   * Called when a document is uploaded or knowledge base is modified.
   * Skills may need to re-index or update in-memory caches.
   */
  onKnowledgeUpdated(event: KnowledgeEvent): Promise<void>;

  // ========================================================================
  // Query Methods
  // Called by OpenClaw runtime to get skill capabilities and configuration
  // ========================================================================

  /**
   * Get the skill's capabilities.
   * Returns information about what features the skill supports.
   */
  getCapabilities(): Promise<SkillCapabilities>;

  /**
   * Get the skill's configuration schema.
   * Returns a JSON Schema describing required and optional configuration fields.
   * OpenClaw uses this to validate configuration and generate UI forms.
   */
  getConfigurationSchema(): ConfigurationSchema;

  /**
   * Perform a health check.
   * Returns the current health status of the skill including dependency checks.
   * Called periodically by OpenClaw to monitor skill health.
   */
  healthCheck(): Promise<HealthStatus>;

  // ========================================================================
  // Optional: Webhook Endpoints
  // Some OpenClaw runtimes may support skills exposing their own HTTP endpoints
  // ========================================================================

  /**
   * Get webhook endpoints that this skill wants to expose.
   * If the skill has specific webhooks that external systems should call,
   * list them here. The OpenClaw runtime may route these accordingly.
   *
   * Example: { path: '/wecom/callback', methods: ['POST'], description: 'WeCom webhook' }
   */
  getWebhookEndpoints?(): WebhookEndpoint[];

  /**
   * Optional adapter for HTTP integration.
   * If provided, OpenClaw may mount these routes on a sub-path.
   */
  getHttpAdapter?(): any;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface WebhookEndpoint {
  path: string;
  methods: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[];
  description: string;
  authRequired?: boolean;
}

// ============================================================================
// Skill Context (passed between methods)
// ============================================================================

/**
 * Optional skill context that persists across the skill lifetime.
 * Skills can store runtime state here. OpenClaw may serialize this if needed.
 */
export interface SkillContext {
  startedAt: Date;
  configHash: string;
  metrics: {
    messagesProcessed: number;
    sessionsCreated: number;
    errors: number;
    lastActivity: Date;
  };
  customData: Record<string, any>;
}

// ============================================================================
// Factory Pattern (optional)
// ============================================================================

/**
 * Optional factory function for creating skill instances.
 * Some OpenClaw runtimes may use factory pattern to instantiate skills.
 */
export interface ISkillFactory {
  create(): IOpenClawSkill;
}

/**
 * Default export for Node.js require/import.
 * OpenClaw runtime can use this to discover and load the skill.
 */
export interface ISkillModule {
  Skill: new () => IOpenClawSkill;
  Factory?: new () => ISkillFactory;
  version: string;
  name: string;
  description?: string;
}
