// WebSocket 测试脚本
// 使用方法：node test-ws.js

const WebSocket = require('ws')

const WS_URL = process.env.WS_URL || 'ws://localhost:8080'

console.log(`[Test] Connecting to ${WS_URL}...`)

const ws = new WebSocket(WS_URL)

ws.on('open', () => {
  console.log('[Test] ✅ Connected!')
  
  // 加入文档
  ws.send(JSON.stringify({
    type: 'join',
    payload: {
      sheetId: 'test-sheet-1',
      name: 'TestUser',
    },
  }))
})

ws.on('message', (data) => {
  const message = JSON.parse(data.toString())
  console.log('[Test] 📩 Received:', message.type)
  
  if (message.type === 'connected') {
    console.log('[Test] Client ID:', message.clientId)
    console.log('[Test] Color:', message.color)
    
    // 发送测试操作
    setTimeout(() => {
      console.log('[Test] Sending test operation...')
      ws.send(JSON.stringify({
        type: 'operation',
        payload: {
          type: 'SET_CELL',
          sheetId: 'test-sheet-1',
          payload: {
            position: { row: 0, col: 0 },
            value: 'Hello from test!',
          },
        },
      }))
    }, 1000)
  }
  
  if (message.type === 'ack') {
    console.log('[Test] ✅ Operation acknowledged, version:', message.version)
    
    // 关闭连接
    setTimeout(() => {
      console.log('[Test] Closing connection...')
      ws.close(1000, 'Test complete')
    }, 500)
  }
})

ws.on('close', (code, reason) => {
  console.log(`[Test] 🔌 Disconnected: code=${code}, reason=${reason || 'none'}`)
  process.exit(0)
})

ws.on('error', (error) => {
  console.error('[Test] ❌ Error:', error.message)
  console.error('[Test] Make sure the WebSocket server is running: npm run dev')
  process.exit(1)
})

// 超时处理
setTimeout(() => {
  console.log('[Test] ⏱️ Connection timeout')
  ws.close()
  process.exit(1)
}, 10000)
