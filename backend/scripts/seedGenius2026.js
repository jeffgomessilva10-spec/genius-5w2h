/**
 * seedGenius2026.js
 * Importa o Plano de Ação – Genius 2026 completo no banco.
 * Executar: node backend/scripts/seedGenius2026.js
 *
 * Idempotente: verifica se projeto já existe antes de criar.
 * Todos os dados foram extraídos do arquivo:
 *   "Plano de Ação - Genius 2026 (1).xlsm"
 *   Aba: "Plano de Ação - 5W 2H"
 *
 * Datas: mapeadas pelas colunas de mês/semana (Março-Outubro/2026)
 * Cada semana começa na segunda-feira do respectivo período.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Mapa de semanas → datas reais 2026 ───────────────────────────────────
// Colunas: H=Mar/S1, I=Mar/S2, J=Mar/S3, K=Mar/S4, L=Mar/S5
//          M=Abr/S1, N=Abr/S2, O=Abr/S3, P=Abr/S4
//          Q=Mai/S1, R=Mai/S2, S=Mai/S3, T=Mai/S4
//          U=Jun/S1, V=Jun/S2, W=Jun/S3, X=Jun/S4
//          Y=Jul/S1, Z=Jul/S2, AA=Jul/S3, AB=Jul/S4
//          AC=Ago/S1, AD=Ago/S2, AE=Ago/S3, AF=Ago/S4
//          AG=Set/S1, AH=Set/S2, AI=Set/S3, AJ=Set/S4
//          AK=Out/S1, AL=Out/S2, AM=Out/S3
const WEEKS = {
  'Mar/1': { start: '2026-03-02', end: '2026-03-08' },
  'Mar/2': { start: '2026-03-09', end: '2026-03-15' },
  'Mar/3': { start: '2026-03-16', end: '2026-03-22' },
  'Mar/4': { start: '2026-03-23', end: '2026-03-29' },
  'Abr/1': { start: '2026-04-06', end: '2026-04-12' },
  'Abr/2': { start: '2026-04-13', end: '2026-04-19' },
  'Abr/3': { start: '2026-04-20', end: '2026-04-26' },
  'Abr/4': { start: '2026-04-27', end: '2026-04-30' },
  'Mai/1': { start: '2026-05-04', end: '2026-05-10' },
  'Mai/2': { start: '2026-05-11', end: '2026-05-17' },
  'Mai/3': { start: '2026-05-18', end: '2026-05-24' },
  'Mai/4': { start: '2026-05-25', end: '2026-05-31' },
  'Jun/1': { start: '2026-06-01', end: '2026-06-07' },
  'Jun/2': { start: '2026-06-08', end: '2026-06-14' },
  'Jun/3': { start: '2026-06-15', end: '2026-06-21' },
  'Jun/4': { start: '2026-06-22', end: '2026-06-28' },
  'Jul/1': { start: '2026-07-06', end: '2026-07-12' },
  'Jul/2': { start: '2026-07-13', end: '2026-07-19' },
  'Jul/3': { start: '2026-07-20', end: '2026-07-26' },
  'Jul/4': { start: '2026-07-27', end: '2026-07-31' },
  'Ago/1': { start: '2026-08-03', end: '2026-08-09' },
  'Ago/2': { start: '2026-08-10', end: '2026-08-16' },
  'Ago/3': { start: '2026-08-17', end: '2026-08-23' },
  'Ago/4': { start: '2026-08-24', end: '2026-08-30' },
  'Set/1': { start: '2026-09-07', end: '2026-09-13' },
  'Set/2': { start: '2026-09-14', end: '2026-09-20' },
  'Set/3': { start: '2026-09-21', end: '2026-09-27' },
  'Out/1': { start: '2026-10-05', end: '2026-10-11' },
  'Out/2': { start: '2026-10-12', end: '2026-10-18' },
  'Out/3': { start: '2026-10-19', end: '2026-10-25' },
};

function d(week) { return WEEKS[week] ? new Date(WEEKS[week].start) : null; }
function dEnd(week) { return WEEKS[week] ? new Date(WEEKS[week].end) : null; }

// Status map
const S = { P: 'PLANNED', I: 'IN_PROGRESS', D: 'DELAYED', F: 'DONE' };

// ── Dados completos extraídos do Excel ───────────────────────────────────
const PROJECT_DATA = {
  name:        'Plano de Ação – Vendas e Marketing – Genius 2026',
  description: 'Plano estratégico de vendas e marketing da Genius Consultoria para 2026.',
  startDate:   new Date('2026-03-02'),
  endDate:     new Date('2026-10-31'),
};

const CATEGORIES = [
  { code: '1', name: 'Site',                         color: '#F04E00', description: 'Desenvolvimento e atualização do site institucional' },
  { code: '2', name: 'Rede Social',                  color: '#2563EB', description: 'Gestão e estratégia das redes sociais' },
  { code: '3', name: 'Nova Apresentação',             color: '#7C3AED', description: 'Criação da nova apresentação comercial' },
  { code: '4', name: 'Tráfego Pago',                 color: '#D97706', description: 'Campanhas de mídia paga e anúncios digitais' },
  { code: '5', name: 'E-mail Marketing',              color: '#0891B2', description: 'Estratégia e campanhas de e-mail marketing' },
  { code: '6', name: 'Vendas',                       color: '#16A34A', description: 'Estruturação do processo comercial e funil de vendas' },
  { code: '7', name: 'Planejamento Estratégico',     color: '#DC2626', description: 'Definição da estratégia e objetivos da empresa' },
  { code: '8', name: 'Estrutura Interna (Operacional)', color: '#6B7280', description: 'Organização e processos internos da empresa' },
];

const ACTIVITIES = [
  // ── 1. SITE ────────────────────────────────────────────
  {
    code: '1.1', cat: '1', status: S.P,
    what:  'Reunião de definição do Escopo',
    why:   'Necessário reajustar o site de acordo com o novo planejamento estratégico',
    who:   'Genius',
    where: 'Presencial / Online',
    how:   'Definir ideia inicial de layout e páginas de serviços',
    whenStart: d('Mar/1'), whenEnd: dEnd('Mar/2'),
    howMuch: 0,
  },
  {
    code: '1.2', cat: '1', status: S.P,
    what:  'Realizar cotação com os fornecedores',
    why:   'Para comparar benefícios e preços',
    who:   'Anderson',
    where: 'Online',
    how:   'Realizar cotação inicial com o Richard e Luis para ter um parâmetro',
    whenStart: d('Mar/3'), whenEnd: dEnd('Mar/3'),
    howMuch: 0,
  },
  {
    code: '1.3', cat: '1', status: S.D,
    what:  'Contratação do fornecedor escolhido',
    why:   'Porque precisamos do serviço',
    who:   'Anderson',
    where: 'Online',
    how:   'Critérios: quem passou mais confiança / melhor prazo de entrega / preço',
    whenStart: d('Mar/4'), whenEnd: dEnd('Mar/4'),
    howMuch: 3000,
    risk:  'Atraso na contratação impacta todas as fases seguintes do site',
  },
  {
    code: '1.4', cat: '1', status: S.I,
    what:  'Reunião de Start do Projeto',
    why:   'Porque é necessário realizar um alinhamento de expectativa entre as partes',
    who:   'Genius / Fornecedor',
    where: 'Presencial / Online',
    how:   'A reunião terá como objetivo definir as premissas de modificação e atualização do site. O fornecedor deve elaborar um cronograma com as datas de entrega intermediária para revisão e final.',
    whenStart: d('Abr/1'), whenEnd: dEnd('Abr/1'),
    howMuch: 0,
  },
  {
    code: '1.5', cat: '1', status: S.F,
    what:  'Envio de Conteúdo de Qualidade (Escrito)',
    why:   'Porque o fornecedor terá dificuldades em expressar de forma técnica a explicação dos produtos',
    who:   'Genius',
    where: 'Online',
    how:   'Reunir informações claras sobre os nossos produtos para descrição do site, consultar tabela de produtos definidos no planejamento estratégico',
    whenStart: d('Abr/2'), whenEnd: dEnd('Abr/2'),
    howMuch: 0,
  },
  {
    code: '1.6', cat: '1', status: S.P,
    what:  'Reunião de Acompanhamento',
    why:   'Porque é necessário realizar ajustes e acompanhar se o planejamento inicial está sendo seguido',
    who:   'Genius / Fornecedor',
    where: 'Presencial / Online',
    how:   'Reunião intermediária onde avaliaremos o que foi desenvolvido até aqui do serviço e se está a contento',
    whenStart: d('Mai/1'), whenEnd: dEnd('Mai/2'),
    howMuch: 0,
  },
  {
    code: '1.7', cat: '1', status: S.P,
    what:  'Reunião de finalização',
    why:   'Verificar se os ajustes foram realizados, testar funcionalidades',
    who:   'Genius / Fornecedor',
    where: 'Presencial / Online',
    how:   'Reunião para cravar a entrega e começar a rodar o novo site',
    whenStart: d('Mai/3'), whenEnd: dEnd('Mai/4'),
    howMuch: 0,
  },

  // ── 2. REDE SOCIAL ─────────────────────────────────────
  {
    code: '2.1', cat: '2', status: S.P,
    what:  'Reorganizar toda a mídia que temos no Google Drive',
    why:   'Porque é importante separar e organizar todo o material que temos para ser utilizado',
    who:   'Jefferson',
    where: 'Online',
    how:   'Realizar levantamento no Drive existente, arquivos do celular, etc.',
    whenStart: d('Mar/1'), whenEnd: dEnd('Mar/2'),
    howMuch: 0,
  },
  {
    code: '2.2', cat: '2', status: S.P,
    what:  'Filtrar conteúdo',
    why:   'Porque é necessário utilizar apenas o que faz sentido frente ao novo planejamento estratégico',
    who:   'Jefferson',
    where: 'Online',
    how:   'Separar todo o conteúdo válido em pasta zipada',
    whenStart: d('Mar/3'), whenEnd: dEnd('Mar/4'),
    howMuch: 0,
  },
  {
    code: '2.3', cat: '2', status: S.P,
    what:  'Reunião de briefing com a empresa de marketing',
    why:   'Alinhamento estratégico de conteúdo para redes sociais',
    who:   'Jefferson / Fornecedor Marketing',
    where: 'Online',
    how:   'Trazer ideias para a reunião, separar link de páginas de conteúdo para referência, definir os tipos de postagem, critérios e cronograma semanal',
    whenStart: d('Abr/1'), whenEnd: dEnd('Abr/1'),
    howMuch: 0,
  },
  {
    code: '2.4', cat: '2', status: S.P,
    what:  'Criação de calendário editorial',
    why:   'Para manter consistência e aumentar engajamento nas redes sociais',
    who:   'Fornecedor Marketing',
    where: 'Online',
    how:   'Desenvolvimento do calendário mensal com tipos de conteúdo, frequência e temas por canal',
    whenStart: d('Abr/2'), whenEnd: dEnd('Abr/3'),
    howMuch: 1500,
  },
  {
    code: '2.5', cat: '2', status: S.P,
    what:  'Início da produção de conteúdo',
    why:   'Para execução da estratégia de redes sociais',
    who:   'Fornecedor Marketing',
    where: 'Online',
    how:   'Produção de posts, stories e reels conforme calendário editorial aprovado',
    whenStart: d('Mai/1'), whenEnd: dEnd('Jun/4'),
    howMuch: 3000,
  },
  {
    code: '2.6', cat: '2', status: S.P,
    what:  'Definir datas de acompanhamentos e relatórios',
    why:   'Porque é necessário acompanhar o progresso (resultados), entendendo se é necessário corrigir a rota',
    who:   'Genius',
    where: 'Online',
    how:   'A empresa de marketing deve entregar um relatório mensal com métricas para que analisemos os números',
    whenStart: d('Mai/1'), whenEnd: dEnd('Out/3'),
    howMuch: 0,
  },
  {
    code: '2.7', cat: '2', status: S.P,
    what:  'Revisão e ajustes da estratégia de conteúdo',
    why:   'Para garantir que os resultados estejam alinhados com os objetivos',
    who:   'Jefferson / Fornecedor Marketing',
    where: 'Online',
    how:   'Reunião trimestral de avaliação e ajuste da estratégia',
    whenStart: d('Jul/1'), whenEnd: dEnd('Jul/2'),
    howMuch: 0,
  },

  // ── 3. NOVA APRESENTAÇÃO ───────────────────────────────
  {
    code: '3.1', cat: '3', status: S.P,
    what:  'Definir nova estrutura da apresentação',
    why:   'Porque é necessário reorganizar para melhor experiência do cliente e compreensão dos serviços',
    who:   'Genius',
    where: 'Presencial',
    how:   'Reunião, realizar exposição das novas ideias e fechar a estrutura',
    whenStart: d('Abr/1'), whenEnd: dEnd('Abr/1'),
    howMuch: 0,
  },
  {
    code: '3.2', cat: '3', status: S.P,
    what:  'Briefing com fornecedor de design',
    why:   'Para alinhar expectativas e cronograma de entrega',
    who:   'Genius / Fornecedor',
    where: 'Online',
    how:   'Comunicar a nova estrutura, ouvir a opinião do fornecedor e definir o cronograma de entrega intermediária e final',
    whenStart: d('Abr/2'), whenEnd: dEnd('Abr/2'),
    howMuch: 0,
  },
  {
    code: '3.3', cat: '3', status: S.P,
    what:  'Criar nova apresentação',
    why:   'Porque é necessário ajustar a apresentação atual de acordo com o novo posicionamento que a empresa busca',
    who:   'Fornecedor',
    where: 'Online',
    how:   'Trabalhar o novo layout pensando em utilizar as novas informações, fonte e cores para fortalecimento do branding',
    whenStart: d('Abr/3'), whenEnd: dEnd('Mai/2'),
    howMuch: 2500,
  },
  {
    code: '3.4', cat: '3', status: S.P,
    what:  'Reunião de acompanhamento e aprovação',
    why:   'Para realizar ajustes necessários e garantir alinhamento com a identidade da empresa',
    who:   'Genius / Fornecedor',
    where: 'Online / Presencial',
    how:   'Marcar reunião online/presencial intermediária para realizar ajustes e aprovações',
    whenStart: d('Mai/3'), whenEnd: dEnd('Mai/3'),
    howMuch: 0,
  },
  {
    code: '3.5', cat: '3', status: S.P,
    what:  'Entrega e aprovação final da apresentação',
    why:   'Para garantir que o produto final está conforme o esperado',
    who:   'Genius / Fornecedor',
    where: 'Presencial',
    how:   'Verificar se os ajustes foram realizados, testar funcionalidades e marcar reunião de apresentação da entrega',
    whenStart: d('Mai/4'), whenEnd: dEnd('Jun/1'),
    howMuch: 0,
  },

  // ── 4. TRÁFEGO PAGO ───────────────────────────────────
  {
    code: '4.1', cat: '4', status: S.P,
    what:  'Definir melhor estratégia de tráfego pago',
    why:   'Porque é necessário entender qual caminho tomaremos para os testes de tráfego pago',
    who:   'Genius / Fornecedor Marketing',
    where: 'Online',
    how:   'Necessário definir: direcionar ao site ou landing page, canais (Facebook/LinkedIn/Instagram/Google), palavras-chave, persona e tom de voz',
    whenStart: d('Mai/2'), whenEnd: dEnd('Mai/3'),
    howMuch: 0,
    risk:  'Sem estratégia clara, o investimento em tráfego pago pode ter ROI negativo',
  },
  {
    code: '4.2', cat: '4', status: S.P,
    what:  'Definir valores de investimento em tráfego pago',
    why:   'Porque é necessário analisar o orçamento para definir os valores que serão investidos inicialmente nos testes',
    who:   'Diretoria',
    where: 'Presencial',
    how:   'Reunião da diretoria para definição dos valores de teste e budget mensal',
    whenStart: d('Jun/1'), whenEnd: dEnd('Jun/1'),
    howMuch: 0,
  },
  {
    code: '4.3', cat: '4', status: S.P,
    what:  'Criar as campanhas de tráfego pago',
    why:   'Porque este é o meio necessário para que sejam feitos os anúncios em ambiente público digital',
    who:   'Fornecedor',
    where: 'Online',
    how:   'Uma vez em posse das informações colhidas nas etapas anteriores, o fornecedor deve desenvolver as campanhas nos canais escolhidos',
    whenStart: d('Jun/2'), whenEnd: dEnd('Jul/1'),
    howMuch: 2000,
  },
  {
    code: '4.4', cat: '4', status: S.P,
    what:  'Acompanhamento e otimização das campanhas',
    why:   'Para garantir que o investimento está gerando os resultados esperados',
    who:   'Fornecedor / Jefferson',
    where: 'Online',
    how:   'Reuniões quinzenais de acompanhamento com relatório de performance e ajustes de campanha',
    whenStart: d('Jul/2'), whenEnd: dEnd('Ago/4'),
    howMuch: 1000,
  },
  {
    code: '4.5', cat: '4', status: S.P,
    what:  'Avaliação de resultados e planejamento da próxima fase',
    why:   'Para mensurar o retorno sobre o investimento e planejar escalonamento',
    who:   'Jefferson / Diretoria',
    where: 'Presencial',
    how:   'Reunião de avaliação com apresentação de relatório completo de resultados dos testes',
    whenStart: d('Set/1'), whenEnd: dEnd('Set/1'),
    howMuch: 0,
  },

  // ── 5. E-MAIL MARKETING ────────────────────────────────
  {
    code: '5.1', cat: '5', status: S.P,
    what:  'Definir estratégia de e-mail marketing',
    why:   'Porque é necessário entender qual caminho tomaremos em relação aos e-mails',
    who:   'Jefferson / Fornecedor Marketing',
    where: 'Online',
    how:   'Necessário definir: segmentação de listas, frequência, tipo de abordagem (novos leads ou base existente)',
    whenStart: d('Jun/3'), whenEnd: dEnd('Jun/4'),
    howMuch: 0,
  },
  {
    code: '5.2', cat: '5', status: S.P,
    what:  'Definir conteúdo e periodicidade dos e-mails',
    why:   'Porque é necessário definir o tipo de abordagem ao cliente',
    who:   'Fornecedor Marketing',
    where: 'Online',
    how:   'Trabalhar no tipo de conteúdo que será utilizado, tom de voz, persona e periodicidade',
    whenStart: d('Jul/1'), whenEnd: dEnd('Jul/2'),
    howMuch: 800,
  },
  {
    code: '5.3', cat: '5', status: S.P,
    what:  'Criação e configuração das automações de e-mail',
    why:   'Para garantir comunicação consistente e escalável com a base de contatos',
    who:   'Fornecedor',
    where: 'Online',
    how:   'Configuração das sequências automáticas de e-mail conforme estratégia definida',
    whenStart: d('Jul/3'), whenEnd: dEnd('Ago/2'),
    howMuch: 1200,
  },
  {
    code: '5.4', cat: '5', status: S.P,
    what:  'Acompanhamento de métricas e otimização',
    why:   'Para garantir que as campanhas estão gerando resultado',
    who:   'Jefferson / Fornecedor',
    where: 'Online',
    how:   'Análise mensal de métricas (taxa de abertura, cliques, conversão) e ajustes necessários',
    whenStart: d('Ago/3'), whenEnd: dEnd('Set/3'),
    howMuch: 0,
  },

  // ── 6. VENDAS ─────────────────────────────────────────
  {
    code: '6.1', cat: '6', status: S.P,
    what:  'Criação do funil de vendas',
    why:   'Porque é necessário definir o processo de vendas',
    who:   'Jefferson',
    where: 'Presencial / Online',
    how:   'Reunião onde será discutida a sequência de atendimento e o passo a passo do cliente para conversão de vendas. Posterior a isso criação do Trello/CRM.',
    whenStart: d('Mar/1'), whenEnd: dEnd('Mar/2'),
    howMuch: 0,
  },
  {
    code: '6.2', cat: '6', status: S.P,
    what:  'Criação dos argumentos de vendas',
    why:   'Porque é necessário ter argumentos fortes para convencimento dos clientes',
    who:   'Jefferson',
    where: 'Presencial',
    how:   'Reunião para definição de: dores dos clientes por tipos de serviços, benefícios de cada serviço, colher a visão do Jefferson sobre os clientes conquistados e qual foi a abordagem passo a passo.',
    whenStart: d('Mar/3'), whenEnd: dEnd('Mar/4'),
    howMuch: 0,
  },
  {
    code: '6.3', cat: '6', status: S.P,
    what:  'Agendamento de Reuniões – Projeto Parcerias',
    why:   'Necessário buscar novos clientes e aumentar a receita',
    who:   'Jefferson',
    where: 'Presencial',
    how:   'Ligar para fornecedores já definidos e agendar reuniões para apresentação do projeto de parceria.',
    whenStart: d('Abr/1'), whenEnd: dEnd('Abr/2'),
    howMuch: 0,
  },
  {
    code: '6.4', cat: '6', status: S.P,
    what:  'Rodada dos parceiros',
    why:   'Diversificação necessária para buscar novos clientes e aumentar a receita',
    who:   'Jefferson / Equipe',
    where: 'Home / Presencial',
    how:   'Trabalhar em uma planilha com Leads possíveis vindos de indicação, lista de clientes enviados pelo Jefferson',
    whenStart: d('Mai/1'), whenEnd: dEnd('Jun/2'),
    howMuch: 0,
  },
  {
    code: '6.5', cat: '6', status: S.P,
    what:  'Criar planilha de mapeamento dos números de vendas',
    why:   'Porque é importante entender as métricas de venda do negócio para trabalhar melhoria contínua',
    who:   'Jefferson',
    where: 'Online',
    how:   'Estruturar planilha para entender quantidade de Leads vindos da internet, indicação, prospecção ativa, taxa de conversão, número de reuniões, ações mais efetivas, principais objeções',
    whenStart: d('Jun/3'), whenEnd: dEnd('Jul/2'),
    howMuch: 0,
  },
  {
    code: '6.6', cat: '6', status: S.P,
    what:  'Revisão e otimização do processo comercial',
    why:   'Para garantir que o processo de vendas está gerando os resultados esperados',
    who:   'Jefferson',
    where: 'Presencial',
    how:   'Reunião de análise dos números e definição de ajustes no funil e nos argumentos',
    whenStart: d('Ago/1'), whenEnd: dEnd('Ago/2'),
    howMuch: 0,
  },

  // ── 7. PLANEJAMENTO ESTRATÉGICO ────────────────────────
  {
    code: '7.1', cat: '7', status: S.P,
    what:  'Missão, Visão e Valores',
    why:   'Porque é necessário ter claro esses três pilares para determinar metas de negócio, cultura, etc.',
    who:   'Jefferson / Diretoria',
    where: 'Presencial',
    how:   'Reunião presencial junto com o Jefferson para definição e alinhamento dos pilares estratégicos',
    whenStart: d('Mar/1'), whenEnd: dEnd('Mar/1'),
    howMuch: 0,
  },
  {
    code: '7.2', cat: '7', status: S.P,
    what:  'Construir os objetivos estratégicos',
    why:   'Porque é importante entender a visão de negócio dos sócios e construir o planejamento para este e para os próximos anos',
    who:   'Jefferson / Diretoria',
    where: 'Presencial',
    how:   'Workshop de planejamento estratégico com definição de metas de curto, médio e longo prazo',
    whenStart: d('Mar/2'), whenEnd: dEnd('Mar/3'),
    howMuch: 0,
  },
  {
    code: '7.3', cat: '7', status: S.P,
    what:  'Construir portfólio de produtos',
    why:   'Porque é necessário definir o que será vendido com base na receita que pretendemos atingir',
    who:   'Jefferson',
    where: 'Presencial',
    how:   'Reunião presencial junto com o Jefferson, entender o que já avançamos nesse assunto.',
    whenStart: d('Abr/1'), whenEnd: dEnd('Abr/2'),
    howMuch: 0,
  },
  {
    code: '7.4', cat: '7', status: S.P,
    what:  'Construir precificação e estratégia de vendas',
    why:   'Necessário definir os valores dos serviços com base nos custos e posicionamento de mercado',
    who:   'Jefferson / Diretoria',
    where: 'Online',
    how:   'Construir tabela de precificação e estratégia de vendas por produto',
    whenStart: d('Abr/3'), whenEnd: dEnd('Mai/1'),
    howMuch: 0,
  },
  {
    code: '7.5', cat: '7', status: S.P,
    what:  'Definir metas e indicadores de desempenho (KPIs)',
    why:   'Para mensurar o progresso em direção aos objetivos estratégicos',
    who:   'Jefferson / Diretoria',
    where: 'Online',
    how:   'Workshop de definição de KPIs por área: vendas, marketing, operacional e financeiro',
    whenStart: d('Mai/2'), whenEnd: dEnd('Mai/3'),
    howMuch: 0,
  },
  {
    code: '7.6', cat: '7', status: S.P,
    what:  'Reunião de revisão trimestral do planejamento',
    why:   'Para verificar se estamos na direção correta e realizar ajustes necessários',
    who:   'Jefferson / Diretoria',
    where: 'Presencial',
    how:   'Reunião trimestral de avaliação dos resultados versus metas e redefinição de prioridades',
    whenStart: d('Jul/1'), whenEnd: dEnd('Jul/1'),
    howMuch: 0,
  },
  {
    code: '7.7', cat: '7', status: S.P,
    what:  'Reunião de avaliação semestral e planejamento do segundo semestre',
    why:   'Para avaliar os resultados do primeiro semestre e planejar as ações do segundo',
    who:   'Jefferson / Diretoria / Equipe',
    where: 'Presencial',
    how:   'Reunião de avaliação completa com apresentação de resultados e planejamento das próximas ações',
    whenStart: d('Set/1'), whenEnd: dEnd('Set/2'),
    howMuch: 0,
  },

  // ── 8. ESTRUTURA INTERNA ───────────────────────────────
  {
    code: '8.1', cat: '8', status: S.P,
    what:  'Criação de servidor online (Diretório de pastas)',
    why:   'Necessário organizar os arquivos, modelos, guardar histórico de projetos, etc.',
    who:   'Jefferson',
    where: 'Online',
    how:   'Jefferson já está reorganizando o existente e separando os materiais para estruturação do servidor',
    whenStart: d('Mar/1'), whenEnd: dEnd('Abr/2'),
    howMuch: 0,
  },
  {
    code: '8.2', cat: '8', status: S.P,
    what:  'Mapear e redesenhar o processo operacional',
    why:   'É necessário reorganizar a estrutura interna para avançar com o aumento da base de clientes',
    who:   'Jefferson / Equipe',
    where: 'Presencial / Online',
    how:   'Mapeamento do processo existente, criação de workflow para acompanhamento dos projetos em andamento, por produto:\n1° Definição e Ilustração da Jornada Macro\n2° Abrir etapa por etapa da jornada macro\n3° Estabelecer a expectativa desejada',
    whenStart: d('Abr/1'), whenEnd: dEnd('Jun/4'),
    howMuch: 0,
    risk:  'Sem processos estruturados, o crescimento da base de clientes pode comprometer a qualidade de entrega',
  },
  {
    code: '8.3', cat: '8', status: S.P,
    what:  'Definir dinâmica de acompanhamento do avanço dos projetos',
    why:   'Para trazer clareza e fluidez para a execução dos projetos, com visibilidade interna e para o cliente',
    who:   'Jefferson / Equipe',
    where: 'Presencial / Online',
    how:   'Estabelecer documentos padrão, ritos de reuniões e formas de governança; criar opções de amostragem através de indicadores para os clientes',
    whenStart: d('Jul/1'), whenEnd: dEnd('Ago/4'),
    howMuch: 0,
  },
  {
    code: '8.4', cat: '8', status: S.P,
    what:  'Implementação e treinamento dos novos processos',
    why:   'Para garantir que toda a equipe está alinhada e aplicando os novos processos corretamente',
    who:   'Jefferson / Equipe',
    where: 'Presencial',
    how:   'Reuniões de treinamento e acompanhamento da implementação dos novos processos',
    whenStart: d('Set/1'), whenEnd: dEnd('Set/4'),
    howMuch: 0,
  },
  {
    code: '8.5', cat: '8', status: S.P,
    what:  'Avaliação e melhoria contínua dos processos internos',
    why:   'Para garantir que os processos continuam eficazes e adequados ao crescimento da empresa',
    who:   'Jefferson / Equipe',
    where: 'Presencial',
    how:   'Ciclo mensal de revisão de processos e implementação de melhorias identificadas',
    whenStart: d('Out/1'), whenEnd: dEnd('Out/3'),
    howMuch: 0,
  },
];

// ─────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Iniciando seed do Plano de Ação Genius 2026...\n');

  // 1. Busca admin
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  if (!admin) {
    console.error('❌ Nenhum usuário ADMIN encontrado. Execute o seed padrão primeiro.');
    process.exit(1);
  }
  console.log(`✅ Admin encontrado: ${admin.email}`);

  // 2. Verifica se projeto já existe (idempotente)
  let project = await prisma.project.findFirst({
    where: { name: { contains: 'Genius 2026' } },
  });

  if (project) {
    console.log(`⚠️  Projeto já existe: ${project.name} (${project.id})`);
    console.log('   Atualizando datas...');
    project = await prisma.project.update({
      where: { id: project.id },
      data: { startDate: PROJECT_DATA.startDate, endDate: PROJECT_DATA.endDate, isActive: true },
    });
  } else {
    project = await prisma.project.create({
      data: {
        ...PROJECT_DATA,
        users: { create: [{ userId: admin.id }] },
      },
    });
    console.log(`✅ Projeto criado: ${project.name} (${project.id})`);
  }

  // 3. Cria/atualiza categorias
  const catMap = {}; // code → category.id
  for (const cat of CATEGORIES) {
    let existing = await prisma.category.findFirst({
      where: { name: cat.name, projectId: project.id },
    });

    if (!existing) {
      existing = await prisma.category.create({
        data: { name: cat.name, color: cat.color, description: cat.description, projectId: project.id },
      });
      console.log(`  ✅ Categoria criada: ${cat.code} – ${cat.name}`);
    } else {
      await prisma.category.update({
        where: { id: existing.id },
        data: { color: cat.color },
      });
      console.log(`  ♻️  Categoria já existe: ${cat.name}`);
    }
    catMap[cat.code] = existing.id;
  }

  // 4. Cria/atualiza atividades
  let created = 0, updated = 0;
  for (const act of ACTIVITIES) {
    const categoryId = catMap[act.cat];
    if (!categoryId) { console.warn(`  ⚠️  Categoria ${act.cat} não encontrada para ${act.code}`); continue; }

    const existing = await prisma.activity.findFirst({
      where: { code: act.code, categoryId },
    });

    const data = {
      code:      act.code,
      what:      act.what,
      why:       act.why      || 'A definir',
      who:       act.who      || 'A definir',
      where:     act.where    || 'A definir',
      how:       act.how      || 'A definir',
      howMuch:   act.howMuch  ?? null,
      whenStart: act.whenStart,
      whenEnd:   act.whenEnd,
      status:    act.status,
      risk:      act.risk     || null,
      categoryId,
    };

    if (!existing) {
      await prisma.activity.create({ data });
      created++;
    } else {
      await prisma.activity.update({ where: { id: existing.id }, data });
      updated++;
    }
  }

  console.log(`\n✅ Atividades: ${created} criadas, ${updated} atualizadas`);
  console.log(`\n🎉 Seed concluído!`);
  console.log(`   Projeto: ${project.name}`);
  console.log(`   ID: ${project.id}`);
  console.log(`   Categorias: ${CATEGORIES.length}`);
  console.log(`   Atividades: ${ACTIVITIES.length}`);
  console.log(`\n   Acesse: https://genius-5w2h.onrender.com`);
}

main()
  .catch(e => { console.error('❌ Erro:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
