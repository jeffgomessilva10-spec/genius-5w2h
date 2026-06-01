// src/pages/ActivityForm.jsx – Formulário completo 5W2H
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  activitiesAPI, categoriesAPI, usersAPI, projectsAPI, classificationAPI, activityNextCode,
} from '../services/api';
import api from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import { useIsMobile } from '../hooks/useIsMobile';
import { ArrowLeft, Save, Loader2, HelpCircle, Zap } from 'lucide-react';
import AIValidator from '../components/ui/AIValidator';

const STATUS_OPTIONS = [
  { value: 'PLANNED',     label: 'Planejado'    },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'DELAYED',     label: 'Atrasado'     },
  { value: 'DONE',        label: 'Finalizado'   },
];

const TOOLTIPS = {
  code:      'Código gerado automaticamente ao selecionar a categoria. Formato: X.Y (ex.: 1.3, 2.1)',
  what:      'O quê: Descreva claramente a tarefa ou entrega esperada',
  why:       'Por quê: Justifique a importância e o benefício desta atividade',
  who:       'Quem: Indique o responsável pela execução (pessoa ou função)',
  where:     'Onde: Local ou plataforma de execução (remoto, escritório, sistema X)',
  how:       'Como: Descreva o método, processo ou ferramenta a utilizar',
  howMuch:   'Quanto: Custo estimado em reais (opcional)',
  whenStart: 'Quando: Data prevista de início',
  whenEnd:   'Quando: Data prevista de conclusão / prazo',
  risk:      'Risco: Consequência ou impacto caso a atividade não seja concluída',
};

function FieldLabel({ label, tooltip, required }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <label style={{ fontSize: '0.83rem', color: '#374151', fontWeight: 600 }}>
        {label}{required && <span style={{ color: '#F04E00' }}>*</span>}
      </label>
      {tooltip && (
        <span title={tooltip} style={{ cursor: 'help', color: '#9CA3AF' }}>
          <HelpCircle size={13} />
        </span>
      )}
    </div>
  );
}

const EMPTY = {
  code: '', what: '', why: '', who: '', where: '', how: '',
  howMuch: '', actualCost: '', plannedHours: '', actualHours: '',
  whenStart: '', whenEnd: '',
  status: 'PLANNED', risk: '', riskProbability: '', riskImpact: '', riskMitigation: '', notes: '',
  categoryId: '', responsibleId: '',
};

