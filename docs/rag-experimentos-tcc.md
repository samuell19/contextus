# Plano de Experimentos RAG para o TCC

## Objetivo

Este documento consolida a proposta de experimentos para avaliar o impacto de RAG, memoria resumida e contexto recuperado na qualidade das respostas do sistema. O foco e medir, de forma demonstrativa e defensavel, se o uso de conhecimento externo melhora a precisao, reduz alucinacao e compensa o custo adicional de contexto.

## Base de inspiracao

### `2202.01110v2 - A Survey on Retrieval-Augmented Text Generation`

Este artigo serve como base teorica. Ele mostra que retrieval-augmented generation deve ser avaliado na tarefa final, e nao apenas pela busca isolada. Para o TCC, isso sustenta a ideia de comparar o comportamento do agente em cenarios reais de uso, como perguntas factuais, integracao de contexto e sessoes mais longas.

### `2302.04761v1 - Toolformer`

Este artigo inspira o desenho experimental. A principal ideia aproveitada aqui e comparar o mesmo modelo em condicoes diferentes:

- sem ajuda externa
- com contexto adicional
- com acesso a conhecimento recuperado

O artigo mede melhora por desempenho em tarefas downstream. No TCC, essa logica sera adaptada para comparar o mesmo agente em modos distintos, medindo acerto, abstencao correta e alucinacao.

### `2312.10997v5 - Retrieval-Augmented Generation for Large Language Models: A Survey`

Este e o artigo mais importante para a parte de avaliacao. A proposta de experimentos abaixo reutiliza especialmente estes eixos:

- `answer faithfulness`
- `answer relevance`
- `negative rejection`
- `information integration`
- `noise robustness`
- metricas de retrieval como `Hit Rate`, `MRR` e `nDCG`, quando houver avaliacao do retriever isoladamente

## Hipotese central

O uso de RAG deve:

1. aumentar a taxa de acerto em perguntas dependentes de base documental
2. reduzir respostas inventadas quando a base nao contem a informacao
3. melhorar respostas que exigem juntar mais de um trecho
4. manter custo de contexto controlado quando combinado com memoria resumida

## Modos comparados

Os experimentos devem comparar quatro modos de execucao:

### 1. `LLM puro`

Recebe apenas a pergunta do usuario.

Uso:

- baseline principal
- mede como o modelo responde sem ajuda externa

### 2. `Memoria resumida`

Recebe a pergunta, um resumo curto da sessao e poucos turnos recentes.

Uso:

- mede se a continuidade da conversa ajuda sem uso de RAG
- importante para o teste de sessao longa

### 3. `RAG enxuto`

Recebe a pergunta e poucos chunks relevantes da base, dentro de um orcamento pequeno de contexto.

Uso:

- mede o ganho de precisao com recuperacao externa
- ajuda a discutir custo vs qualidade

### 4. `RAG + memoria`

Recebe a pergunta, resumo da sessao, turnos recentes e chunks relevantes da base.

Uso:

- modo mais completo
- mede o ganho combinado de memoria e base externa

## Cenarios de teste

Para evitar que o experimento fique restrito a "tem arquivo ou nao tem arquivo", os cenarios devem cobrir recuperacao, raciocinio aplicado e comportamento seguro.

### 1. `Factual`

Objetivo:

- verificar se o sistema encontra um fato direto e exato na base

Exemplo:

- "Qual e o horario oficial do backup?"

Comportamento esperado:

- `LLM puro` pode falhar ou responder genericamente
- modos com `RAG` devem recuperar e responder o valor correto

### 2. `Unanswerable`

Objetivo:

- verificar se o sistema sabe dizer que nao encontrou informacao suficiente

Exemplo:

- "Qual e o nome do diretor financeiro da empresa?"

Comportamento esperado:

- resposta ideal admite que a base nao traz o dado
- inventar um nome conta como alucinacao

### 3. `Conflicting`

Objetivo:

- verificar se o sistema prioriza o contexto mais atual ou correto

Exemplo:

