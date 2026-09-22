// Thin RPC facade over the generated agent-sdk-typescript client and the
// easy-rpc fetch transport. Mirrors the Flutter client: same POST paths, same
// application/connect+proto framing, same streamed turn events.
import {
  createAgentServiceClient,
  AgentServiceClient,
  ListSessionsRequestSchema,
  CreateSessionRequestSchema,
  GetSessionRequestSchema,
  DeleteSessionRequestSchema,
  ListMessagesRequestSchema,
  PromptRequestSchema,
  WatchSessionRequestSchema,
  HealthRequestSchema,
  GetIdentityRequestSchema,
  SetModelRequestSchema,
  UpdateSettingsRequestSchema,
  ListPresetsRequestSchema,
  UpsertPresetRequestSchema,
  DeletePresetRequestSchema,
  ListProvidersRequestSchema,
  ListModelsRequestSchema,
  RegisterProviderRequestSchema,
  DeleteProviderRequestSchema,
  TestProviderRequestSchema,
  ListToolsRequestSchema,
  GetConfigRequestSchema,
  SetConfigRequestSchema,
  MailboxRequestSchema,
  Session,
  Message,
  Preset,
  Provider,
  ToolInfo,
  ModelInfo,
  MailboxEntry,
} from '@easy-utils/agent-sdk-typescript'
import { connect } from '@easy-utils/easy-rpc'

export interface StreamEvent {
  event: string
  params: Record<string, unknown>
  eid: string
}

export interface SessionRef {
  id: string
  model: string
  preset: string
  locale: string
  unreadCount: number
  lastMessagePreview: string
  lastMessageAt: string
  updatedAt: string
  createdAt: string
}

export interface Identity {
  tenant: string
  tenantName: string
  role: string
}

export interface PresetRef {
  id: string
  systemPrompt: string
  tools: string[]
  maxTurns: number
  isSystem: boolean
}

export interface ProviderRef {
  providerId: string
  apiType: string
  baseUrl: string
  apiKey: string
  capability: string
  models: { id: string; name: string }[]
}

export interface ToolRef {
  name: string
  description: string
  category: string
}

export interface MailboxRef {
  id: string
  msgType: string
  payload: string
  status: string
  /** ORIGIN: user / session:{name} / system:{name} / extension-defined. */
  source: string
}

/** One page of the mailbox (newest-first) plus whether older entries exist. */
export interface MailboxPage {
  entries: MailboxRef[]
  hasMore: boolean
}

/** A rendered transcript line with its message ORIGIN for provenance. */
export interface TranscriptLine {
  text: string
  role: string
  source: string
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

  async identity(): Promise<Identity> {
    const r = await this.agent.getIdentity({})
    return { tenant: r.tenant, tenantName: r.tenantName, role: r.role }
  }

  async resolveUsername(): Promise<string> {
    try {
      const id = await this.identity()
      return id.tenantName || id.tenant
    } catch {
      return ''
    }
  }

  // ---- sessions ----

  /** Sessions ordered most-recent-first (lastMessageAt -> updatedAt -> createdAt). */
  async listSessions(): Promise<SessionRef[]> {
    const r = await this.agent.listSessions({})
    return r.sessions.map(sessionFromPb).sort((a, b) => recency(b) - recency(a))
  }

  async createSession(name: string): Promise<string> {
    const r = await this.agent.createSession({ name })
    return r.sessionName
  }

  async deleteSession(id: string): Promise<void> {
    await this.agent.deleteSession({ id })
  }

  /** Fork a session into a new branch (without opening it). */
  async fork(id: string, branch: string): Promise<void> {
    await this.agent.fork({ id, name: branch })
  }

  async setModel(id: string, model: string): Promise<void> {
    await this.agent.setModel({ id, model })
  }

  /** Only model/preset/locale/variant are client-editable (proto v0.18). */
  async settings(
    id: string,
    updates: { model?: string; preset?: string; locale?: string; variant?: string },
  ): Promise<void> {
    const req: Record<string, unknown> = { id }
    if (updates.model) req.model = updates.model
    if (updates.preset) req.preset = updates.preset
    req.locale = updates.locale ?? ''
    req.variant = updates.variant ?? ''
    await this.agent.updateSettings(req)
  }

