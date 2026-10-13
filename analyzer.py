import re
import pandas as pd


class WhatsAppAnalyzer:
    """
    Classe responsavel por carregar, processar e analisar dados
    de conversas exportadas do WhatsApp em formato .txt.
    """

    def __init__(self):
        self.df = pd.DataFrame(columns=['data', 'hora', 'nome do remetente', 'mensagem'])

    def parse_text(self, text_content: str) -> pd.DataFrame:
        """
        Processa o conteudo textual de um arquivo de conversa do WhatsApp
        e o converte em um DataFrame estruturado do Pandas.

        Suporta padroes de exportacao do Android e do iOS, alem de mensagens
        multilinha e descarte de notificacoes de sistema.

        Parametros:
            text_content (str): Texto completo do arquivo .txt exportado.

        Retorno:
            pd.DataFrame: DataFrame com as colunas 'data', 'hora', 'nome do remetente', 'mensagem'.
        """
        time_pattern = re.compile(
            r'^\[?(\d{1,2}/\d{1,2}/\d{2,4})[,\s]+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[apAP][mM])?)\]?(?:\s*-\s*)?(.*)$'
        )

        messages = []
        current_entry = None

        lines = text_content.splitlines()

        for line in lines:
            clean_line = line.strip('\ufeff\r\n').replace('\u202f', ' ').replace('\xa0', ' ')
            if not clean_line:
                continue

            match = time_pattern.match(clean_line)
            if match:
                raw_date = match.group(1)
                raw_time = match.group(2)
                remainder = match.group(3)

                if ': ' in remainder:
                    sender, content = remainder.split(': ', 1)

                    parts = raw_date.split('/')
                    if len(parts) == 3 and len(parts[2]) == 2:
                        raw_date = f"{int(parts[0]):02d}/{int(parts[1]):02d}/20{parts[2]}"
                    elif len(parts) == 3:
                        raw_date = f"{int(parts[0]):02d}/{int(parts[1]):02d}/{parts[2]}"

                    current_entry = {
                        'data': raw_date,
                        'hora': raw_time,
                        'nome do remetente': sender.strip(),
                        'mensagem': content.strip()
                    }
                    messages.append(current_entry)
                else:
                    current_entry = None
            else:
                if current_entry is not None:
                    current_entry['mensagem'] += '\n' + clean_line

        self.df = pd.DataFrame(messages, columns=['data', 'hora', 'nome do remetente', 'mensagem'])
        return self.df

    def get_summary(self) -> list:
        """
        Gera o resumo estatistico de participacao por remetente, ordenando
        do maior volume de mensagens para o menor.

        Retorno:
            list[dict]: Lista com remetente, total de mensagens e percentual.
        """
        if self.df.empty:
            return []

        counts = self.df['nome do remetente'].value_counts()
        total_messages = len(self.df)

        summary = []
        for sender, count in counts.items():
            percentage = round((count / total_messages) * 100, 2)
            summary.append({
                'nome do remetente': sender,
                'total_mensagens': int(count),
                'percentual': percentage
            })
        return summary

    def filter_by_sender(self, sender_name: str) -> list:
        """
        Filtra as mensagens enviadas por um remetente especifico.

        Parametros:
            sender_name (str): Nome do contato a ser filtrado.

        Retorno:
            list[dict]: Mensagens contendo data, hora e conteudo textual.
        """
        if self.df.empty or not sender_name:
            return []

        filtered = self.df[self.df['nome do remetente'] == sender_name]
        return filtered[['data', 'hora', 'mensagem']].to_dict(orient='records')

    def get_sender_daily_histogram(self, sender_name: str = None) -> dict:
        """
        Calcula a contagem de mensagens agrupadas por data para o remetente selecionado.

        Parametros:
            sender_name (str, opcional): Nome do remetente para filtragem.

        Retorno:
            dict: Dicionario com 'labels' e 'values'.
        """
        if self.df.empty:
            return {'labels': [], 'values': []}

        target_df = self.df if not sender_name else self.df[self.df['nome do remetente'] == sender_name]
        if target_df.empty:
            return {'labels': [], 'values': []}

        temp_df = target_df.copy()
        temp_df['dt'] = pd.to_datetime(temp_df['data'], format='%d/%m/%Y', errors='coerce')
        temp_df = temp_df.dropna(subset=['dt'])

        grouped = temp_df.groupby('dt').size().sort_index()

        labels = [dt.strftime('%d/%m/%Y') for dt in grouped.index]
        values = grouped.values.tolist()

        return {'labels': labels, 'values': values}

    def get_pie_chart_data(self) -> dict:
        """
        Gera os dados para o grafico de pizza com a distribuicao percentual
        e quantitativa de mensagens por remetente.

        Retorno:
            dict: Dicionario com 'labels', 'counts' e 'percentages'.
        """
        if self.df.empty:
            return {'labels': [], 'counts': [], 'percentages': []}

        counts = self.df['nome do remetente'].value_counts()
        total = len(self.df)

        labels = counts.index.tolist()
        counts_list = counts.values.tolist()
        percentages = [round((c / total) * 100, 2) for c in counts_list]

        return {
            'labels': labels,
            'counts': counts_list,
            'percentages': percentages
        }

    def get_timeline_data(self) -> dict:
        """
        Gera a serie temporal da quantidade de mensagens ao longo do tempo (data)
        para todos os remetentes, garantindo que todos estejam presentes e ordenados.

        Retorno:
            dict: Dicionario com lista de 'dates' e lista de 'series' com contagens diarias.
        """
        if self.df.empty:
            return {'dates': [], 'series': []}

        temp_df = self.df.copy()
        temp_df['dt'] = pd.to_datetime(temp_df['data'], format='%d/%m/%Y', errors='coerce')
        temp_df = temp_df.dropna(subset=['dt'])

        pivot = temp_df.pivot_table(
            index='dt',
            columns='nome do remetente',
            values='mensagem',
            aggfunc='count',
            fill_value=0
        ).sort_index()

        dates = [dt.strftime('%d/%m/%Y') for dt in pivot.index]

        series = []
        for sender in pivot.columns:
            series.append({
                'sender': sender,
                'counts': pivot[sender].tolist()
            })

        return {'dates': dates, 'series': series}

    def get_all_records(self) -> list:
        """
        Retorna todos os registros do DataFrame completo.

        Retorno:
            list[dict]: Lista de dicionarios com data, hora, nome do remetente e mensagem.
        """
        if self.df.empty:
            return []
        return self.df.to_dict(orient='records')

    def get_senders(self) -> list:
        """
        Retorna a lista ordenada dos nomes unicos de todos os remetentes.

        Retorno:
            list[str]: Nomes dos remetentes.
        """
        if self.df.empty:
            return []
        return sorted(self.df['nome do remetente'].unique().tolist())