export default function ActivityForm() {
  const { id }           = useParams();
  const [searchParams]   = useSearchParams();
  const navigate         = useNavigate();
  const isMobile         = useIsMobile();
  const isEdit           = Boolean(id);

  // Pré-seleciona projeto e categoria da URL
  const urlProjectId  = searchParams.get('projectId')  || '';
  const urlCategoryId = searchParams.get('categoryId') || '';

  const [form,            setForm]            = useState({ ...EMPTY, categoryId: urlCategoryId });
  const [projects,        setProjects]        = useState([]);
  const [selectedProject, setSelectedProject] = useState(urlProjectId);
  const [categories,      setCategories]      = useState([]); // categorias DO projeto selecionado
  const [classifications, setClassifications] = useState({ grouped: {} }); // novo sistema
  const [users,           setUsers]           = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');
  const [generatingCode,  setGeneratingCode]  = useState(false);
  const [showAI,          setShowAI]          = useState(false);

  useEffect(() => {
    loadInitialData();
    if (isEdit) loadActivity();
  }, []);

  useEffect(() => {
    if (selectedProject) loadProjectCategories(selectedProject);
  }, [selectedProject]);

  useEffect(() => {
    // Gera código automático quando categoria muda (só em modo criação)
    if (!isEdit && form.categoryId) {
      generateCode(form.categoryId);
    }
  }, [form.categoryId]);

  async function loadInitialData() {
    try {
      const [projRes, usersRes, classRes] = await Promise.all([
        projectsAPI.list(),
        usersAPI.list(),
        classificationAPI.list().catch(() => ({ data: { grouped: {} } })),
      ]);
      setProjects(projRes.data.projects);
      setUsers(usersRes.data.users);
      setClassifications(classRes.data || { grouped: {} });

      // Se não tem projeto selecionado, usa o primeiro
      if (!selectedProject && projRes.data.projects[0]) {
        setSelectedProject(projRes.data.projects[0].id);
      }
    } catch (e) { console.error(e); }
  }

  async function loadProjectCategories(projectId) {
    if (!projectId) { setCategories([]); return; }
    try {
      const { data } = await categoriesAPI.list(projectId);
      setCategories(data.categories || []);
    } catch { setCategories([]); }
  }

  async function loadActivity() {
    setLoading(true);
    try {
      const { data } = await activitiesAPI.get(id);
      const a = data.activity;
      setSelectedProject(a.category?.projectId || '');
      setForm({
        code:           a.code          || '',
        what:           a.what          || '',
        why:            a.why           || '',
        who:            a.who           || '',
        where:          a.where         || '',
        how:            a.how           || '',
        howMuch:        a.howMuch       != null ? String(a.howMuch)       : '',
        actualCost:     a.actualCost    != null ? String(a.actualCost)    : '',
        plannedHours:   a.plannedHours  != null ? String(a.plannedHours)  : '',
        actualHours:    a.actualHours   != null ? String(a.actualHours)   : '',
        whenStart:      a.whenStart     ? a.whenStart.slice(0, 10) : '',
        whenEnd:        a.whenEnd       ? a.whenEnd.slice(0, 10)   : '',
        status:         a.status        || 'PLANNED',
        risk:           a.risk          || '',
        riskProbability: a.riskProbability ? String(a.riskProbability) : '',
        riskImpact:      a.riskImpact      ? String(a.riskImpact)      : '',
        riskMitigation: a.riskMitigation  || '',
        notes:          a.notes         || '',
        categoryId:     a.categoryId    || '',
        responsibleId:  a.responsibleId || '',
      });
    } finally { setLoading(false); }
  }

  async function generateCode(categoryId) {
    if (!categoryId || isEdit) return;
    setGeneratingCode(true);
    try {
      const { data } = await activityNextCode(categoryId);
      setForm(f => ({ ...f, code: data.code }));
    } catch { /* mantém código atual */ } finally { setGeneratingCode(false); }
  }

  function set(field) { return e => setForm(prev => ({ ...prev, [field]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        howMuch:         form.howMuch      ? parseFloat(form.howMuch)      : null,
        actualCost:      form.actualCost   ? parseFloat(form.actualCost)   : null,
        plannedHours:    form.plannedHours ? parseFloat(form.plannedHours) : null,
        actualHours:     form.actualHours  ? parseFloat(form.actualHours)  : null,
        riskProbability: form.riskProbability ? parseInt(form.riskProbability) : null,
        riskImpact:      form.riskImpact      ? parseInt(form.riskImpact)      : null,
        whenStart:       form.whenStart || null,
        whenEnd:         form.whenEnd   || null,
        responsibleId:   form.responsibleId || null,
      };
      if (isEdit) await activitiesAPI.update(id, payload);
      else        await activitiesAPI.create(payload);
      navigate('/dashboard');
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? msgs.map(e => e.msg).join(' · ') : err.response?.data?.error || 'Erro ao salvar.');
    } finally { setSaving(false); }
  }

  const hasClassifications = Object.keys(classifications.grouped || {}).some(k => (classifications.grouped[k]?.length || 0) > 0);

  const cardStyle = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '24px 28px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
  const sectionTitle = { fontSize: '0.78rem', fontWeight: 700, color: '#F04E00', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 };

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={36} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} />
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>

        {/* Topbar */}
        <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: isMobile ? '12px 16px' : '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 64, position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/dashboard" className="btn btn-ghost btn-sm">
              <ArrowLeft size={14} /> Voltar
            </Link>
            <div>
              <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
                {isEdit ? 'Editar' : 'Nova'} Atividade
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Método 5W2H</p>
            </div>
          </div>
          <button type="submit" form="activity-form" disabled={saving} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <><Save size={15} /> {isEdit ? 'Salvar alterações' : 'Criar atividade'}</>}
          </button>
        </header>

        <div style={{ padding: isMobile ? 16 : '28px 32px', maxWidth: 900, margin: '0 auto' }}>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#DC2626', fontSize: '0.85rem', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          <form id="activity-form" onSubmit={handleSubmit}>

            {/* ── IDENTIFICAÇÃO ── */}
            <div style={cardStyle}>
              <div style={sectionTitle}>📋 Identificação</div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Projeto */}
                <div>
                  <FieldLabel label="Projeto" required />
                  <select className="input" value={selectedProject}
                    onChange={e => {
                      setSelectedProject(e.target.value);
                      setForm(f => ({ ...f, categoryId: '', code: '' }));
                    }}
                    style={{ border: '1.5px solid #E5E7EB' }}
                  >
                    <option value="">Selecione o projeto...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {/* Categoria — filtrada pelo projeto */}
                <div>
                  <FieldLabel label="Categoria" required />
                  <select className="input" value={form.categoryId} onChange={set('categoryId')} required
                    style={{ border: '1.5px solid #E5E7EB' }}
                  >
                    <option value="">Selecione a categoria...</option>
                    {categories.length > 0 ? (
                      categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                    ) : selectedProject ? (
                      <option disabled>Nenhuma categoria neste projeto</option>
                    ) : (
                      <option disabled>Selecione um projeto primeiro</option>
                    )}
                  </select>
                  {selectedProject && categories.length === 0 && (
                    <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>
                      Acesse o projeto e crie categorias antes de adicionar atividades.
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '140px 1fr 1fr', gap: 16 }}>
                {/* Código automático */}
                <div>
                  <FieldLabel label="Código" tooltip={TOOLTIPS.code} required />
                  <div style={{ position: 'relative' }}>
                    <input className="input" value={form.code} onChange={set('code')} placeholder="1.1" required
                      style={{ border: '1.5px solid #E5E7EB', paddingRight: generatingCode ? 36 : 14 }} />
                    {generatingCode && (
                      <Loader2 size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', animation: 'spin 1s linear infinite' }} />
                    )}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <FieldLabel label="Status" required />
                  <select className="input" value={form.status} onChange={set('status')} style={{ border: '1.5px solid #E5E7EB' }}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                {/* Responsável */}
                <div>
                  <FieldLabel label="Responsável (usuário)" />
                  <select className="input" value={form.responsibleId} onChange={set('responsibleId')} style={{ border: '1.5px solid #E5E7EB' }}>
                    <option value="">Nenhum</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Classificações do novo sistema — se disponíveis */}
              {hasClassifications && (
                <div style={{ marginTop: 16, padding: '14px 16px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
                    Classificações (opcional)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 12 }}>
                    {[
                      { key: 'STRATEGIC',      label: 'Categoria Estratégica', color: '#F04E00' },
                      { key: 'LEAN_OBJECTIVE', label: 'Objetivo Lean',          color: '#7C3AED' },
                      { key: 'AREA',           label: 'Área',                   color: '#2563EB' },
                    ].map(({ key, label, color }) => {
                      const items = classifications.grouped?.[key] || [];
                      if (!items.length) return null;
                      return (
                        <div key={key}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color, display: 'block', marginBottom: 5 }}>{label}</label>
                          <select className="input" value={form[`class_${key}`] || ''} onChange={e => setForm(f => ({ ...f, [`class_${key}`]: e.target.value }))} style={{ border: `1.5px solid ${color}44`, fontSize: '0.83rem' }}>
                            <option value="">Selecione...</option>
                            {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── 5W ── */}
            <div style={cardStyle}>
              <div style={sectionTitle}>5W — WHAT · WHY · WHO · WHERE · WHEN</div>

              <div style={{ marginBottom: 14 }}>
                <FieldLabel label="O quê (What)" tooltip={TOOLTIPS.what} required />
                <input className="input" value={form.what} onChange={set('what')} placeholder="Descreva a tarefa ou entrega esperada..." required style={{ border: '1.5px solid #E5E7EB' }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <FieldLabel label="Por quê (Why)" tooltip={TOOLTIPS.why} required />
                <textarea className="input" value={form.why} onChange={set('why')} placeholder="Justifique a importância desta atividade..." required rows={2} style={{ resize: 'vertical', border: '1.5px solid #E5E7EB' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 14 }}>
                <div>
                  <FieldLabel label="Quem (Who)" tooltip={TOOLTIPS.who} required />
                  <input className="input" value={form.who} onChange={set('who')} placeholder="Responsável pela execução" required style={{ border: '1.5px solid #E5E7EB' }} />
                </div>
                <div>
                  <FieldLabel label="Onde (Where)" tooltip={TOOLTIPS.where} required />
                  <input className="input" value={form.where} onChange={set('where')} placeholder="Local ou plataforma de execução" required style={{ border: '1.5px solid #E5E7EB' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <div>
                  <FieldLabel label="Data de início (When start)" tooltip={TOOLTIPS.whenStart} />
                  <input className="input" type="date" value={form.whenStart} onChange={set('whenStart')} style={{ border: '1.5px solid #E5E7EB' }} />
                </div>
                <div>
                  <FieldLabel label="Prazo / Data fim (When end)" tooltip={TOOLTIPS.whenEnd} />
                  <input className="input" type="date" value={form.whenEnd} onChange={set('whenEnd')} style={{ border: '1.5px solid #E5E7EB' }} />
                </div>
              </div>
            </div>

            {/* ── 2H ── */}
            <div style={cardStyle}>
              <div style={sectionTitle}>2H — HOW · HOW MUCH</div>

              <div style={{ marginBottom: 14 }}>
                <FieldLabel label="Como (How)" required />
                <textarea className="input" value={form.how} onChange={set('how')} placeholder="Descreva o método, processo ou ferramenta..." required rows={3} style={{ resize: 'vertical', border: '1.5px solid #E5E7EB' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 16 }}>
                <div>
                  <FieldLabel label="Custo estimado R$ (How Much)" tooltip={TOOLTIPS.howMuch} />
                  <input className="input" type="number" step="0.01" value={form.howMuch} onChange={set('howMuch')} placeholder="0,00" style={{ border: '1.5px solid #E5E7EB' }} />
                </div>
                <div>
                  <FieldLabel label="Custo realizado R$" />
                  <input className="input" type="number" step="0.01" value={form.actualCost} onChange={set('actualCost')} placeholder="0,00" style={{ border: '1.5px solid #E5E7EB' }} />
                </div>
                <div>
                  <FieldLabel label="Horas planejadas" />
                  <input className="input" type="number" step="0.5" value={form.plannedHours} onChange={set('plannedHours')} placeholder="Ex: 8" style={{ border: '1.5px solid #E5E7EB' }} />
                </div>
              </div>
            </div>

            {/* ── RISCO ── */}
            <div style={cardStyle}>
              <div style={sectionTitle}>⚠️ Risco e Mitigação</div>

              <div style={{ marginBottom: 14 }}>
                <FieldLabel label="Descrição do risco" tooltip={TOOLTIPS.risk} />
                <textarea className="input" value={form.risk} onChange={set('risk')} placeholder="Descreva o risco caso a atividade não seja concluída..." rows={2} style={{ resize: 'vertical', border: '1.5px solid #E5E7EB' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 2fr', gap: 16 }}>
                <div>
                  <FieldLabel label="Probabilidade (1-5)" />
                  <select className="input" value={form.riskProbability} onChange={set('riskProbability')} style={{ border: '1.5px solid #E5E7EB' }}>
                    <option value="">—</option>
                    <option value="1">1 — Muito baixa</option>
                    <option value="2">2 — Baixa</option>
                    <option value="3">3 — Média</option>
                    <option value="4">4 — Alta</option>
                    <option value="5">5 — Muito alta</option>
                  </select>
                </div>
                <div>
                  <FieldLabel label="Impacto (1-5)" />
                  <select className="input" value={form.riskImpact} onChange={set('riskImpact')} style={{ border: '1.5px solid #E5E7EB' }}>
                    <option value="">—</option>
                    <option value="1">1 — Desprezível</option>
                    <option value="2">2 — Menor</option>
                    <option value="3">3 — Moderado</option>
                    <option value="4">4 — Significativo</option>
                    <option value="5">5 — Catastrófico</option>
                  </select>
                </div>
                <div>
                  <FieldLabel label="Plano de mitigação" />
                  <input className="input" value={form.riskMitigation} onChange={set('riskMitigation')} placeholder="O que faremos para reduzir/evitar o risco?" style={{ border: '1.5px solid #E5E7EB' }} />
                </div>
              </div>
            </div>

            {/* ── Validação IA ── */}
            {!isEdit && (
              <div style={cardStyle}>
                <div style={sectionTitle}><Zap size={14} /> Validação Inteligente</div>
                <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: 12 }}>
                  Analise a qualidade dos campos 5W2H antes de salvar.
                </p>
                <button type="button" onClick={() => setShowAI(!showAI)} className="btn btn-ghost" style={{ fontSize: '0.82rem', marginBottom: showAI ? 12 : 0 }}>
                  <Zap size={14} /> {showAI ? 'Ocultar validação' : 'Validar com IA'}
                </button>
                {showAI && <AIValidator activity={form} />}
              </div>
            )}

            {/* Notas */}
            <div style={cardStyle}>
              <div style={sectionTitle}>📝 Observações</div>
              <textarea className="input" value={form.notes} onChange={set('notes')} placeholder="Observações adicionais..." rows={3} style={{ resize: 'vertical', border: '1.5px solid #E5E7EB' }} />
            </div>

            {/* Botão mobile */}
            {isMobile && (
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 20 }}>
                {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <><Save size={15} /> {isEdit ? 'Salvar alterações' : 'Criar atividade'}</>}
              </button>
            )}

          </form>
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
