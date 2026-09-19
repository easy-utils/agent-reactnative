// Thin RPC facade over the generated agent-sdk-typescript client and the
// easy-rpc fetch transport. Mirrors the Flutter client: same POST paths, same
// application/connect+proto framing, same streamed turn events.
import {
  createAgentServiceClient,
  AgentServiceClient,
  ListSessionsRequestSchema,
  CreateSessionRequestSchema,
  ListMessagesRequestSchema,
  PromptRequestSchema,
  WatchSessionRequestSchema,
  HealthRequestSchema,
  SetModelRequestSchema,
  Session,
  Message,
} from '@easy-utils/agent-sdk-typescript'
import { connect } from '@easy-utils/easy-rpc'

export interface StreamEvent {
  event: string
  params: Record<string, unknown>
  eid: string
}

export interface SessionRef {
  id: string
}

export class AgentApi {
  private readonly agent: AgentServiceClient

  constructor(baseUrl: string, token: string) {
    const trimmed = baseUrl.replace(/\/+$/, '')
    const transport = connect({ baseUrl: trimmed, token, mode: 'fetch' })
    this.agent = createAgentServiceClient(transport)
  }

  async health(): Promise<void> {
    await this.agent.health({})
  }

  async listSessions(): Promise<SessionRef[]> {
    const r = await this.agent.listSessions({})
    return r.sessions.map((s) => ({ id: s.name }))
  }

  async createSession(name: string): Promise<string> {
    const r = await this.agent.createSession({ name })
    return r.sessionName
  }

  async setModel(id: string, model: string): Promise<void> {
    await this.agent.setModel({ id, model })
  }

  async listMessages(id: string, limit = 50): Promise<string[]> {
    const r = await this.agent.listMessages({ id, limit })
    return messagesToLines(r.messages)
  }

  /** Start a turn; returns once the server accepts it. Live events arrive on
   * the WatchSession stream (see watchSession). */
  async prompt(id: string, prompt: string): Promise<void> {
    const stream = await this.agent.prompt({ id, prompt })
    for await (const _ev of stream) {
      // Drain; the accepted frame carries the message id.
    }
  }

  /** Long-lived session event stream; invoke onEvent per frame until the
   * AbortSignal is triggered. */
  async watchSession(
    id: string,
    onEvent: (ev: StreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const stream = await this.agent.watchSession({ id }, { signal })
    for await (const ev of stream) {
      onEvent({
        event: ev.event,
        params: (ev.params ?? {}) as Record<string, unknown>,
        eid: ev.eid,
      })
    }
  }
}

function messagesToLines(messages: Message[]): string[] {
  const lines: string[] = []
  for (const m of messages) {
    const who = m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Agent' : m.role
    for (const p of m.parts) {
      let d: any = {}
      try {
        d = p.data ? JSON.parse(p.data) : {}
      } catch {
        d = {}
      }
      if (p.type === 'text' || p.type === 'reasoning') {
        const text = (d.text as string) ?? ''
        if (text.trim()) lines.push(`${who}: ${text}`)
      } else if (p.type === 'tool') {
        lines.push(`[tool: ${(d.name as string) ?? 'tool'}]`)
      }
    }
  }
  return lines
}
