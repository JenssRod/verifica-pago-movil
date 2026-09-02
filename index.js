require('dotenv').config();
const express = require('express');
const supabase = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Interfaz web optimizada para pantallas táctiles (Biopago) con teclado numérico y reportes
const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificación de Pago Móvil - Biopago</title>
    <style>
        body { font-family: Arial, sans-serif; background: #eef2f7; margin: 0; padding: 15px; display: flex; justify-content: center; align-items: center; flex-direction: column; }
        .main-container { width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 20px; }
        .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        h2 { text-align: center; color: #2c3e50; margin-top: 0; }
        label { display: block; margin-top: 12px; font-weight: bold; color: #34495e; font-size: 16px; }
        input { width: 100%; padding: 14px; margin-top: 6px; box-sizing: border-box; border: 2px solid #cbd5e1; border-radius: 8px; font-size: 18px; background: #f8fafc; }
        input:focus { border-color: #3b82f6; outline: none; background: white; }
        .btn-primary { width: 100%; background: #2563eb; color: white; padding: 16px; border: none; border-radius: 8px; margin-top: 20px; cursor: pointer; font-size: 18px; font-weight: bold; }
        .btn-primary:active { background: #1d4ed8; transform: scale(0.98); }
        .btn-secondary { width: 100%; background: #059669; color: white; padding: 14px; border: none; border-radius: 8px; margin-top: 10px; cursor: pointer; font-size: 16px; font-weight: bold; }
        #mensaje { margin-top: 15px; text-align: center; font-weight: bold; font-size: 16px; }

        /* Estilos del Teclado Numérico Virtual Táctil */
        .keyboard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px; background: #e2e8f0; padding: 12px; border-radius: 10px; }
        .key { background: white; border: 1px solid #cbd5e1; padding: 18px; font-size: 22px; font-weight: bold; text-align: center; border-radius: 8px; cursor: pointer; user-select: none; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .key:active { background: #cbd5e1; }
        .key-clear { background: #fee2e2; color: #dc2626; }
        .key-back { background: #fef3c7; color: #d97706; }

        /* Estilos para la sección de Reportes */
        .report-box { margin-top: 15px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; max-height: 200px; overflow-y: auto; }
        .report-item { font-size: 14px; padding: 8px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; }
        .totals { font-weight: bold; font-size: 16px; color: #059669; margin-top: 10px; text-align: right; }
    </style>
</head>
<body>
    <div class="main-container">
        <!-- Formulario de Registro -->
        <div class="card">
            <h2>Registrar Pago Móvil</h2>
            <form id="pagoForm">
                <label>Referencia (últimos dígitos):</label>
                <input type="text" id="referencia" readonly placeholder="Toque para escribir" required>
                
                <label>Monto:</label>
                <input type="text" id="monto" readonly placeholder="Toque para escribir" required>
                
                <label>Teléfono:</label>
                <input type="text" id="telefono" readonly placeholder="Toque para escribir" required>
                
                <label>Cédula:</label>
                <input type="text" id="cedula" readonly placeholder="Toque para escribir" required>
                
                <button type="submit" class="btn-primary">Verificar y Registrar</button>
            </form>
            <div id="mensaje"></div>

            <!-- Teclado Numérico Virtual Táctil -->
            <div class="keyboard" id="virtualKeyboard" style="display:none;">
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

        <!-- Panel de Reportes Diario -->
        <div class="card">
            <h2>Cierre y Reporte Diario</h2>
            <button class="btn-secondary" onclick="cargarReporte()">Actualizar Reporte</button>
            <div class="totals" id="totalMonto">Total Recaudado: $0.00</div>
            <div class="report-box" id="listaReporte">
                <div style="text-align: center; color: #64748b;">Presione "Actualizar Reporte" para ver las transacciones.</div>
            </div>
        </div>
    </div>

    <script>
        let activeInput = null;
        const keyboard = document.getElementById('virtualKeyboard');

        // Asignar eventos táctiles a cada campo de entrada para mostrar el teclado
        ['referencia', 'monto', 'telefono', 'cedula'].forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('focus', () => {
                activeInput = input;
                keyboard.style.display = 'grid';
            });
            input.addEventListener('click', () => {
                activeInput = input;
                keyboard.style.display = 'grid';
            });
        });

        function insertKey(val) {
            if (activeInput) {
                activeInput.value += val;
            }
        }

        function backspaceKey() {
            if (activeInput) {
                activeInput.value = activeInput.value.slice(0, -1);
            }
        }

        function clearInput() {
            if (activeInput) {
                activeInput.value = '';
            }
        }

        // Enviar formulario
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
                    keyboard.style.display = 'none';
                    cargarReporte(); // Actualiza automáticamente el reporte al registrar
                } else {
                    mensaje.style.color = 'red';
                    mensaje.textContent = data.error;
                }
            } catch (err) {
                mensaje.style.color = 'red';
                mensaje.textContent = 'Error de conexión con el servidor.';
            }
        });

        // Función para consultar el cierre diario
        async function cargarReporte() {
            const listaReporte = document.getElementById('listaReporte');
            const totalMonto = document.getElementById('totalMonto');
            listaReporte.innerHTML = '<div style="text-align: center; color: #64748b;">Cargando...</div>';

            try {
                const res = await fetch('/api/cierre-diario');
                const data = await res.json();

                if (data.success) {
                    totalMonto.textContent = \`Total Recaudado: $\${data.montoTotal} (\${data.totalTransacciones} pagos)\`;
                    if (data.pagos.length === 0) {
                        listaReporte.innerHTML = '<div style="text-align: center; color: #64748b;">No hay pagos registrados aún.</div>';
                        return;
                    }
                    let html = '';
                    data.pagos.forEach(p => {
                        html += \`<div class="report-item">
                            <span>Ref: <strong>\${p.referencia}</strong> | Cédula: \${p.cedula}</span>
                            <span style="color: #059669; font-weight: bold;">$\${p.monto}</span>
                        </div>\`;
                    });
                    listaReporte.innerHTML = html;
                } else {
                    listaReporte.innerHTML = '<div style="text-align: center; color: red;">Error al cargar reporte.</div>';
                }
            } catch (err) {
                listaReporte.innerHTML = '<div style="text-align: center; color: red;">Error de conexión.</div>';
            }
        }

        // Cargar reporte al abrir la página por primera vez
        window.onload = cargarReporte;
    </script>
</body>
</html>
`;

// Ruta principal que sirve la interfaz táctil
app.get('/', (req, res) => {
    res.send(htmlContent);
});

// 1. REGISTRAR Y VALIDAR PAGO MÓVIL
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
        console.error(err);
        res.status(500).json({ success: false, error: 'Error al registrar (referencia duplicada o datos inválidos).' });
    }
});

// 2. OBTENER CIERRE DIARIO
app.get('/api/cierre-diario', async (req, res) => {
    try {
        const { data: pagos, error } = await supabase
            .from('pagos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        let montoTotal = pagos.reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);

        res.json({
            success: true,
            totalTransacciones: pagos.length,
            montoTotal: montoTotal.toFixed(2),
            pagos: pagos
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Error al obtener el cierre.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});