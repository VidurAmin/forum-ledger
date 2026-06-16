import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

const MEMBERS = ['PP','Faiz','Sahil','Manav','Prasad','Ashish','Matthew','Bobby','Vidur']
const MONTHS  = ['Jan','Feb','Mar','Apr','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] // no May

const inr = n => '₹' + Math.round(n).toLocaleString('en-IN')

/* ---------------- Auth gate ---------------- */
function Gate() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  const send = async () => {
    setErr('')
    if (!email.trim()) { setErr('Enter your email'); return }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin }
    })
    if (error) setErr(error.message)
    else setSent(true)
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <h1>Forum <span className="yr">2026</span></h1>
        <p>Private expense ledger. Enter your email and we’ll send a one-time sign-in link.</p>
        {!sent ? (
          <>
            <input
              type="email" placeholder="you@email.com" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button className="btn brass" onClick={send}>Send sign-in link</button>
            {err && <div className="gate-msg" style={{background:'var(--red-bg)',color:'var(--red)'}}>{err}</div>}
          </>
        ) : (
          <div className="gate-msg">Check your inbox — tap the link to sign in.</div>
        )}
      </div>
    </div>
  )
}

/* ---------------- Ledger ---------------- */
function Ledger({ session }) {
  const [meetings, setMeetings] = useState(null)
  const [settlements, setSettlements] = useState([])
  const [toast, setToast] = useState('')
  const [editing, setEditing] = useState(null) // {type:'cell'|'venue', month, member}

  const [sFrom, setSFrom] = useState(MEMBERS[0])
  const [sTo, setSTo] = useState(MEMBERS[1])
  const [sAmt, setSAmt] = useState('')
  const [sDate, setSDate] = useState(new Date().toISOString().slice(0,10))

  const flash = useCallback(msg => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }, [])

  // initial load
  useEffect(() => {
    (async () => {
      const { data: mt } = await supabase.from('meetings').select('*')
      const byMonth = {}
      ;(mt || []).forEach(r => { byMonth[r.month] = r })
      const full = MONTHS.map(m => byMonth[m] || { month:m, venue:'', payments:{} })
      setMeetings(full)
      const { data: st } = await supabase.from('settlements').select('*').order('created_at')
      setSettlements(st || [])
    })()
  }, [])

  // ---- persistence helpers ----
  const upsertMeeting = async (mt) => {
    await supabase.from('meetings').upsert(
      { month: mt.month, venue: mt.venue, payments: mt.payments },
      { onConflict: 'month' }
    )
  }

  const setPayment = async (month, member, value) => {
    setMeetings(prev => {
      const next = prev.map(m => {
        if (m.month !== month) return m
        const payments = { ...m.payments }
        if (value > 0) payments[member] = value
        else delete payments[member]
        const updated = { ...m, payments }
        upsertMeeting(updated)
        return updated
      })
      return next
    })
    flash('Saved')
  }

  const setVenue = async (month, venue) => {
    setMeetings(prev => prev.map(m => {
      if (m.month !== month) return m
      const updated = { ...m, venue }
      upsertMeeting(updated)
      return updated
    }))
  }

  const addSettlement = async () => {
    const amt = Number(sAmt)
    if (sFrom === sTo) { flash('Payer and receiver must differ'); return }
    if (!amt || amt <= 0) { flash('Enter an amount'); return }
    const row = { from_m: sFrom, to_m: sTo, amount: amt, date: sDate }
    const { data, error } = await supabase.from('settlements').insert(row).select().single()
    if (error) { flash('Could not save'); return }
    setSettlements(prev => [...prev, data])
    setSAmt('')
    flash('Settlement recorded')
  }

  const quickSettle = async (from, to, amount) => {
    const row = { from_m: from, to_m: to, amount, date: new Date().toISOString().slice(0,10) }
    const { data, error } = await supabase.from('settlements').insert(row).select().single()
    if (error) { flash('Could not save'); return }
    setSettlements(prev => [...prev, data])
    flash(`${from} → ${to} ${inr(amount)} recorded`)
  }

  const removeSettlement = async (id) => {
    await supabase.from('settlements').delete().eq('id', id)
    setSettlements(prev => prev.filter(s => s.id !== id))
  }

  if (!meetings) return <div className="loading">Loading ledger…</div>

  // ---- math ----
  const paid = Object.fromEntries(MEMBERS.map(m => [m, 0]))
  let grand = 0
  meetings.forEach(mt => MEMBERS.forEach(m => {
    const v = Number(mt.payments[m] || 0); paid[m] += v; grand += v
  }))
  const share = grand / MEMBERS.length
  const bal = {}
  MEMBERS.forEach(m => bal[m] = paid[m] - share)
  settlements.forEach(s => { bal[s.from_m] += Number(s.amount); bal[s.to_m] -= Number(s.amount) })

  // minimal transfers
  const creditors = [], debtors = []
  MEMBERS.forEach(m => {
    const v = Math.round(bal[m])
    if (v > 0) creditors.push({ m, v }); else if (v < 0) debtors.push({ m, v: -v })
  })
  creditors.sort((a,b)=>b.v-a.v); debtors.sort((a,b)=>b.v-a.v)
  const moves = []; let i=0, j=0
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].v, creditors[j].v)
    if (pay >= 1) moves.push({ from: debtors[i].m, to: creditors[j].m, amount: pay })
    debtors[i].v -= pay; creditors[j].v -= pay
    if (debtors[i].v < 1) i++; if (creditors[j].v < 1) j++
  }

  return (
    <div className="ledger">
      <div className="wrap">
        <div className="masthead">
          <h1>Forum <span className="yr">2026</span> · Expense Ledger</h1>
          <div className="right">
            <span className="sub">YPO Forum · 9 members · equal split · no May</span>
            <button className="signout" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </div>
        </div>

        <h2 className="sec">Who owes who</h2>
        <div className="sec-note">Net position per member, then the minimum set of transfers to square everyone up.</div>
        <div className="balances">
          {MEMBERS.map(m => {
            const v = Math.round(bal[m])
            const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero'
            const tag = v > 0 ? 'is owed' : v < 0 ? 'owes' : 'square'
            return (
              <div className={`bal ${cls}`} key={m}>
                <div className="nm">{m}</div>
                <div className="amt">{inr(Math.abs(v))}</div>
                <div className="tag">{tag}</div>
              </div>
            )
          })}
        </div>
        <div className="transfers">
          {grand === 0 ? <div className="muted">No expenses recorded yet.</div>
            : moves.length === 0
              ? <div className="all-square">Everyone is square — total spend {inr(grand)}, share {inr(share)} each.</div>
              : <>
                  {moves.map((mv, k) => (
                    <div className="tr-line" key={k}>
                      <b>{mv.from}</b> <span className="arrow">⟶</span> <b>{mv.to}</b>
                      <span className="amt">{inr(mv.amount)}</span>
                      <button className="btn ghost" onClick={() => quickSettle(mv.from, mv.to, mv.amount)}>Mark settled</button>
                    </div>
                  ))}
                  <div className="muted">Total spend so far {inr(grand)} · equal share {inr(share)} per member.</div>
                </>}
        </div>

        <h2 className="sec">Master ledger</h2>
        <div className="sec-note">Tap any cell to add or edit what a member paid that month. Tap the venue to change it.</div>
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th className="month">Month</th>
                <th style={{textAlign:'left'}}>Venue</th>
                <th>Total</th>
                {MEMBERS.map(m => <th key={m}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {meetings.map(mt => {
                const rowTotal = MEMBERS.reduce((s,m)=>s+Number(mt.payments[m]||0),0)
                return (
                  <tr key={mt.month}>
                    <td className="month">{mt.month}</td>
                    <td className="venue">
                      {editing?.type==='venue' && editing.month===mt.month ? (
                        <input autoFocus type="text" defaultValue={mt.venue}
                          onBlur={e => { setVenue(mt.month, e.target.value.trim()); setEditing(null) }}
                          onKeyDown={e => { if(e.key==='Enter') e.target.blur(); if(e.key==='Escape') setEditing(null) }} />
                      ) : (
                        <span className="v-edit" onClick={() => setEditing({type:'venue', month:mt.month})}>
                          {mt.venue || <span className="empty">add venue</span>}
                        </span>
                      )}
                    </td>
                    <td className="total">{rowTotal ? inr(rowTotal) : <span className="empty">—</span>}</td>
                    {MEMBERS.map(m => {
                      const v = Number(mt.payments[m]||0)
                      const isEd = editing?.type==='cell' && editing.month===mt.month && editing.member===m
                      return (
                        <td className="cell" key={m} onClick={() => !isEd && setEditing({type:'cell', month:mt.month, member:m})}>
                          {isEd ? (
                            <input autoFocus type="number" min="0" defaultValue={v||''}
                              onBlur={e => { setPayment(mt.month, m, Math.max(0, Number(e.target.value||0))); setEditing(null) }}
                              onKeyDown={e => { if(e.key==='Enter') e.target.blur(); if(e.key==='Escape') setEditing(null) }} />
                          ) : (v ? inr(v) : <span className="empty">·</span>)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              <tr className="foot">
                <td className="month">Paid</td><td></td><td>{inr(grand)}</td>
                {MEMBERS.map(m => <td key={m}>{inr(paid[m])}</td>)}
              </tr>
              <tr className="foot2">
                <td className="month">Fair share</td><td></td><td></td>
                {MEMBERS.map(m => <td key={m}>{inr(share)}</td>)}
              </tr>
              <tr className="foot3">
                <td className="month">Net (after settlements)</td><td></td><td></td>
                {MEMBERS.map(m => {
                  const v = Math.round(bal[m])
                  const txt = v===0 ? '0' : (v>0?'+₹':'−₹') + Math.abs(v).toLocaleString('en-IN')
                  return <td className={v>0?'pos':v<0?'neg':''} key={m}>{txt}</td>
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="sec">Settlements</h2>
        <div className="sec-note">When someone pays a member back directly, record it here. Balances recalculate instantly.</div>
        <div className="settle-form">
          <div className="field"><label>From (payer)</label>
            <select value={sFrom} onChange={e=>setSFrom(e.target.value)}>{MEMBERS.map(m=><option key={m}>{m}</option>)}</select></div>
          <div className="field"><label>To (receiver)</label>
            <select value={sTo} onChange={e=>setSTo(e.target.value)}>{MEMBERS.map(m=><option key={m}>{m}</option>)}</select></div>
          <div className="field"><label>Amount (₹)</label>
            <input type="number" min="1" placeholder="0" value={sAmt} onChange={e=>setSAmt(e.target.value)} /></div>
          <div className="field"><label>Date</label>
            <input type="date" value={sDate} onChange={e=>setSDate(e.target.value)} /></div>
          <button className="btn brass" onClick={addSettlement}>Record settlement</button>
        </div>
        <div className="settle-list">
          {settlements.length === 0 ? <div className="muted">No settlements recorded yet.</div>
            : settlements.slice().reverse().map(s => (
              <div className="settle-item" key={s.id}>
                <span className="dt">{s.date}</span>
                <b>{s.from_m}</b> paid <b>{s.to_m}</b>
                <span className="amt">{inr(s.amount)}</span>
                <button className="btn ghost" onClick={() => removeSettlement(s.id)}>Remove</button>
              </div>
            ))}
        </div>
      </div>
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  )
}

/* ---------------- Root ---------------- */
export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="loading">Loading…</div>
  if (!session) return <Gate />
  return <Ledger session={session} />
}
