import { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  DollarSign, Clock, Loader2, FolderOpen, BarChart3,
  Activity, ShieldAlert, Target, Info,
} from 'lucide-react';

// ── Paleta semáforo ──────────────────────────────────
const STATUS_COLOR = {
  OK:   { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', dot: '#16A34A' },
  WARN: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', dot: '#D97706' },
  RISK: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', dot: '#DC2626' },
  N_A:  { bg: '#F9FAFB', border: '#E5E7EB', text: '#9CA3AF', dot: '#D1D5DB' },
};

const PERIOD_OPTIONS = [
  { value: '',        label: 'Todo período' },
  { value: 'week',   label: 'Última semana' },
  { value: 'month',  label: 'Último mês'   },
  { value: 'quarter',label: 'Último trimestre' },
];

function fmt$(v) { return v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'; }
function fmtPct(v) { return v != null ? `${v}%` : '—'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('pt-BR') : '—'; }

// KPI Card
function KpiCard({ icon: Icon, label, value, sub, color = '#F04E00', tooltip, onClick }) {
  return (
    <div
      onClick={onClick}
      title={tooltip}
      style={{
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14,
        padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        borderTop: `3px solid ${color}`, cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</span>
        {tooltip && <Info size={12} style={{ color: '#D1D5DB', marginLeft: 'auto' }} />}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// Barra de progresso de projeto
function ProjectBar({ project, onClick }) {
  const spiCfg = STATUS_COLOR[project.spiStatus] || STATUS_COLOR.N_A;
  const cpiCfg = STATUS_COLOR[project.cpiStatus] || STATUS_COLOR.N_A;

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
        padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        cursor: 'pointer', transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>{project.name}</div>
          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 2 }}>
            {fmtDate(project.startDate)} → {fmtDate(project.endDate)} · {project.total} atividades
          </div>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 800, color: project.pctDone >= 70 ? '#16A34A' : project.pctDone >= 40 ? '#D97706' : '#DC2626' }}>
          {project.pctDone}%
        </div>
      </div>

      {/* Barra de conclusão */}
      <div style={{ height: 8, background: '#E5E7EB', borderRadius: 99, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99, transition: 'width 0.5s',
          width: `${project.pctDone}%`,
          background: project.pctDone >= 70 ? '#16A34A' : project.pctDone >= 40 ? '#D97706' : '#DC2626',
        }} />
      </div>

      {/* Indicadores financeiros e índices */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { label: 'Previsto', value: fmt$(project.plannedCost) },
          { label: 'Realizado', value: fmt$(project.actualCost) },
          {
            label: 'SPI', value: project.spi ?? '—',
            bg: spiCfg.bg, border: spiCfg.border, text: spiCfg.text,
            tooltip: 'Schedule Performance Index: ≥1 adiantado, <1 atrasado',
          },
          {
            label: 'CPI', value: project.cpi ?? '—',
            bg: cpiCfg.bg, border: cpiCfg.border, text: cpiCfg.text,
            tooltip: 'Cost Performance Index: ≥1 dentro do orçamento',
          },
        ].map((item, i) => (
          <div key={i} title={item.tooltip} style={{
            background: item.bg || '#F9FAFB',
            border: `1px solid ${item.border || '#E5E7EB'}`,
            borderRadius: 8, padding: '6px 10px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 2 }}>{item.label}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: item.text || '#374151' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {project.delayed > 0 && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#DC2626' }}>
          <AlertTriangle size={12} /> {project.delayed} atividade{project.delayed > 1 ? 's' : ''} atrasada{project.delayed > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export default function ExecutiveDashboard() {
  const isMobile = useIsMobile();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState('');
  const [drillDown, setDrillDown] = useState(null);

  useEffect(() => { load(); }, [period]);

  async function load() {
    setLoading(true);
    try {
      const { data: d } = await dashboardAPI.executive({ period });
      setData(d);
    } finally { setLoading(false); }
  }

  const p = data?.portfolio;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {/* Topbar */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #E5E7EB',
          padding: '0 32px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Dashboard Executivo</h1>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Visão estratégica do portfólio</p>
          </div>
          <select className="input" value={period} onChange={e => setPeriod(e.target.value)}
            style={{ width: 180, height: 36, fontSize: '0.83rem', border: '1px solid #E5E7EB', background: '#fff' }}>
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <Loader2 size={32} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ padding: isMobile ? 16 : '28px 32px' }}>

            {/* ── KPIs do portfólio ── */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 12 }}>
                Portfólio Geral
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 14 }}>
                <KpiCard icon={FolderOpen}    label="Projetos"       value={p?.totalProjects}    sub={`${p?.projectsOnTrack} no prazo`}     color="#F04E00" tooltip="Total de projetos ativos" />
                <KpiCard icon={Activity}      label="Atividades"     value={p?.totalActivities}  sub={`${p?.totalDelayed} atrasadas`}        color="#DC2626" />
                <KpiCard icon={BarChart3}     label="Conclusão média" value={`${p?.avgPctDone}%`} sub={`${p?.projectsAtRisk} projetos em risco`} color={p?.avgPctDone >= 70 ? '#16A34A' : '#D97706'} />
                <KpiCard icon={DollarSign}    label="Orçamento total" value={fmt$(p?.plannedCost)} sub={`Realizado: ${fmt$(p?.actualCost)}`}  color="#2563EB" tooltip="Soma de todos os custos planejados" />
              </div>
            </div>

            {/* ── Horas do portfólio ── */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 24 }}>
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} style={{ color: '#F04E00' }} /> Horas do Portfólio
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Planejadas', value: `${(p?.plannedHours || 0).toFixed(0)}h`, color: '#2563EB' },
                    { label: 'Realizadas', value: `${(p?.actualHours  || 0).toFixed(0)}h`, color: '#16A34A' },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: 'center', padding: '12px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 6 }}>{item.label}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                {p?.plannedHours > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9CA3AF', marginBottom: 5 }}>
                      <span>Realizado</span>
                      <span>{Math.round((p.actualHours / p.plannedHours) * 100)}%</span>
                    </div>
                    <div style={{ height: 8, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(Math.round((p.actualHours / p.plannedHours) * 100), 100)}%`, background: '#16A34A', borderRadius: 99 }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Exposição ao risco */}
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldAlert size={16} style={{ color: '#DC2626' }} /> Exposição ao Risco
                </div>
                {data?.riskExposure?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: '#9CA3AF', fontSize: '0.82rem' }}>
                    <CheckCircle2 size={24} style={{ color: '#16A34A', marginBottom: 8 }} /><br />Nenhum risco crítico
                  </div>
                ) : (
                  data?.riskExposure?.slice(0, 5).map(a => (
                    <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #F3F4F6' }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                        background: a.riskLevel === 'CRITICAL' ? '#DC2626' : '#D97706',
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#111827' }}>{a.code} — {a.what}</div>
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 2 }}>
                          {a.category?.project?.name} · {a.responsible?.name || '—'} · Vence: {fmtDate(a.whenEnd)}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                        background: a.riskLevel === 'CRITICAL' ? '#FEF2F2' : '#FFFBEB',
                        color: a.riskLevel === 'CRITICAL' ? '#DC2626' : '#D97706',
                        border: `1px solid ${a.riskLevel === 'CRITICAL' ? '#FECACA' : '#FDE68A'}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {a.riskLevel}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── Projetos — barras de progresso ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Desempenho por Projeto
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: '#9CA3AF' }}>
                  {[{ key: 'OK', label: '≥1.0 no prazo' }, { key: 'WARN', label: '0.8–1.0 atenção' }, { key: 'RISK', label: '<0.8 em risco' }].map(s => (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[s.key].dot }} />
                      SPI {s.label}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
                {data?.projectKPIs?.map(proj => (
                  <ProjectBar key={proj.id} project={proj} onClick={() => setDrillDown(proj)} />
                ))}
              </div>
            </div>

            {/* ── Atividades atrasadas ── */}
            {data?.topDelayed?.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 12 }}>
                  Atividades Atrasadas
                </div>
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 1fr 1fr 1fr', padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                    <span>Atividade</span>
                    {!isMobile && <><span>Projeto</span><span>Responsável</span><span>Prazo</span></>}
                  </div>
                  {data.topDelayed.map((a, i) => (
                    <div key={a.id} style={{
                      display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 1fr 1fr 1fr',
                      padding: '12px 20px', alignItems: 'center',
                      borderBottom: i < data.topDelayed.length - 1 ? '1px solid #F3F4F6' : 'none',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>{a.code} — {a.what}</div>
                        {isMobile && <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 2 }}>{a.category?.project?.name} · {a.responsible?.name} · {fmtDate(a.whenEnd)}</div>}
                      </div>
                      {!isMobile && <>
                        <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>{a.category?.project?.name}</span>
                        <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>{a.responsible?.name || '—'}</span>
                        <span style={{ fontSize: '0.82rem', color: '#DC2626', fontWeight: 600 }}>{fmtDate(a.whenEnd)}</span>
                      </>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Legenda dos índices ── */}
            <div style={{ marginTop: 28, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px', fontSize: '0.78rem', color: '#6B7280' }}>
              <div style={{ fontWeight: 700, color: '#374151', marginBottom: 8 }}>📊 Guia dos Indicadores</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                <div><strong>SPI (Schedule Performance Index):</strong> ≥1.0 dentro do prazo · 0.8–1.0 atenção · &lt;0.8 atrasado</div>
                <div><strong>CPI (Cost Performance Index):</strong> ≥1.0 dentro do orçamento · &lt;1.0 acima do custo previsto</div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Drill-down modal */}
      {drillDown && (
        <>
          <div onClick={() => setDrillDown(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 998 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 16, padding: 28, zIndex: 999, width: Math.min(520, window.innerWidth - 32), maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', marginBottom: 4 }}>{drillDown.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: 20 }}>{fmtDate(drillDown.startDate)} → {fmtDate(drillDown.endDate)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Atividades', value: drillDown.total },
                { label: 'Concluídas', value: `${drillDown.done} (${drillDown.pctDone}%)` },
                { label: 'Atrasadas',  value: drillDown.delayed, color: drillDown.delayed > 0 ? '#DC2626' : undefined },
                { label: 'Custo previsto', value: fmt$(drillDown.plannedCost) },
                { label: 'Custo realizado', value: fmt$(drillDown.actualCost) },
                { label: 'Variação custo', value: drillDown.costVariance != null ? `${drillDown.costVariance > 0 ? '+' : ''}${drillDown.costVariance}%` : '—', color: drillDown.costVariance > 0 ? '#16A34A' : '#DC2626' },
                { label: 'SPI', value: drillDown.spi ?? '—' },
                { label: 'CPI', value: drillDown.cpi ?? '—' },
              ].map(item => (
                <div key={item.label} style={{ background: '#F9FAFB', borderRadius: 8, padding: '10px 14px', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: item.color || '#111827' }}>{item.value}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setDrillDown(null)} className="btn btn-ghost" style={{ width: '100%', marginTop: 20, justifyContent: 'center' }}>Fechar</button>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
