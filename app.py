import os
from flask import Flask, render_template, request, jsonify
from analyzer import WhatsAppAnalyzer

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # Limite de 32MB para upload

analyzer_instance = WhatsAppAnalyzer()


@app.route('/')
def index():
    """
    Rota principal que renderiza a interface grafica do sistema.
    """
    return render_template('index.html')


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """
    Endpoint para upload e processamento do arquivo de texto do WhatsApp.

    Recebe o arquivo via multipart/form-data, decodifica o conteudo textual
    e popula o DataFrame interno do WhatsAppAnalyzer.

    Retorno:
        JSON com contagem total de mensagens, quantidade de remetentes e status.
    """
    global analyzer_instance

    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400

    uploaded_file = request.files['file']
    if uploaded_file.filename == '':
        return jsonify({'error': 'Arquivo vazio'}), 400

    try:
        content_bytes = uploaded_file.read()
        try:
            content_text = content_bytes.decode('utf-8')
        except UnicodeDecodeError:
            content_text = content_bytes.decode('latin-1')

        new_analyzer = WhatsAppAnalyzer()
        df = new_analyzer.parse_text(content_text)

        if df.empty:
            return jsonify({'error': 'Nenhuma mensagem valida encontrada no arquivo'}), 422

        analyzer_instance = new_analyzer

        return jsonify({
            'status': 'success',
            'total_messages': len(df),
            'total_senders': len(new_analyzer.get_senders()),
            'senders': new_analyzer.get_senders()
        })
    except Exception as exc:
        return jsonify({'error': f'Falha no processamento: {str(exc)}'}), 500


@app.route('/api/load-sample', methods=['POST'])
def load_sample():
    """
    Endpoint para carregamento rapido de uma conversa de teste pre-definida.
    Util para demonstracoes e validacao de funcionalidades.
    """
    global analyzer_instance

    sample_path = os.path.join(app.root_path, 'sample_chat.txt')
    if not os.path.exists(sample_path):
        return jsonify({'error': 'Arquivo de exemplo nao encontrado'}), 404

    try:
        with open(sample_path, 'r', encoding='utf-8') as f:
            content = f.read()

        new_analyzer = WhatsAppAnalyzer()
        df = new_analyzer.parse_text(content)
        analyzer_instance = new_analyzer

        return jsonify({
            'status': 'success',
            'total_messages': len(df),
            'total_senders': len(new_analyzer.get_senders()),
            'senders': new_analyzer.get_senders()
        })
    except Exception as exc:
        return jsonify({'error': f'Falha ao carregar exemplo: {str(exc)}'}), 500


@app.route('/api/dataframe', methods=['GET'])
def get_dataframe():
    """
    Endpoint que retorna os registros completos do DataFrame do Pandas.
    Contem as colunas: data, hora, nome do remetente e mensagem.
    """
    records = analyzer_instance.get_all_records()
    return jsonify({
        'total': len(records),
        'data': records
    })


@app.route('/api/summary', methods=['GET'])
def get_summary():
    """
    Endpoint do Resumo das Conversas.
    Retorna a lista de remetentes ordenada pelo maior total de mensagens para o menor.
    """
    summary = analyzer_instance.get_summary()
    return jsonify(summary)


@app.route('/api/history', methods=['GET'])
def get_history():
    """
    Endpoint do Historico do Remetente.
    Filtra as mensagens por remetente enviando data, hora e conteudo textual.

    Parametros de consulta (Query Params):
        sender (str): Nome exato do remetente a ser filtrado.
    """
    sender = request.args.get('sender', '')
    history = analyzer_instance.filter_by_sender(sender)
    return jsonify(history)


@app.route('/api/chart/histogram', methods=['GET'])
def get_histogram_chart():
    """
    Endpoint para geracao de dados do Histograma de conversas por dia.
    Permite filtrar por um remetente especifico ou obter dados consolidados.

    Parametros de consulta (Query Params):
        sender (str, opcional): Nome do remetente.
    """
    sender = request.args.get('sender', None)
    if sender == '':
        sender = None
    data = analyzer_instance.get_sender_daily_histogram(sender)
    return jsonify(data)


@app.route('/api/chart/pie', methods=['GET'])
def get_pie_chart():
    """
    Endpoint para geracao do Grafico de Pizza com o percentual de mensagens de cada remetente.
    """
    data = analyzer_instance.get_pie_chart_data()
    return jsonify(data)


@app.route('/api/chart/timeline', methods=['GET'])
def get_timeline_chart():
    """
    Endpoint para geracao do Grafico de Linhas temporal com todos os remetentes presentes.
    """
    data = analyzer_instance.get_timeline_data()
    return jsonify(data)


@app.route('/api/senders', methods=['GET'])
def get_senders_list():
    """
    Endpoint auxiliar que fornece a relacao ordenada de todos os remetentes unicos.
    """
    return jsonify(analyzer_instance.get_senders())


if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
