// src/pages/ActivityForm.jsx – Formulário completo 5W2H
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { activitiesAPI, categoriesAPI, usersAPI, projectsAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import { ArrowLeft, Save, Loader2, HelpCircle } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'PLANNED',     label: 'Planejado'    },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'DELAYED',     label: 'Atrasado'     },
  { value: 'DONE',        label: 'Finalizado'   },
];

// Tooltips explicativos para cada campo 5W2H
const TOOLTIPS = {
  code:        'Identificador único no formato X.Y (ex.: 1.3, 2.1)',
  what:        'O quê: Descreva claramente a tarefa ou entrega esperada',
  why:         'Por quê: Justifique a importância e o benefício desta atividade',
  who:         'Quem: Indique o responsável pela execução (pessoa ou função)',
  where:       'Onde: Local ou plataforma de execução (remoto, escritório, sistema X)',
  how:         'Como: Descreva o método, processo ou ferramenta a utilizar',
  howMuch:     'Quanto: Custo estimado em reais (opcional)',
  whenStart:   'Quando: Data prevista de início',
  whenEnd:     'Quando: Data prevista de conclusão / prazo',
  risk:        'Risco: Consequência ou impacto caso a atividade não seja concluída',
};

function FieldLabel({ label, tooltip, required }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <label style={{ fontSize: '0.83rem', color: 'var(--genius-text-muted)', fontWeight: 600 }}>
        {label}{required && <span style={{ color: 'var(--genius-gold)' }}>*</span>}
      </label>
      {tooltip && (
        <div style={{ position: 'relative', cursor: 'help' }} title={tooltip}>
          <HelpCircle size={13} style={{ color: 'var(--genius-text-subtle)' }} />
        </div>
      )}
    </div>
  );
}

const EMPTY = {
  code: '', what: '', why: '', who: '', where: '', how: '',
  howMuch: '', whenStart: '', whenEnd: '',
  status: 'PLANNED', risk: '', notes: '',
  categoryId: '', responsibleId: '',
};