  async listMessages(id: string, limit = 50): Promise<TranscriptLine[]> {
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

  // ---- presets / providers / tools / config ----

  async listPresets(locale?: string): Promise<PresetRef[]> {
    const r = await this.agent.listPresets({ locale: locale ?? '' })
    return r.presets.map((p: Preset) => ({
      id: p.id,
      systemPrompt: p.systemPrompt,
      tools: p.tools,
      maxTurns: p.maxTurns,
      isSystem: p.isSystem,
    }))
  }

  async savePreset(p: PresetRef): Promise<void> {
    await this.agent.upsertPreset({
      preset: {
        id: p.id,
        systemPrompt: p.systemPrompt,
        tools: p.tools,
        maxTurns: p.maxTurns,
      },
    })
  }

  async deletePreset(id: string): Promise<void> {
    await this.agent.deletePreset({ id })
  }

  async listProviders(): Promise<ProviderRef[]> {
    const r = await this.agent.listProviders({})
    return r.providers.map((p: Provider) => ({
      providerId: p.providerId,
      apiType: p.apiType,
      baseUrl: p.baseUrl,
      apiKey: p.apiKey,
      capability: p.capability,
      models: p.models.map((m) => ({ id: m.id, name: m.name })),
    }))
  }

  async listModels(providerId: string): Promise<ModelInfo[]> {
    const r = await this.agent.listModels({ providerId })
    return r.models
  }

  async registerProvider(p: ProviderRef): Promise<void> {
    await this.agent.registerProvider({
      provider: {
        providerId: p.providerId,
        apiType: p.apiType,
        baseUrl: p.baseUrl,
        apiKey: p.apiKey,
        capability: p.capability,
        models: p.models.map((m) => ({ id: m.id, name: m.name, modelType: p.capability })),
      },
    })
  }

  async deleteProvider(providerId: string): Promise<void> {
    await this.agent.deleteProvider({ providerId })
  }

  async testProvider(providerId: string, model: string): Promise<[boolean, string]> {
    const r = await this.agent.testProvider({ providerId, model })
    return [r.ok, r.result ?? '']
  }

  async listTools(locale?: string): Promise<ToolRef[]> {
    const r = await this.agent.listTools({ locale: locale ?? '' })
    return r.tools.map((t: ToolInfo) => ({
      name: t.name,
      description: t.description,
      category: t.category,
    }))
  }

  async getConfig(key: string): Promise<string> {
    const r = await this.agent.getConfig({ key })
    return r.value
  }

  async setConfig(key: string, value: string): Promise<void> {
    await this.agent.setConfig({ key, value })
  }

  /** One page of the mailbox (NEWEST-FIRST, paged backward). */
  async mailbox(id: string, before = '', limit = 0): Promise<MailboxPage> {
    const r = await this.agent.mailbox({ id, before, limit })
    return {
      hasMore: r.hasMore,
      entries: r.mailbox.map((m: MailboxEntry) => ({
        id: m.id,
        msgType: m.msgType,
        payload: m.payload,
        status: m.status,
        source: m.source,
      })),
    }
  }
}

function sessionFromPb(s: Session): SessionRef {
  return {
    id: s.name,
    model: s.model,
    preset: s.preset,
    locale: s.locale,
    unreadCount: 0,
    lastMessagePreview: '',
    lastMessageAt: s.lastMessageAt,
    updatedAt: s.updatedAt,
    createdAt: s.createdAt,
  }
}

/** Epoch-ms recency: lastMessageAt -> updatedAt -> createdAt. */
function recency(s: SessionRef): number {
  for (const v of [s.lastMessageAt, s.updatedAt, s.createdAt]) {
    const t = Date.parse(v)
    if (!Number.isNaN(t)) return t
  }
  return 0
}

function messagesToLines(messages: Message[]): TranscriptLine[] {
  const lines: TranscriptLine[] = []
  for (const m of messages) {
    const who = m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Agent' : m.role
    // A `session:{name}` user message is a hand-off from another session; label
    // it with its origin instead of "You".
    const label = m.source.startsWith('session:')
      ? `[${m.source.slice('session:'.length)}]`
      : m.source.startsWith('system:')
        ? `[system:${m.source.slice('system:'.length)}]`
        : who
    for (const p of m.parts) {
      let d: any = {}
      try {
        d = p.data ? JSON.parse(p.data) : {}
      } catch {
        d = {}
      }
      if (p.type === 'text' || p.type === 'reasoning') {
        const text = (d.text as string) ?? ''
        if (text.trim()) lines.push({ text: `${label}: ${text}`, role: m.role, source: m.source })
      } else if (p.type === 'tool') {
        lines.push({ text: `[tool: ${(d.name as string) ?? 'tool'}]`, role: m.role, source: m.source })
      }
    }
  }
  return lines
}
