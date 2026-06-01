// src/pages/ActivityForm.jsx – Formulário completo 5W2H
// Categorias baseadas no sistema de classificações padrão (sistema-wide)
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { activitiesAPI, categoriesAPI, usersAPI, projectsAPI } from '../services/api';
import api from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import { useIsMobile } from '../hooks/useIsMobile';
import { ArrowLeft, Save, Loader2, HelpCircle, Zap } from 'lucide-react';
import AIValidator from '../components/ui/AIValidator';

// ── Categorias padrão do sistema (gerenciadas em Configurações → Categorias) ──
// Estas são as opções padrão que aparecem para TODOS os projetos.
// O admin pode customizar via /category-settings.
const DEFAULT_CATEGORIES = [
  { type: 'STRATEGIC', name: 'Estratégico'  },
  { type: 'STRATEGIC', name: 'Projeto'      },
  { type: 'STRATEGIC', name: 'Processo'     },
  { type: 'STRATEGIC', name: 'Operacional'  },
];

const LEAN_OBJECTIVES = [
  'Valor', 'Automação', 'Redução de Custo', 'Redução de Tempo',
  'Padronização', 'Controle', 'Inovação',
];

const AREAS = [
  'Comercial', 'Marketing', 'RH', 'Financeiro',
  'Operações', 'Tecnologia', 'Diretoria',
];

const STATUS_OPTIONS = [
  { value: 'PLANNED',     label: 'Planejado'    },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'DELAYED',     label: 'Atrasado'     },
  { value: 'DONE',        label: 'Finalizado'   },
];

const TOOLTIPS = {
  code:     'Código gerado automaticamente. Formato: X.Y (ex.: 1.3, 2.1)',
  what:     'Descreva claramente a tarefa ou entrega esperada',
  why:      'Justifique a importância e o benefício desta atividade',
  who:      'Indique o responsável pela execução (pessoa ou função)',
  where:    'Local ou plataforma de execução (remoto, escritório, sistema X)',
  how:      'Descreva o método, processo ou ferramenta a utilizar',
  howMuch:  'Custo estimado em reais (opcional)',
  whenEnd:  'Data prevista de conclusão / prazo',
  risk:     'Consequência ou impacto caso a atividade não seja concluída',
};

function FieldLabel({ label, tooltip, required }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <label style={{ fontSize: '0.83rem', color: '#374151', fontWeight: 600 }}>
        {label}{required && <span style={{ color: '#F04E00' }}>*</span>}
      </label>
      {tooltip && <span title={tooltip} style={{ cursor: 'help', color: '#9CA3AF' }}><HelpCircle size={13} /></span>}
    </div>
  );
}

const EMPTY = {
  code: '', what: '', why: '', who: '', where: '', how: '',
  howMuch: '', actualCost: '', plannedHours: '',
  whenStart: '', whenEnd: '',
  status: 'PLANNED', risk: '', riskProbability: '', riskImpact: '', riskMitigation: '', notes: '',
  categoryId: '',       // ID da categoria no projeto (gerado automaticamente)
  categoryName: '',     // Nome da categoria selecionada (ex: "Estratégico")
  leanObjective: '',    // Objetivo Lean
  area: '',             // Área
  responsibleId: '',
};

