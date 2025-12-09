import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import { BlobServiceClient } from '@azure/storage-blob';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

// Cargar variables de entorno desde .env
dotenv.config();

//Configuraciones de entorno
const { MONGODB_URI, MONGODB_DB, port = process.env.PORT || 4000, API_KEY, AZURE_STORAGE_CONNECTION_STRING, AZURE_BLOB_CONTAINER, AZURE_STORAGE_ACCOUNT, AZURE_SAS_TOKEN } = process.env;

// Verificar si falta algo crítico
if (!MONGODB_URI || !MONGODB_DB || !API_KEY || !AZURE_STORAGE_CONNECTION_STRING || !AZURE_BLOB_CONTAINER || !AZURE_STORAGE_ACCOUNT || !AZURE_SAS_TOKEN) {
  console.error('Faltan variables de entorno: MONGODB_URI, MONGODB_DB, API_KEY, AZURE...');
  process.exit(1);
}

// Cliente de Azure Blob
const blobService = new BlobServiceClient(
  `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net?${AZURE_SAS_TOKEN}`
);

const container = blobService.getContainerClient(AZURE_BLOB_CONTAINER);

const app = express();

// Helper: genera URL pública con SAS incluido
function blobUrlWithSas(blobName) {
  return `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/${AZURE_BLOB_CONTAINER}/${blobName}?${AZURE_SAS_TOKEN}`;
}

// Middlewares de seguridad y utilidades
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "connect-src": ["'self'", "http://localhost:4000", "http://127.0.0.1:4000"],
      "img-src": ["'self'", "https:", "data:", "https://esdibstorage.blob.core.windows.net"],
      "script-src": ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      "style-src": ["'self'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://unpkg.com", "'unsafe-inline'"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
    }
  }
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'public/paginaEsdib')));
app.use(express.static(path.join(__dirname, 'public/formulario admin')));

// Configurar Multer (aunque no se especifica uso de imágenes en el nuevo esquema, lo dejamos por si acaso)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const ok = /image\/(png|jpe?g|webp)/i.test(file.mimetype);
    cb(ok ? null : new Error('Solo imágenes (png/jpg/webp)'), ok);
  }
});

// Auth por API Key
const apiKeyGuard = (req, res, next) => {
  // Permitir acceso público a endpoints de autenticación y contacto
  if (req.path.startsWith('/auth') || req.path.startsWith('/contacto')) return next();
  // Permitir lectura pública de noticias
  if (req.method === 'GET' && req.path.startsWith('/noticias')) return next();

  if (req.header('x-api-key') !== process.env.API_KEY) return res.status(401).json({ error: 'No autorizado' });
  next();
};
app.use('/api', apiKeyGuard);

// Conexión a MONGODB
let client;
let db;
async function connectToMongo() {
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db('vidar_db'); // Forzamos vidar_db
  console.log('✅ Conectado a MongoDB (vidar_db)');
}

// --- HELPERS DE VALIDACIÓN ---

function parseDateField(value, fieldName) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`El campo "${fieldName}" no es una fecha válida`);
  }
  return d;
}

function parseBoolField(value) {
  if (value === 'true' || value === true) return true;
  return false;
}

function parseFloatField(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const num = parseFloat(value);
  if (Number.isNaN(num)) {
    throw new Error(`El campo "${fieldName}" debe ser un número decimal`);
  }
  return num;
}

// --- NORMALIZADORES ---

function normalizeDonante(body) {
  const { nombre, apellidos, email, telefono, fecha_nacimiento, provincia, es_donante_registrado } = body;
  if (!nombre || !email) throw new Error('Nombre y Email son obligatorios para Donante');
  return {
    nombre: String(nombre).trim(),
    apellidos: apellidos ? String(apellidos).trim() : null,
    email: String(email).trim(),
    telefono: telefono ? String(telefono).trim() : null,
    fecha_nacimiento: parseDateField(fecha_nacimiento, 'fecha_nacimiento'),
    provincia: provincia ? String(provincia).trim() : null,
    es_donante_registrado: parseBoolField(es_donante_registrado)
  };
}

