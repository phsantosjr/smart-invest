# Paleta de Cores e Temas (Light & Dark Mode)

## 1. Paleta Base Definida
A identidade visual do frontend utiliza a seguinte paleta de cores extraída da referência visual:

| Papel na Paleta | Hex | RGB | Uso Sugerido na Interface |
| :--- | :--- | :--- | :--- |
| **Roxo Profundo (Primária / Autoridade)** | `#4A249D` | `rgb(74, 36, 157)` | Destaques primários, botões de ação principais, badges de *Household / Main User*, cabeçalhos ativos e foco interativo. |
| **Ciano / Azul-Petroleo (Secundária / Dados)** | `#009FBD` | `rgb(0, 159, 189)` | Indicadores secundários, séries em gráficos de alocação/evolução, links e estados informativos. |
| **Areia / Creme Quente (Acento Suave)** | `#F9E2AF` | `rgb(249, 226, 175)` | Destaque suave para avisos/alertas não críticos, tags de Renda Fixa / marcação manual e superfícies de ênfase moderada. |
| **Cinza Claro Neutro (Superfície Clara)** | `#F6F5F5` | `rgb(246, 245, 245)` | Superfície base clara no **Light Mode**, fundos de cards secundários e separadores neutros. |

## 2. Aplicação em Light Mode e Dark Mode
* **Light Mode:**
  * Fundo principal claro utilizando `#F6F5F5` e superfícies brancas/neutras de alto contraste para tabelas numéricas e gráficos.
  * Ações primárias e navegação ativa com `#4A249D` (garantindo texto branco `#FFFFFF` de alto contraste).
  * Informações analíticas e métricas secundárias com `#009FBD`.
  * Realces pontuais e indicadores de observação com `#F9E2AF` (sempre acompanhados de texto escuro de alto contraste).
* **Dark Mode:**
  * Fundos escuros profundos (ex: tons neutros escuros) para reduzir fadiga visual durante análise de carteiras.
  * Preservação de `#009FBD` e `#F9E2AF` para acentos, gráficos e badges, ajustando superfícies com `#4A249D` e variações tonais para manter contraste legível (`WCAG AA`).

## 3. Diretrizes de UI e Acessibilidade Financeira
* **Precisão Visual em Números:** Em tabelas de carteira, preço médio, quantidade e rentabilidade, priorize legibilidade, alinhamento tabular (`tabular-nums`) e contraste claro entre ganhos e perdas sem depender exclusivamente de cor.
* **Integração com Redux:** O estado do tema (`themeMode: 'light' | 'dark'`) fica centralizado no slice de UI/configurações e sincronizado com o `localStorage` e classes/variáveis CSS (`CSS Custom Properties` / Tailwind).