import { API_ORIGIN, getAuthToken } from './request'
import { getTaskDetail, getTaskResult } from './taskApi'
import type { TaskResultItem, TaskStatusMessage } from '../types/taskTypes'

const TERMINAL_FAILURE_STATUSES = new Set(['FAILED', 'RETRYABLE', 'CANCELED'])
const SUCCESS_STATUS = 'SUCCESS'

export interface TrackTaskResultOptions<T> {
  onStatus?: (message: TaskStatusMessage) => void
  onResult: (result: TaskResultItem<T>) => void | Promise<void>
  onFailure?: (message: TaskStatusMessage) => void
  onError?: (error: Error) => void
  pollIntervalMs?: number
}

export function trackTaskResult<T = unknown>(taskId: number, options: TrackTaskResultOptions<T>) {
  let stopped = false
  let completed = false
  let pollTimer: number | null = null
  let fallbackTimer: number | null = null
  let stopWs: (() => void) | null = null

  function stop() {
    stopped = true
    if (fallbackTimer != null) {
      window.clearTimeout(fallbackTimer)
      fallbackTimer = null
    }
    if (pollTimer != null) {
      window.clearInterval(pollTimer)
      pollTimer = null
    }
    stopWs?.()
    stopWs = null
  }

  async function handleStatus(message: TaskStatusMessage) {
    if (stopped || completed) {
      return
    }
    options.onStatus?.(message)
    const status = String(message.status)
    if (status === SUCCESS_STATUS) {
      completed = true
      stop()
      try {
        const result = await getTaskResult<T>(taskId)
        await options.onResult(result)
      } catch (error) {
        options.onError?.(toError(error, '查询任务结果失败'))
      }
      return
    }
    if (TERMINAL_FAILURE_STATUSES.has(status)) {
      completed = true
      stop()
      options.onFailure?.(message)
    }
  }

  async function pollOnce() {
    if (stopped || completed) {
      return
    }
    try {
      const detail = await getTaskDetail(taskId)
      await handleStatus({
        taskId: detail.taskId,
        ownerUserId: detail.ownerUserId,
        taskType: detail.taskType,
        status: detail.status,
        progress: detail.progress,
        errorMessage: detail.errorMessage,
      })
    } catch (error) {
      options.onError?.(toError(error, '查询任务状态失败'))
    }
  }

  function startPolling() {
    if (stopped || pollTimer != null || completed) {
      return
    }
    void pollOnce()
    pollTimer = window.setInterval(() => {
      void pollOnce()
    }, options.pollIntervalMs ?? 2000)
  }

  stopWs = subscribeTaskStatus(taskId, {
    onMessage(message) {
      void handleStatus(message)
    },
    onUnavailable: startPolling,
  })
  fallbackTimer = window.setTimeout(startPolling, 5000)

  return stop
}

interface SubscribeTaskStatusOptions {
  onMessage: (message: TaskStatusMessage) => void
  onUnavailable: () => void
}

function subscribeTaskStatus(taskId: number, options: SubscribeTaskStatusOptions) {
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
    options.onUnavailable()
    return () => {}
  }

  let stopped = false
  let connected = false
  let socket: WebSocket | null = null
  let fallbackStarted = false

  function startFallback() {
    if (stopped || fallbackStarted) {
      return
    }
    fallbackStarted = true
    options.onUnavailable()
  }

  try {
    socket = new WebSocket(resolveWsUrl())
  } catch {
    startFallback()
    return () => {
      stopped = true
    }
  }

  socket.onopen = () => {
    if (!socket || stopped) {
      return
    }
    const token = getAuthToken()
    const authHeader = token ? `Authorization:Bearer ${token}\n` : ''
    socket.send(`CONNECT\naccept-version:1.2\nheart-beat:10000,10000\n${authHeader}\n\0`)
  }

  socket.onmessage = (event) => {
    const frames = splitStompFrames(String(event.data || ''))
    for (const frame of frames) {
      const parsed = parseStompFrame(frame)
      if (!parsed) {
        continue
      }
      if (parsed.command === 'CONNECTED' && !connected) {
        connected = true
        socket?.send(`SUBSCRIBE\nid:task-${taskId}\ndestination:/topic/tasks/${taskId}\nack:auto\n\n\0`)
        continue
      }
      if (parsed.command === 'MESSAGE' && parsed.body) {
        try {
          options.onMessage(JSON.parse(parsed.body) as TaskStatusMessage)
        } catch {
          startFallback()
        }
      }
      if (parsed.command === 'ERROR') {
        startFallback()
      }
    }
  }

  socket.onerror = startFallback
  socket.onclose = () => {
    if (!stopped && !connected) {
      startFallback()
    }
  }

  return () => {
    stopped = true
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(`UNSUBSCRIBE\nid:task-${taskId}\n\n\0`)
      socket.send('DISCONNECT\n\n\0')
    }
    socket?.close()
  }
}

function resolveWsUrl() {
  const configured = import.meta.env.VITE_WS_BASE_URL as string | undefined
  if (configured) {
    return configured
  }
  if (typeof window !== 'undefined' && (!API_ORIGIN || API_ORIGIN.startsWith('/'))) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws`
  }
  const wsOrigin = API_ORIGIN.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')
  return `${wsOrigin}/ws`
}

function splitStompFrames(raw: string) {
  return raw
    .split('\0')
    .map((frame) => frame.trim())
    .filter(Boolean)
}

function parseStompFrame(frame: string) {
  const separator = frame.includes('\r\n\r\n') ? '\r\n\r\n' : '\n\n'
  const [head, ...bodyParts] = frame.split(separator)
  const command = head.split(/\r?\n/)[0]
  if (!command) {
    return null
  }
  return {
    command,
    body: bodyParts.join(separator).trim(),
  }
}

function toError(error: unknown, fallback: string) {
  return error instanceof Error ? error : new Error(fallback)
}
