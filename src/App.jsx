import { useEffect, useMemo, useState } from 'react'
import { createProduct, deleteProduct, listProducts } from './api.js'

const CATEGORIES = ['신선', '가공', '냉동']
const ALLERGY_KINDS = ['함유', '라인 공유'] // 알레르기 주의로 보는 구분 (03_query_allergens.sql 과 같은 기준)

const won = (n) => `${n.toLocaleString('ko-KR')}원`
const allergyItems = (p) => p.allergens.filter((a) => ALLERGY_KINDS.includes(a.kind))

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [allergyOnly, setAllergyOnly] = useState(false)
  const [selectedCode, setSelectedCode] = useState(null)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      setProducts(await listProducts())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // 10건 정도라 검색 · 필터는 브라우저에서 처리
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (category && p.category !== category) return false
      if (allergyOnly && allergyItems(p).length === 0) return false
      if (!q) return true
      return [p.code, p.name, p.origin ?? ''].some((v) => v.toLowerCase().includes(q))
    })
  }, [products, query, category, allergyOnly])

  const selected = products.find((p) => p.code === selectedCode) ?? null

  async function handleCreate(product) {
    const created = await createProduct(product)
    setShowForm(false)
    setNotice(`${created.code} ${created.name} 을(를) 추가했습니다.`)
    await load()
    setSelectedCode(created.code)
  }

  async function handleDelete(p) {
    if (!window.confirm(`${p.code} ${p.name} 을(를) 삭제할까요?\n보관 · 알레르기 정보도 함께 삭제되며 되돌릴 수 없습니다.`)) return
    setError('')
    try {
      await deleteProduct(p.code)
      setSelectedCode(null)
      setNotice(`${p.code} ${p.name} 을(를) 삭제했습니다.`)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>상품 관리</h1>
          <p className="sub">실습용 가상 데이터 · Supabase</p>
        </div>
        <button className="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? '추가 닫기' : '+ 상품 추가'}
        </button>
      </header>

      {notice && (
        <div className="banner ok" onClick={() => setNotice('')}>
          {notice}
        </div>
      )}
      {error && (
        <div className="banner err" onClick={() => setError('')}>
          {error}
        </div>
      )}

      {showForm && <AddProductForm existingCodes={products.map((p) => p.code)} onSubmit={handleCreate} />}

      <section className="toolbar">
        <input
          type="search"
          placeholder="상품명 · 코드 · 원산지 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">전체 분류</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={allergyOnly} onChange={(e) => setAllergyOnly(e.target.checked)} />
          알레르기 주의만
        </label>
        <button onClick={load} disabled={loading}>
          새로고침
        </button>
      </section>

      <div className="layout">
        <section className="list">
          {loading ? (
            <p className="muted">불러오는 중…</p>
          ) : (
            <>
              <p className="muted">
                {filtered.length}건 / 전체 {products.length}건
              </p>
              <ProductTable products={filtered} selectedCode={selectedCode} onSelect={setSelectedCode} />
            </>
          )}
        </section>
        <aside className="detail">
          {selected ? (
            <ProductDetail product={selected} onDelete={handleDelete} />
          ) : (
            <p className="muted">목록에서 상품을 선택하면 보관 · 알레르기 정보가 여기 나옵니다.</p>
          )}
        </aside>
      </div>
    </div>
  )
}

