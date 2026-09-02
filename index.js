require('dotenv').config();
const express = require('express');
const PDFDocument = require('pdfkit');
const supabase = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificación de Pago Móvil - Banesco</title>
    <style>
        body { font-family: Arial, sans-serif; background: #eef2f7; margin: 0; padding: 15px; display: flex; justify-content: center; align-items: center; flex-direction: column; }
        .main-container { width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: 15px; }
        .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        h2 { text-align: center; color: #2c3e50; margin-top: 0; font-size: 22px; }
        label { display: block; margin-top: 10px; font-weight: bold; color: #34495e; font-size: 14px; }
        input { width: 100%; padding: 14px; margin-top: 5px; box-sizing: border-box; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 18px; background: #f8fafc; text-align: center; letter-spacing: 2px; }
        input:focus { border-color: #3b82f6; outline: none; background: white; }
        
        .btn-primary { width: 100%; background: #2563eb; color: white; padding: 14px; border: none; border-radius: 8px; margin-top: 15px; cursor: pointer; font-size: 16px; font-weight: bold; }
        .btn-primary:active { background: #1d4ed8; }
        
        .btn-toggle { width: 100%; background: #1e293b; color: white; padding: 14px; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: bold; display: flex; justify-content: center; align-items: center; gap: 8px; transition: background 0.2s; }
        .btn-toggle:hover { background: #0f172a; }

        .btn-bcv { background: #059669; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; }
        .btn-bcv:hover { background: #047857; }

        .btn-pdf { width: 100%; background: #dc2626; color: white; padding: 12px; border: none; border-radius: 8px; margin-top: 12px; cursor: pointer; font-size: 15px; font-weight: bold; display: flex; justify-content: center; align-items: center; gap: 8px; text-decoration: none; box-sizing: border-box; text-align: center; }
        .btn-pdf:hover { background: #b91c1c; }
        
        #mensaje { margin-top: 12px; text-align: center; font-weight: bold; font-size: 15px; }

        /* Estilos del Teclado Numérico Virtual */
        .keyboard-container { display: none; margin-top: 12px; background: #e2e8f0; padding: 10px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .keyboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 0 4px; }
        .keyboard-title { font-size: 13px; font-weight: bold; color: #475569; }
        .close-keyboard { background: #ef4444; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; }
        
        .keyboard-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .key { background: white; border: 1px solid #cbd5e1; padding: 14px; font-size: 20px; font-weight: bold; text-align: center; border-radius: 6px; cursor: pointer; user-select: none; }
        .key:active { background: #cbd5e1; }
        .key-clear { background: #fee2e2; color: #dc2626; }
        .key-back { background: #fef3c7; color: #d97706; }

        /* Estilos del Panel de Reportes Estilo Nexus */
        .report-panel { display: none; margin-top: 12px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .factor-box { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 12px; }
        .report-box { max-height: 200px; overflow-y: auto; margin-top: 10px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; padding: 5px; }
        .report-item { font-size: 12px; padding: 8px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .totals-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 6px; margin-top: 10px; }
        .totals-text { font-weight: bold; font-size: 15px; color: #166534; text-align: right; }
    </style>
</head>
<body>
    <div class="main-container">
        <!-- Formulario de Consulta Rápida por Referencia -->
        <div class="card">
            <h2>Consulta API Banesco (Pago Móvil)</h2>
            <form id="pagoForm">
                <label>Últimos 4 dígitos de la Referencia:</label>
                <input type="text" id="referencia" maxlength="4" placeholder="Ej: 4541" required autocomplete="off">
                
                <button type="submit" class="btn-primary">Consultar en Banco y Registrar</button>
            </form>
            <div id="mensaje"></div>

            <!-- Teclado Numérico Virtual Flotante -->
            <div class="keyboard-container" id="virtualKeyboard">
                <div class="keyboard-header">
                    <span class="keyboard-title">Teclado Táctil</span>
                    <button type="button" class="close-keyboard" onclick="hideKeyboard()">Ocultar ✕</button>
                </div>
                <div class="keyboard-grid">
                    <div class="key" onclick="insertKey('1')">1</div>
                    <div class="key" onclick="insertKey('2')">2</div>
                    <div class="key" onclick="insertKey('3')">3</div>
                    <div class="key" onclick="insertKey('4')">4</div>
                    <div class="key" onclick="insertKey('5')">5</div>
                    <div class="key" onclick="insertKey('6')">6</div>
                    <div class="key" onclick="insertKey('7')">7</div>
                    <div class="key" onclick="insertKey('8')">8</div>
                    <div class="key" onclick="insertKey('9')">9</div>
                    <div class="key key-clear" onclick="clearInput()">C</div>
                    <div class="key" onclick="insertKey('0')">0</div>
                    <div class="key key-back" onclick="backspaceKey()">⌫</div>
                </div>
            </div>
        </div>

        <!-- Módulo de Factores y Cierre Diario (Estilo Nexus) -->
        <div class="card" style="padding: 15px;">
            <button class="btn-toggle" onclick="toggleReporte()">
                <span>📊</span> <span id="toggleReportText">Módulo de Cierre y Factor Cambiario</span>
            </button>
            <div class="report-panel" id="reportPanel">
                
                <!-- Factor Cambiario BCV -->
                <div class="factor-box">
                    <label style="margin-top: 0; color: #1e293b;">Factor Cambiario / Tasa BCV (Bs. por USD):</label>
                    <div style="display: flex; gap: 8px; align-items: center; margin-top: 5px;">
                        <input type="text" id="tasaBcv" value="36.50" oninput="calcularTotales()" style="margin-top: 0; font-weight: bold; color: #0f172a; text-align: left; letter-spacing: normal; font-size: 16px; padding: 10px;">
                        <button type="button" class="btn-bcv" onclick="consultarTasaBcvManual()">🔄 Consultar BCV</button>
                    </div>
                    <div id="bcvStatus" style="font-size: 11px; color: #64748b; margin-top: 4px;">Tasa lista para conversión y cierre.</div>
                </div>

                <div class="totals-box">
                    <div class="totals-text" id="totalBsText">Total Recaudado Bs.: Bs. 0.00</div>
                    <div class="totals-text" id="totalUsdText" style="color: #1e40af; margin-top: 4px;">Equivalente Dólares: $ 0.00</div>
                </div>

                <div style="font-weight: bold; font-size: 13px; color: #475569; margin-top: 12px;">Transacciones Verificadas Hoy:</div>
                <div class="report-box" id="listaReporte">
                    <div style="text-align: center; color: #64748b; padding: 15px;">Cargando transacciones...</div>
                </div>

                <a id="btnPdfLink" href="/api/cierre-pdf?tasa=36.50" target="_blank" class="btn-pdf">
                    <span>📄</span> Imprimir Cierre de Caja en PDF
                </a>
            </div>
        </div>
    </div>

    <script>
        let activeInput = null;
        let globalDataPagos = [];
        const keyboard = document.getElementById('virtualKeyboard');

        ['referencia', 'tasaBcv'].forEach(id => {
            const input = document.getElementById(id);
            if(input) {
                input.addEventListener('focus', () => {
                    activeInput = input;
                    if(id !== 'tasaBcv') keyboard.style.display = 'block';
                });
            }
        });

        function hideKeyboard() {
            keyboard.style.display = 'none';
        }

        function insertKey(val) {
            if (activeInput && activeInput.id === 'referencia') {
                if(activeInput.value.length < 4) {
                    activeInput.value += val;
                }
            }
        }

        function backspaceKey() {
            if (activeInput && activeInput.id === 'referencia') {
                activeInput.value = activeInput.value.slice(0, -1);
            }
        }

        function clearInput() {
            if (activeInput && activeInput.id === 'referencia') {
                activeInput.value = '';
            }
        }

        async function consultarTasaBcvManual() {
            const status = document.getElementById('bcvStatus');
            status.textContent = 'Consultando tasa oficial BCV...';
            status.style.color = '#d97706';
            try {
                const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
                const data = await res.json();
                if (data && data.promedio) {
                    document.getElementById('tasaBcv').value = data.promedio;
                    calcularTotales();
                    status.textContent = '¡Tasa BCV actualizada exitosamente desde la web!';
                    status.style.color = '#059669';
                } else {
                    throw new Error('Respuesta inválida');
                }
            } catch (e) {
                status.textContent = 'No se pudo conectar de forma automática. Puede ingresarla manualmente.';
                status.style.color = '#dc2626';
            }
        }

        function toggleReporte() {
            const panel = document.getElementById('reportPanel');
            const text = document.getElementById('toggleReportText');
            if (panel.style.display === 'block') {
                panel.style.display = 'none';
                text.textContent = 'Módulo de Cierre y Factor Cambiario';
            } else {
                panel.style.display = 'block';
                text.textContent = 'Ocultar Módulo de Cierre';
                consultarTasaBcvManual();
                cargarReporte();
            }
        }

        document.getElementById('pagoForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const referencia = document.getElementById('referencia').value;
            const mensaje = document.getElementById('mensaje');

            if(referencia.length < 4) {
                mensaje.style.color = 'red';
                mensaje.textContent = 'Debe ingresar los 4 dígitos de la referencia.';
                return;
            }

            try {
                const res = await fetch('/api/verificar-pago', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ referencia })
                });
                const data = await res.json();
                if (data.success) {
                    mensaje.style.color = 'green';
                    mensaje.textContent = data.mensaje;
                    document.getElementById('pagoForm').reset();
                    hideKeyboard();
                    if (document.getElementById('reportPanel').style.display === 'block') {
                        cargarReporte();
                    }
                } else {
                    mensaje.style.color = 'red';
                    mensaje.textContent = data.error;
                }
            } catch (err) {
                mensaje.style.color = 'red';
                mensaje.textContent = 'Error de conexión con el servidor.';
            }
        });

        async function cargarReporte() {
            const listaReporte = document.getElementById('listaReporte');

            try {
                const res = await fetch('/api/cierre-diario');
                const data = await res.json();

                if (data.success) {
                    globalDataPagos = data.pagos;
                    calcularTotales();

                    if (data.pagos.length === 0) {
                        listaReporte.innerHTML = '<div style="text-align: center; color: #64748b; padding: 15px;">No hay pagos verificados hoy.</div>';
                        return;
                    }
                    let html = '';
                    data.pagos.forEach(p => {
                        const fechaHora = p.fecha ? new Date(p.fecha).toLocaleString() : '-';
                        html += '<div class="report-item">' +
                            '<div>' +
                                '<div>Ref: <strong>' + p.referencia + '</strong> | Tel: ' + (p.telefono || '-') + '</div>' +
                                '<div style="color: #64748b; font-size: 10px;">' + fechaHora + ' | Cédula: ' + (p.cedula || '-') + '</div>' +
                            '</div>' +
                            '<span style="color: #059669; font-weight: bold; font-size: 13px;">Bs. ' + Number(p.monto).toFixed(2) + '</span>' +
                        '</div>';
                    });
                    listaReporte.innerHTML = html;
                } else {
                    listaReporte.innerHTML = '<div style="text-align: center; color: red; padding: 15px;">Error al cargar reporte.</div>';
                }
            } catch (err) {
                listaReporte.innerHTML = '<div style="text-align: center; color: red; padding: 15px;">Error de conexión.</div>';
            }
        }

        function calcularTotales() {
            let tasa = parseFloat(document.getElementById('tasaBcv').value) || 1;
            let totalBs = globalDataPagos.reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);
            let totalUsd = tasa > 0 ? totalBs / tasa : 0;

            document.getElementById('totalBsText').textContent = 'Total Recaudado Bs.: Bs. ' + totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            document.getElementById('totalUsdText').textContent = 'Equivalente Dólares: $ ' + totalUsd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

            document.getElementById('btnPdfLink').href = '/api/cierre-pdf?tasa=' + tasa;
        }
    </script>
</body>
</html>
`;

app.get('/', (req, res) => {
    res.send(htmlContent);
});

app.post('/api/verificar-pago', async (req, res) => {
    try {
        let { referencia } = req.body;
        referencia = referencia ? referencia.trim() : '';

        // Simulación de datos extraídos desde la API de Banesco
        const montoReal = 1250.00; 
        const telefonoReal = "04241234567";
        const cedulaReal = "V12345678";

        const { data, error } = await supabase
            .from('pagos')
            .insert([{ 
                referencia, 
                monto: montoReal, 
                telefono: telefonoReal, 
                cedula: cedulaReal 
            }]);

        if (error) throw error;
        res.json({ success: true, mensaje: `¡Pago Ref. ${referencia} verificado en Banesco con éxito!` });
    } catch (err) {
        console.error("Error al verificar:", err.message);
        res.status(500).json({ success: false, error: 'No se encontró la referencia en Banesco o hubo un error de conexión.' });
    }
});

app.get('/api/cierre-diario', async (req, res) => {
    try {
        const hoyInicio = new Date();
        hoyInicio.setHours(0, 0, 0, 0);

        const { data: pagos, error } = await supabase
            .from('pagos')
            .select('*')
            .gte('fecha', hoyInicio.toISOString())
            .order('fecha', { ascending: false });

        if (error) throw error;
        
        res.json({
            success: true,
            totalTransacciones: pagos.length,
            pagos: pagos
        });
    } catch (err) {
        console.error("Error en cierre diario:", err.message);
        res.status(500).json({ success: false, error: err.message || 'Error al obtener el cierre.' });
    }
});

app.get('/api/cierre-pdf', async (req, res) => {
    try {
        const tasa = parseFloat(req.query.tasa) || 1;
        
        const hoyInicio = new Date();
        hoyInicio.setHours(0, 0, 0, 0);

        const { data: pagos, error } = await supabase
            .from('pagos')
            .select('*')
            .gte('fecha', hoyInicio.toISOString())
            .order('fecha', { ascending: false });

        if (error) throw error;

        let totalBs = pagos.reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);
        let totalUsd = tasa > 0 ? totalBs / tasa : 0;
        const fechaActual = new Date().toLocaleString();

        const doc = new PDFDocument({ size: 'LETTER', margin: 40 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=cierre_diario.pdf');

        doc.pipe(res);

        doc.fontSize(18).fillColor('#2c3e50').text('Cierre y Reporte Diario de Caja - Banesco', { align: 'center' });
        doc.fontSize(10).fillColor('#7f8c8d').text(`Fecha de emisión: ${fechaActual}`, { align: 'center' });
        doc.moveDown(1);

        doc.fontSize(10).fillColor('#333').text(`Total de Transacciones: ${pagos.length}`);
        doc.text(`Factor Cambiario / Tasa BCV: Bs. ${tasa.toFixed(2)}`);
        doc.text(`Monto Total Recaudado (Bs.): Bs. ${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        doc.text(`Equivalente Total en Dólares ($): $ ${totalUsd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        doc.moveDown(1);

        doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(572, doc.y).stroke();
        doc.moveDown(0.8);

        // Cabecera de la tabla PDF usando coordenadas fijas (y)
        doc.fontSize(9).fillColor('#1e293b');
        let startY = doc.y;
        doc.text('Fecha / Hora', 40, startY, { width: 110, lineBreak: false });
        doc.text('Referencia', 150, startY, { width: 75, lineBreak: false });
        doc.text('Cédula', 230, startY, { width: 85, lineBreak: false });
        doc.text('Teléfono', 320, startY, { width: 90, lineBreak: false });
        doc.text('Monto (Bs.)', 430, startY, { width: 142, align: 'right', lineBreak: false });
        
        doc.moveDown(1.2);
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, doc.y).lineTo(572, doc.y).stroke();
        doc.moveDown(0.6);

        pagos.forEach((p) => {
            const fechaFormateada = p.fecha ? new Date(p.fecha).toLocaleString() : '-';
            let rowY = doc.y;

            if (rowY > 700) {
                doc.addPage();
                rowY = doc.y;
            }

            // Cada columna se dibuja limpiamente en la misma línea horizontal (rowY)
            doc.fontSize(8.5).fillColor('#475569');
            doc.text(fechaFormateada, 40, rowY, { width: 110, lineBreak: false });
            doc.text(p.referencia || '-', 150, rowY, { width: 75, lineBreak: false });
            doc.text(p.cedula || '-', 230, rowY, { width: 85, lineBreak: false });
            doc.text(p.telefono || '-', 320, rowY, { width: 90, lineBreak: false });
            doc.text(`Bs. ${Number(p.monto).toFixed(2)}`, 430, rowY, { width: 142, align: 'right', lineBreak: false });
            
            doc.moveDown(1.1);
        });

        doc.end();
    } catch (err) {
        console.error("Error al generar PDF:", err.message);
        res.status(500).send('Error al generar el PDF del cierre: ' + err.message);
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});