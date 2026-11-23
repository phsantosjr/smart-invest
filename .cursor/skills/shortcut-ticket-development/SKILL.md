---
name: shortcut-ticket-development
description: Lê stories do Shortcut via MCP, extrai critérios de aceite e produz plano de implementação para integrador ou integrador-front-end. Use quando o usuário informar número/link da story, pedir análise de ticket ou planejamento antes de codar. Não implementa código sem aprovação explícita do plano.
---

# Desenvolvimento guiado por Shortcut

Fluxo **somente planejamento** (v1): o agente investiga o ticket e propõe como implementar; **não altera código** até o desenvolvedor aprovar o plano.

## Pré-requisitos

- MCP **`user-shortcut`** configurado no Cursor.
- Workspace com o código alvo aberto (`integrador` ou `integrador-front-end`).
- Opcional: `stories-get-branch-name` para sugerir nome de branch.

## Entrada do usuário

Aceite qualquer um:

- ID público da story (número)
- URL do Shortcut contendo o ID
- Título aproximado → use `stories-search` se o ID não for claro

## Passo 1 — Carregar a story

```
stories-get-by-id → storyPublicId: <id>
```

Registre:

- Nome, descrição, tipo, estado, dono, epic/projeto
- Critérios de aceite (descrição, checklist, comentários fixados)
- Subtarefas (`stories-search` ou campos da story)
- Links externos (PR, Figma) via `external_links` / comentários

Se não encontrar: `stories-search` com termos da descrição do usuário.

## Passo 2 — Classificar o repositório

| Sinais no ticket | Repo provável | Agente depois do OK |
|------------------|---------------|---------------------|
| API, Django, Celery, migration, DRF | `integrador/` | `backend-developer` |
| Tela, React, Redux, Vitest | `integrador-front-end/` | `frontend-developer` |
| Ambos | Plano em duas fases com ordem explícita | ambos agentes |

Em dúvida, pergunte em uma frase antes de detalhar o plano.

## Passo 3 — Contexto do sistema (somente leitura)

1. **Documentação primeiro**
   - Backend: `integrador/_docs/` (README do domínio, `SPEC-*`, `ADR-*`).
   - Frontend: `integrador-front-end/.docs/`.
   - Full-stack: ler ambos quando o ticket cruza API e tela.
2. **Se não houver doc para o escopo:** varrer código (`grep`, seguir imports a partir de rotas/views/services).
3. Rules em `manifest/projects.yaml`.
4. No plano, seção **Contexto consultado** (paths dos docs ou dos arquivos de código).
5. Listar arquivos que **provavelmente** mudam (não é compromisso de diff final).

## Passo 4 — Plano (template obrigatório)

Responda em **português (BR)**:

```markdown
# Plano — [SC-12345] Título da story

## Entendimento
[2–4 frases do que o ticket pede]

## Critérios de aceite
- [ ] CA1 — como validar
- [ ] CA2 — ...

## Lacunas / perguntas
- Pergunta 1 (bloqueia? sim/não)

## Contexto consultado
- Docs: …
- Código (se sem doc): …

## Repositório e escopo
- Repo: integrador | integrador-front-end
- Fora de escopo: ...

## Arquivos prováveis
| Arquivo | Mudança prevista |
|---------|------------------|

## Abordagem técnica
1. ...
2. ...

## Testes
- Backend: `python manage.py test ...`
- Frontend: `npm run test ...`

## Riscos
- ...

## Próximo passo após aprovação
- Agente sugerido: ...
- Branch sugerida: [opcional: stories-get-branch-name]
```

## Passo 5 — Gate de aprovação

Encerre com:

> **Aprovar este plano para iniciar a implementação?** (sim / ajustar / cancelar)

- **sim** → indique qual agente ativar (`backend-developer` ou `frontend-developer`) e relembre escopo aprovado.
- **ajustar** → colete feedback e revise só as seções afetadas.
- **cancelar** → pare.

**Proibido** sem "sim" explícito: editar arquivos, criar branch, commit, comentar na story como "feito".

## Passo 6 — Opcional pós-aprovação

Só se o usuário pedir após implementação futura:

- `stories-create-comment` com resumo técnico
- `stories-add-external-link` com URL do PR

## Ferramentas Shortcut úteis

| Ferramenta | Quando |
|------------|--------|
| `stories-get-by-id` | Story principal |
| `stories-search` | Achar ID ou stories relacionadas |
| `stories-get-history` | Mudanças recentes no escopo |
| `stories-get-branch-name` | Nome de branch padrão do time |
| `stories-create-comment` | Atualização de status (só com pedido) |

## Erros comuns

- **401/403 MCP:** pedir ao dev verificar auth do Shortcut no Cursor.
- **Story vaga:** listar perguntas em Lacunas; não inventar requisitos.
- **Ticket só frontend mas exige API:** plano em duas PRs ordem backend → frontend.