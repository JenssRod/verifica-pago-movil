require('dotenv').config();
const express = require('express');
const supabase = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Permitir archivos estáticos si luego pones un HTML en una carpeta 'public'
app.use(express.static('public'));

// ==========================================
// 1. REGISTRAR Y VALIDAR PAGO MÓVIL
// ==========================================
app.post('/api/verificar-pago', async (req, res) => {
    console.log('➡️ Petición de pago recibida:', req.body);
    try {
        let { referencia, monto, telefono, cedula, banco } = req.body;

        // Limpieza de espacios
        referencia = referencia ? referencia.trim() : '';
        telefono = telefono ? telefono.trim() : '';
        cedula = cedula ? cedula.trim() : '';

        // --- VALIDACIONES DE NEGOCIO ---
        if (!referencia || !monto || !telefono || !cedula) {
            return res.status(400).json({ 
                success: false, 
                error: 'Todos los campos (referencia, monto, teléfono, cédula) son obligatorios.' 
            });
        }

        // Validar que la referencia tenga al menos 4 dígitos o caracteres
        if (referencia.length < 4) {
            return res.status(400).json({ 
                success: false, 
                error: 'El número de referencia es demasiado corto o inválido.' 
            });
        }

        // Validar monto positivo
        const numMonto = parseFloat(monto);
        if (isNaN(numMonto) || numMonto <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'El monto ingresado no es válido.' 
            });
        }

        // Validar formato de teléfono venezolano (ej: 04141234567 o 4141234567)
        const regexTelefono = /^(0412|0414|0424|0416|0426)\d{7}$/;
        const telefonoLimpio = telefono.startsWith('0') ? telefono : '0' + telefono;
        if (!regexTelefono.test(telefonoLimpio)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Formato de teléfono inválido. Debe ser un número móvil venezolano válido (Ej: 04141234567).' 
            });
        }

        // Validar cédula (solo números, entre 6 y 9 dígitos)
        const regexCedula = /^\d{6,9}$/;
        if (!regexCedula.test(cedula)) {
            return res.status(400).json({ 
                success: false, 
                error: 'La cédula debe contener solo números (entre 6 y 9 dígitos).' 
            });
        }

        console.log('🔄 Verificando duplicados y guardando en Supabase...');
        const { data, error } = await supabase
            .from('pagos')
            .insert([{ 
                referencia, 
                monto: numMonto, 
                telefono: telefonoLimpio, 
                cedula,
                banco: banco || 'Banesco'
            }])
            .select();

        if (error) {
            console.error('❌ Error devuelto por Supabase:', error);
            // Código 23505 en PostgreSQL indica violación de índice único (Duplicado)
            if (error.code === '23505') {
                return res.status(400).json({ 
                    success: false, 
                    mensaje: `¡Pago rechazado! La referencia de pago N° "${referencia}" ya fue registrada anteriormente en el sistema.` 
                });
            }
            return res.status(500).json({ 
                success: false, 
                error: error.message || 'Error al guardar el pago en la base de datos.' 
            });
        }

        console.log('✅ Pago registrado con éxito:', data[0]);
        return res.status(200).json({
            success: true,
            mensaje: '¡Pago móvil verificado y registrado con éxito!',
            pago: data[0]
        });

    } catch (err) {
        console.error('🔥 Error crítico en servidor:', err);
        return res.status(500).json({ 
            success: false, 
            error: err.message || 'Error interno del servidor.' 
        });
    }
});

// ==========================================
// 2. MÓDULO DE REPORTE Y CIERRE (PARA IMPRIMIR)
// ==========================================
app.get('/api/cierre-diario', async (req, res) => {
    try {
        console.log('📊 Generando reporte de cierre...');
        // Consultar todos los pagos ordenados del más reciente al más antiguo
        const { data: pagos, error } = await supabase
            .from('pagos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        // Calcular totales
        const totalTransacciones = pagos.length;
        const montoTotal = pagos.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0);

        return res.status(200).json({
            success: true,
            fechaCierre: new Date().toLocaleString(),
            totalTransacciones,
            montoTotal: montoTotal.toFixed(2),
            pagos
        });

    } catch (err) {
        console.error('🔥 Error al generar cierre:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor multiusuario corriendo en el puerto ${PORT}`);
});