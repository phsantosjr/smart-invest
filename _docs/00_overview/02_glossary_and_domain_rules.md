# Glossário e Regras de Domínio

## 1. Glossário de Termos
* **Household:** Núcleo de relacionamento (família ou grupo próximo) liderado por um usuário principal (*main user*) que organiza membros e libera permissões de visualização.
* **Main User (Titular da Household):** Usuário responsável pela administração do grupo familiar e pela concessão/revogação de acesso de leitura (`can_view`) entre membros.
* **Brokerage Account (Conta de Investimento):** Conta vinculada a um único usuário e a uma instituição financeira (`institutions`), como XP ou Banco Inter.
* **Preço Médio (PM):** Custo médio ponderado por quantidade das posições em aberto, calculado dinamicamente por query no PostgreSQL a cada consulta da carteira.
* **Valuation (Marcação Manual de Renda Fixa):** Registro datado do saldo bruto (`current_value`) e do capital inicial (`applied_value` / valor aplicado) informados manualmente pelo usuário para um ativo de renda fixa, permitindo comparar evolução e ganho/perda entre datas.

## 2. Regras de Negócio Fundamentais
1. **Unicidade de Conta por Usuário:** Cada conta em banco/corretora pertence a um único usuário (`user_id`). Compartilhamento entre membros ocorre via permissão explícita na *household*, não dividindo a mesma conta de corretora.
2. **Permissão Explícita na Household:** Um membro só visualiza dados de outro membro da *household* se houver permissão ativa (`can_view = true`) configurada pelo *main user*.
3. **Ativos sem Ticker:** Renda Fixa e outros instrumentos sem código de negociação em bolsa podem ter `ticker = NULL`, com índice único parcial aplicado apenas quando `ticker IS NOT NULL`.
4. **Precisão Numérica:** Valores monetários e quantidades devem utilizar tipos decimais exatos (`NUMERIC` no PostgreSQL / `Decimal` no Python), nunca ponto flutuante binário (`float`).
5. **Extensibilidade de Cotações:** A busca de preços de mercado deve passar por abstração via *Factory Pattern* para permitir troca ou adição de provedores sem alterar o domínio.