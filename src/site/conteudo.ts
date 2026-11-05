/* Todo o texto e fotografias do site público, num só sítio para a escola poder rever e actualizar. */

export const ESCOLA = 'Talatona Kids'

export const CONTACTOS = {
  telefone: '+244 948 983 907',
  whatsapp: 'https://wa.me/244948983907',
  email: 'secretaria@talatonakids.com',
  facebook: { nome: '@talatonakids', url: 'https://www.facebook.com/talatonakids' },
  instagram: { nome: '@talatona_kids', url: 'https://www.instagram.com/talatona_kids' },
  morada: 'Rua Pedro de Castro Van-Dúnem Loy N.º 10, Condomínio Zeus, Belas',
  mapa: 'https://www.google.com/maps/search/?api=1&query=Rua+Pedro+de+Castro+Van-D%C3%BAnem+Loy+10+Condom%C3%ADnio+Zeus+Belas+Luanda',
}

export const MENU: [string, string][] = [
  ['/oferta-educativa', 'Oferta educativa'],
  ['/candidatura', 'Pré-inscrição'],
  ['/galeria', 'Galeria'],
  ['/contactos', 'Contactos'],
]

export const FOTOS = {
  criancas: { src: '/site/criancas-sala.jpg', alt: 'Duas alunas a sorrir, sentadas à mesa na sala de aula' },
  turma: { src: '/site/turma.jpg', alt: 'Turma a trabalhar numa sala colorida' },
  edificio: { src: '/site/edificio.jpg', alt: 'Edifício da escola com a indicação Creche, Pré-Escolar e Ensino Primário' },
}

export type Categoria = 'momentos' | 'aprender' | 'espacos'
export type Foto = { src: string; alt: string; cat: Categoria }

const g = (n: number, cat: Categoria, alt: string): Foto => ({ src: `/site/galeria/g${String(n).padStart(2, '0')}.jpg`, alt, cat })

// Para trocar por fotografias melhores, basta substituir o ficheiro em public/site/galeria com o mesmo nome.
export const GALERIA: Foto[] = [
  g(2, 'momentos', 'Três amigos a fazer poses divertidas junto às mesas'),
  g(3, 'momentos', 'Grupo de alunas a brincar com poses para a fotografia'),
  g(4, 'aprender', 'Duas alunas a criar figuras coloridas com materiais de modelagem'),
  g(5, 'momentos', 'Dois rapazes a mostrar, orgulhosos, os seus trabalhos'),
  g(7, 'momentos', 'Quatro alunos abraçados na sala de aula'),
  g(1, 'aprender', 'Aluna concentrada numa mesa cheia de lápis coloridos'),
  g(10, 'momentos', 'Alunas a rir e a conversar à mesa'),
  g(6, 'aprender', 'Alunas a trabalhar em conjunto num projecto na sala'),
  g(9, 'momentos', 'Três colegas abraçados, à janela da sala'),
  g(11, 'momentos', 'Quatro alunos sentados à mesa, com mapas de África na parede'),
  g(13, 'aprender', 'Alunos com computadores na sala, junto ao círculo cromático'),
  g(8, 'momentos', 'Dois alunos a sorrir, um deles com o polegar levantado'),
  g(14, 'aprender', 'Duas meninas a fazer um trabalho manual na sala'),
  g(15, 'momentos', 'Aluna a sorrir, com a turma sentada ao fundo'),
  g(12, 'aprender', 'Turma completa em plena aula'),
  g(17, 'espacos', 'Aluno a arrumar a mochila no corredor das salas'),
  g(16, 'espacos', 'Corredor luminoso com as mochilas penduradas'),
  g(18, 'espacos', 'Corredor colorido com vista para o jardim interior'),
  g(19, 'espacos', 'Pavilhão desportivo com tabela de basquetebol'),
  g(20, 'espacos', 'Pavilhão coberto com balizas e campo desportivo'),
  g(21, 'espacos', 'Galerias do edifício da escola'),
  g(22, 'espacos', 'Árvore no pátio central da escola'),
]

export const CATEGORIAS: [Categoria | 'todas', string][] = [
  ['todas', 'Todas'],
  ['momentos', 'Momentos'],
  ['aprender', 'A aprender'],
  ['espacos', 'Os nossos espaços'],
]

