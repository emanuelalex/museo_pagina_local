
require('dotenv').config();

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// =============================================
// PÁGINAS
// =============================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/panel.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

// =============================================
// AUTENTICACIÓN Y PERMISOS
// =============================================

function autenticar(req, res, next) {
    const encabezado = req.headers.authorization;

    if (!encabezado || !encabezado.startsWith('Bearer ')) {
        return res.status(401).json({
            mensaje: 'Debes iniciar sesión.'
        });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({
            mensaje: 'El servidor no tiene configurada la clave JWT.'
        });
    }

    try {
        const token = encabezado.slice(7);
        req.auth = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({
            mensaje: 'Tu sesión expiró o el token no es válido. Inicia sesión nuevamente.'
        });
    }
}

function soloAdmin(req, res, next) {
    if (req.auth.rol !== 'admin') {
        return res.status(403).json({
            mensaje: 'No tienes permisos de administrador.'
        });
    }

    next();
}

function esNumeroPositivo(valor) {
    return Number.isInteger(Number(valor)) && Number(valor) > 0;
}

function valorOpcional(valor) {
    if (valor === undefined || valor === null || valor === '') {
        return null;
    }

    return valor;
}

// =============================================
// REGISTRO DE USUARIOS
// =============================================

app.post('/api/registro', async (req, res) => {
    try {
        const { usuario, password } = req.body;

        if (
            typeof usuario !== 'string' ||
            typeof password !== 'string' ||
            !/^[a-zA-Z0-9_]{3,50}$/.test(usuario) ||
            password.length < 8 ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            return res.status(400).json({
                mensaje: 'El usuario debe tener entre 3 y 50 caracteres y la contraseña al menos 8 caracteres.'
            });
        }

        const [existentes] = await pool.execute(
            'SELECT id FROM usuarios WHERE usuario = ?',
            [usuario]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                mensaje: 'Ese usuario ya existe.'
            });
        }

        const hash = await bcrypt.hash(password, 12);

        // Las nuevas cuentas no pueden asignarse el rol admin.
        await pool.execute(
            'INSERT INTO usuarios (usuario, password_hash) VALUES (?, ?)',
            [usuario, hash]
        );

        return res.status(201).json({
            mensaje: 'Usuario registrado correctamente.'
        });

    } catch (error) {
        console.error('Error en registro:', error);

        return res.status(500).json({
            mensaje: 'Error al registrar el usuario.'
        });
    }
});

// =============================================
// INICIO DE SESIÓN
// =============================================

