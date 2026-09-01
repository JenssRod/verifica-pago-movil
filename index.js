require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const supabase = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Ruta principal robusta para servir index.html
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        console.error("No se encontró el archivo index.html en:", filePath);
        res.status(500).send("Error crítico: index.html no está accesible en el servidor.");
    }
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
    console.log(`Servidor multiusuario corriendo en el puerto ${PORT}`);
});