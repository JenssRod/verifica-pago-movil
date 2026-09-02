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
    <title>Verificación de Pago Móvil - Biopago</title>
    <style>
        body { font-family: Arial, sans-serif; background: #eef2f7; margin: 0; padding: 15px; display: flex; justify-content: center; align-items: center; flex-direction: column; }
        .main-container { width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 15px; }
        .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        h2 { text-align: center; color: #2c3e50; margin-top: 0; font-size: 22px; }
        label { display: block; margin-top: 10px; font-weight: bold; color: #34495e; font-size: 15px; }
        input { width: 100%; padding: 12px; margin-top: 5px; box-sizing: border-box; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 16px; background: #f8fafc; }
        input:focus { border-color: #3b82f6; outline: none; background: white; }
        
        .btn-primary { width: 100%; background: #2563eb; color: white; padding: 14px; border: none; border-radius: 8px; margin-top: 18px; cursor: pointer; font-size: 16px; font-weight: bold; }
        .btn-primary:active { background: #1d4ed8; }
        
        .btn-toggle { width: 100%; background: #475569; color: white; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: bold; display: flex; justify-content: center; align-items: center; gap: 8px; transition: background 0.2s; }
        .btn-toggle:hover { background: #334155; }

        .btn-pdf { width: 100%; background: #dc2626; color: white; padding: 12px; border: none; border-radius: 8px; margin-top: 10px; cursor: pointer; font-size: 15px; font-weight: bold; display: flex; justify-content: center; align-items: center; gap: 8px; text-decoration: none; box-sizing: border-box; }
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

        /* Estilos del Panel de Reportes Colapsable */
        .report-panel { display: none; margin-top: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .report-box { max-height: 160px; overflow-y: auto; margin-top: 10px; }
        .report-item { font-size: 13px; padding: 6px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; }
        .totals-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 6px; margin-top: 8px; }
        .totals-text { font-weight: bold; font-size: 14px; color: #166534; text-align: right; }
    </style>
</head>
<body>
    <div class="main-container">
        <!-- Formulario de Registro -->
        <div class="card">
            <h2>Registrar Pago Móvil</h2>
            <form id="pagoForm">
                <label>Referencia (últimos dígitos):</label>
                <input type="text" id="referencia" placeholder="Ej: 4541" required>
                
                <label>Monto (Bs.):</label>
                <input type="text" id="monto" placeholder="Ej: 1500.00" required>
                
                <label>Teléfono:</label>
                <input type="text" id="telefono" placeholder="Ej: 0424..." required>
                
                <label>Cédula:</label>
                <input type="text" id="cedula" placeholder="Ej: 1713..." required>
                
                <button type="submit" class="btn-primary">Verificar y Registrar</button>
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

        <!-- Botón y Panel de Reportes Diario -->
        <div class="card" style="padding: 15px;">
            <button class="btn-toggle" onclick="toggleReporte()">
                <span>📊</span> <span id="toggleReportText">Ver Cierre y Reporte de Hoy</span>
            </button>
            <div class="report-panel" id="reportPanel">
                <label style="font-size: 13px; margin-top: 0;">Tasa BCV del Dólar (Bs.):</label>
                <input type="text" id="tasaBcv" value="36.50" oninput="calcularTotales()" style="padding: 8px; font-size: 14px;">

                <div class="totals-box">
                    <div class="totals-text" id="totalBsText">Total Bs.: Bs. 0.00</div>
                    <div class="totals-text" id="totalUsdText" style="color: #1e40af; margin-top: 4px;">Equivalente USD: $ 0.00</div>
                </div>

                <div class="report-box" id="listaReporte">
                    <div style="text-align: center; color: #64748b;">Cargando transacciones de hoy...</div>
                </div>
                <a id="btnPdfLink" href="/api/cierre-pdf?tasa=36.50" target="_blank" class="btn-pdf">
                    <span>📄</span> Descargar / Imprimir Cierre de Hoy PDF
                </a>
            </div>
        </div>
    </div>

    <script>
        let activeInput = null;
        let globalDataPagos = [];
        const keyboard = document.getElementById('virtualKeyboard');

        ['referencia', 'monto', 'telefono', 'cedula', 'tasaBcv'].forEach(id => {
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
            if (activeInput && activeInput.id !== 'tasaBcv') activeInput.value += val;
        }

        function backspaceKey() {
            if (activeInput && activeInput.id !== 'tasaBcv') activeInput.value = activeInput.value.slice(0, -1);
        }

        function clearInput() {
            if (activeInput && activeInput.id !== 'tasaBcv') activeInput.value = '';
        }

        function toggleReporte() {
            const panel = document.getElementById('reportPanel');
            const text = document.getElementById('toggleReportText');
            if (panel.style.display === 'block') {
                panel.style.display = 'none';
                text.textContent = 'Ver Cierre y Reporte de Hoy';
            } else {
                panel.style.display = 'block';
                text.textContent = 'Ocultar Cierre y Reporte';
                cargarReporte();
            }
        }

        document.getElementById('pagoForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const referencia = document.getElementById('referencia').value;
            const monto = document.getElementById('monto').value;
            const telefono = document.getElementById('telefono').value;
            const cedula = document.getElementById('cedula').value;
            const mensaje = document.getElementById('mensaje');

            try {
                const res = await fetch('/api/verificar-pago', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ referencia, monto, telefono, cedula })
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
                        listaReporte.innerHTML = '<div style="text-align: center; color: #64748b;">No hay pagos registrados hoy.</div>';
                        return;
                    }
                    let html = '';
                    data.pagos.forEach(p => {
                        html += '<div class="report-item">' +
                            '<span>Ref: <strong>' + p.referencia + '</strong> | Cédula: ' + p.cedula + '</span>' +
                            '<span style="color: #059669; font-weight: bold;">Bs. ' + Number(p.monto).toFixed(2) + '</span>' +
                        '</div>';
                    });
                    listaReporte.innerHTML = html;
                } else {
                    listaReporte.innerHTML = '<div style="text-align: center; color: red;">Error al cargar reporte.</div>';
                }
            } catch (err) {
                listaReporte.innerHTML = '<div style="text-align: center; color: red;">Error de conexión.</div>';
            }
        }

        function calcularTotales() {
            let tasa = parseFloat(document.getElementById('tasaBcv').value) || 1;
            let totalBs = globalDataPagos.reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);
            let totalUsd = tasa > 0 ? totalBs / tasa : 0;

            document.getElementById('totalBsText').textContent = 'Total Bs.: Bs. ' + totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            document.getElementById('totalUsdText').textContent = 'Equivalente USD: $ ' + totalUsd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

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
        let { referencia, monto, telefono, cedula } = req.body;
        referencia = referencia ? referencia.trim() : '';
        telefono = telefono ? telefono.trim() : '';
        cedula = cedula ? cedula.trim() : '';

        const { data, error } = await supabase
            .from('pagos')
            .insert([{ referencia, monto, telefono, cedula }]);

        if (error) throw error;
        res.json({ success: true, mensaje: '¡Pago registrado con éxito!' });
    } catch (err) {
        console.error("Error al registrar:", err.message);
        res.status(500).json({ success: false, error: err.message || 'Error al registrar pago.' });
    }
});

// Endpoint modificado para filtrar únicamente las transacciones del día actual (Hora Venezuela/Servidor)
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

// Endpoint del PDF también adaptado solo para el día de hoy
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

        const doc = new PDFDocument({ size: 'LETTER', margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=cierre_diario.pdf');

        doc.pipe(res);

        doc.fontSize(20).fillColor('#2c3e50').text('Cierre y Reporte Diario de Pagos', { align: 'center' });
        doc.fontSize(10).fillColor('#7f8c8d').text(`Fecha de emisión: ${fechaActual}`, { align: 'center' });
        doc.moveDown(1.2);

        doc.fontSize(11).fillColor('#333').text(`Total de Transacciones de Hoy: ${pagos.length}`);
        doc.text(`Tasa BCV Aplicada: Bs. ${tasa.toFixed(2)}`);
        doc.text(`Monto Total Recaudado (Bs.): Bs. ${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        doc.text(`Equivalente Total en Dólares ($): $ ${totalUsd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        doc.moveDown(1);

        doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(1);

        doc.fontSize(10).fillColor('#1e293b');
        const startY = doc.y;
        doc.text('Fecha / Hora', 50, startY, { width: 120 });
        doc.text('Referencia', 170, startY, { width: 80 });
        doc.text('Cédula', 255, startY, { width: 80 });
        doc.text('Teléfono', 340, startY, { width: 80 });
        doc.text('Monto (Bs.)', 430, startY, { width: 100, align: 'right' });
        
        doc.moveDown(0.8);
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(0.5);

        pagos.forEach((p) => {
            const fechaFormateada = p.fecha ? new Date(p.fecha).toLocaleString() : '-';
            const currentY = doc.y;

            if (currentY > 700) {
                doc.addPage();
            }

            doc.fontSize(9).fillColor('#475569');
            doc.text(fechaFormateada, 50, doc.y, { width: 120 });
            doc.text(p.referencia || '-', 170, doc.y, { width: 80 });
            doc.text(p.cedula || '-', 255, doc.y, { width: 80 });
            doc.text(p.telefono || '-', 340, doc.y, { width: 80 });
            doc.text(`Bs. ${Number(p.monto).toFixed(2)}`, 430, doc.y, { width: 100, align: 'right' });
            doc.moveDown(0.8);
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