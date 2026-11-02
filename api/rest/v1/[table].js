import { timingSafeEqual } from 'node:crypto'

// 배포(Vercel)용 Supabase 중계 함수. 로컬 개발에서는 vite.config.js 프록시가 같은 역할을 한다
// 키는 Vercel 환경 변수에만 두고, ADMIN_PASSWORD 를 맞힌 요청만 통과시킨다
const ALLOWED_TABLES = ['products']
const ALLOWED_METHODS = ['GET', 'POST', 'DELETE']

// 한글 비밀번호도 헤더로 보낼 수 있게 양쪽 모두 URL 인코딩한 값으로 비교
function samePassword(sent, expected) {
  const a = Buffer.from(String(sent ?? ''))
  const b = Buffer.from(encodeURIComponent(expected))
  return a.length === b.length && timingSafeEqual(a, b)
}

export default async function handler(req, res) {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const password = process.env.ADMIN_PASSWORD
  if (!url || !key || !password) {
    return res.status(503).json({
      code: 'CONFIG',
      message: 'Vercel 환경 변수 SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY · ADMIN_PASSWORD 를 설정한 뒤 다시 배포하세요.',
    })
  }
  if (!samePassword(req.headers['x-admin-password'], password)) {
    return res.status(401).json({ code: 'AUTH', message: '관리 비밀번호가 맞지 않습니다.' })
  }
  const { table } = req.query
  if (!ALLOWED_TABLES.includes(table) || !ALLOWED_METHODS.includes(req.method)) {
    return res.status(403).json({ code: 'FORBIDDEN', message: '허용되지 않은 요청입니다.' })
  }

  const search = new URL(req.url, 'http://localhost').searchParams
  search.delete('table') // 동적 경로 값이 쿼리에 섞여 들어오는 경우 제거

  // 테이블은 public 스키마(기본값)에 있어 스키마 지정 헤더는 필요 없다
  const headers = {
    apikey: key,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
  // 예전 JWT 형식 키(eyJ...)는 Authorization 헤더도 필요. 새 형식(sb_secret_...)은 apikey 만 사용
  if (!key.startsWith('sb_')) headers.Authorization = `Bearer ${key}`

  try {
    const upstream = await fetch(`${url}/rest/v1/${table}?${search}`, {
      method: req.method,
      headers,
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    })
    res.status(upstream.status)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    return res.send(await upstream.text())
  } catch {
    return res.status(502).json({ code: 'UPSTREAM', message: 'Supabase에 연결할 수 없습니다. SUPABASE_URL 환경 변수를 확인하세요.' })
  }
}
