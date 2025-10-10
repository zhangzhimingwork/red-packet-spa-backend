import { verifyMessage } from 'viem'
import { sign, verify, TokenExpiredError } from './utils/jwt.js'
import { generateNonce } from './utils/crypto.js'
import { createSignatureMessage } from './utils/message.js'

// 使用全局 Map 存储 nonce（生产环境应使用 KV 或 Durable Objects）
const nonceStore = new Map()

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

// 处理 OPTIONS 请求
function handleOptions() {
  return new Response(null, {
    headers: corsHeaders
  })
}

// 清理过期 nonce
function cleanExpiredNonces() {
  const now = Date.now()
  for (const [address, data] of nonceStore.entries()) {
    if (data.expiresAt < now) {
      nonceStore.delete(address)
    }
  }
}

// 处理生成 nonce 的请求
async function handleNonce(request, env) {
  try {
    const { address, domain } = await request.json()

    // 验证地址格式
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return new Response(JSON.stringify({ error: '无效的钱包地址' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 生成随机 nonce
    const nonce = generateNonce()
    const timestamp = Date.now()
    const expiresAt = timestamp + 5 * 60 * 1000 // 5分钟过期

    const normalizedAddress = address.toLowerCase()

    // 存储 nonce
    nonceStore.set(normalizedAddress, { nonce, expiresAt })

    // 清理过期的 nonce
    cleanExpiredNonces()

    // 生成签名消息
    const message = createSignatureMessage({
      address,
      nonce,
      timestamp,
      expiresAt,
      domain: domain || env.DOMAIN
    })

    return new Response(
      JSON.stringify({
        message,
        nonce,
        timestamp,
        expiresAt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('生成nonce失败:', error)
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// 处理验证签名的请求
async function handleVerify(request, env) {
  try {
    const { address, signature, message } = await request.json()

    // 验证必需参数
    if (!address || !signature || !message) {
      return new Response(JSON.stringify({ error: '缺少必需参数' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 验证地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return new Response(JSON.stringify({ error: '无效的钱包地址' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 验证签名格式
    if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
      return new Response(JSON.stringify({ error: '无效的签名格式' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const normalizedAddress = address.toLowerCase()

    // 检查 nonce 是否存在
    const storedData = nonceStore.get(normalizedAddress)
    if (!storedData) {
      return new Response(JSON.stringify({ error: '未找到nonce，请先请求签名消息' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 检查 nonce 是否过期
    if (Date.now() > storedData.expiresAt) {
      nonceStore.delete(normalizedAddress)
      return new Response(JSON.stringify({ error: '签名已过期，请重新请求' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 验证消息中是否包含 nonce
    if (!message.includes(storedData.nonce)) {
      return new Response(JSON.stringify({ error: '消息验证失败：nonce不匹配' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 使用 viem 验证签名
    const isValid = await verifyMessage({
      address: address,
      message: message,
      signature: signature
    })

    if (!isValid) {
      return new Response(JSON.stringify({ error: '签名验证失败' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 签名验证成功，删除已使用的 nonce
    nonceStore.delete(normalizedAddress)

    // 生成 JWT Token
    const token = await sign(
      {
        address: normalizedAddress,
        iat: Math.floor(Date.now() / 1000)
      },
      env.JWT_SECRET || 'your-secret-key',
      {
        expiresIn: env.JWT_EXPIRES_IN || '7d'
      }
    )

    return new Response(
      JSON.stringify({
        success: true,
        token,
        address: normalizedAddress,
        expiresIn: env.JWT_EXPIRES_IN || '7d'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('验证签名失败:', error)
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

// 验证 JWT Token 并返回用户信息
async function handleMe(request, env) {
  try {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: '未授权：缺少Token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.substring(7)

    const decoded = await verify(token, env.JWT_SECRET || 'your-secret-key')

    return new Response(
      JSON.stringify({
        address: decoded.address,
        message: '身份验证成功'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    if (error.message === 'Invalid signature' || error.message === 'Invalid token format') {
      return new Response(JSON.stringify({ error: '无效的Token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else if (error.message === 'Token expired') {
      return new Response(JSON.stringify({ error: 'Token已过期' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      console.error('Token验证错误:', error)
      return new Response(JSON.stringify({ error: '服务器错误' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }
}

// 健康检查
function handleHealth() {
  return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// 主处理函数
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // 处理 OPTIONS 请求
    if (method === 'OPTIONS') {
      return handleOptions()
    }

    // 路由处理
    if (path === '/health' && method === 'GET') {
      return handleHealth()
    }

    if (path === '/api/auth/nonce' && method === 'POST') {
      return handleNonce(request, env)
    }

    if (path === '/api/auth/verify' && method === 'POST') {
      return handleVerify(request, env)
    }

    if (path === '/api/auth/me' && method === 'GET') {
      return handleMe(request, env)
    }

    // 404
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}
