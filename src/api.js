// Supabase REST(PostgREST) 호출. 키는 로컬에서는 개발 서버 프록시(vite.config.js),
// 배포에서는 서버 함수(api/rest/v1/[table].js)가 붙인다
const BASE = '/api/rest/v1'
const PASSWORD_KEY = 'qa-dummy-admin-password'

// 배포 환경의 관리 비밀번호. 탭을 닫으면 사라지도록 sessionStorage 에만 둔다 (로컬 개발에서는 쓰이지 않음)
function getPassword() {
  try {
    return sessionStorage.getItem(PASSWORD_KEY) || ''
  } catch {
    return ''
  }
}

function setPassword(value) {
  try {
    sessionStorage.setItem(PASSWORD_KEY, value)
  } catch {
    // 저장이 막힌 환경이면 매번 다시 묻게 됨
  }
}

// PostgreSQL 오류 코드 → 화면에 보여줄 문장
const PG_MESSAGES = {
  '23503': '질문 또는 이슈에서 이 상품을 참조하고 있어 삭제할 수 없습니다. 해당 질문 · 이슈의 상품코드를 먼저 비우세요.',
  '23505': '이미 있는 상품코드입니다.',
  '23514': '입력 형식이 맞지 않습니다. (상품코드는 P-0000 형식, 가격은 1 이상)',
  '42501': '권한이 없습니다. 04_local_admin_grants.sql 을 실행했는지 확인하세요.',
  PGRST106: 'qa_dummy 스키마가 API에 노출되어 있지 않습니다. 대시보드 Exposed schemas 에 추가하세요.',
}

async function request(path, options = {}, retried = false) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        'x-admin-password': encodeURIComponent(getPassword()),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 로컬이면 npm run dev 가 실행 중인지 확인하세요.')
  }
  // 배포 환경에서 비밀번호가 없거나 틀리면 한 번 묻고 다시 시도
  if (res.status === 401 && !retried) {
    const input = window.prompt('관리 비밀번호를 입력하세요')
    if (input) {
      setPassword(input)
      return request(path, options, true)
    }
  }
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // 프록시 오류 등 JSON이 아닌 응답
  }
  if (!res.ok) {
    // JSON 없는 5xx = 프록시가 Supabase에 닿지 못한 경우
    const fallback =
      res.status >= 500
        ? 'Supabase에 연결할 수 없습니다. .env 의 SUPABASE_URL 과 인터넷 연결을 확인하세요.'
        : `요청 실패 (HTTP ${res.status})`
    const msg = (data && (PG_MESSAGES[data.code] || data.message)) || fallback
    throw new Error(msg)
  }
  return data
}

const PRODUCT_SELECT =
  '*,allergens(item,kind,source_text),storage_rules(timing,method,days,kind,content,reason)'

export function listProducts() {
  return request(`/products?select=${PRODUCT_SELECT}&order=code.asc`)
}

export async function createProduct(product) {
  const rows = await request('/products', { method: 'POST', body: JSON.stringify(product) })
  return rows[0]
}

// 보관 · 알레르기 행은 FK on delete cascade 로 함께 삭제된다
export async function deleteProduct(code) {
  const rows = await request(`/products?code=eq.${encodeURIComponent(code)}`, { method: 'DELETE' })
  if (!rows || rows.length === 0) throw new Error(`${code} 상품이 없습니다. 이미 삭제되었을 수 있습니다.`)
  return rows[0]
}
