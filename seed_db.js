import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("Error: MONGODB_URI no definida en .env");
    process.exit(1);
}
const client = new MongoClient(uri);

const TIPOS_DATA = [
    {
        nombre: 'Sangre',
        descripcion_general: 'Donación de sangre para transfusiones.',
        requisitos: 'Ser mayor de edad, pesar más de 50kg, buen estado de salud.',
        pasos: 'Registro, entrevista, donación, refrigerio.',
        beneficios: 'Salvas 3 vidas.',
        color_identidad: '#bb0710'
    },
    {
        nombre: 'Médula Ósea',
        descripcion_general: 'Donación de progenitores hematopoyéticos.',
        requisitos: 'Entre 18 y 40 años, buena salud.',
        pasos: 'Registro en REDMO, compatibilidad, extracción.',
        beneficios: 'Cura para leucemia y otras enfermedades.',
        color_identidad: '#eaab00'
    },
    {
        nombre: 'Órganos',
        descripcion_general: 'Donación de órganos sólidos.',
        requisitos: 'Fallecimiento en UCI o donante vivo (riñón/hígado).',
        pasos: 'Evaluación médica, consentimiento familiar.',
        beneficios: 'Mejora o salva vidas de pacientes con fallo orgánico.',
        color_identidad: '#00afaa'
    },
    {
        nombre: 'Leche Materna',
        descripcion_general: 'Donación de leche para bebés prematuros.',
        requisitos: 'Madre lactante sana con excedente de leche.',
        pasos: 'Entrevista, análisis, extracción en casa.',
        beneficios: 'Vital para prematuros extremos.',
        color_identidad: '#f0e68c'
    },
    {
        nombre: 'Cordón Umbilical',
        descripcion_general: 'Sangre del cordón tras el parto.',
        requisitos: 'Embarazo normal, firmar consentimiento antes del parto.',
        pasos: 'Recogida tras nacimiento del bebé.',
        beneficios: 'Rica en células madre.',
        color_identidad: '#ff69b4'
    }
];

const CENTROS_DATA = [
    {
        nombre: "Hospital Universitario La Paz",
        direccion: "Paseo de la Castellana, 261, 28046 Madrid",
        provincia: "Madrid",
        telefono: "917 27 70 00",
        horario: "L-D 9:00 - 21:00",
        coordenadas: { lat: 40.4810, lon: -3.6876 },
        tipos_nombres: ['Sangre', 'Médula Ósea', 'Órganos', 'Cordón Umbilical', 'Leche Materna']
    },
    {
        nombre: "Hospital Clínic de Barcelona",
        direccion: "Carrer de Villarroel, 170, 08036 Barcelona",
        provincia: "Barcelona",
        telefono: "932 27 54 00",
        horario: "L-V 8:00 - 20:00",
        coordenadas: { lat: 41.3896, lon: 2.1554 },
        tipos_nombres: ['Sangre', 'Médula Ósea', 'Órganos']
    },
    {
        nombre: "Hospital Universitari i Politècnic La Fe",
        direccion: "Avinguda de Fernando Abril Martorell, 106, 46026 València",
        provincia: "Valencia",
        telefono: "961 24 40 00",
        horario: "L-S 9:00 - 21:00",
        coordenadas: { lat: 39.4436, lon: -0.3762 },
        tipos_nombres: ['Sangre', 'Leche Materna', 'Órganos']
    },
    {
        nombre: "Hospital Virgen del Rocío",
        direccion: "Av. Manuel Siurot, s/n, 41013 Sevilla",
        provincia: "Sevilla",
        telefono: "955 01 20 00",
        horario: "L-V 8:00 - 21:00",
        coordenadas: { lat: 37.3695, lon: -5.9868 },
        tipos_nombres: ['Sangre', 'Médula Ósea', 'Cordón Umbilical']
    },
    {
        nombre: "Hospital Universitario de Cruces",
        direccion: "Cruces Plaza, s/n, 48903 Barakaldo, Bizkaia",
        provincia: "Bizkaia",
        telefono: "946 00 60 00",
        horario: "L-V 8:30 - 20:30",
        coordenadas: { lat: 43.2843, lon: -2.9818 },
        tipos_nombres: ['Sangre', 'Órganos']
    },
    {
        nombre: "Complejo Hospitalario de Navarra",
        direccion: "C. de Irunlarrea, 3, 31008 Pamplona",
        provincia: "Navarra",
        telefono: "848 42 22 22",
        horario: "L-V 8:00 - 15:00",
        coordenadas: { lat: 42.8095, lon: -1.6644 },
        tipos_nombres: ['Sangre']
    },
    {
        nombre: "Hospital Universitario Central de Asturias",
        direccion: "Av. Roma, s/n, 33011 Oviedo",
        provincia: "Asturias",
        telefono: "985 10 80 00",
        horario: "L-D 24h",
        coordenadas: { lat: 43.3765, lon: -5.8368 },
        tipos_nombres: ['Sangre', 'Médula Ósea']
    },
    {
        nombre: "Hospital Clínico Universitario de Santiago",
        direccion: "Travesía da Choupana, s/n, 15706 Santiago de Compostela",
        provincia: "A Coruña",
        telefono: "981 95 00 00",
        horario: "L-V 9:00 - 21:00",
        coordenadas: { lat: 42.8687, lon: -8.5639 },
        tipos_nombres: ['Sangre', 'Órganos', 'Leche Materna']
    },
    {
        nombre: "Hospital Universitario Son Espases",
        direccion: "Ctra. de Valldemossa, 79, 07120 Palma, Illes Balears",
        provincia: "Baleares",
        telefono: "871 20 50 00",
        horario: "L-V 8:30 - 20:00",
        coordenadas: { lat: 39.6053, lon: 2.6515 },
        tipos_nombres: ['Sangre', 'Cordón Umbilical', 'Médula Ósea']
    },
    {
        nombre: "Hospital Miguel Servet",
        direccion: "P.º de Isabel la Católica, 1-3, 50009 Zaragoza",
        provincia: "Zaragoza",
        telefono: "976 76 55 00",
        horario: "L-V 8:00 - 21:00",
        coordenadas: { lat: 41.6358, lon: -0.9015 },
        tipos_nombres: ['Sangre', 'Leche Materna']
    }
];