function normalizeTipoDonacion(body) {
  const { nombre, descripcion_general, requisitos, pasos, beneficios, color_identidad } = body;
  if (!nombre) throw new Error('Nombre es obligatorio para Tipo de Donación');
  return {
    nombre: String(nombre).trim(),
    descripcion_general: descripcion_general ? String(descripcion_general).trim() : null,
    requisitos: requisitos ? String(requisitos).trim() : null,
    pasos: pasos ? String(pasos).trim() : null,
    beneficios: beneficios ? String(beneficios).trim() : null,
    color_identidad: color_identidad ? String(color_identidad).trim() : null
  };
}

function normalizeCentro(body) {
  const { nombre, direccion, provincia, telefono, email_contacto, horario, lat, lon, tipos_disponibles } = body;
  if (!nombre) throw new Error('Nombre es obligatorio para Centro');

  let coordenadas = null;
  if (lat || lon) {
    coordenadas = {
      lat: parseFloatField(lat, 'lat'),
      lon: parseFloatField(lon, 'lon')
    };
  }

  // tipos_disponibles se espera como array de IDs
  let tipos = [];
  if (Array.isArray(tipos_disponibles)) {
    tipos = tipos_disponibles.map(id => new ObjectId(id));
  } else if (typeof tipos_disponibles === 'string') {
    // Si viene como string separado por comas o un solo ID
    tipos = tipos_disponibles.split(',').map(s => s.trim()).filter(s => ObjectId.isValid(s)).map(s => new ObjectId(s));
  }

  return {
    nombre: String(nombre).trim(),
    direccion: direccion ? String(direccion).trim() : null,
    provincia: provincia ? String(provincia).trim() : null,
    telefono: telefono ? String(telefono).trim() : null,
    email_contacto: email_contacto ? String(email_contacto).trim() : null,
    horario: horario ? String(horario).trim() : null,
    coordenadas,
    tipos_disponibles: tipos
  };
}

function normalizeDonacion(body) {
  const { id_donante, id_tipo, id_centro, fecha_donacion, estado } = body;
  if (!id_donante || !id_tipo || !id_centro) throw new Error('IDs de donante, tipo y centro son obligatorios');

  return {
    id_donante: new ObjectId(id_donante),
    id_tipo: new ObjectId(id_tipo),
    id_centro: new ObjectId(id_centro),
    fecha_donacion: parseDateField(fecha_donacion, 'fecha_donacion'),
    estado: estado ? String(estado).trim() : 'pendiente'
  };
}

function normalizeContacto(body) {
  const { nombre, email, mensaje, fecha_envio } = body;
  if (!nombre || !email) throw new Error('Nombre y Email son obligatorios para Contacto');
  return {
    nombre: String(nombre).trim(),
    email: String(email).trim(),
    mensaje: mensaje ? String(mensaje).trim() : null,
    fecha_envio: fecha_envio ? parseDateField(fecha_envio, 'fecha_envio') : new Date()
  };
}

function normalizeNoticia(body) {
  const { titulo, imagen, contenido, fecha } = body;
  if (!titulo || !contenido) throw new Error('Título y Contenido son obligatorios');
  return {
    titulo: String(titulo).trim(),
    imagen: imagen ? String(imagen).trim() : 'ilustraciones_logos/sang.svg', // Default
    contenido: String(contenido).trim(),
    fecha: fecha ? parseDateField(fecha, 'fecha') : new Date()
  };
}

// --- RUTAS GENÉRICAS ---