app.post('/api/login', async (req, res) => {
    try {
        const { usuario, password } = req.body;

        if (
            typeof usuario !== 'string' ||
            typeof password !== 'string' ||
            password.length === 0 ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            return res.status(400).json({
                mensaje: 'Usuario o contraseña inválidos.'
            });
        }

        const [filas] = await pool.execute(
            `SELECT id, usuario, password_hash, rol
             FROM usuarios
             WHERE usuario = ?`,
            [usuario]
        );

        if (
            filas.length === 0 ||
            !(await bcrypt.compare(password, filas[0].password_hash))
        ) {
            return res.status(401).json({
                mensaje: 'Usuario o contraseña incorrectos.'
            });
        }

        const persona = filas[0];

        if (!process.env.JWT_SECRET) {
            throw new Error('Falta configurar JWT_SECRET en .env');
        }

        const token = jwt.sign(
            {
                id: persona.id,
                rol: persona.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.json({
            mensaje: 'Inicio de sesión exitoso.',
            token,
            usuario: persona.usuario,
            rol: persona.rol
        });

    } catch (error) {
        console.error('Error en login:', error);

        return res.status(500).json({
            mensaje: 'Error al iniciar sesión.'
        });
    }
});

// =============================================
// COMPROBAR SESIÓN
// =============================================

app.get('/api/sesion', autenticar, async (req, res) => {
    try {
        const [filas] = await pool.execute(
            'SELECT id, usuario, rol FROM usuarios WHERE id = ?',
            [req.auth.id]
        );

        if (filas.length === 0) {
            return res.status(401).json({
                mensaje: 'La cuenta ya no existe.'
            });
        }

        if (filas[0].rol !== req.auth.rol) {
            return res.status(401).json({
                mensaje: 'Los permisos de tu sesión han cambiado. Inicia sesión nuevamente.'
            });
        }

        return res.json({
            id: filas[0].id,
            usuario: filas[0].usuario,
            rol: filas[0].rol
        });

    } catch (error) {
        console.error('Error al comprobar sesión:', error);

        return res.status(500).json({
            mensaje: 'Error al comprobar la sesión.'
        });
    }
});

// =============================================
// ESCUELAS
// Tabla: escuelas
// =============================================

app.get('/api/escuelas', autenticar, soloAdmin, async (req, res) => {
    try {
        const [filas] = await pool.execute(
            'SELECT * FROM escuelas ORDER BY id_escuela DESC'
        );

        res.json(filas);
    } catch (error) {
        console.error('Error al consultar escuelas:', error);
        res.status(500).json({ mensaje: 'Error al consultar escuelas.' });
    }
});

app.post('/api/escuelas', autenticar, soloAdmin, async (req, res) => {
    try {
        const {
            nombre,
            clave_escuela,
            tipo_escuela,
            direccion,
            telefono,
            correo
        } = req.body;

        if (typeof nombre !== 'string' || !nombre.trim()) {
            return res.status(400).json({
                mensaje: 'El nombre de la escuela es obligatorio.'
            });
        }

        const [resultado] = await pool.execute(
            `INSERT INTO escuelas
             (nombre, clave_escuela, tipo_escuela, direccion, telefono, correo)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                nombre.trim(),
                valorOpcional(clave_escuela),
                valorOpcional(tipo_escuela),
                valorOpcional(direccion),
                valorOpcional(telefono),
                valorOpcional(correo)
            ]
        );

        res.status(201).json({
            mensaje: 'Escuela registrada correctamente.',
            id_escuela: resultado.insertId
        });

    } catch (error) {
        console.error('Error al registrar escuela:', error);
        res.status(500).json({
            mensaje: 'Error al guardar la escuela. Verifica los datos.'
        });
    }
});

// =============================================
// RESPONSABLES
// Tabla: responsables
// =============================================

app.get('/api/responsables', autenticar, soloAdmin, async (req, res) => {
    try {
        const [filas] = await pool.execute(
            'SELECT * FROM responsables ORDER BY id_responsable DESC'
        );

        res.json(filas);
    } catch (error) {
        console.error('Error al consultar responsables:', error);
        res.status(500).json({ mensaje: 'Error al consultar responsables.' });
    }
});

app.post('/api/responsables', autenticar, soloAdmin, async (req, res) => {
    try {
        const {
            id_escuela,
            nombre,
            apellido,
            telefono,
            correo,
            cargo
        } = req.body;

        if (
            !esNumeroPositivo(id_escuela) ||
            typeof nombre !== 'string' || !nombre.trim() ||
            typeof apellido !== 'string' || !apellido.trim()
        ) {
            return res.status(400).json({
                mensaje: 'Selecciona una escuela e ingresa nombre y apellido.'
            });
        }

        const [resultado] = await pool.execute(
            `INSERT INTO responsables
             (id_escuela, nombre, apellido, telefono, correo, cargo)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                Number(id_escuela),
                nombre.trim(),
                apellido.trim(),
                valorOpcional(telefono),
                valorOpcional(correo),
                valorOpcional(cargo)
            ]
        );

        res.status(201).json({
            mensaje: 'Responsable registrado correctamente.',
            id_responsable: resultado.insertId
        });

    } catch (error) {
        console.error('Error al registrar responsable:', error);
        res.status(500).json({
            mensaje: 'Error al registrar responsable. Verifica la escuela seleccionada.'
        });
    }
});

// =============================================
// GRUPOS
// Tabla: grupos
// =============================================

app.get('/api/grupos', autenticar, soloAdmin, async (req, res) => {
    try {
        const [filas] = await pool.execute(
            'SELECT * FROM grupos ORDER BY id_grupo DESC'
        );

        res.json(filas);
    } catch (error) {
        console.error('Error al consultar grupos:', error);
        res.status(500).json({ mensaje: 'Error al consultar grupos.' });
    }
});

app.post('/api/grupos', autenticar, soloAdmin, async (req, res) => {
    try {
        const {
            id_escuela,
            grado,
            grupo,
            cantidad_alumnos,
            cantidad_maestros
        } = req.body;

        if (
            !esNumeroPositivo(id_escuela) ||
            !esNumeroPositivo(cantidad_alumnos) ||
            !Number.isInteger(Number(cantidad_maestros ?? 0)) ||
            Number(cantidad_maestros ?? 0) < 0
        ) {
            return res.status(400).json({
                mensaje: 'Selecciona una escuela e ingresa cantidades válidas.'
            });
        }

        const [resultado] = await pool.execute(
            `INSERT INTO grupos
             (id_escuela, grado, grupo, cantidad_alumnos, cantidad_maestros)
             VALUES (?, ?, ?, ?, ?)`,
            [
                Number(id_escuela),
                valorOpcional(grado),
                valorOpcional(grupo),
                Number(cantidad_alumnos),
                Number(cantidad_maestros ?? 0)
            ]
        );

        res.status(201).json({
            mensaje: 'Grupo registrado correctamente.',
            id_grupo: resultado.insertId
        });

    } catch (error) {
        console.error('Error al registrar grupo:', error);
        res.status(500).json({
            mensaje: 'Error al registrar grupo. Verifica la escuela seleccionada.'
        });
    }
});

// =============================================
// SALAS
// Tabla: salas
// =============================================

app.get('/api/salas', autenticar, soloAdmin, async (req, res) => {
    try {
        const [filas] = await pool.execute(
            'SELECT * FROM salas ORDER BY id_sala DESC'
        );

        res.json(filas);
    } catch (error) {
        console.error('Error al consultar salas:', error);
        res.status(500).json({ mensaje: 'Error al consultar salas.' });
    }
});

app.post('/api/salas', autenticar, soloAdmin, async (req, res) => {
    try {
        const {
            nombre,
            descripcion,
            capacidad,
            duracion_minutos,
            activa
        } = req.body;

        if (
            typeof nombre !== 'string' || !nombre.trim() ||
            !esNumeroPositivo(capacidad) ||
            !esNumeroPositivo(duracion_minutos) ||
            ![0, 1].includes(Number(activa ?? 1))
        ) {
            return res.status(400).json({
                mensaje: 'Ingresa un nombre, capacidad, duración y estado válidos.'
            });
        }

        const [resultado] = await pool.execute(
            `INSERT INTO salas
             (nombre, descripcion, capacidad, duracion_minutos, activa)
             VALUES (?, ?, ?, ?, ?)`,
            [
                nombre.trim(),
                valorOpcional(descripcion),
                Number(capacidad),
                Number(duracion_minutos),
                Number(activa ?? 1)
            ]
        );

        res.status(201).json({
            mensaje: 'Sala registrada correctamente.',
            id_sala: resultado.insertId
        });

    } catch (error) {
        console.error('Error al registrar sala:', error);
        res.status(500).json({ mensaje: 'Error al registrar sala.' });
    }
});

// =============================================
// HORARIOS
// Tabla: horarios
// =============================================

app.get('/api/horarios', autenticar, soloAdmin, async (req, res) => {
    try {
        const [filas] = await pool.execute(
            'SELECT * FROM horarios ORDER BY hora_inicio'
        );

        res.json(filas);
    } catch (error) {
        console.error('Error al consultar horarios:', error);
        res.status(500).json({ mensaje: 'Error al consultar horarios.' });
    }
});

app.post('/api/horarios', autenticar, soloAdmin, async (req, res) => {
    try {
        const { hora_inicio, hora_fin, activo } = req.body;

        if (
            typeof hora_inicio !== 'string' ||
            typeof hora_fin !== 'string' ||
            !/^\d{2}:\d{2}$/.test(hora_inicio) ||
            !/^\d{2}:\d{2}$/.test(hora_fin) ||
            hora_inicio >= hora_fin ||
            ![0, 1].includes(Number(activo ?? 1))
        ) {
            return res.status(400).json({
                mensaje: 'Ingresa un intervalo de horario válido.'
            });
        }

        const [resultado] = await pool.execute(
            `INSERT INTO horarios (hora_inicio, hora_fin, activo)
             VALUES (?, ?, ?)`,
            [
                hora_inicio + ':00',
                hora_fin + ':00',
                Number(activo ?? 1)
            ]
        );

        res.status(201).json({
            mensaje: 'Horario registrado correctamente.',
            id_horario: resultado.insertId
        });

    } catch (error) {
        console.error('Error al registrar horario:', error);
        res.status(500).json({
            mensaje: 'Error al registrar horario.'
        });
    }
});

// =============================================
// CITAS
// Tabla: citas
// =============================================

app.get('/api/citas', autenticar, soloAdmin, async (req, res) => {
    try {
        const [filas] = await pool.execute(
            `SELECT id_cita, id_escuela, id_responsable,
                    DATE_FORMAT(fecha_visita, '%Y-%m-%d') AS fecha_visita,
                    hora_llegada, cantidad_alumnos, cantidad_maestros,
                    observaciones, estado
             FROM citas
             ORDER BY fecha_visita DESC, id_cita DESC`
        );

        res.json(filas);
    } catch (error) {
        console.error('Error al consultar citas:', error);
        res.status(500).json({ mensaje: 'Error al consultar citas.' });
    }
});

app.post('/api/citas', autenticar, soloAdmin, async (req, res) => {
    let conexion;

    try {
        const {
            id_escuela,
            id_responsable,
            fecha_visita,
            hora_llegada,
            cantidad_alumnos,
            cantidad_maestros,
            observaciones,
            asignaciones
        } = req.body;

        if (
            !esNumeroPositivo(id_escuela) ||
            !esNumeroPositivo(id_responsable) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(fecha_visita || '') ||
            !esNumeroPositivo(cantidad_alumnos) ||
            !Number.isInteger(Number(cantidad_maestros ?? 0)) ||
            Number(cantidad_maestros ?? 0) < 0 ||
            !Array.isArray(asignaciones) ||
            asignaciones.length === 0
        ) {
            return res.status(400).json({
                mensaje: 'Completa la escuela, responsable, fecha, cantidades y al menos una sala.'
            });
        }

        if (
            hora_llegada &&
            !/^\d{2}:\d{2}$/.test(hora_llegada)
        ) {
            return res.status(400).json({
                mensaje: 'La hora de llegada no es válida.'
            });
        }

        const [relacion] = await pool.execute(
            `SELECT id_responsable
             FROM responsables
             WHERE id_responsable = ? AND id_escuela = ?`,
            [Number(id_responsable), Number(id_escuela)]
        );

        if (!relacion.length) {
            return res.status(400).json({
                mensaje: 'El responsable no pertenece a la escuela seleccionada.'
            });
        }

        const combinaciones = asignaciones.map(a =>
            `${Number(a.id_sala)}-${Number(a.id_horario)}`
        );

        if (
            asignaciones.some(a =>
                !esNumeroPositivo(a.id_sala) ||
                !esNumeroPositivo(a.id_horario)
            ) ||
            new Set(combinaciones).size !== combinaciones.length
        ) {
            return res.status(400).json({
                mensaje: 'Las asignaciones de salas y horarios no son válidas o están repetidas.'
            });
        }

        conexion = await pool.getConnection();
        await conexion.beginTransaction();

        // Validar que cada sala y horario existan, estén activos
        // y que la sala tenga capacidad suficiente.
        for (const asignacion of asignaciones) {
            const [salasValidas] = await conexion.execute(
                `SELECT s.id_sala, s.capacidad
                 FROM salas s
                 WHERE s.id_sala = ?
                   AND s.activa = 1
                 FOR UPDATE`,
                [Number(asignacion.id_sala)]
            );

            const [horariosValidos] = await conexion.execute(
                `SELECT id_horario
                 FROM horarios
                 WHERE id_horario = ? AND activo = 1`,
                [Number(asignacion.id_horario)]
            );

            if (!salasValidas.length || !horariosValidos.length) {
                throw new Error('Una sala o un horario no existe o está inactivo.');
            }

            if (
                Number(cantidad_alumnos) +
                Number(cantidad_maestros ?? 0) >
                Number(salasValidas[0].capacidad)
            ) {
                throw new Error(
                    'La cantidad de alumnos y maestros supera la capacidad de una sala.'
                );
            }
        }

        const [resultado] = await conexion.execute(
            `INSERT INTO citas
             (id_escuela, id_responsable, fecha_visita, hora_llegada,
              cantidad_alumnos, cantidad_maestros, observaciones, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente')`,
            [
                Number(id_escuela),
                Number(id_responsable),
                fecha_visita,
                hora_llegada ? hora_llegada + ':00' : null,
                Number(cantidad_alumnos),
                Number(cantidad_maestros ?? 0),
                valorOpcional(observaciones)
            ]
        );

        const idCita = resultado.insertId;

        for (const asignacion of asignaciones) {
            await conexion.execute(
                `INSERT INTO cita_salas (id_cita, id_sala, id_horario)
                 VALUES (?, ?, ?)`,
                [
                    idCita,
                    Number(asignacion.id_sala),
                    Number(asignacion.id_horario)
                ]
            );
        }

        await conexion.commit();

        res.status(201).json({
            mensaje: 'Cita registrada correctamente.',
            id_cita: idCita
        });

    } catch (error) {
        if (conexion) {
            await conexion.rollback();
        }

        console.error('Error al registrar cita:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                mensaje: 'Esa sala y ese horario ya están reservados según las restricciones de la base de datos.'
            });
        }

        if (error.message.includes('capacidad') ||
            error.message.includes('inactivo')) {
            return res.status(400).json({
                mensaje: error.message
            });
        }

        res.status(500).json({
            mensaje: 'No se pudo registrar la cita. Revisa los datos y las reservas.'
        });

    } finally {
        if (conexion) {
            conexion.release();
        }
    }
});

