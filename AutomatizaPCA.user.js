// ==UserScript==
// @name         Automatiza PCA
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Automação do lançamento de PCA no Sigeduca com suporte a Excel
// @author       Elder Martins
// @match        http://sigeduca.seduc.mt.gov.br/ged/hwmgedatestado.aspx*
// @match        http://sigeduca.seduc.mt.gov.br/ged/ttgedatestado.aspx*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @downloadURL  https://github.com/donidozh/AutomatizaPCA/raw/refs/heads/main/AutomatizaPCA.user.js
// @updateURL    https://github.com/donidozh/AutomatizaPCA/raw/refs/heads/main/AutomatizaPCA.user.js
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG_BIMESTRE = {
        '1': { ini: '02/02/2026', fim: '22/04/2026', label: '1º bimestre' },
        '2': { ini: '23/04/2026', fim: '03/07/2026', label: '2º bimestre' },
        '3': { ini: '21/07/2026', fim: '01/10/2026', label: '3º bimestre' },
        '4': { ini: '02/10/2026', fim: '18/12/2026', label: '4º bimestre' },
        'TODOS': { ini: '02/02/2026', fim: '18/12/2026', label: '1º ao 4º bimestre' }
    };

    const BASE_LEGAL = "conforme Portaria Nº 299/2025/GS/SEDUC/MT.";
    let codigosPlanilha = [];

    const formatarObs = (bim) => `Lançamento do plano de compensação de ausências referente ao ${CONFIG_BIMESTRE[bim].label}, ${BASE_LEGAL}`;
    const salvarEstado = (dados) => localStorage.setItem('pca_automation_state', JSON.stringify(dados));
    const obterEstado = () => JSON.parse(localStorage.getItem('pca_automation_state'));
    const limparEstado = () => localStorage.removeItem('pca_automation_state');

    function criarPainel() {
        if (document.getElementById('painel-pca')) return;

        const painel = document.createElement('div');
        painel.id = 'painel-pca';
        painel.style.cssText = `position:fixed; top:10px; right:10px; width:280px; background:#fff; border:2px solid #065195; border-radius:8px; padding:15px; z-index:9999; font-family:sans-serif; box-shadow:0 5px 15px rgba(0,0,0,0.3);`;

        painel.innerHTML = `
            <h3 style="margin:0 0 10px 0; color:#065195; font-size:14px; text-align:center;">Automação PCA 2026</h3>

            <label style="display:block; font-size:12px; font-weight:bold;">Selecione o Bimestre:</label>
            <select id="sel-bimestre" style="width:100%; margin-bottom:10px; padding:4px;">
                <option value="1">1º Bimestre</option>
                <option value="2">2º Bimestre</option>
                <option value="3">3º Bimestre</option>
                <option value="4">4º Bimestre</option>
                <option value="TODOS">TODOS</option>
            </select>

            <label style="display:block; font-size:12px; font-weight:bold;">Importar Planilha (.xlsx):</label>
            <input type="file" id="file-excel" accept=".xlsx" style="width:100%; font-size:11px; margin-bottom:10px;">

            <div id="container-manual">
                <label style="display:block; font-size:12px; font-weight:bold;">Códigos dos Alunos (um por linha):</label>
                <textarea id="txt-codigos" style="width:100%; height:100px; font-family:monospace; font-size:11px; margin-bottom:10px; resize:vertical;"></textarea>
            </div>

            <button id="btn-iniciar" style="width:100%; background:#065195; color:#fff; border:none; padding:8px; border-radius:4px; cursor:pointer; font-weight:bold;">Iniciar Processamento</button>
            <div id="msg-status" style="margin-top:10px; font-size:11px; color:#444; text-align:center;"></div>
        `;

        document.body.appendChild(painel);

        const fileInput = document.getElementById('file-excel');
        const containerManual = document.getElementById('container-manual');

        // Lógica para ler o Excel e esconder a caixa manual
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) {
                containerManual.style.display = 'block';
                codigosPlanilha = [];
                return;
            }

            const reader = new FileReader();
            reader.onload = (evt) => {
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Converte para JSON e pega apenas a primeira coluna (A)
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                codigosPlanilha = json.map(row => row[0]).filter(c => c && c.toString().trim() !== "");

                if (codigosPlanilha.length > 0) {
                    containerManual.style.display = 'none';
                    document.getElementById('msg-status').innerText = `${codigosPlanilha.length} códigos carregados da planilha.`;
                }
            };
            reader.readAsBinaryString(file);
        });

        document.getElementById('btn-iniciar').addEventListener('click', () => {
            let codigos = [];

            if (codigosPlanilha.length > 0) {
                codigos = codigosPlanilha;
            } else {
                const rawCodes = document.getElementById('txt-codigos').value;
                codigos = rawCodes.split('\n').map(c => c.trim()).filter(c => c.length > 0);
            }

            const bimestre = document.getElementById('sel-bimestre').value;

            if (codigos.length === 0) return alert("Insira códigos manualmente ou anexe uma planilha!");

            salvarEstado({
                ativo: true,
                bimestre: bimestre,
                codigos: codigos,
                index: 0
            });

            processar();
        });
    }

    function processar() {
        const estado = obterEstado();
        if (!estado || !estado.ativo) return;

        const statusDiv = document.getElementById('msg-status');
        if (statusDiv) statusDiv.innerText = `Processando: ${estado.index + 1} de ${estado.codigos.length}`;

        if (estado.index >= estado.codigos.length) {
            alert("Todos os códigos foram processados!");
            limparEstado();
            location.reload();
            return;
        }

        const urlAtual = window.location.href;

        if (urlAtual.includes('hwmgedatestado.aspx')) {
            const btnIncluir = document.querySelector('input[name="BINCLUIR"]');
            if (btnIncluir) btnIncluir.click();
        }
        else if (urlAtual.includes('ttgedatestado.aspx')) {
            const codigoAtual = estado.codigos[estado.index];
            const dadosBim = CONFIG_BIMESTRE[estado.bimestre];

            const campos = {
                'GEDATETIPO': '3',
                'GEDALUCOD': codigoAtual,
                'GEDATEPERINI': dadosBim.ini,
                'GEDATEPERFIN': dadosBim.fim,
                'GEDATEOBS': formatarObs(estado.bimestre)
            };

            for (let id in campos) {
                const el = document.getElementById(id);
                if (el) {
                    el.value = campos[id];
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    el.dispatchEvent(new Event('blur', { bubbles: true }));
                }
            }

            estado.index++;
            salvarEstado(estado);

            setTimeout(() => {
                const btnConfirmar = document.querySelector('input[name="BCONFIRMAR"]');
                if (btnConfirmar) btnConfirmar.click();
            }, 800);
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        if (window.location.href.includes('hwmgedatestado.aspx')) {
            criarPainel();
        }
        setTimeout(processar, 1000);
    }
})();
