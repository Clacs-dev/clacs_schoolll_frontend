/* Ícones de traço simples (24×24, stroke 1.8), no estilo SF Symbols / Material Symbols "outlined". */
const PATHS: Record<string, string> = {
  home: 'M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  gestao: 'M4 6h16M4 12h16M4 18h16',
  painel: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  aluno: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21c0-4 4-6 8-6s8 2 8 6',
  financeiro: 'M3 6h18v12H3zM3 10h18M7 15h3',
  docente: 'M3 5h18v11H3zM8 21l4-5 4 5M7 9h6',
  academico: 'M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6',
  secretaria: 'M3 7h6l2 2h10v10H3zM3 7V5h6l2 2',
  comunicacao: 'M4 5h16v11H8l-4 4z',
  admin: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z',
  config: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 1-2-1V5h-4v2l-2 1-2-1-2 4 2 1v2l-2 1 2 4 2-1 2 1v2h4v-2l2-1 2 1 2-4-2-1z',
  sair: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  tema: 'M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z',
  mais: 'M12 5v14M5 12h14',
  procurar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  pessoas: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-3.5 3-6 7-6s7 2.5 7 6M16 3.5a4 4 0 0 1 0 7.5M18 15c2.4.6 4 2.7 4 6',
  turma: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  calendario: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  alerta: 'M12 4 2 20h20zM12 10v4M12 17v.5',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
  visto: 'M5 12l5 5 9-10',
  seta: 'M5 12h14M13 6l6 6-6 6',
  sino: 'M6 9a6 6 0 1 1 12 0c0 6 2 8 2 8H4s2-2 2-8M10 21h4',
  relogio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  notas: 'M4 4h16v16H4zM8 9h8M8 13h8M8 17h5',
  matricula: 'M15 19c0-2.5-2.7-4-6-4s-6 1.5-6 4M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 8v6M16 11h6',
}

export const Icone = ({ n, size = 18 }: { n: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={PATHS[n] ?? PATHS.doc} />
  </svg>
)