function ProductTable({ products, selectedCode, onSelect }) {
  if (products.length === 0) return <p className="muted">조건에 맞는 상품이 없습니다.</p>
  return (
    <table>
      <thead>
        <tr>
          <th>코드</th>
          <th>상품명</th>
          <th>분류</th>
          <th>원산지</th>
          <th>용량</th>
          <th className="num">가격</th>
          <th>알레르기</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => {
          const items = allergyItems(p)
          return (
            <tr key={p.code} className={p.code === selectedCode ? 'selected' : ''} onClick={() => onSelect(p.code)}>
              <td className="mono">{p.code}</td>
              <td>{p.name}</td>
              <td>
                {p.category ?? '-'}
                {p.category_assumed && p.category && <span className="tag assumed">임시</span>}
              </td>
              <td>{p.origin ?? <span className="muted">없음</span>}</td>
              <td>{p.volume}</td>
              <td className="num">{won(p.price_won)}</td>
              <td>
                {items.map((a) => (
                  <span key={a.item} className={`tag ${a.kind === '함유' ? 'warn' : 'line'}`}>
                    {a.item}
                  </span>
                ))}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function ProductDetail({ product: p, onDelete }) {
  return (
    <div>
      <h2>
        {p.name} <span className="mono muted">{p.code}</span>
      </h2>
      <dl className="facts">
        <dt>분류</dt>
        <dd>
          {p.category ?? '-'} {p.category_assumed && p.category && <span className="tag assumed">임시 분류</span>}
        </dd>
        <dt>원산지</dt>
        <dd>{p.origin ?? '문서에 없음'}</dd>
        <dt>용량 · 가격</dt>
        <dd>
          {p.volume} · {won(p.price_won)}
        </dd>
        <dt>판매기간</dt>
        <dd>{p.sale_period ?? '명시 없음'}</dd>
        <dt>원본 문서</dt>
        <dd className="mono small">{p.source_doc}</dd>
      </dl>

      <h3>알레르기</h3>
      {p.allergens.length === 0 ? (
        <p className="muted">등록된 정보 없음</p>
      ) : (
        <ul className="rows">
          {p.allergens.map((a) => (
            <li key={a.item}>
              <span className={`tag ${a.kind === '함유' ? 'warn' : a.kind === '라인 공유' ? 'line' : ''}`}>{a.kind}</span>
              {a.item === '해당 없음' ? a.source_text : `${a.item} — ${a.source_text}`}
            </li>
          ))}
        </ul>
      )}

      <h3>보관</h3>
      {p.storage_rules.length === 0 ? (
        <p className="muted">등록된 정보 없음</p>
      ) : (
        <ul className="rows">
          {p.storage_rules.map((s) => (
            <li key={s.content}>
              <span className={`tag ${s.kind === '금지' ? 'warn' : s.kind === '주의' ? 'line' : ''}`}>{s.kind}</span>
              <span className="muted">[{s.timing}]</span> {s.content}
              {s.reason && <span className="muted"> ({s.reason})</span>}
            </li>
          ))}
        </ul>
      )}

      <button className="danger" onClick={() => onDelete(p)}>
        이 상품 삭제
      </button>
    </div>
  )
}

const EMPTY_FORM = {
  code: '',
  name: '',
  category: '',
  category_assumed: false,
  origin: '',
  volume: '',
  price_won: '',
  sale_period: '',
  source_doc: '',
}

function AddProductForm({ existingCodes, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  // DB 제약 조건과 같은 검사를 먼저 해서 알기 쉬운 문장으로 알려 준다
  function validate() {
    if (!/^P-\d{4}$/.test(form.code)) return '상품코드는 P-0000 형식이어야 합니다.'
    if (existingCodes.includes(form.code)) return '이미 있는 상품코드입니다.'
    if (!form.name.trim()) return '상품명을 입력하세요.'
    if (!form.volume.trim()) return '용량을 입력하세요.'
    const price = Number(form.price_won)
    if (!Number.isInteger(price) || price <= 0) return '가격은 1 이상의 정수여야 합니다.'
    return ''
  }

  async function submit(e) {
    e.preventDefault()
    const msg = validate()
    if (msg) return setError(msg)
    setSaving(true)
    setError('')
    const blankToNull = (v) => (v.trim() ? v.trim() : null)
    try {
      await onSubmit({
        code: form.code,
        name: form.name.trim(),
        category: form.category || null,
        category_assumed: form.category_assumed,
        origin: blankToNull(form.origin),
        volume: form.volume.trim(),
        price_won: Number(form.price_won),
        sale_period: blankToNull(form.sale_period),
        source_doc: form.source_doc.trim() || `docs/dummy/products/${form.code}_${form.name.trim()}.md`,
      })
      setForm(EMPTY_FORM)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h2>상품 추가</h2>
      <div className="grid">
        <label>
          상품코드 *<input value={form.code} onChange={set('code')} placeholder="P-0500" />
        </label>
        <label>
          상품명 *<input value={form.name} onChange={set('name')} />
        </label>
        <label>
          분류
          <select value={form.category} onChange={set('category')}>
            <option value="">선택 안 함</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={form.category_assumed} onChange={set('category_assumed')} />
          임시 분류 (확인 필요)
        </label>
        <label>
          원산지<input value={form.origin} onChange={set('origin')} placeholder="경북 영천" />
        </label>
        <label>
          용량 *<input value={form.volume} onChange={set('volume')} placeholder="500g" />
        </label>
        <label>
          가격(원) *<input type="number" min="1" step="1" value={form.price_won} onChange={set('price_won')} />
        </label>
        <label>
          판매기간<input value={form.sale_period} onChange={set('sale_period')} placeholder="비우면 명시 없음" />
        </label>
        <label className="wide">
          원본 문서 경로
          <input value={form.source_doc} onChange={set('source_doc')} placeholder="비우면 docs/dummy/products/코드_상품명.md" />
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="primary" type="submit" disabled={saving}>
        {saving ? '저장 중…' : '추가'}
      </button>
    </form>
  )
}