async function run() {
    try {
        await client.connect();
        const db = client.db('vidar_db');
        console.log("Conectado a BD.");

        // 1. Limpiar colecciones (opcional, para evitar duplicados si limpiamos todo)
        // await db.collection('tipos_donacion').deleteMany({});
        // await db.collection('centros').deleteMany({});

        // 2. Insertar/Obtener id tipos
        const tiposMap = {}; // nombre -> _id

        for (const tipo of TIPOS_DATA) {
            // Verificar si existe
            let doc = await db.collection('tipos_donacion').findOne({ nombre: tipo.nombre });
            if (!doc) {
                const res = await db.collection('tipos_donacion').insertOne(tipo);
                doc = await db.collection('tipos_donacion').findOne({ _id: res.insertedId });
                console.log(`Creado tipo: ${tipo.nombre}`);
            } else {
                console.log(`Ya existe tipo: ${tipo.nombre}`);
            }
            tiposMap[tipo.nombre] = doc._id;
        }

        // 3. Insertar Centros con IDs correctos
        for (const centro of CENTROS_DATA) {

            // Mapear nombres a IDs
            const tiposIds = [];
            if (centro.tipos_nombres) {
                for (const tName of centro.tipos_nombres) {
                    if (tiposMap[tName]) tiposIds.push(tiposMap[tName]);
                }
            }

            const nuevoCentro = {
                nombre: centro.nombre,
                direccion: centro.direccion,
                provincia: centro.provincia,
                telefono: centro.telefono,
                horario: centro.horario,
                coordenadas: centro.coordenadas,
                tipos_disponibles: tiposIds, // Array de ObjectId
                email_contacto: "info@hospital.es"
            };

            // Verificar duplicados por nombre
            const existing = await db.collection('centros').findOne({ nombre: centro.nombre });
            if (!existing) {
                await db.collection('centros').insertOne(nuevoCentro);
                console.log(`Creado centro: ${centro.nombre}`);
            } else {
                // Actualizar tipos si ya existe (para asegurar que map funcione)
                await db.collection('centros').updateOne(
                    { _id: existing._id },
                    { $set: { tipos_disponibles: tiposIds, coordenadas: centro.coordenadas } }
                );
                console.log(`Actualizado centro: ${centro.nombre}`);
            }
        }

        console.log("¡Carga de datos completada!");

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}
run();