// Helper para crear rutas CRUD básicas
function createCrudRoutes(collectionName, normalizeFunc) {
  const router = express.Router();

  // GET ALL
  router.get('/', async (req, res) => {
    try {
      const items = await db.collection(collectionName).find({}).sort({ _id: -1 }).toArray();
      res.json(items);
    } catch (err) {
      console.error(`Error GET /api/${collectionName}:`, err);
      res.status(500).json({ error: 'Error al obtener datos' });
    }
  });

  // POST
  router.post('/', async (req, res) => {
    try {
      const payload = normalizeFunc(req.body);
      const result = await db.collection(collectionName).insertOne(payload);
      const doc = await db.collection(collectionName).findOne({ _id: result.insertedId });
      res.status(201).json(doc);
    } catch (err) {
      console.error(`Error POST /api/${collectionName}:`, err);
      res.status(400).json({ error: err.message || 'Error al crear' });
    }
  });

  // DELETE
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'ID no válido' });
      const result = await db.collection(collectionName).deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) return res.status(404).json({ error: 'No encontrado' });
      res.json({ ok: true });
    } catch (err) {
      console.error(`Error DELETE /api/${collectionName}:`, err);
      res.status(500).json({ error: 'Error al eliminar' });
    }
  });

  // PUT
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'ID no válido' });
      const payload = normalizeFunc(req.body);
      const result = await db.collection(collectionName).updateOne({ _id: new ObjectId(id) }, { $set: payload });
      if (result.matchedCount === 0) return res.status(404).json({ error: 'No encontrado' });
      const doc = await db.collection(collectionName).findOne({ _id: new ObjectId(id) });
      res.json(doc);
    } catch (err) {
      console.error(`Error PUT /api/${collectionName}:`, err);
      res.status(400).json({ error: err.message || 'Error al actualizar' });
    }
  });

  return router;
}

// Registrar rutas
app.use('/api/donantes', createCrudRoutes('donantes', normalizeDonante));
app.use('/api/tipos_donacion', createCrudRoutes('tipos_donacion', normalizeTipoDonacion));
app.use('/api/centros', createCrudRoutes('centros', normalizeCentro));
app.use('/api/donaciones_realizadas', createCrudRoutes('donaciones_realizadas', normalizeDonacion));
app.use('/api/contacto', createCrudRoutes('contacto', normalizeContacto));
app.use('/api/noticias', createCrudRoutes('noticias', normalizeNoticia));

// Endpoint de subida de archivos a Azure
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se envió ningún archivo' });

    const blobName = `${Date.now()}-${req.file.originalname}`;
    const blockBlobClient = container.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype }
    });

    // Generar URL con SAS
    const url = blobUrlWithSas(blobName);
    res.json({ url });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
});

// --- AUTHENTICATION ---

function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

const authRouter = express.Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });

    const existing = await db.collection('users').findOne({ username });
    if (existing) return res.status(400).json({ error: 'El usuario ya existe' });

    const role = username.toLowerCase().includes('admin') ? 'admin' : 'user';

    const { hash, salt } = hashPassword(password);
    const newUser = {
      username,
      hash,
      salt,
      role,
      createdAt: new Date()
    };

    await db.collection('users').insertOne(newUser);
    res.status(201).json({ message: 'Usuario registrado correctamente' });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ error: 'Error al registrar' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Faltan credenciales' });

    const user = await db.collection('users').findOne({ username });
    if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });

    if (!verifyPassword(password, user.hash, user.salt)) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // En un caso real usaríamos JWT. Aquí devolvemos datos básicos.
    res.json({
      message: 'Login exitoso',
      user: {
        id: user._id,
        username: user.username,
        role: user.role || 'user'
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

app.use('/api/auth', authRouter);

// Serve Homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/paginaEsdib/index.html'));
});

// Serve Admin Panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/formulario admin/index.html'));
});

// Arranque
connectToMongo()
  .then(() => {
    app.listen(port, () => console.log(`🚀 API escuchando en http://localhost:${port}`));
  })
  .catch((err) => {
    console.error('No se pudo conectar a MongoDB:', err);
    process.exit(1);
  });

// Cierre elegante
process.on('SIGINT', async () => {
  try {
    await client?.close();
  } finally {
    process.exit(0);
  }
});