export default function ActivityForm() {
  const { id }                  = useParams();
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const isEdit                  = Boolean(id);

  const [form,       setForm]       = useState({ ...EMPTY, categoryId: searchParams.get('categoryId') || '' });
  const [categories, setCategories] = useState([]);
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    loadSupport();
    if (isEdit) loadActivity();
  }, [id]);

  async function loadSupport() {
    try {
      const [catsRes, usersRes] = await Promise.all([
        categoriesAPI.list(),
        usersAPI.list('COLLABORATOR'),
      ]);
      setCategories(catsRes.data.categories);
      setUsers(usersRes.data.users);
    } catch {}
  }

  async function loadActivity() {
    setLoading(true);
    try {
      const { data } = await activitiesAPI.get(id);
      const a = data.activity;
      setForm({
        code:          a.code         || '',
        what:          a.what         || '',
        why:           a.why          || '',
        who:           a.who          || '',
        where:         a.where        || '',
        how:           a.how          || '',
        howMuch:       a.howMuch      != null ? String(a.howMuch) : '',
        whenStart:     a.whenStart    ? a.whenStart.slice(0, 10) : '',
        whenEnd:       a.whenEnd      ? a.whenEnd.slice(0, 10)   : '',
        status:        a.status       || 'PLANNED',
        risk:          a.risk         || '',
        notes:         a.notes        || '',
        categoryId:    a.categoryId   || '',
        responsibleId: a.responsibleId|| '',
      });
    } finally {
      setLoading(false);
    }
  }

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        howMuch:    form.howMuch    ? parseFloat(form.howMuch)    : null,
        whenStart:  form.whenStart  || null,
        whenEnd:    form.whenEnd    || null,
        responsibleId: form.responsibleId || null,
      };

      if (isEdit) {
        await activitiesAPI.update(id, payload);
      } else {
        await activitiesAPI.create(payload);
      }

      navigate('/dashboard');
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? msgs.map((e) => e.msg).join(' · ') : err.response?.data?.error || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={36} style={{ color: 'var(--genius-gold)', animation: 'spin 1s linear infinite' }} />
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '36px 40px', overflowY: 'auto' }}>
        <Link to="/dashboard" className="btn btn-ghost btn-sm" style={{ marginBottom: 24, display: 'inline-flex' }}>
          <ArrowLeft size={14} /> Voltar
        </Link>

        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: 2, marginBottom: 4 }}>
          {isEdit ? 'EDITAR' : 'NOVA'} <span style={{ color: 'var(--genius-gold)' }}>ATIVIDADE</span>
        </h1>
        <p style={{ color: 'var(--genius-text-muted)', fontSize: '0.88rem', marginBottom: 32 }}>
          Preencha todos os campos do método 5W2H
        </p>

        <form onSubmit={handleSubmit} style={{ maxWidth: 860 }}>
          {/* ── Identificação ─────────────────────────────── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: 1, marginBottom: 16, color: 'var(--genius-gold)' }}>
              IDENTIFICAÇÃO
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 16 }}>
              <div>
                <FieldLabel label="Código" tooltip={TOOLTIPS.code} required />
                <input className="input" value={form.code} onChange={set('code')} placeholder="1.1" required />
              </div>
              <div>
                <FieldLabel label="Categoria" required />
                <select className="input" value={form.categoryId} onChange={set('categoryId')} required>
                  <option value="">Selecione...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel label="Status" required />
                <select className="input" value={form.status} onChange={set('status')}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── 5W ────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: 1, marginBottom: 16, color: 'var(--genius-gold)' }}>
              5W — WHAT · WHY · WHO · WHERE · WHEN
            </h3>

            {/* WHAT */}
            <div style={{ marginBottom: 14 }}>
              <FieldLabel label="O quê (What)" tooltip={TOOLTIPS.what} required />
              <input className="input" value={form.what} onChange={set('what')} placeholder="Descreva a tarefa ou entrega..." required />
            </div>

            {/* WHY */}
            <div style={{ marginBottom: 14 }}>
              <FieldLabel label="Por quê (Why)" tooltip={TOOLTIPS.why} required />
              <textarea className="input" value={form.why} onChange={set('why')} placeholder="Justifique a importância desta atividade..." required rows={2} style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
              {/* WHO */}
              <div>
                <FieldLabel label="Quem (Who)" tooltip={TOOLTIPS.who} required />
                <input className="input" value={form.who} onChange={set('who')} placeholder="Responsável pela execução" required />
              </div>
              {/* Responsável (usuário do sistema) */}
              <div>
                <FieldLabel label="Vincular usuário responsável" />
                <select className="input" value={form.responsibleId} onChange={set('responsibleId')}>
                  <option value="">Nenhum</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>

            {/* WHERE */}
            <div style={{ marginBottom: 14 }}>
              <FieldLabel label="Onde (Where)" tooltip={TOOLTIPS.where} required />
              <input className="input" value={form.where} onChange={set('where')} placeholder="Local ou plataforma de execução" required />
            </div>

            {/* WHEN */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <FieldLabel label="Data de início (When start)" tooltip={TOOLTIPS.whenStart} />
                <input className="input" type="date" value={form.whenStart} onChange={set('whenStart')} />
              </div>
              <div>
                <FieldLabel label="Prazo / Data fim (When end)" tooltip={TOOLTIPS.whenEnd} />
                <input className="input" type="date" value={form.whenEnd} onChange={set('whenEnd')} />
              </div>
            </div>
          </div>

          {/* ── 2H ────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: 1, marginBottom: 16, color: 'var(--genius-gold)' }}>
              2H — HOW · HOW MUCH
            </h3>

            {/* HOW */}
            <div style={{ marginBottom: 14 }}>
              <FieldLabel label="Como (How)" tooltip={TOOLTIPS.how} required />
              <textarea className="input" value={form.how} onChange={set('how')} placeholder="Método, processo ou ferramenta a utilizar..." required rows={2} style={{ resize: 'vertical' }} />
            </div>

            {/* HOW MUCH */}
            <div style={{ maxWidth: 200 }}>
              <FieldLabel label="Quanto (How much)" tooltip={TOOLTIPS.howMuch} />
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--genius-text-muted)', fontSize: '0.85rem' }}>R$</span>
                <input className="input" type="number" step="0.01" min="0" value={form.howMuch} onChange={set('howMuch')} placeholder="0,00" style={{ paddingLeft: 34 }} />
              </div>
            </div>
          </div>

          {/* ── Risco + Observações ──────────────────────── */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: 1, marginBottom: 16, color: '#F59E0B' }}>
              RISCO &amp; OBSERVAÇÕES
            </h3>
            <div style={{ marginBottom: 14 }}>
              <FieldLabel label="Risco" tooltip={TOOLTIPS.risk} />
              <textarea className="input" value={form.risk} onChange={set('risk')} placeholder="Consequência caso esta atividade não seja concluída no prazo..." rows={2} style={{ resize: 'vertical', borderColor: form.risk ? 'rgba(245,158,11,0.4)' : undefined }} />
            </div>
            <div>
              <FieldLabel label="Observações adicionais" />
              <textarea className="input" value={form.notes} onChange={set('notes')} placeholder="Notas, links, referências..." rows={2} style={{ resize: 'vertical' }} />
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '12px 16px', marginBottom: 20,
              color: '#F87171', fontSize: '0.87rem',
            }}>
              {error}
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '12px 28px' }}>
              {saving
                ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : <Save size={16} />
              }
              {isEdit ? 'Salvar alterações' : 'Criar atividade'}
            </button>
            <Link to="/dashboard" className="btn btn-ghost" style={{ padding: '12px 20px' }}>
              Cancelar
            </Link>
          </div>
        </form>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
