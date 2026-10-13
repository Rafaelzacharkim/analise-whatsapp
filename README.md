# Analise de Conversas do WhatsApp

Trabalho pratico de analise de dados - Avaliacao A2.

## Sobre o Projeto

Aplicacao desenvolvida em Python para analise de conversas de grupos exportadas do WhatsApp (compativel com formatos de Android e iPhone). O projeto processa o arquivo de texto bruto, estrutura os dados em um DataFrame do Pandas e apresenta os resultados em uma interface web com tabelas e graficos interativos.

## Funcionalidades Implementadas

- **DataFrame Completo**: Processamento e exibicao da tabela com as colunas padronizadas (`data`, `hora`, `nome do remetente`, `mensagem`), incluindo busca textual e descarte automatico de mensagens de sistema do WhatsApp.
- **Resumo das Conversas**: Contagem de mensagens por participante, ordenada do maior volume para o menor com calculo de porcentagem.
- **Historico do Remetente**: Filtro por participante para inspecionar as mensagens enviadas com data e horario.
- **Histograma Diario**: Grafico de barras com a quantidade de conversas por dia para cada remetente.
- **Grafico de Pizza**: Distribuicao percentual das mensagens enviadas no grupo por participante.
- **Grafico de Linhas**: Evolucao temporal da quantidade de mensagens ao longo dos dias com linhas e cores distintas para todos os remetentes.

## Tecnologias Utilizadas

- Python 3
- Pandas
- Flask
- Chart.js

## Como Executar

1. Crie e ative o ambiente virtual:
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2. Instale as dependencias:
```powershell
pip install -r requirements.txt
```

3. Inicie o servidor:
```powershell
python app.py
```
*(Ou execute diretamente: `.\venv\Scripts\python.exe app.py`)*

4. Acesse a aplicacao no navegador:
`http://127.0.0.1:5000`
