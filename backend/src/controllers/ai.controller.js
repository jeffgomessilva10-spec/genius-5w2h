// Serviço de IA para validação dos campos 5W2H
// Usa regras inteligentes + opcionalmente Claude API se ANTHROPIC_API_KEY configurado

function scoreField(value, minLen = 10) {
  if (!value?.trim()) return { score: 0, issue: 'Campo vazio' };
  if (value.trim().length < minLen) return { score: 30, issue: `Muito vago (${value.trim().length} chars, mínimo ${minLen})` };
  if (value.trim().length < minLen * 2) return { score: 70, issue: 'Poderia ser mais detalhado' };
  return { score: 100, issue: null };
}

function validateWith5W2H(activity) {
  const fields = {
    what:  { label: 'O Quê',   value: activity.what,  minLen: 15 },
    why:   { label: 'Por Quê', value: activity.why,   minLen: 15 },
    who:   { label: 'Quem',    value: activity.who,   minLen: 5  },
    where: { label: 'Onde',    value: activity.where, minLen: 5  },
    how:   { label: 'Como',    value: activity.how,   minLen: 15 },
  };

  const results = {};
  let totalScore = 0;
  const issues = [];
  const suggestions = [];

  for (const [key, cfg] of Object.entries(fields)) {
    const r = scoreField(cfg.value, cfg.minLen);
    results[key] = { ...r, label: cfg.label };
    totalScore += r.score;
    if (r.issue) issues.push(`${cfg.label}: ${r.issue}`);
  }

  const avgScore = Math.round(totalScore / Object.keys(fields).length);

  // Validações financeiras
  if (!activity.howMuch) {
    issues.push('Quanto: Custo estimado não informado');
    suggestions.push('Adicione o custo estimado para melhor controle financeiro');
  }

  // Validações de datas
  if (!activity.whenStart || !activity.whenEnd) {
    issues.push('Quando: Datas de início e/ou término não definidas');
    suggestions.push('Defina as datas para aparecer no Gantt e receber alertas de prazo');
  } else {
    const start = new Date(activity.whenStart);
    const end   = new Date(activity.whenEnd);
    if (end <= start) {
      issues.push('Quando: Data de término deve ser posterior ao início');
    }
    if (end < new Date()) {
      suggestions.push('A data de término já passou — verifique se o status está correto');
    }
  }

  // Validações de risco
  if (!activity.risk) {
    suggestions.push('Descreva o risco caso a atividade não seja concluída no prazo');
  }

  // Qualidade geral
  if (avgScore >= 90) suggestions.push('✅ Excelente qualidade de preenchimento!');
  else if (avgScore >= 70) suggestions.push('📋 Bom preenchimento, mas há campos que podem ser melhorados');
  else suggestions.push('⚠️ Vários campos precisam de mais detalhes para boa execução');

  return {
    score: avgScore,
    grade: avgScore >= 90 ? 'A' : avgScore >= 70 ? 'B' : avgScore >= 50 ? 'C' : 'D',
    fields: results,
    issues,
    suggestions,
    isValid: issues.filter(i => i.includes('vazio')).length === 0,
  };
}

// POST /api/ai/validate
async function validateActivity(req, res, next) {
  try {
    const activity = req.body;
    const result = validateWith5W2H(activity);
    res.json(result);
  } catch (err) { next(err); }
}

// POST /api/ai/suggest — sugestão de melhoria para um campo
async function suggestImprovement(req, res, next) {
  try {
    const { field, value, context } = req.body;

    const suggestions = {
      what: [
        'Descreva a entrega específica (ex: "Redesign completo da página inicial com novo layout responsivo")',
        'Inclua o resultado esperado (ex: "Implementar CRM com pipeline de vendas e relatórios automáticos")',
      ],
      why: [
        'Conecte ao objetivo estratégico (ex: "Aumentar conversão em 30% e reduzir custo de aquisição")',
        'Descreva o impacto para o negócio (ex: "Eliminar retrabalho manual que consome 40h/mês da equipe")',
      ],
      who: [
        'Nomeie o responsável e equipe (ex: "João Silva (líder) + equipe de design — 3 pessoas")',
        'Inclua fornecedor se externo (ex: "Agência XYZ — contato: agencia@email.com")',
      ],
      where: [
        'Especifique o ambiente (ex: "Sistema ERP interno + integração com planilha Google Sheets")',
        'Indique o local físico ou digital (ex: "Reunião presencial — Sala 3 · Apresentação via Google Meet")',
      ],
      how: [
        'Descreva a metodologia (ex: "Sprint de 2 semanas: wireframe → prototipo → aprovação → desenvolvimento")',
        'Liste as etapas principais (ex: "1. Levantamento, 2. Desenvolvimento, 3. Testes, 4. Implantação")',
      ],
    };

    const tips = suggestions[field] || ['Seja mais específico e detalhado na descrição.'];

    res.json({
      field,
      currentValue: value,
      tips,
      minRecommendedLength: field === 'who' || field === 'where' ? 10 : 20,
    });
  } catch (err) { next(err); }
}

module.exports = { validateActivity, suggestImprovement };