export const VALORES = [
  { t: 'Educação com propósito', d: 'Ensino orientado para o cumprimento dos programas curriculares, ampliando sempre que necessário os seus objectivos e articulando o saber com o saber ser.', cor: 'ceu' },
  { t: 'Acolhimento humanizado', d: 'Um ambiente educativo seguro, afectuoso e respeitoso, onde cada criança se sente valorizada, escutada e parte de uma comunidade.', cor: 'mag' },
  { t: 'Crescimento individual e colectivo', d: 'Uma convivência democrática, onde cada opinião é considerada e o diálogo é promovido como ferramenta de crescimento mútuo.', cor: 'verde' },
  { t: 'Inovação', d: 'Incentivo à curiosidade, ao pensamento crítico e ao uso de metodologias activas, respeitando a diversidade de contextos socioculturais.', cor: 'lar' },
  { t: 'Educação transformadora', d: 'A aprendizagem como força motriz de transformação pessoal e social, com impacto positivo nas crianças, nas famílias e na comunidade.', cor: 'sol' },
] as const

export const DIFERENCIAIS = [
  { t: 'Metodologias activas', d: 'Aprendizagem prática e participativa que estimula o pensamento crítico.' },
  { t: 'Ambiente acolhedor', d: 'Espaço seguro e afectuoso que valoriza e respeita cada criança.' },
  { t: 'Educação transformadora', d: 'Formação integral que prepara para fazer a diferença no mundo.' },
  { t: 'Desenvolvimento individual', d: 'Atenção personalizada, respeitando o ritmo e o potencial de cada criança.' },
]

export const PROJECTO = [
  { t: 'Estrutura pedagógica', d: 'O Talatona Kids foi concebido por uma equipa multidisciplinar de pedagogos, médicos, arquitectos e engenheiros, para construir um ambiente escolar seguro, funcional e alinhado com as exigências do século XXI.' },
  { t: 'Coordenação educacional', d: 'A direcção pedagógica é composta por profissionais com formação sólida em educação, psicologia e saúde infantil, integrando conhecimento, bem-estar emocional e desenvolvimento físico num único projecto educativo.' },
  { t: 'Corpo docente e acompanhamento', d: 'Professores especialistas em Educação Infantil, Ensino Primário e áreas complementares. As turmas seguem as etapas do desenvolvimento infantil, com número reduzido de alunos por sala e suporte psicopedagógico contínuo.' },
]

export const CITACAO = {
  texto: 'O projecto nasceu com o objectivo de oferecer mais do que uma escola: um espaço de crescimento emocional, físico e intelectual.',
  autor: 'A fundadora, à Platinaline (2022)',
}

export const EQUIPA = [
  { nome: 'Mário Piedade', cargo: 'Director', foto: '/site/equipa-mario.jpg' },
  { nome: 'Elizabete Veloso', cargo: 'Coordenadora do Ensino Primário', foto: '/site/equipa-elizabete.jpg' },
  { nome: 'Carla Campos', cargo: 'Coordenadora do I Ciclo', foto: '/site/equipa-carla.jpg' },
]

export const TESTEMUNHOS = [
  { texto: 'Foi a melhor escolha para o meu filho. A estrutura é excelente, e os professores são super atenciosos. Ele chega todos os dias a contar o que aprendeu.', quem: 'Mãe de aluno', onde: 'Talatona' },
  { texto: 'Adorei saber que oferecem actividades como inglês e capoeira logo na infância. Está a fazer diferença no desenvolvimento motor e na comunicação da minha filha.', quem: 'Pai de aluna', onde: 'Belas' },
  { texto: 'O espaço é seguro, bem pensado, e os educadores são muito pacientes. Confio plenamente no trabalho deles.', quem: 'Encarregada de educação', onde: 'Via WhatsApp institucional' },
]

export const NIVEIS = [
  { t: 'Creche', d: 'Os primeiros passos, num ambiente seguro e cheio de afecto, onde cada criança é acolhida ao seu ritmo.', foto: '/site/galeria/g17.jpg', alt: 'Criança no corredor das salas, junto às mochilas', cor: 'mag' },
  { t: 'Pré-Escolar', d: 'Brincar, explorar e criar para desenvolver a curiosidade, a linguagem e a autonomia.', foto: '/site/galeria/g14.jpg', alt: 'Duas meninas num trabalho manual', cor: 'lar' },
  { t: 'Ensino Primário', d: 'Bases sólidas nas aprendizagens essenciais, com metodologias activas e acompanhamento próximo.', foto: '/site/galeria/g11.jpg', alt: 'Alunos do primário à mesa', cor: 'ceu' },
  { t: 'I Ciclo', d: 'Mais autonomia, pensamento crítico e responsabilidade, preparando cada aluno para os desafios seguintes.', foto: '/site/galeria/g08.jpg', alt: 'Dois alunos mais velhos a sorrir', cor: 'verde' },
] as const

export const COMPLEMENTARES = ['Inglês', 'Música', 'Educação física', 'Ballet', 'Capoeira']
