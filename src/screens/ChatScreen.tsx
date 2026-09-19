import React from 'react'
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { AgentApi } from '../lib/api'
import { colors } from '../theme'

export function ChatScreen({
  api,
  sessionId,
  onBack,
}: {
  api: AgentApi
  sessionId: string
  onBack: () => void
}) {
  const [lines, setLines] = React.useState<string[]>([])
  const [composer, setComposer] = React.useState('')
  const listRef = React.useRef<FlatList<string>>(null)
  const linesRef = React.useRef<string[]>([])
  linesRef.current = lines

  const append = React.useCallback((text: string) => {
    setLines((prev) => {
      const next = [...prev]
      if (next.length === 0) next.push(text)
      else next[next.length - 1] += text
      return next
    })
  }, [])

  const push = React.useCallback((line: string) => {
    setLines((prev) => [...prev, line])
  }, [])

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const history = await api.listMessages(sessionId, 50)
        if (!cancelled) setLines(history)
      } catch {
        // ignore; the live stream will populate
      }
    })()
    const ac = new AbortController()
    void api
      .watchSession(
        sessionId,
        (ev) => {
          const params = ev.params as Record<string, unknown>
          switch (ev.event) {
            case 'text-delta':
              append(String(params.text ?? ''))
              break
            case 'reasoning-delta':
              append(`[reasoning] ${String(params.text ?? '')}`)
              break
            case 'tool-call':
              push(
                `\n[tool: ${String(
                  params.toolName ?? params.name ?? 'tool',
                )}]\n`,
              )
              break
          }
        },
        ac.signal,
      )
      .catch(() => {
        // aborted on unmount / stream error
      })
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [api, sessionId, append, push])

  const send = React.useCallback(async () => {
    const text = composer.trim()
    if (!text) return
    setComposer('')
    push(`You: ${text}`)
    push('Agent: ')
    try {
      await api.prompt(sessionId, text)
    } catch (e) {
      append(`\n[error: ${String(e)}]`)
    }
  }, [api, sessionId, composer, push, append])

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.action} onPress={onBack}>
          <Text style={styles.actionText}>Back</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {sessionId}
        </Text>
      </View>
      <FlatList
        ref={listRef}
        data={lines}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{item}</Text>
          </View>
        )}
      />
      <View style={styles.composerRow}>
        <TextInput
          style={styles.composer}
          value={composer}
          onChangeText={setComposer}
          placeholder="Message…"
          placeholderTextColor={colors.dim}
          onSubmitEditing={send}
        />
        <Pressable style={styles.send} onPress={send}>
          <Text style={styles.actionText}>Send</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.panel,
  },
  title: { color: colors.fg, fontWeight: '700', marginLeft: 12, flex: 1 },
  action: {
    backgroundColor: colors.panelAlt,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionText: { color: colors.fg, fontSize: 13 },
  list: { padding: 12 },
  bubble: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  bubbleText: { color: colors.fg },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: colors.panel,
  },
  composer: {
    flex: 1,
    backgroundColor: colors.panelAlt,
    color: colors.fg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  send: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
})
