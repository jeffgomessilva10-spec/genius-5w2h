import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  CheckCircle2, Clock, AlertTriangle, PlayCircle,
  Calendar, User, DollarSign, Loader2, ShieldAlert,
  SlidersHorizontal, TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLOR = { PLANNED: '#6B7280', IN_PROGRESS: '#2563EB', DELAYED: '#DC2626', DONE: '#16A34A' };
const STATUS_LABEL = { PLANNED: 'Planejado', IN_PROGRESS: 'Em andamento', DELAYED: 'Atrasado', DONE: 'Finalizado' };
const RISK_COLOR   = { LOW: '#16A34A', MEDIUM: '#D97706', HIGH: '#EA580C', CRITICAL: '#DC2626' };

const PERIOD_OPTIONS = [
  { value: '',        label: 'Todo período'  },
  { value: 'week',   label: 'Última semana' },
  { value: 'month',  label: 'Último mês'    },
  { value: 'quarter',label: 'Último trimestre' },
];

function fmt$(v) { return v != null && v > 0 ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : null; }
function fmtDate(d) { return d ? format(new Date(d), 'dd/MM/yyyy') : '—'; }

// Card de contagem com semáforo
function StatusCard({ label, count, total, color, icon: Icon, isActive, onClick }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div onClick={onClick} style={{
      background: isActive ? `${color}12` : '#fff',
      border: `1.5px solid ${isActive ? color : '#E5E7EB'}`,
      borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
      borderTop: `3px solid ${color}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</span>
        <Icon size={15} style={{ color }} />
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>{pct}% do total</div>
    </div>
  );
}

// Activity row
function ActivityRow({ activity, compact = false }) {
  const daysLeft = activity.whenEnd
    ? Math.round((new Date(activity.whenEnd) - new Date()) / 86400000)
    : null;
  const isUrgent = daysLeft != null && daysLeft <= 3 && activity.status !== 'DONE';

  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      padding: compact ? '8px 0' : '12px 0',
      borderBottom: '1px solid #F3F4F6',
    }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[activity.status], flexShrink: 0, marginTop: 5 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activity.code} — {activity.what}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 3 }}>
          {activity.category && (
            <span style={{ fontSize: '0.72rem', color: activity.category.color || '#9CA3AF', fontWeight: 600 }}>
              {activity.category.project?.name || activity.category.name}
            </span>
          )}
          {activity.whenEnd && (
            <span style={{ fontSize: '0.72rem', color: isUrgent ? '#DC2626' : '#9CA3AF', fontWeight: isUrgent ? 700 : 400 }}>
              <Calendar size={10} style={{ display: 'inline', marginRight: 3 }} />
              {daysLeft != null && daysLeft < 0 ? `${Math.abs(daysLeft)}d atrasada` : daysLeft === 0 ? 'Vence hoje!' : `${daysLeft}d`}
            </span>
          )}
          {fmt$(activity.howMuch) && (
            <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
              <DollarSign size={10} style={{ display: 'inline' }} />{fmt$(activity.howMuch)}
            </span>
          )}
        </div>
      </div>
      <span style={{
        fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99,
        background: `${STATUS_COLOR[activity.status]}15`,
        color: STATUS_COLOR[activity.status],
        border: `1px solid ${STATUS_COLOR[activity.status]}33`,
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {STATUS_LABEL[activity.status]}
      </span>
    </div>
  );
}

export default function OperationalDashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [period,      setPeriod]      = useState('');
  const [statusFilter,setStatusFilter]= useState('');

  useEffect(() => { load(); }, [period]);

  async function load() {
    setLoading(true);
    try {
      const { data: d } = await dashboardAPI.operational({ period, status: statusFilter || undefined });
      setData(d);
    } finally { setLoading(false); }
  }

  const s = data?.summary;
  const total = s?.total || 0;

  const filteredActivities = statusFilter
    ? data?.myActivities?.filter(a => a.status === statusFilter)
    : data?.myActivities;

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
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
              Olá, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Dashboard operacional — suas atividades</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="input" value={period} onChange={e => { setPeriod(e.target.value); }}
              style={{ width: 160, height: 36, fontSize: '0.82rem', border: '1px solid #E5E7EB', background: '#fff' }}>
              {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <Loader2 size={32} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ padding: isMobile ? 16 : '28px 32px' }}>

            {/* ── Cards de status ── */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              <StatusCard label="Planejadas"    count={s?.planned}    total={total} color="#6B7280" icon={Clock}         isActive={statusFilter === 'PLANNED'}     onClick={() => setStatusFilter(statusFilter === 'PLANNED'     ? '' : 'PLANNED')}     />
              <StatusCard label="Em andamento"  count={s?.inProgress} total={total} color="#2563EB" icon={PlayCircle}    isActive={statusFilter === 'IN_PROGRESS'} onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? '' : 'IN_PROGRESS')} />
              <StatusCard label="Atrasadas"     count={s?.delayed}    total={total} color="#DC2626" icon={AlertTriangle} isActive={statusFilter === 'DELAYED'}     onClick={() => setStatusFilter(statusFilter === 'DELAYED'     ? '' : 'DELAYED')}     />
              <StatusCard label="Concluídas"    count={s?.done}       total={total} color="#16A34A" icon={CheckCircle2}  isActive={statusFilter === 'DONE'}        onClick={() => setStatusFilter(statusFilter === 'DONE'        ? '' : 'DONE')}        />
            </div>

            {/* ── Horas e financeiro ── */}
            {(s?.plannedHours > 0 || s?.plannedCost > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 24 }}>
                {s?.plannedHours > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={15} style={{ color: '#F04E00' }} /> Horas — Minhas Atividades
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Planejadas</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563EB' }}>{s.plannedHours.toFixed(0)}h</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Realizadas</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16A34A' }}>{s.actualHours.toFixed(0)}h</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Registradas</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F04E00' }}>{s.totalHours.toFixed(0)}h</div>
                      </div>
                    </div>
                    {s.plannedHours > 0 && (
                      <div>
                        <div style={{ height: 7, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(Math.round((s.actualHours / s.plannedHours) * 100), 100)}%`, background: '#16A34A', borderRadius: 99 }} />
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 4 }}>
                          {Math.round((s.actualHours / s.plannedHours) * 100)}% das horas planejadas realizadas
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {s?.plannedCost > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendingUp size={15} style={{ color: '#F04E00' }} /> Financeiro — Minhas Atividades
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Previsto</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563EB' }}>{fmt$(s.plannedCost)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Realizado</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.actualCost > s.plannedCost ? '#DC2626' : '#16A34A' }}>{fmt$(s.actualCost)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 16 }}>
              {/* Minhas atividades */}
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#374151' }}>
                    Minhas Atividades {statusFilter && <span style={{ color: STATUS_COLOR[statusFilter], fontSize: '0.75rem' }}>· {STATUS_LABEL[statusFilter]}</span>}
                  </div>
                  {statusFilter && (
                    <button onClick={() => setStatusFilter('')} style={{ fontSize: '0.72rem', color: '#F04E00', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Limpar filtro
                    </button>
                  )}
                </div>
                {!filteredActivities?.length
                  ? <p style={{ color: '#9CA3AF', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>Nenhuma atividade encontrada.</p>
                  : filteredActivities.map(a => <ActivityRow key={a.id} activity={a} />)
                }
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Prazos próximos */}
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={14} style={{ color: '#F04E00' }} /> Vencendo em 7 dias
                  </div>
                  {!data?.upcomingDeadlines?.length
                    ? <p style={{ color: '#9CA3AF', fontSize: '0.78rem', textAlign: 'center', padding: '12px 0' }}>✅ Nenhum prazo próximo</p>
                    : data.upcomingDeadlines.map(a => (
                      <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: '#F04E00' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.what}</div>
                          <div style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 700 }}>{fmtDate(a.whenEnd)}</div>
                        </div>
                      </div>
                    ))
                  }
                </div>

                {/* Atividades críticas */}
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldAlert size={14} style={{ color: '#DC2626' }} /> Riscos Críticos
                  </div>
                  {!data?.criticalActivities?.length
                    ? <p style={{ color: '#9CA3AF', fontSize: '0.78rem', textAlign: 'center', padding: '12px 0' }}>✅ Nenhum risco crítico</p>
                    : data.criticalActivities.map(a => (
                      <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: RISK_COLOR[a.riskLevel] || '#9CA3AF', marginTop: 5 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#111827' }}>{a.what}</div>
                          <div style={{ fontSize: '0.7rem', color: RISK_COLOR[a.riskLevel], fontWeight: 700 }}>{a.riskLevel}</div>
                        </div>
                      </div>
                    ))
                  }
                </div>

                {/* Backlog por categoria */}
                {data?.backlogByCategory?.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', marginBottom: 12 }}>Backlog por Categoria</div>
                    {data.backlogByCategory.map(item => (
                      <div key={item.category.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.category.color || '#9CA3AF', flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: '0.8rem', color: '#374151', fontWeight: 500 }}>{item.category.name}</div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F04E00' }}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
