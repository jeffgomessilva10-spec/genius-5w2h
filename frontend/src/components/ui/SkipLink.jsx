/**
 * SkipLink.jsx — WCAG 2.1 Success Criterion 2.4.1
 * Permite que usuários de teclado/leitores de tela pulem direto ao conteúdo principal.
 */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      style={{
        position: 'absolute',
        top: '-100px',
        left: 16,
        background: '#F04E00',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: 6,
        fontWeight: 700,
        fontSize: '0.875rem',
        zIndex: 9999,
        textDecoration: 'none',
        transition: 'top 0.1s',
      }}
      onFocus={e => (e.currentTarget.style.top = '16px')}
      onBlur={e  => (e.currentTarget.style.top = '-100px')}
    >
      Pular para o conteúdo principal
    </a>
  );
}
