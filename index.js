require('dotenv').config();
const express = require('express');
const supabase = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Interfaz web embebida para evitar cualquier error de archivos en Render
const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificación de Pago Móvil</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f9; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; flex-direction: column; }
        .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); width: 100%; max-width: 400px; margin-bottom: 20px; }
        h2 { text-align: center; color: #333; }
        label { display: block; margin-top: 10px; font-weight: bold; color: #555; }
        input { width: 100%; padding: 8px; margin-top: 5px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
        button { width: 100%; background: #007bff; color: white; padding: 10px; border: none; border-radius: 4px; margin-top: 15px; cursor: pointer; font-size: 16px; }
        button:hover { background: #0056b3; }
        #mensaje { margin-top: 15px; text-align: center; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Registrar Pago Móvil</h2>
        <form id="pagoForm">
            <label>Referencia (últimos dígitos):</label>
            <input type="text" id="referencia" required>
            
            <label>Monto:</label>
            <input type="number" step="0.01" id="monto" required>
            
            <label>Teléfono:</label>
            <input type="text" id="telefono" required>
            
            <label>Cédula:</label>
            <input type="text" id="cedula" required>
            
            <button type="submit">Verificar y Registrar</button>
        </form>
        <div id="mensaje"></div>
    </div>

    <script>
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
                } else {
                    mensaje.style.color = 'red';
                    mensaje.textContent = data.error;
                }
            } catch (err) {
                mensaje.style.color = 'red';
                mensaje.textContent = 'Error de conexión con el servidor.';
            }
        });
    </script>
</body>
</html>
`;

// Ruta principal que sirve el HTML directamente desde la memoria
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
        res.status(500).json({ success: false, error: 'Error al registrar el pago en la base de datos.' });
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