export default function ActivityForm() {
  const { id }         = useParams();
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const isMobile       = useIsMobile();
  const isEdit         = Boolean(id);

  const urlProjectId   = searchParams.get('projectId') || '';

  const [form,           setForm]           = useState({ ...EMPTY });
  const [projects,       setProjects]       = useState([]);
  const [selectedProject,setSelectedProject]= useState(urlProjectId);
  const [projectCats,    setProjectCats]    = useState([]); // categorias existentes no projeto
  const [customCats,     setCustomCats]     = useState([]); // categorias customizadas do sistema
  const [users,          setUsers]          = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [showAI,         setShowAI]         = useState(false);

  useEffect(() => { loadInitialData(); if (isEdit) loadActivity(); }, []);
  useEffect(() => { if (selectedProject) loadProjectCats(); }, [selectedProject]);
  useEffect(() => { if (!isEdit && form.categoryName && selectedProject) generateCode(); }, [form.categoryName]);

  async function loadInitialData() {
    try {
      const [projRes, usersRes] = await Promise.all([projectsAPI.list(), usersAPI.list()]);
      setProjects(projRes.data.projects);
      setUsers(usersRes.data.users);
      if (!selectedProject && projRes.data.projects[0]) {
        setSelectedProject(projRes.data.projects[0].id);
      }
      // Tenta carregar classificações customizadas do servidor
      try {
        const clsRes = await api.get('/classifications?type=STRATEGIC');
        const items = clsRes.data.classifications || [];
        if (items.length > 0) setCustomCats(items.map(i => i.name));
      } catch {}
    } catch (e) { console.error(e); }
  }

  async function loadProjectCats() {
    if (!selectedProject) return;
    try {
      const { data } = await categoriesAPI.list(selectedProject);
      setProjectCats(data.categories || []);
    } catch { setProjectCats([]); }
  }

  async function loadActivity() {
    setLoading(true);
    try {
      const { data } = await activitiesAPI.get(id);
      const a = data.activity;
      setSelectedProject(a.category?.projectId || '');
      const catName = a.category?.name || '';
      setForm({
        code:           a.code         || '',
        what:           a.what         || '',
        why:            a.why          || '',
        who:            a.who          || '',
        where:          a.where        || '',
        how:            a.how          || '',
        howMuch:        a.howMuch      != null ? String(a.howMuch)       : '',
        actualCost:     a.actualCost   != null ? String(a.actualCost)    : '',
        plannedHours:   a.plannedHours != null ? String(a.plannedHours)  : '',
        whenStart:      a.whenStart    ? a.whenStart.slice(0, 10) : '',
        whenEnd:        a.whenEnd      ? a.whenEnd.slice(0, 10)   : '',
        status:         a.status       || 'PLANNED',
        risk:           a.risk         || '',
        riskProbability: a.riskProbability ? String(a.riskProbability) : '',
        riskImpact:      a.riskImpact      ? String(a.riskImpact)      : '',
        riskMitigation: a.riskMitigation  || '',
        notes:          a.notes        || '',
        categoryId:     a.categoryId   || '',
        categoryName:   catName,
        leanObjective:  '',
        area:           '',
        responsibleId:  a.responsibleId|| '',
      });
    } finally { setLoading(false); }
  }

  async function generateCode() {
    // Encontra a categoria no projeto com o nome selecionado
    const existing = projectCats.find(c => c.name === form.categoryName);
    const catId = existing?.id;
    if (!catId) return;

    setGeneratingCode(true);
    try {
      const { data } = await api.get(`/activities/next-code?categoryId=${catId}`);
      setForm(f => ({ ...f, code: data.code, categoryId: catId }));
    } catch {} finally { setGeneratingCode(false); }
  }

  /**
   * Encontra ou cria a categoria pelo nome no projeto selecionado.
   * Garante que a categoria do sistema esteja disponível no projeto.
   */
  async function ensureCategory(projectId, categoryName) {
    // 1. Verifica se já existe no projeto
    let cat = projectCats.find(c => c.name === categoryName);
    if (cat) return cat.id;

    // 2. Não existe → cria a categoria no projeto
    const { data } = await api.post('/categories', {
      name: categoryName,
      description: `Categoria ${categoryName}`,
      color: getCategoryColor(categoryName),
      projectId,
    });
    // Atualiza lista local
    setProjectCats(prev => [...prev, data.category]);
    return data.category.id;
  }

  function getCategoryColor(name) {
    const colors = {
      'Estratégico':  '#F04E00',
      'Projeto':      '#2563EB',
      'Processo':     '#7C3AED',
      'Operacional':  '#16A34A',
    };
    return colors[name] || '#9CA3AF';
  }

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.categoryName) { setError('Selecione uma categoria.'); return; }
    if (!selectedProject)   { setError('Selecione um projeto.'); return; }

    setSaving(true);
    try {
      // Garante que a categoria existe no projeto
      const catId = await ensureCategory(selectedProject, form.categoryName);

      // Recalcula o código se necessário
      let code = form.code;
      if (!code) {
        try {
          const { data: cd } = await api.get(`/activities/next-code?categoryId=${catId}`);
          code = cd.code;
        } catch { code = '1.1'; }
      }

      const payload = {
        code,
        what:          form.what,
        why:           form.why,
        who:           form.who,
        where:         form.where,
        how:           form.how,
        howMuch:       form.howMuch      ? parseFloat(form.howMuch)      : null,
        actualCost:    form.actualCost   ? parseFloat(form.actualCost)   : null,
        plannedHours:  form.plannedHours ? parseFloat(form.plannedHours) : null,
        riskProbability: form.riskProbability ? parseInt(form.riskProbability) : null,
        riskImpact:      form.riskImpact      ? parseInt(form.riskImpact)      : null,
        riskMitigation: form.riskMitigation || null,
        whenStart:     form.whenStart || null,
        whenEnd:       form.whenEnd   || null,
        status:        form.status,
        risk:          form.risk      || null,
        notes:         form.notes     || null,
        categoryId:    catId,
        responsibleId: form.responsibleId || null,
      };

      if (isEdit) await activitiesAPI.update(id, payload);
      else        await activitiesAPI.create(payload);

      navigate('/dashboard');
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? msgs.map(e => e.msg).join(' · ') : err.response?.data?.error || 'Erro ao salvar.');
    } finally { setSaving(false); }
  }

  // Lista final de categorias: customizadas do servidor + defaults + outras do projeto
  const systemCategoryNames = customCats.length > 0
    ? customCats
    : DEFAULT_CATEGORIES.map(c => c.name);

  // Inclui categorias do projeto que NÃO estão no sistema (legado)
  const legacyCats = projectCats.filter(c => !systemCategoryNames.includes(c.name));

  const cardStyle = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '24px 28px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
  const sectionTitle = { fontSize: '0.78rem', fontWeight: 700, color: '#F04E00', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 };

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
        <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: isMobile ? '12px 16px' : '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 64, position: 'sticky', top: 0, zIndex: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/dashboard" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Voltar</Link>
            <div>
              <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{isEdit ? 'Editar' : 'Nova'} Atividade</h1>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Método 5W2H</p>
            </div>
          </div>
          {!isMobile && (
            <button type="submit" form="activity-form" disabled={saving} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <><Save size={15} /> {isEdit ? 'Salvar alterações' : 'Criar atividade'}</>}
            </button>
          )}
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

              {/* Projeto */}
              <div style={{ marginBottom: 16 }}>
                <FieldLabel label="Projeto" required />
                <select className="input" value={selectedProject}
                  onChange={e => {
                    setSelectedProject(e.target.value);
                    setForm(f => ({ ...f, categoryName: '', categoryId: '', code: '' }));
                  }}
                  style={{ border: '1.5px solid #E5E7EB' }}
                >
                  <option value="">Selecione o projeto...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Categoria — Estratégica (sistema padrão) */}
              <div style={{ marginBottom: 16 }}>
                <FieldLabel label="Categoria Estratégica" required />
                <select className="input" value={form.categoryName}
                  onChange={e => setForm(f => ({ ...f, categoryName: e.target.value, categoryId: '', code: '' }))}
                  style={{ border: '1.5px solid #E5E7EB' }}
                  required
                >
                  <option value="">Selecione a categoria...</option>

                  {/* Categorias do sistema padrão */}
                  <optgroup label="── Categorias Padrão ──">
                    {systemCategoryNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </optgroup>

                  {/* Categorias legadas do projeto (se houver) */}
                  {legacyCats.length > 0 && (
                    <optgroup label="── Categorias do Projeto ──">
                      {legacyCats.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {/* Indicador de categoria nova (será criada automaticamente) */}
                {form.categoryName && !projectCats.find(c => c.name === form.categoryName) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: '0.72rem', color: '#2563EB' }}>
                    <span>✨</span>
                    <span>A categoria <strong>"{form.categoryName}"</strong> será criada automaticamente neste projeto.</span>
                  </div>
                )}
              </div>

              {/* Objetivo Lean + Área */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <FieldLabel label="Objetivo Lean" />
                  <select className="input" value={form.leanObjective} onChange={set('leanObjective')} style={{ border: '1.5px solid #E5E7EB', color: form.leanObjective ? '#374151' : '#9CA3AF' }}>
                    <option value="">Selecione o objetivo...</option>
                    {LEAN_OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel label="Área" />
                  <select className="input" value={form.area} onChange={set('area')} style={{ border: '1.5px solid #E5E7EB', color: form.area ? '#374151' : '#9CA3AF' }}>
                    <option value="">Selecione a área...</option>
                    {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              {/* Código + Status + Responsável */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '130px 1fr 1fr', gap: 16 }}>
                <div>
                  <FieldLabel label="Código" tooltip={TOOLTIPS.code} required />
                  <div style={{ position: 'relative' }}>
                    <input className="input" value={form.code} onChange={set('code')} placeholder="1.1" required
                      style={{ border: '1.5px solid #E5E7EB', paddingRight: generatingCode ? 36 : 14 }} />
                    {generatingCode && <Loader2 size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', animation: 'spin 1s linear infinite' }} />}
                  </div>
                </div>
                <div>
                  <FieldLabel label="Status" required />
                  <select className="input" value={form.status} onChange={set('status')} style={{ border: '1.5px solid #E5E7EB' }}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel label="Responsável (usuário)" />
                  <select className="input" value={form.responsibleId} onChange={set('responsibleId')} style={{ border: '1.5px solid #E5E7EB' }}>
                    <option value="">Nenhum</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* ── 5W ── */}
            <div style={cardStyle}>
              <div style={sectionTitle}>5W — What · Why · Who · Where · When</div>

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
                  <FieldLabel label="Data de início" />
                  <input className="input" type="date" value={form.whenStart} onChange={set('whenStart')} style={{ border: '1.5px solid #E5E7EB' }} />
                </div>
                <div>
                  <FieldLabel label="Prazo / Data fim" tooltip={TOOLTIPS.whenEnd} />
                  <input className="input" type="date" value={form.whenEnd} onChange={set('whenEnd')} style={{ border: '1.5px solid #E5E7EB' }} />
                </div>
              </div>
            </div>

            {/* ── 2H ── */}
            <div style={cardStyle}>
              <div style={sectionTitle}>2H — How · How Much</div>

              <div style={{ marginBottom: 14 }}>
                <FieldLabel label="Como (How)" required />
                <textarea className="input" value={form.how} onChange={set('how')} placeholder="Descreva o método, processo ou ferramenta..." required rows={3} style={{ resize: 'vertical', border: '1.5px solid #E5E7EB' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 16 }}>
                <div>
                  <FieldLabel label="Custo estimado R$" tooltip={TOOLTIPS.howMuch} />
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
                <textarea className="input" value={form.risk} onChange={set('risk')} placeholder="Descreva o risco caso não concluída no prazo..." rows={2} style={{ resize: 'vertical', border: '1.5px solid #E5E7EB' }} />
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
                  <input className="input" value={form.riskMitigation} onChange={set('riskMitigation')} placeholder="O que faremos para reduzir o risco?" style={{ border: '1.5px solid #E5E7EB' }} />
                </div>
              </div>
            </div>

            {/* ── Validação IA ── */}
            {!isEdit && (
              <div style={cardStyle}>
                <div style={sectionTitle}><Zap size={14} style={{ display:'inline', marginRight:6 }} />Validação Inteligente</div>
                <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: 12 }}>Analise a qualidade dos campos 5W2H antes de salvar.</p>
                <button type="button" onClick={() => setShowAI(!showAI)} className="btn btn-ghost" style={{ fontSize: '0.82rem', marginBottom: showAI ? 12 : 0 }}>
                  <Zap size={14} /> {showAI ? 'Ocultar' : 'Validar com IA'}
                </button>
                {showAI && <AIValidator activity={form} />}
              </div>
            )}

            {/* Notas + Botão mobile */}
            <div style={cardStyle}>
              <div style={sectionTitle}>📝 Observações</div>
              <textarea className="input" value={form.notes} onChange={set('notes')} placeholder="Observações adicionais..." rows={3} style={{ resize: 'vertical', border: '1.5px solid #E5E7EB' }} />
            </div>

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
