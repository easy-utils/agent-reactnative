// Navigation model — port of the Flutter/Compose/webui contract.
//
// Two side tabs, each with its own page stack. Page keys and config sub-ids are
// identical to every other Easy Agent client (guarded by tools/pages.py), so a
// page added here must be added everywhere.
import type { AgentApi } from './lib/api'

export type SiderTab = 'chat' | 'config'
export type SessionOverlay = 'mailbox'

export const SIDER_TABS: SiderTab[] = ['chat', 'config']

// Every page kind. `config_sub` and `provider_model` carry an id and use a
// prefixed key, exactly like the other clients.
export type AppPage =
  | { kind: 'chat_list'; key: 'chat_list' }
  | { kind: 'chat_session'; key: 'chat_session' }
  | { kind: 'chat_overlay'; key: 'chat_overlay'; overlay: SessionOverlay }
  | { kind: 'config_root'; key: 'config_root' }
  | { kind: 'config_sub'; key: string; id: string }
  | { kind: 'providers_list'; key: 'providers_list' }
  | { kind: 'preset_form'; key: 'preset_form_new' }
  | { kind: 'provider_form'; key: 'provider_form' }
  | { kind: 'provider_models'; key: string; modelId: string | null }

export const CONFIG_SUB_IDS = ['appearance', 'backends', 'presets', 'tools']
export const SESSION_OVERLAYS: SessionOverlay[] = ['mailbox']

export function rootPageFor(tab: SiderTab): AppPage {
  return tab === 'chat'
    ? { kind: 'chat_list', key: 'chat_list' }
    : { kind: 'config_root', key: 'config_root' }
}

/** A page's view dispatch target (the `case '<key>':` in App.tsx). Kept as a
 *  function so every static key has an explicit branch — the guard checks it. */
export function screenFor(page: AppPage): string {
  switch (page.kind) {
    case 'chat_list':
      return 'SessionListScreen'
    case 'chat_session':
      return 'ChatScreen'
    case 'chat_overlay':
      return page.overlay === 'mailbox' ? 'MailboxScreen' : 'ChatScreen'
    case 'config_root':
      return 'ConfigScreen'
    case 'config_sub':
      return 'ConfigScreen'
    case 'providers_list':
      return 'ProvidersListScreen'
    case 'preset_form':
      return 'PresetFormScreen'
    case 'provider_form':
      return 'ProviderFormScreen'
    case 'provider_models':
      return 'ProviderModelsScreen'
  }
}

/** Per-tab page stacks with the same push/pop semantics as the other clients. */
export class NavStore {
  private stacks: Record<SiderTab, AppPage[]> = {
    chat: [rootPageFor('chat')],
    config: [rootPageFor('config')],
  }
  tab: SiderTab = 'chat'
  /** The session the chat stack is showing (set when opening a conversation). */
  activeSessionId = ''
  listeners = new Set<() => void>()

  private emit() {
    for (const l of this.listeners) l()
  }

  subscribe(l: () => void): () => void {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }

  switchTab(tab: SiderTab) {
    this.tab = tab
    this.emit()
  }

  get stack(): AppPage[] {
    return this.stacks[this.tab]
  }

  get top(): AppPage {
    const s = this.stacks[this.tab]
    return s[s.length - 1] ?? rootPageFor(this.tab)
  }

  get canPop(): boolean {
    return this.stacks[this.tab].length > 1
  }

  push(page: AppPage) {
    this.stacks[this.tab].push(page)
    this.emit()
  }

  pop() {
    const s = this.stacks[this.tab]
    if (s.length > 1) {
      s.pop()
      this.emit()
    }
  }
}

export interface AppContext {
  api: AgentApi
  nav: NavStore
}