- documento antigo: plano Pro custa R$ 99
- documento atual: plano Pro custa R$ 129
- pergunta: "Qual e o preco atual do plano Pro?"

Comportamento esperado:

- modos com `RAG` devem favorecer o dado correto e atual

### 4. `Multi-document`

Objetivo:

- medir se o sistema consegue integrar informacoes de mais de um trecho

Exemplo:

- documento A: deploy exige aprovacao do time de Plataforma
- documento B: a aprovacao deve ser registrada no painel Orion
- pergunta: "Como funciona o fluxo de deploy em producao?"

Comportamento esperado:

- a resposta correta deve citar os dois pontos essenciais

### 5. `Noise robustness`

Objetivo:

- verificar se o sistema continua correto mesmo com ruido no contexto

Exemplo:

- junto dos chunks corretos, incluir 1 ou 2 trechos relacionados mas irrelevantes

Comportamento esperado:

- o modelo nao deve se desviar por conta do ruido

### 6. `Aplicacao documental`

Objetivo:

- avaliar se o sistema apenas encontra o dado ou se consegue aplica-lo

Exemplo:

- a base informa preco, desconto anual e taxa de implantacao
- pergunta: "Quanto custa o primeiro ano para 3 clinicas no plano Pro com implantacao?"

Comportamento esperado:

- o sistema deve recuperar os valores corretos e aplicar a regra corretamente

Observacao:

- este teste e melhor que matematica pura, porque exige recuperacao + interpretacao + calculo

### 7. `Sessao longa comprimida`

Objetivo:

- avaliar continuidade de contexto sem reenviar historico inteiro para a API

Exemplo:

- no inicio da conversa o usuario define publico, prazo e orcamento
- depois de varios turnos pergunta novamente esses dados

Comportamento esperado:

- `Memoria resumida` e `RAG + memoria` devem lembrar corretamente os fatos centrais

## Metricas principais

As metricas prioritarias do TCC devem ser simples, fortes e interpretaveis.

### 1. `Taxa de acerto`

Quantos cenarios o modo respondeu corretamente.

### 2. `Taxa de abstencao correta`

Quantas vezes o sistema soube dizer "nao sei" ou "nao encontrei base suficiente" quando a resposta nao estava na base.

### 3. `Taxa de alucinacao`

Quantas vezes o sistema:

- inventou informacao
- respondeu sem suporte suficiente
- escolheu um dado errado diante de contexto conflitante

### 4. `Latencia media`

Tempo medio de resposta por modo.

### 5. `Tokens medios de prompt`

Quanto contexto cada modo consumiu.

### 6. `Economia de contexto`

Especialmente importante para sessao longa. Mede quantos tokens foram poupados ao usar resumo e selecao de contexto em vez de reenviar todo o historico.

## Metricas opcionais

Estas metricas podem ser adicionadas depois, caso a implementacao do retriever fique mais madura:

- `Hit Rate`
- `MRR`
- `nDCG`

Elas fazem mais sentido quando houver avaliacao isolada do modulo de recuperacao, com chunks esperados anotados por cenario.

## Leitura esperada dos resultados

Se os experimentos seguirem a hipotese central, espera-se observar o seguinte:

- `LLM puro` com menor acerto em perguntas documentais
- `Memoria resumida` melhor desempenho em continuidade de sessao, mas sem substituir RAG
- `RAG enxuto` como melhor equilibrio entre acerto e custo
- `RAG + memoria` como modo mais robusto em cenarios que exigem base + historico

## Conclusao metodologica

Para o TCC, o experimento nao deve ser apresentado apenas como "o sistema encontrou o arquivo certo". O ideal e mostrar tres camadas:

1. `Recuperacao`: o sistema encontra o contexto relevante
2. `Aplicacao`: o sistema usa esse contexto para responder, integrar regras ou calcular corretamente
3. `Seguranca`: o sistema evita inventar quando a base nao sustenta a resposta

Esse desenho deixa a avaliacao mais forte, mais proxima da literatura recente e mais convincente para discutir a utilidade real de RAG no sistema.
