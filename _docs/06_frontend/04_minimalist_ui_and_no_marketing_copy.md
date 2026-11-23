# Diretriz de UI Minimalista e Ausência de Copy de Marketing

## 1. Objetivo de Negócio
Garantir que todas as telas e páginas do frontend (React + TypeScript + Vite + Redux Toolkit) mantenham uma abordagem **estritamente minimalista, utilitária e orientada à operação**, eliminando textos longos, explicações didáticas excessivas ou linguagem promocional/de marketing.

## 2. Princípios Fundamentais
1. **Apenas o Essencial para Operar:** Cada tela deve conter exclusivamente os elementos necessários para o usuário visualizar dados, tomar decisões e executar ações (inputs, tabelas, filtros, botões de ação e métricas diretas).
2. **Zero Copy de Marketing:** Não incluir textos persuasivos, introduções comerciais, slogans, seções explicativas sobre *"por que investir"*, *"vantagens da plataforma"* ou blocos longos de *onboarding* textual dentro das páginas operacionais.
3. **Rótulos Curtos e Objetivos:** Preferir nomes diretos de campos, ações e colunas (ex: *"E-mail"*, *"Senha"*, *"Código 2FA"*, *"Corretora"*, *"Preço Médio"*, *"Saldo Atual"*, *"Salvar"*, *"Importar PDF"*) em vez de frases explicativas.
4. **Feedback Conciso:** Mensagens de erro, sucesso ou validação devem ser curtas, claras e acionáveis (ex: *"Credenciais inválidas."*, *"Código 2FA incorreto ou expirado."*, *"Saldo atualizado."*).
5. **Hierarquia Limpa com a Paleta Definida:** Respeitar a identidade visual minimalista com **Dark Mode** e **Light Mode** e a paleta definida (`#4A249D`, `#009FBD`, `#F9E2AF`, `#F6F5F5`), mantendo respiro visual e foco nos dados numéricos.

## 3. O Que Evitar nas Telas
* Parágrafos introdutórios no topo de páginas, formulários ou modais.
* Textos de ajuda extensos explicando conceitos financeiros óbvios ou regras do sistema onde um label ou tooltip curto já basta.
* Cards decorativos ou blocos informativos sem função operacional direta no fluxo atual.
* Elementos visuais típicos de *landing pages* ou campanhas promocionais dentro da aplicação autenticada ou na tela de login.

## 4. Critérios de Aceite (BDD)

* **Cenário 1 — Foco em controles operacionais**
  * **Given** que o usuário acessa qualquer tela do sistema (ex: `/login`, `/portfolio`, `/transactions/new`, `/household`, `/imports/brokerage-note`),
  * **When** a página é renderizada,
  * **Then** devem estar visíveis apenas os controles e dados necessários para a tarefa daquela tela, sem blocos de texto promocional ou explicações longas.

* **Cenário 2 — Mensagens diretas e objetivas**
  * **Given** que ocorre uma ação bem-sucedida ou um erro de validação/autenticação,
  * **When** o feedback é exibido na interface,
  * **Then** a mensagem deve ser curta, direta e relacionada estritamente ao resultado da operação.