// ==UserScript==
// @name         Automatiza Plano de Compensação de Ausências
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Automatiza a inserção do PCA no Sigeduca
// @author       Elder Martins
// @match        http*://*/*
// @updateURL    https://raw.githubusercontent.com/donidozh/AutomatizaPCA/main/AutomatizaPCA.user.js
// @downloadURL  https://raw.githubusercontent.com/donidozh/AutomatizaPCA/main/AutomatizaPCA.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Configurações padrão dos dados
    const DADOS_PADRAO = {
        tipo: '3', // Outros
        dataInicio: '03/02/2025',
        dataFim: '04/07/2025',
        observacoes: 'Lançamento do plano de recomposição de ausências referente ao 1º e 2º bimestre, conforme Portaria Nº 299/2025/GS/SEDUC/MT.'
    };

    // Verifica se está na página correta
    if (!document.querySelector('#GEDATECOD')) {
        return;
    }

    // Cria o painel lateral
    function criarPainelLateral() {
        const painel = document.createElement('div');
        painel.id = 'painel-automacao';
        painel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            background: #f0f0f0;
            border: 2px solid #065195;
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            font-family: Verdana, sans-serif;
            font-size: 12px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        `;

        painel.innerHTML = `
            <div style="background: #065195; color: white; padding: 8px; margin: -15px -15px 10px -15px; border-radius: 6px 6px 0 0; font-weight: bold; text-align: center;">
                Automação do PCA
            </div>

            <div style="margin-bottom: 10px;">
                <strong>Dados que serão inseridos:</strong><br>
                <small style="color: #666;">
                    • Tipo: Outros<br>
                    • Início: ${DADOS_PADRAO.dataInicio}<br>
                    • Fim: ${DADOS_PADRAO.dataFim}<br>
                    • Obs: ${DADOS_PADRAO.observacoes.substring(0, 50)}...
                </small>
            </div>

            <div style="margin-bottom: 10px;">
                <label for="lista-alunos" style="font-weight: bold;">Códigos dos Alunos:</label><br>
                <textarea id="lista-alunos" placeholder="Digite os códigos dos alunos, um por linha"
                    style="width: 100%; height: 120px; margin-top: 5px; padding: 5px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace;"></textarea>
            </div>

            <div style="margin-bottom: 10px;">
                <label>
                    <input type="checkbox" id="confirmar-automatico" checked>
                    Confirmar automaticamente
                </label>
            </div>

            <div style="text-align: center;">
                <button id="btn-processar" style="background: #065195; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    Processar PCA
                </button>
                <button id="btn-parar" style="background: #cc0000; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-left: 5px; display: none;">
                    Parar
                </button>
            </div>

            <div id="status-processamento" style="margin-top: 10px; padding: 8px; background: #fff; border: 1px solid #ddd; border-radius: 4px; display: none;">
                <div id="status-texto"></div>
                <div id="progress-bar" style="width: 100%; height: 10px; background: #ddd; border-radius: 5px; margin-top: 5px;">
                    <div id="progress-fill" style="height: 100%; background: #065195; border-radius: 5px; width: 0%; transition: width 0.3s;"></div>
                </div>
            </div>
        `;

        document.body.appendChild(painel);

        // Event listeners
        document.getElementById('btn-processar').addEventListener('click', iniciarProcessamento);
        document.getElementById('btn-parar').addEventListener('click', pararProcessamento);
    }

    // Variáveis de controle
    let processandoAtestados = false;
    let codigosParaProcessar = [];
    let indiceAtual = 0;

    // Inicia o processamento
    function iniciarProcessamento() {
        const textarea = document.getElementById('lista-alunos');
        const codigos = textarea.value.trim().split('\n').filter(code => code.trim() !== '');

        if (codigos.length === 0) {
            alert('Por favor, insira pelo menos um código de aluno.');
            return;
        }

        codigosParaProcessar = codigos.map(codigo => codigo.trim());
        indiceAtual = 0;
        processandoAtestados = true;

        document.getElementById('btn-processar').style.display = 'none';
        document.getElementById('btn-parar').style.display = 'inline-block';
        document.getElementById('status-processamento').style.display = 'block';

        console.log('Iniciando processamento de', codigosParaProcessar.length, 'atestados');
        processarProximoAtestado();
    }

    // Para o processamento
    function pararProcessamento() {
        processandoAtestados = false;
        document.getElementById('btn-processar').style.display = 'inline-block';
        document.getElementById('btn-parar').style.display = 'none';
        document.getElementById('status-processamento').style.display = 'none';
        console.log('Processamento interrompido pelo usuário');
    }

    // Processa o próximo atestado da lista
    function processarProximoAtestado() {
        if (!processandoAtestados || indiceAtual >= codigosParaProcessar.length) {
            finalizarProcessamento();
            return;
        }

        const codigoAluno = codigosParaProcessar[indiceAtual];
        const progresso = Math.round(((indiceAtual + 1) / codigosParaProcessar.length) * 100);

        atualizarStatus(`Processando aluno ${codigoAluno} (${indiceAtual + 1}/${codigosParaProcessar.length})`, progresso);

        console.log(`Processando atestado ${indiceAtual + 1}/${codigosParaProcessar.length} para aluno: ${codigoAluno}`);

        preencherFormulario(codigoAluno);

        indiceAtual++;

        // Aguarda um pouco antes do próximo processamento
        setTimeout(() => {
            if (processandoAtestados) {
                processarProximoAtestado();
            }
        }, 1000);
    }

    // Preenche o formulário com os dados
    function preencherFormulario(codigoAluno) {
        try {
            // Tipo de justificativa (Outros = 3)
            const tipoSelect = document.getElementById('GEDATETIPO');
            if (tipoSelect) {
                tipoSelect.value = DADOS_PADRAO.tipo;
                // Dispara evento de mudança
                tipoSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Código do aluno
            const codigoInput = document.getElementById('GEDALUCOD');
            if (codigoInput) {
                codigoInput.value = codigoAluno;
                // Dispara eventos
                codigoInput.dispatchEvent(new Event('change', { bubbles: true }));
                codigoInput.dispatchEvent(new Event('blur', { bubbles: true }));
            }

            // Data de início
            const dataInicioInput = document.getElementById('GEDATEPERINI');
            if (dataInicioInput) {
                dataInicioInput.value = DADOS_PADRAO.dataInicio;
                dataInicioInput.dispatchEvent(new Event('change', { bubbles: true }));
                dataInicioInput.dispatchEvent(new Event('blur', { bubbles: true }));
            }

            // Data final
            const dataFimInput = document.getElementById('GEDATEPERFIN');
            if (dataFimInput) {
                dataFimInput.value = DADOS_PADRAO.dataFim;
                dataFimInput.dispatchEvent(new Event('change', { bubbles: true }));
                dataFimInput.dispatchEvent(new Event('blur', { bubbles: true }));
            }

            // Observações
            const obsTextarea = document.getElementById('GEDATEOBS');
            if (obsTextarea) {
                obsTextarea.value = DADOS_PADRAO.observacoes;
                obsTextarea.dispatchEvent(new Event('change', { bubbles: true }));
            }

            console.log(`Formulário preenchido para aluno: ${codigoAluno}`);

            // Se deve confirmar automaticamente
            if (document.getElementById('confirmar-automatico').checked) {
                setTimeout(() => {
                    const btnConfirmar = document.querySelector('input[name="BCONFIRMAR"]');
                    if (btnConfirmar) {
                        btnConfirmar.click();
                        console.log(`Atestado confirmado para aluno: ${codigoAluno}`);
                    }
                }, 500);
            }

        } catch (error) {
            console.error('Erro ao preencher formulário:', error);
            atualizarStatus(`Erro ao processar aluno ${codigoAluno}: ${error.message}`, null);
        }
    }

    // Atualiza o status do processamento
    function atualizarStatus(texto, progresso = null) {
        const statusTexto = document.getElementById('status-texto');
        const progressFill = document.getElementById('progress-fill');

        if (statusTexto) {
            statusTexto.textContent = texto;
        }

        if (progresso !== null && progressFill) {
            progressFill.style.width = progresso + '%';
        }
    }

    // Finaliza o processamento
    function finalizarProcessamento() {
        processandoAtestados = false;
        document.getElementById('btn-processar').style.display = 'inline-block';
        document.getElementById('btn-parar').style.display = 'none';

        atualizarStatus(`Processamento concluído! ${codigosParaProcessar.length} atestados processados.`, 100);

        console.log('Processamento de atestados concluído');

        // Esconde o status após alguns segundos
        setTimeout(() => {
            document.getElementById('status-processamento').style.display = 'none';
        }, 5000);
    }

    // Aguarda o carregamento completo da página
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', criarPainelLateral);
    } else {
        criarPainelLateral();
    }

    console.log('Script de automação do Sigeduca carregado');

})();
