/**
 * ImportPage.jsx — Importação de projetos via Excel/CSV.
 * Suporta: .xlsx, .xlsm, .xls, .csv
 */
import { useState, useRef } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { useIsMobile } from '../hooks/useIsMobile';
import api from '../services/api';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Loader2, Info, Download, ChevronDown, ChevronUp
} from 'lucide-react';

const STEPS = [
  { n: 1, label: 'Selecionar arquivo' },
  { n: 2, label: 'Configurar projeto' },
  { n: 3, label: 'Importar' },
];

export default function ImportPage() {
  const isMobile = useIsMobile();
  const fileRef  = useRef(null);

  const [step,        setStep]        = useState(1);
  const [file,        setFile]        = useState(null);
  const [projectName, setProjectName] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState('');
  const [showFormat,  setShowFormat]  = useState(false);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setProjectName(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    setStep(2);
    setError('');
    setResult(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setProjectName(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
      setStep(2);
    }
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true); setError(''); setResult(null); setStep(3);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectName', projectName.trim() || file.name);

      const { data } = await api.post('/import/project', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Erro ao importar. Verifique o arquivo.';
      setError(msg);
      setStep(2);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(1); setFile(null); setProjectName('');
    setResult(null); setError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  const fmtBytes = (b) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(1)}MB`;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />
      <main id="main-content" style={{ flex: 1, overflowY: 'auto' }}>

        {/* Topbar */}
        <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', display: 'flex', alignItems: 'center', height: 64, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Importar Projeto</h1>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Carregue um arquivo Excel com o plano de ação 5W2H</p>
          </div>
        </header>

        <div style={{ padding: isMobile ? 16 : '28px 32px', maxWidth: 720, margin: '0 auto' }}>

          {/* Steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.85rem',
                    background: step >= s.n ? '#F04E00' : '#E5E7EB',
                    color: step >= s.n ? '#fff' : '#9CA3AF',
                  }}>
                    {step > s.n ? <CheckCircle2 size={16} /> : s.n}
                  </div>
                  {!isMobile && <span style={{ fontSize: '0.72rem', color: step >= s.n ? '#F04E00' : '#9CA3AF', fontWeight: step === s.n ? 700 : 400, whiteSpace: 'nowrap' }}>{s.label}</span>}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: step > s.n ? '#F04E00' : '#E5E7EB', margin: '0 8px', marginBottom: isMobile ? 0 : 20 }} />
                )}
              </div>
            ))}
          </div>

          {/* Formato esperado */}
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
            <button onClick={() => setShowFormat(!showFormat)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', color: '#1D4ED8', fontWeight: 600, fontSize: '0.85rem' }}>
              <Info size={15} />
              Formato esperado da planilha
              {showFormat ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showFormat && (
              <div style={{ marginTop: 10, fontSize: '0.8rem', color: '#1D4ED8', lineHeight: 1.7 }}>
                <strong>Colunas recomendadas:</strong>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 4, marginTop: 6 }}>
                  {[
                    ['A — #', 'Código: "1" = categoria, "1.1" = atividade'],
                    ['B — WHAT', 'O Quê (obrigatório)'],
                    ['C — WHY', 'Por Quê'],
                    ['D — WHO', 'Quem'],
                    ['E — WHERE', 'Onde'],
                    ['F — HOW', 'Como'],
                    ['G — HOW MUCH', 'Custo estimado (R$)'],
                    ['H — WHEN', 'Data início (dd/mm/aaaa)'],
                    ['I — WHEN END', 'Data término'],
                  ].map(([col, desc]) => (
                    <div key={col} style={{ background: '#fff', borderRadius: 6, padding: '4px 8px' }}>
                      <strong>{col}:</strong> {desc}
                    </div>
                  ))}
                </div>
                <p style={{ marginTop: 8, color: '#3B82F6' }}>
                  💡 O cabeçalho é detectado automaticamente. Não precisa ser exatamente na linha 1.
                </p>
              </div>
            )}
          </div>

          {/* Step 1: Upload */}
          {step === 1 && (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed #E5E7EB', borderRadius: 16,
                padding: isMobile ? '40px 20px' : '60px 40px',
                textAlign: 'center', cursor: 'pointer', background: '#fff',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#F04E00'; e.currentTarget.style.background = '#FFF3EE'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#fff'; }}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xlsm,.xls,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
              <FileSpreadsheet size={48} style={{ color: '#D1D5DB', marginBottom: 16 }} />
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#374151', marginBottom: 8 }}>
                Arraste o arquivo aqui ou clique para selecionar
              </p>
              <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>
                Suporta: .xlsx, .xlsm, .xls, .csv (máx. 10MB)
              </p>
            </div>
          )}

          {/* Step 2: Configurar */}
          {step === 2 && file && (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              {/* Info do arquivo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#F0FDF4', borderRadius: 10, marginBottom: 20, border: '1px solid #BBF7D0' }}>
                <FileSpreadsheet size={24} style={{ color: '#16A34A', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#16A34A' }}>{fmtBytes(file.size)}</div>
                </div>
                <CheckCircle2 size={20} style={{ color: '#16A34A', flexShrink: 0 }} />
              </div>

              {/* Nome do projeto */}
              <div style={{ marginBottom: 20 }}>
                <label htmlFor="projectName" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Nome do projeto
                </label>
                <input
                  id="projectName"
                  className="input"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="Nome do projeto que será criado"
                  style={{ border: '1.5px solid #E5E7EB' }}
                />
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>
                  Deixe em branco para usar o nome da aba da planilha
                </p>
              </div>

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#DC2626', fontSize: '0.85rem', fontWeight: 500 }}>
                  <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6 }} />
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={reset} className="btn btn-ghost" style={{ flex: isMobile ? 1 : 'none' }}>
                  ← Trocar arquivo
                </button>
                <button onClick={handleImport} disabled={loading} className="btn btn-primary" style={{ flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
                  {loading
                    ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Importando...</>
                    : <><Upload size={15} /> Importar Projeto</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Resultado */}
          {step === 3 && (
            <div>
              {loading ? (
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 60, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <Loader2 size={40} style={{ color: '#F04E00', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
                  <p style={{ fontWeight: 600, color: '#374151' }}>Processando planilha...</p>
                  <p style={{ color: '#9CA3AF', fontSize: '0.82rem', marginTop: 4 }}>Criando projeto, categorias e atividades</p>
                </div>
              ) : result ? (
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '28px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={24} style={{ color: '#16A34A' }} />
                    </div>
                    <div>
                      <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827' }}>Importação concluída!</h2>
                      <p style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: 2 }}>{result.message}</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                    {[
                      { label: 'Projeto criado', value: result.project?.name, color: '#F04E00' },
                      { label: 'Categorias', value: result.stats?.categories, color: '#2563EB' },
                      { label: 'Atividades', value: result.stats?.activities, color: '#16A34A' },
                    ].map(item => (
                      <div key={item.label} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{item.label}</div>
                        <div style={{ fontSize: item.label === 'Projeto criado' ? '0.85rem' : '1.4rem', fontWeight: 800, color: item.color, lineHeight: 1.2 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <a href="/dashboard" className="btn btn-primary" style={{ textDecoration: 'none', flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
                      Ver no Dashboard
                    </a>
                    <a href="/gantt" className="btn btn-ghost" style={{ textDecoration: 'none', flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
                      Ver no Gantt
                    </a>
                    <button onClick={reset} className="btn btn-ghost" style={{ flex: isMobile ? '1 1 100%' : 'none' }}>
                      Importar outro arquivo
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
