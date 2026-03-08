import { WebSocketServer, WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'

const PORT = process.env.PORT || 8080

// 操作类型
type OperationType =
  | 'SET_CELL'
  | 'DELETE_CELL'
  | 'INSERT_ROW'
  | 'DELETE_ROW'
  | 'INSERT_COL'
  | 'DELETE_COL'
  | 'SET_STYLE'
  | 'SELECTION_CHANGE'
  | 'CURSOR_MOVE'

interface Operation {
  id: string
  type: OperationType
  sheetId: string
  payload: Record<string, any>
  timestamp: number
  userId: string
  version: number
}

interface Client {
  id: string
  ws: WebSocket
  sheetId: string | null
  color: string
  name: string
  pingInterval?: NodeJS.Timeout
  pongTimeout?: NodeJS.Timeout
}

interface DocumentState {
  version: number
  operations: Operation[]
  clients: Map<string, Client>
}

// 文档状态管理
const documents = new Map<string, DocumentState>()

// 生成随机颜色
function getRandomColor(): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  return colors[Math.floor(Math.random() * colors.length)]
}

// OT 算法：转换两个并发操作
function transformOperation(op1: Operation, op2: Operation): Operation {
  // 简单实现：如果操作同一单元格，后到的操作覆盖
  if (
    op1.type === 'SET_CELL' &&
    op2.type === 'SET_CELL' &&
    op1.payload.position?.row === op2.payload.position?.row &&
    op1.payload.position?.col === op2.payload.position?.col
  ) {
    // 如果 op1 先到达，op2 保持不变
    return op2
  }

  // 处理行列插入/删除的影响
  if (op1.type === 'INSERT_ROW' && op2.type === 'SET_CELL') {
    const row = op1.payload.rowIndex
    const cellRow = op2.payload.position?.row
    if (cellRow >= row) {
      return {
        ...op2,
        payload: {
          ...op2.payload,
          position: {
            ...op2.payload.position,
            row: cellRow + 1,
          },
        },
      }
    }
  }

  if (op1.type === 'INSERT_COL' && op2.type === 'SET_CELL') {
    const col = op1.payload.colIndex
    const cellCol = op2.payload.position?.col
    if (cellCol >= col) {
      return {
        ...op2,
        payload: {
          ...op2.payload,
          position: {
            ...op2.payload.position,
            col: cellCol + 1,
          },
        },
      }
    }
  }

  return op2
}

// 应用操作到文档
function applyOperation(doc: DocumentState, op: Operation): void {
  doc.version++
  op.version = doc.version
  doc.operations.push(op)

  // 限制操作历史大小
  if (doc.operations.length > 1000) {
    doc.operations = doc.operations.slice(-500)
  }
}

// 广播操作给其他客户端
function broadcast(docId: string, op: Operation, excludeClientId?: string): void {
  const doc = documents.get(docId)
  if (!doc) {
    console.log('[WebSocket] Broadcast failed: document not found', docId)
    return
  }

  const message = JSON.stringify({
    type: 'operation',
    operation: op,
  })

  let sentCount = 0
  doc.clients.forEach((client) => {
    if (client.id !== excludeClientId) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(message)
          sentCount++
          console.log(`[WebSocket] Broadcast to ${client.id}`)
        } catch (error) {
          console.error(`[WebSocket] Broadcast error to ${client.id}:`, error)
        }
      } else {
        console.log(`[WebSocket] Client ${client.id} not ready: ${client.ws.readyState}`)
      }
    }
  })
  console.log(`[WebSocket] Broadcast complete: ${sentCount} clients`)
}

// 广播用户列表
function broadcastUsers(docId: string): void {
  const doc = documents.get(docId)
  if (!doc) return

  const users = Array.from(doc.clients.values()).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }))

  const message = JSON.stringify({
    type: 'users',
    users,
  })

  doc.clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message)
    }
  })
}

// 心跳检查间隔（毫秒）
const HEARTBEAT_INTERVAL = 30000 // 30 秒
const HEARTBEAT_TIMEOUT = 10000 // 10 秒

// 创建 WebSocket 服务器
const wss = new WebSocketServer({ port: PORT }, () => {
  console.log(`[WebSocket] ✅ Server started on ws://localhost:${PORT}`)
  console.log(`[WebSocket] Process ID: ${process.pid}`)
  console.log(`[WebSocket] Ready for connections...`)
})

wss.on('error', (error) => {
  console.error(`[WebSocket] ❌ Server error:`, error.message)
  console.error(`[WebSocket] Port ${PORT} may be in use. Try: netstat -ano | findstr :${PORT}`)
  process.exit(1)
})

// 设置心跳检查
const heartbeat = () => {
  wss.clients.forEach((ws) => {
    if ((ws as any).isAlive === false) {
      console.log('[WebSocket] Client heartbeat timeout, closing connection')
      return ws.terminate()
    }

    (ws as any).isAlive = false
    ws.ping()
    console.log('[WebSocket] Sending ping to client')
  })
}

const heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL)

wss.on('close', () => {
  clearInterval(heartbeatInterval)
})

wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4()
  const client: Client = {
    id: clientId,
    ws,
    sheetId: null,
    color: getRandomColor(),
    name: `User ${clientId.slice(0, 4)}`,
  }

  // 设置客户端心跳状态
  ;(ws as any).isAlive = true

  console.log(`[WebSocket] Client connected: ${clientId}`)
  console.log(`[WebSocket] Total clients: ${Array.from(documents.values()).reduce((sum, doc) => sum + doc.clients.size, 0)}`)

  // 响应 pong
  ws.on('pong', () => {
    ;(ws as any).isAlive = true
    console.log(`[WebSocket] Received pong from ${clientId}`)
  })

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString())
      console.log(`[WebSocket] Message from ${clientId}:`, message.type, message.payload ? JSON.stringify(message.payload).slice(0, 100) : '')

      switch (message.type) {
        case 'join': {
          // 加入文档
          const { sheetId, name } = message.payload
          client.sheetId = sheetId
          if (name) client.name = name

          // 获取或创建文档状态
          let doc = documents.get(sheetId)
          if (!doc) {
            doc = {
              version: 0,
              operations: [],
              clients: new Map(),
            }
            documents.set(sheetId, doc)
            console.log(`[WebSocket] Created new document: ${sheetId}`)
          }

          doc.clients.set(clientId, client)

          console.log(`[WebSocket] Client ${clientId} joined sheet ${sheetId}, total clients in sheet: ${doc.clients.size}`)

          // 发送历史操作
          ws.send(
            JSON.stringify({
              type: 'init',
              version: doc.version,
              operations: doc.operations,
            })
          )

          // 广播用户列表
          broadcastUsers(sheetId)

          break
        }

        case 'operation': {
          // 接收操作
          const op: Operation = {
            ...message.payload,
            id: uuidv4(),
            timestamp: Date.now(),
            userId: clientId,
          }

          const doc = documents.get(client.sheetId!)
          if (!doc) break

          // OT 转换
          const transformedOp = transformOperation(doc.operations[doc.operations.length - 1], op)
          applyOperation(doc, transformedOp)

          // 广播给其他客户端
          broadcast(client.sheetId!, transformedOp, clientId)

          // 确认操作
          ws.send(
            JSON.stringify({
              type: 'ack',
              operationId: op.id,
              version: doc.version,
            })
          )

          break
        }

        case 'cursor': {
          // 广播光标位置
          const doc = documents.get(client.sheetId!)
          if (!doc) break

          const cursorMessage = JSON.stringify({
            type: 'cursor',
            userId: clientId,
            color: client.color,
            position: message.payload.position,
            selection: message.payload.selection,
          })

          doc.clients.forEach((c) => {
            if (c.id !== clientId && c.ws.readyState === WebSocket.OPEN) {
              c.ws.send(cursorMessage)
            }
          })

          break
        }

        case 'leave': {
          // 离开文档
          if (client.sheetId) {
            const doc = documents.get(client.sheetId)
            doc?.clients.delete(clientId)
            broadcastUsers(client.sheetId)
          }
          break
        }
      }
    } catch (error) {
      console.error('Error processing message:', error)
    }
  })

  ws.on('close', (code, reason) => {
    console.log(`[WebSocket] Client disconnected: ${clientId}`)
    console.log(`[WebSocket] Close code: ${code}, reason: ${reason || 'none'}`)

    // 清理客户端心跳
    if (client.pingInterval) clearInterval(client.pingInterval)
    if (client.pongTimeout) clearTimeout(client.pongTimeout)

    if (client.sheetId) {
      const doc = documents.get(client.sheetId)
      if (doc) {
        console.log(`[WebSocket] Removing client from sheet ${client.sheetId}`)
        doc.clients.delete(clientId)
        console.log(`[WebSocket] Remaining clients in sheet: ${doc.clients.size}`)
        
        // 如果文档没有客户端了，等待 30 秒再清理（给重连留时间）
        if (doc.clients.size === 0) {
          console.log(`[WebSocket] Document ${client.sheetId} has no clients, scheduling cleanup in 30s...`)
          setTimeout(() => {
            const currentDoc = documents.get(client.sheetId)
            if (currentDoc && currentDoc.clients.size === 0) {
              console.log(`[WebSocket] Removing empty document: ${client.sheetId}`)
              documents.delete(client.sheetId)
            }
          }, 30000)
        }
      }
      broadcastUsers(client.sheetId)
    }
  })

  ws.on('error', (error) => {
    console.error(`[WebSocket] Error for ${clientId}:`, error.message)
  })

  // 发送客户端 ID
  ws.send(
    JSON.stringify({
      type: 'connected',
      clientId,
      color: client.color,
    })
  )
})

console.log(`WebSocket server running on ws://localhost:${PORT}`)
