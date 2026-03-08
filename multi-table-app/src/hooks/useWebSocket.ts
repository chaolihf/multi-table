import { useEffect, useRef, useCallback } from 'react'

export interface WSOperation {
  id: string
  type: string
  sheetId: string
  payload: Record<string, any>
  timestamp: number
  userId: string
  version: number
}

export interface WSUser {
  id: string
  name: string
  color: string
}

export interface WSCursor {
  userId: string
  color: string
  position: { row: number; col: number }
  selection?: { anchor: { row: number; col: number }; focus: { row: number; col: number } }
}

interface UseWebSocketOptions {
  sheetId: string | null
  userName?: string
  onOperation?: (op: WSOperation) => void
  onUsers?: (users: WSUser[]) => void
  onCursor?: (cursor: WSCursor) => void
  onConnected?: (clientId: string, color: string) => void
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'

export function useWebSocket({
  sheetId,
  userName,
  onOperation,
  onUsers,
  onCursor,
  onConnected,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const clientIdRef = useRef<string>('')
  const colorRef = useRef<string>('')
  const reconnectTimeoutRef = useRef<number | undefined>(undefined)
  const pendingOperationsRef = useRef<WSOperation[]>([])
  const reconnectAttempts = useRef(0)
  const lastDisconnectTime = useRef<number>(0)
  const currentSheetId = useRef<string | null>(null)

  // 计算重连延迟（指数退避 + 随机抖动）
  const getReconnectDelay = (attempts: number): number => {
    const baseDelay = Math.min(1000 * Math.pow(2, attempts), 30000) // 1s, 2s, 4s, 8s, 16s, 30s
    const jitter = Math.random() * 1000 // 0-1s 随机抖动
    return baseDelay + jitter
  }

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (!sheetId) return

    // 如果 sheetId 没变化，不重新连接
    if (sheetId === currentSheetId.current && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected to this sheet')
      return
    }

    // 关闭现有连接
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }

    currentSheetId.current = sheetId
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      reconnectAttempts.current = 0
      lastDisconnectTime.current = 0
      // 加入文档
      try {
        ws.send(
          JSON.stringify({
            type: 'join',
            payload: {
              sheetId,
              name: userName,
            },
          })
        )
      } catch (error) {
        console.error('Failed to send join message:', error)
      }
    }

    // 响应服务端 ping
    ws.addEventListener('ping', () => {
      console.log('WebSocket received ping')
    })

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)

        switch (message.type) {
          case 'connected':
            clientIdRef.current = message.clientId
            colorRef.current = message.color
            onConnected?.(message.clientId, message.color)
            
            // 连接成功后发送缓存的操作
            if (pendingOperationsRef.current.length > 0) {
              pendingOperationsRef.current.forEach((op) => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  try {
                    wsRef.current.send(
                      JSON.stringify({
                        type: 'operation',
                        payload: op,
                      })
                    )
                  } catch (error) {
                    console.error('Failed to send pending operation:', error)
                  }
                }
              })
              pendingOperationsRef.current = []
            }
            break

          case 'init':
            // 初始化历史操作
            message.operations.forEach((op: WSOperation) => {
              onOperation?.(op)
            })
            break

          case 'operation':
            // 接收远程操作
            onOperation?.(message.operation)
            break

          case 'users':
            // 用户列表更新
            onUsers?.(message.users)
            break

          case 'cursor':
            // 光标更新
            onCursor?.(message)
            break

          case 'ack':
            // 操作确认
            break
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error)
      }
    }

    ws.onclose = (event) => {
      const now = Date.now()
      const timeSinceLastDisconnect = now - lastDisconnectTime.current
      lastDisconnectTime.current = now
      
      console.log('WebSocket disconnected', event.code, event.reason, `(${reconnectAttempts.current} attempts)`)
      wsRef.current = null
      
      // 只在非正常关闭时重连
      if (event.code !== 1000 && sheetId) {
        // 如果频繁断开（5 秒内超过 3 次），延长等待时间
        if (timeSinceLastDisconnect < 5000 && reconnectAttempts.current >= 3) {
          const longDelay = 10000 // 10 秒
          console.log(`Frequent disconnections detected, waiting ${longDelay}ms before reconnecting...`)
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectAttempts.current = 0
            connect()
          }, longDelay)
          return
        }
        
        // 指数退避重连
        const delay = getReconnectDelay(reconnectAttempts.current)
        reconnectAttempts.current++
        console.log(`Reconnecting in ${Math.round(delay)}ms... (attempt ${reconnectAttempts.current})`)
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect()
        }, delay)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      // 错误时不触发重连，由 onclose 处理
    }

    wsRef.current = ws
  }, [sheetId, userName, onOperation, onUsers, onCursor, onConnected])

  // 断开连接
  const disconnect = useCallback((sendLeave = true) => {
    reconnectAttempts.current = 0
    lastDisconnectTime.current = 0
    currentSheetId.current = null
    if (wsRef.current) {
      try {
        // 只在明确要求时发送 leave 消息
        if (sendLeave && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'leave',
              payload: {},
            })
          )
        }
      } catch (error) {
        // 忽略断开时的发送错误
      }
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
    if (reconnectTimeoutRef.current !== undefined) {
      window.clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = undefined
    }
    // 清空缓存操作
    pendingOperationsRef.current = []
  }, [])

  // 发送操作
  const sendOperation = useCallback(
    (op: Omit<WSOperation, 'id' | 'timestamp' | 'userId' | 'version'>) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        // 缓存未发送的操作
        pendingOperationsRef.current.push(op as WSOperation)
        return
      }

      try {
        wsRef.current.send(
          JSON.stringify({
            type: 'operation',
            payload: op,
          })
        )
      } catch (error) {
        console.error('Failed to send operation:', error)
        // 发送失败时缓存操作
        pendingOperationsRef.current.push(op as WSOperation)
      }
    },
    []
  )

  // 发送光标位置
  const sendCursor = useCallback((position: { row: number; col: number }) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    try {
      wsRef.current.send(
        JSON.stringify({
          type: 'cursor',
          payload: { position },
        })
      )
    } catch (error) {
      console.error('Failed to send cursor:', error)
    }
  }, [])

  // 重连时发送缓存的操作
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && pendingOperationsRef.current.length > 0) {
      pendingOperationsRef.current.forEach((op) => {
        wsRef.current?.send(
          JSON.stringify({
            type: 'operation',
            payload: op,
          })
        )
      })
      pendingOperationsRef.current = []
    }
  }, [wsRef.current?.readyState])

  // 连接/断开
  useEffect(() => {
    if (sheetId) {
      connect()
    }
    // 组件卸载时不发送 leave，保持长连接
    return () => {
      disconnect(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetId])

  return {
    clientId: clientIdRef.current,
    color: colorRef.current,
    sendOperation,
    sendCursor,
    connected: wsRef.current?.readyState === WebSocket.OPEN,
  }
}