// =============================================
// CONSULTAR LAS SALAS ASIGNADAS A UNA CITA
// =============================================

app.get('/api/citas/:id/salas', autenticar, soloAdmin, async (req, res) => {
    try {
        if (!esNumeroPositivo(req.params.id)) {
            return res.status(400).json({
                mensaje: 'El identificador de la cita no es válido.'
            });
        }

        const [filas] = await pool.execute(
            `SELECT cs.id_cita_sala, cs.id_cita,
                    s.id_sala, s.nombre AS sala,
                    h.id_horario, h.hora_inicio, h.hora_fin
             FROM cita_salas cs
             INNER JOIN salas s ON cs.id_sala = s.id_sala
             INNER JOIN horarios h ON cs.id_horario = h.id_horario
             WHERE cs.id_cita = ?
             ORDER BY h.hora_inicio`,
            [Number(req.params.id)]
        );

        res.json(filas);

    } catch (error) {
        console.error('Error al consultar salas de la cita:', error);
        res.status(500).json({
            mensaje: 'Error al consultar las salas asignadas.'
        });
    }
});

// =============================================
// CAMBIAR ESTADO DE UNA CITA
// =============================================

app.patch('/api/citas/:id/estado', autenticar, soloAdmin, async (req, res) => {
    try {
        const { estado } = req.body;
        const estadosPermitidos = [
            'Pendiente',
            'Confirmada',
            'Cancelada',
            'Realizada'
        ];

        if (
            !esNumeroPositivo(req.params.id) ||
            !estadosPermitidos.includes(estado)
        ) {
            return res.status(400).json({
                mensaje: 'El identificador o el estado de la cita no es válido.'
            });
        }

        const [resultado] = await pool.execute(
            'UPDATE citas SET estado = ? WHERE id_cita = ?',
            [estado, Number(req.params.id)]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: 'No se encontró la cita.'
            });
        }

        res.json({
            mensaje: 'Estado de la cita actualizado correctamente.'
        });

    } catch (error) {
        console.error('Error al actualizar cita:', error);
        res.status(500).json({
            mensaje: 'Error al actualizar el estado de la cita.'
        });
    }
});

// =============================================
// INICIAR SERVIDOR
// =============================================

async function iniciarServidor() {
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('Falta configurar JWT_SECRET en el archivo .env');
        }

        await pool.query('SELECT 1');

        app.listen(PORT, () => {
            console.log(`Servidor funcionando en http://localhost:${PORT}`);
            console.log('Conexión con MySQL verificada.');
        });

    } catch (error) {
        console.error('No se pudo iniciar el servidor:', error.message);
        process.exit(1);
    }
}

iniciarServidor();
