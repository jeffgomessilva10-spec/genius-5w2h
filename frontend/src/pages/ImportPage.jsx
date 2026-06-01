/**
 * ImportPage.jsx — Importação de projetos via Excel/CSV com preview.
 * Fluxo: 1) Upload → 2) Preview e ajuste → 3) Confirmar importação
 */
import { useState, useRef } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { useIsMobile } from '../hooks/useIsMobile';
import api from '../services/api';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Loader2, ChevronDown, ChevronUp, Eye, Tag, Calendar,
  DollarSign, User, ArrowRight, RefreshCw,
} from 'lucide-react';

const STATUS_COLOR = { PLANNED:'#6B7280', IN_PROGRESS:'#2563EB', DELAYED:'#DC2626', DONE:'#16A34A' };
const STATUS_LABEL = { PLANNED:'Planejado', IN_PROGRESS:'Em andamento', DELAYED:'Atrasado', DONE:'Finalizado' };

const STEPS = [
  { n:1, label:'Selecionar arquivo' },
  { n:2, label:'Revisar dados'      },
  { n:3, label:'Importar'           },
];

export default function ImportPage() {
  const isMobile  = useIsMobile();
  const fileRef   = useRef(null);

  const [step,        setStep]        = useState(1);
  const [file,        setFile]        = useState(null);
  const [projectName, setProjectName] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [preview,     setPreview]     = useState(null);  // dados do preview
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState('');
  const [showFmt,     setShowFmt]     = useState(false);
  const [showAll,     setShowAll]     = useState(false);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setProjectName(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    setStep(2);
    setError('');
    setPreview(null);
    setResult(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setProjectName(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')); setStep(2); }
  }

  // Step 2: busca preview sem salvar
  async function handlePreview() {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('projectName', projectName.trim());
      const { data } = await api.post('/import/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      setPreview(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao processar o arquivo. Verifique o formato.');
    } finally { setLoading(false); }
  }

  // Step 3: importa de fato
  async function handleImport() {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('projectName', projectName.trim());
      const { data } = await api.post('/import/project', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setResult(data);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao importar. Verifique o arquivo e tente novamente.');
    } finally { setLoading(false); }
  }

  function reset() {
    setStep(1); setFile(null); setProjectName('');
    setPreview(null); setResult(null); setError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  const fmtBytes = b => b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;
  const fmtDate  = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  // Atividades do preview (com e sem datas)
  const withDates    = preview?.preview?.filter(p => p.type === 'activity' && p.whenStart) || [];
  const withoutDates = preview?.preview?.filter(p => p.type === 'activity' && !p.whenStart) || [];

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#F3F4F6' }}>
      <Sidebar />
      <main id="main-content" style={{ flex:1, overflowY:'auto' }}>

        {/* Topbar */}
        <header style={{ background:'#fff', borderBottom:'1px solid #E5E7EB', padding: isMobile ? '12px 16px' : '0 32px', display:'flex', alignItems:'center', height:64, position:'sticky', top:0, zIndex:10 }}>
          <div>
            <h1 style={{ fontSize:'1rem', fontWeight:700, color:'#111827' }}>Importar Projeto</h1>
            <p style={{ fontSize:'0.78rem', color:'#9CA3AF' }}>Carregue um arquivo Excel com o plano de ação 5W2H</p>
          </div>
        </header>

        <div style={{ padding: isMobile ? 16 : '28px 32px', maxWidth:760, margin:'0 auto' }}>

          {/* Steps */}
          <div style={{ display:'flex', alignItems:'center', marginBottom:28 }}>
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length-1 ? 1 : 0 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.85rem', background: step > s.n ? '#16A34A' : step === s.n ? '#F04E00' : '#E5E7EB', color: step >= s.n ? '#fff' : '#9CA3AF', transition:'all 0.2s' }}>
                    {step > s.n ? <CheckCircle2 size={16} /> : s.n}
                  </div>
                  {!isMobile && <span style={{ fontSize:'0.7rem', color: step >= s.n ? '#F04E00' : '#9CA3AF', fontWeight: step === s.n ? 700 : 400, whiteSpace:'nowrap' }}>{s.label}</span>}
                </div>
                {i < STEPS.length-1 && <div style={{ flex:1, height:2, background: step > s.n ? '#16A34A' : '#E5E7EB', margin:'0 8px', marginBottom: isMobile ? 0 : 20, transition:'background 0.3s' }} />}
              </div>
            ))}
          </div>

          {/* Formato esperado */}
          <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:12, padding:'12px 16px', marginBottom:20 }}>
            <button onClick={() => setShowFmt(!showFmt)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, width:'100%', textAlign:'left', color:'#1D4ED8', fontWeight:600, fontSize:'0.85rem' }}>
              📋 Formato esperado da planilha {showFmt ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
            {showFmt && (
              <div style={{ marginTop:10, fontSize:'0.78rem', color:'#1D4ED8' }}>
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:4, marginBottom:8 }}>
                  {[
                    ['Coluna #', 'Código: "1" = categoria, "1.1" = atividade'],
                    ['WHAT',     'O Quê — descrição da tarefa (obrigatório)'],
                    ['WHY',      'Por Quê — justificativa'],
                    ['WHO',      'Quem — responsável'],
                    ['WHERE',    'Onde — local/ambiente'],
                    ['HOW',      'Como — método/processo'],
                    ['HOW MUCH', 'Quanto — custo estimado (R$)'],
                    ['WHEN/datas', 'Data início e fim, ou colunas de semana (Sem.1, Sem.2...)'],
                    ['STATUS',   'Planejado / Em andamento / Atrasado / Finalizado'],
                  ].map(([col, desc]) => (
                    <div key={col} style={{ background:'#fff', borderRadius:6, padding:'4px 8px', fontSize:'0.75rem' }}>
                      <strong>{col}:</strong> {desc}
                    </div>
                  ))}
                </div>
                <p style={{ color:'#3B82F6', fontSize:'0.72rem' }}>
                  💡 O cabeçalho é detectado automaticamente. Funciona com qualquer planilha que tenha colunas WHAT, WHY, WHO, WHERE, HOW.
                </p>
              </div>
            )}
          </div>

          {/* Erro */}
          {error && (
            <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'flex-start', gap:10, color:'#DC2626', fontSize:'0.85rem' }}>
              <AlertTriangle size={16} style={{ flexShrink:0, marginTop:2 }} />
              <div>
                <strong>Erro:</strong> {error}
                {error.includes('Rota') && (
                  <div style={{ marginTop:6, fontSize:'0.78rem', color:'#9CA3AF' }}>
                    O sistema está sendo atualizado. Aguarde alguns minutos e tente novamente.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 1: Upload ── */}
          {step === 1 && (
            <div onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={() => fileRef.current?.click()}
              style={{ border:'2px dashed #E5E7EB', borderRadius:16, padding: isMobile ? '40px 20px' : '60px 40px', textAlign:'center', cursor:'pointer', background:'#fff', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#F04E00'; e.currentTarget.style.background='#FFF3EE'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#E5E7EB'; e.currentTarget.style.background='#fff'; }}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xlsm,.xls,.csv" onChange={handleFileChange} style={{ display:'none' }} />
              <FileSpreadsheet size={48} style={{ color:'#D1D5DB', marginBottom:16 }} />
              <p style={{ fontWeight:700, fontSize:'1rem', color:'#374151', marginBottom:8 }}>
                Arraste o arquivo ou clique para selecionar
              </p>
              <p style={{ fontSize:'0.82rem', color:'#9CA3AF' }}>
                .xlsx, .xlsm, .xls, .csv — máx. 10 MB
              </p>
            </div>
          )}

          {/* ── STEP 2: Preview e ajuste ── */}
          {step === 2 && file && (
            <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'24px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>

              {/* Info arquivo */}
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#F0FDF4', borderRadius:10, marginBottom:20, border:'1px solid #BBF7D0' }}>
                <FileSpreadsheet size={24} style={{ color:'#16A34A', flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:'0.9rem', color:'#166534', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.name}</div>
                  <div style={{ fontSize:'0.75rem', color:'#16A34A' }}>{fmtBytes(file.size)}</div>
                </div>
                <CheckCircle2 size={20} style={{ color:'#16A34A', flexShrink:0 }} />
              </div>

              {/* Nome do projeto */}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:'0.82rem', fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Nome do projeto</label>
                <input className="input" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Nome do projeto (vazio = usa nome da aba)" style={{ border:'1.5px solid #E5E7EB' }} />
              </div>

              {/* Botão de preview */}
              {!preview && (
                <button onClick={handlePreview} disabled={loading} className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', marginBottom:16 }}>
                  {loading ? <><Loader2 size={15} style={{ animation:'spin 1s linear infinite' }} /> Analisando planilha...</> : <><Eye size={15} /> Analisar e pré-visualizar dados</>}
                </button>
              )}

              {/* Preview dos dados */}
              {preview && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontWeight:700, fontSize:'0.88rem', color:'#111827', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
                    <Eye size={15} style={{ color:'#F04E00' }} /> Pré-visualização dos dados
                    <button onClick={() => setPreview(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:'0.72rem', color:'#9CA3AF' }}>
                      <RefreshCw size={12} /> Reanalisar
                    </button>
                  </div>

                  {/* Resumo */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
                    {[
                      { icon:<Tag size={14}/>,      label:'Categorias',  value: preview.categories, color:'#2563EB' },
                      { icon:<FileSpreadsheet size={14}/>, label:'Atividades', value: preview.activities, color:'#F04E00' },
                      { icon:<Calendar size={14}/>, label:'Com datas',   value: withDates.length,   color:'#16A34A' },
                    ].map(item => (
                      <div key={item.label} style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:10, padding:'10px 14px', textAlign:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:'0.68rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', marginBottom:5 }}>{item.icon} {item.label}</div>
                        <div style={{ fontSize:'1.6rem', fontWeight:800, color:item.color }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Categorias detectadas */}
                  {preview.categoriesList?.length > 0 && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', marginBottom:6 }}>Categorias detectadas</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {preview.categoriesList.map(c => (
                          <span key={c.code} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:99, background:`${c.color}18`, border:`1px solid ${c.color}44`, fontSize:'0.78rem', fontWeight:600, color:c.color }}>
                            <span style={{ width:8, height:8, borderRadius:'50%', background:c.color, flexShrink:0 }} />
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Amostra de atividades */}
                  <div style={{ border:'1px solid #E5E7EB', borderRadius:10, overflow:'hidden' }}>
                    <div style={{ padding:'8px 14px', background:'#F9FAFB', borderBottom:'1px solid #E5E7EB', fontSize:'0.72rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase' }}>
                      Amostra das atividades
                    </div>
                    {(showAll ? preview.preview.filter(p => p.type === 'activity') : preview.activitiesSample || []).map((act, i) => (
                      <div key={i} style={{ padding:'10px 14px', borderBottom:'1px solid #F3F4F6', display:'flex', gap:10, alignItems:'flex-start' }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:STATUS_COLOR[act.status] || '#9CA3AF', flexShrink:0, marginTop:6 }} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:'0.82rem', color:'#111827' }}>
                            {act.code} — {act.what}
                          </div>
                          <div style={{ display:'flex', gap:10, marginTop:3, flexWrap:'wrap' }}>
                            <span style={{ fontSize:'0.7rem', fontWeight:700, padding:'1px 7px', borderRadius:99, background:`${STATUS_COLOR[act.status]}15`, color:STATUS_COLOR[act.status] }}>
                              {STATUS_LABEL[act.status]}
                            </span>
                            {act.who && <span style={{ fontSize:'0.7rem', color:'#6B7280' }}>👤 {act.who}</span>}
                            {act.whenStart && <span style={{ fontSize:'0.7rem', color:'#6B7280' }}>📅 {fmtDate(act.whenStart)} → {fmtDate(act.whenEnd)}</span>}
                            {act.howMuch > 0 && <span style={{ fontSize:'0.7rem', color:'#16A34A' }}>💰 R$ {Number(act.howMuch).toLocaleString('pt-BR')}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {preview.activities > 5 && (
                      <button onClick={() => setShowAll(!showAll)} style={{ width:'100%', padding:'8px', background:'none', border:'none', cursor:'pointer', fontSize:'0.78rem', color:'#9CA3AF', borderTop:'1px solid #F3F4F6' }}>
                        {showAll ? '▲ Mostrar menos' : `▼ Ver todas as ${preview.activities} atividades`}
                      </button>
                    )}
                  </div>

                  {/* Aviso sobre atividades sem data */}
                  {withoutDates.length > 0 && (
                    <div style={{ marginTop:12, padding:'10px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, fontSize:'0.78rem', color:'#D97706' }}>
                      <strong>⚠️ {withoutDates.length} atividade(s) sem datas</strong> — Serão importadas sem datas e aparecerão na lista mas não no Gantt. Você pode editar as datas depois.
                    </div>
                  )}
                </div>
              )}

              {/* Botões */}
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <button onClick={reset} className="btn btn-ghost" style={{ flex: isMobile ? 1 : 'none' }}>← Trocar arquivo</button>
                {preview && (
                  <button onClick={handleImport} disabled={loading} className="btn btn-primary" style={{ flex: isMobile ? 1 : 'none', justifyContent:'center' }}>
                    {loading ? <><Loader2 size={15} style={{ animation:'spin 1s linear infinite' }} /> Importando...</> : <><ArrowRight size={15} /> Confirmar importação</>}
                  </button>
                )}
                {!preview && !loading && (
                  <button onClick={handleImport} disabled={loading} className="btn btn-ghost" style={{ flex: isMobile ? 1 : 'none', justifyContent:'center', fontSize:'0.8rem' }}>
                    Importar sem pré-visualizar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: Resultado ── */}
          {step === 3 && result && (
            <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'28px 32px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
                <div style={{ width:48, height:48, borderRadius:'50%', background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <CheckCircle2 size={24} style={{ color:'#16A34A' }} />
                </div>
                <div>
                  <h2 style={{ fontWeight:800, fontSize:'1.1rem', color:'#111827' }}>Importação concluída!</h2>
                  <p style={{ fontSize:'0.82rem', color:'#6B7280', marginTop:2 }}>{result.message}</p>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
                {[
                  { label:'Projeto', value: result.project?.name, color:'#F04E00' },
                  { label:'Categorias', value: result.stats?.categories, color:'#2563EB' },
                  { label:'Atividades', value: result.stats?.activities, color:'#16A34A' },
                ].map(item => (
                  <div key={item.label} style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                    <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', marginBottom:6 }}>{item.label}</div>
                    <div style={{ fontSize: item.label === 'Projeto' ? '0.82rem' : '1.6rem', fontWeight:800, color:item.color, lineHeight:1.2 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ padding:'12px 16px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, fontSize:'0.82rem', color:'#1D4ED8', marginBottom:20 }}>
                💡 <strong>Próximos passos:</strong> Acesse o projeto e verifique as atividades. As atividades sem datas podem ser editadas para aparecer no Gantt. Se necessário, ajuste as categorias em <strong>Projetos → Ver projeto</strong>.
              </div>

              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <a href="/projects" className="btn btn-primary" style={{ textDecoration:'none', flex: isMobile ? 1 : 'none', justifyContent:'center' }}>
                  Ver projetos
                </a>
                <a href="/gantt" className="btn btn-ghost" style={{ textDecoration:'none', flex: isMobile ? 1 : 'none', justifyContent:'center' }}>
                  Abrir Gantt
                </a>
                <button onClick={reset} className="btn btn-ghost" style={{ flex: isMobile ? '1 1 100%' : 'none' }}>
                  Importar outro arquivo
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
