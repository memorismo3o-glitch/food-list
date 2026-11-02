import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// 어느 폴더에서 실행해도 이 폴더의 .env.local 을 읽도록 기준 경로를 고정
const ROOT = fileURLToPath(new URL('.', import.meta.url))

// 브라우저는 /rest 로만 요청하고, 개발 서버가 service_role 키를 붙여 Supabase로 전달한다
// 키는 .env.local 에만 있고 VITE_ 접두어가 없어서 브라우저 코드에 들어가지 않는다
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ROOT, '') // .env, .env.local 순으로 읽음 (.env.local 우선)
  const url = (env.SUPABASE_URL || '').replace(/\/+$/, '')
  const anonKey = env.SUPABASE_ANON_KEY
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (/^postgres(ql)?:\/\//.test(url)) {
    throw new Error('SUPABASE_URL 에 DB 접속 문자열(Session pooler 등)이 들어 있습니다. 프로젝트 URL(https://xxxx.supabase.co)을 넣어 주세요.')
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
    throw new Error('.env.local 의 SUPABASE_URL 을 프로젝트 URL(https://xxxx.supabase.co) 형식으로 넣어 주세요.')
  }
  if (!serviceKey) {
    throw new Error('.env.local 에 SUPABASE_SERVICE_ROLE_KEY 를 넣어 주세요. (조회 · 추가 · 삭제에 사용)')
  }
  // anon 키는 qa_dummy 권한이 없어 지금은 요청에 쓰지 않는다. 나중에 읽기 전용 화면을 만들 때 사용
  console.log(`[qa-dummy-admin] 프로젝트 URL ${url} · service_role 키 설정됨 · anon 키 ${anonKey ? '설정됨(미사용)' : '없음'}`)

  const headers = {
    apikey: serviceKey,
    'Accept-Profile': 'qa_dummy',
    'Content-Profile': 'qa_dummy',
  }
  // 예전 JWT 형식 키(eyJ...)는 Authorization 헤더도 필요. 새 형식(sb_secret_...)은 apikey 만 사용
  if (!serviceKey.startsWith('sb_')) headers.Authorization = `Bearer ${serviceKey}`

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1', // 내 PC에서만 접속 가능
      port: 5173,
      proxy: {
        '/rest': { target: url, changeOrigin: true, headers },
      },
    },
  }
})
