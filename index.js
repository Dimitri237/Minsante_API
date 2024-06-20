const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('./authMiddleware');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const { Pool } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

const pool = new Pool({
    host: 'localhost',
    user: 'postgres',
    password: '771817',
    database: 'minsante2',
    port: 5432
});

const app = express();
app.use(bodyParser.json());
app.use(cors());

const Papa = require('papaparse');

async function importData(filePath) {
    try {
        const csvData = await fs.promises.readFile(filePath, 'utf8');
        const { data } = Papa.parse(csvData, { header: true });
        const uniqueData = new Set();

        for (const row of data) {
            const rowData = {
                matricule: row.matricule,
                nom_prenom: row.nom_prenom,
                date_naissance: row.date_naissance,
                lieu_naissance: row.lieu_naissance,
                pays_naissance: row.pays_naissance,
                sexe: row.sexe,
                profession: row.profession,
                specialisation: row.specialisation,
                pays_formation: row.pays_formation,
                duree_specialisation: row.duree_specialisation,
                lieu_service: row.lieu_service,
                fonction: row.fonction,
                contact: row.contact,
                district: row.district,
                region: row.region,
            };
            const rowKey = JSON.stringify(rowData);
            if (!uniqueData.has(rowKey)) {
                uniqueData.add(rowKey);
            }
        }

        const processedData = Array.from(uniqueData).map(rowKey => JSON.parse(rowKey));

        const tableName = 'personnel'; // Remplacez par le nom réel de votre table (assurez-vous qu'elle existe)
        const insertQuery = `INSERT INTO ${tableName} (matricule, nom_prenom, date_naissance, lieu_naissance, pays_naissance, sexe, profession, specialisation, pays_formation, duree_specialisation, lieu_service, fonction, contact, district, region) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`;

        for (const row of processedData) {
            const values = [
                row.matricule,
                row.nom_prenom,
                row.date_naissance,
                row.lieu_naissance,
                row.pays_naissance,
                row.sexe,
                row.profession,
                row.specialisation,
                row.pays_formation,
                row.duree_specialisation,
                row.lieu_service,
                row.fonction,
                row.contact,
                row.district,
                row.region,
            ];
            await pool.query(insertQuery, values);
        }

        console.log('Données importées avec succès !');
    } catch (error) {
        console.error('Erreur lors de l\'importation des données :', error);
    }
}
// Appel de la fonction importData avec le chemin du fichier
app.post('/import', upload.single('excelFile'), async (req, res) => {
    const filePath = req.file.path; // Chemin d'accès au fichier téléchargé

    try {
        await importData(filePath);
        res.send('Données importées avec succès !');
    } catch (error) {
        console.error('Erreur lors de l\'importation des données :', error);
        res.status(500).send('Erreur lors de l\'importation des données.');
    }

    // Supprimez le fichier téléchargé après l'importation
    fs.unlinkSync(filePath);
});
// Route d'enregistrement (signup)
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = 'INSERT INTO users (id, username, date_naissance, image, type,, password, create_at, updat_at, create_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    const values = [id, username, date_naissance, image, type, hashedPassword, create_at, updat_at, create_by];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'Utilisateur créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'insertion de l\'utilisateur :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
// Route de connexion (login)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const query = 'SELECT * FROM users WHERE username = $1';
        const result = await pool.query(query, [username]);

        if (result.rowCount === 1) {
            const user = result.rows[0];

            if (user.password === password) {
                const token = jwt.sign({ username }, '77181753');
                res.json({ token });
            } else {
                res.status(401).json({ message: 'Mot de passe incorrect' });
            }
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (error) {
        console.error('Erreur lors de la connexion :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.delete('/actes/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const query = 'DELETE FROM actes WHERE id = $1';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 1) {
            res.json({ message: 'Acte supprimé avec succès' });
        } else {
            res.status(404).json({ message: 'Acte non trouvé' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Une erreur s\'est produite lors de la suppression de l\'acte' });
    }
});
app.delete('/offres/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const query = 'DELETE FROM offres WHERE id = $1';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 1) {
            res.json({ message: 'Offre supprimé avec succès' });
        } else {
            res.status(404).json({ message: 'Offres non trouvé' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Une erreur s\'est produite lors de la suppression de l\'offre' });
    }
});
app.delete('/realisations/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const query = 'DELETE FROM realisations WHERE id = $1';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 1) {
            res.json({ message: 'Realisation supprimé avec succès' });
        } else {
            res.status(404).json({ message: 'Realisations non trouvé' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Une erreur s\'est produite lors de la suppression de la realisation' });
    }
});
app.post('/personnel', async (req, res) => {
    const { matricule, nom_prenom, date_naissance, lieu_naissance, pays_naissance, sexe, profession, spécialisation, pays_formation, durée_spécialisation, lieu_service } = req.body;
    const update_at = new Date();
    const create_at = new Date();

    const query = 'INSERT INTO personnel (matricule, nom_prenom, date_naissance, lieu_naissance, pays_naissance, sexe, profession, spécialisation, pays_formation, durée_spécialisation, lieu_service, create_at, update_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)';
    const values = [matricule, nom_prenom, date_naissance, lieu_naissance, pays_naissance, sexe, profession, spécialisation, pays_formation, durée_spécialisation, lieu_service, create_at, update_at];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'Employe créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'insertion de l\'employe :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/personnel', async (req, res) => {
    try {
        const query = 'SELECT * FROM personnel';
        const result = await pool.query(query);
        const personnels = result.rows;
        res.status(200).json(personnels);
    } catch (error) {
        console.error('Erreur lors de la récupération des personnels :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/personnel/:matricule', async (req, res) => {
    try {
        const { matricule } = req.params;
        const query = 'SELECT * FROM personnel WHERE matricule = $1';
        const result = await pool.query(query, [matricule]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Employé non trouvé' });
        }

        const personnel = result.rows[0];
        res.status(200).json(personnel);
    } catch (error) {
        console.error('Erreur lors de la récupération des détails du personnel :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.delete('/personnel/:matricule', async (req, res) => {
    const matricule = req.params.matricule;

    try {
        const query = 'DELETE FROM personnel WHERE matricule = $1';
        const result = await pool.query(query, [matricule]);

        if (result.rowCount === 1) {
            res.json({ message: 'Personnel supprimé avec succès' });
        } else {
            res.status(404).json({ message: 'Personnel non trouvé' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Une erreur s\'est produite lors de la suppression du Personnel' });
    }
});
app.get('/personnel-count', async (req, res) => {
    try {
        const query = 'SELECT COUNT(*) AS count FROM personnel';
        const result = await pool.query(query);
        const count = result.rows[0].count;
        res.status(200).json({ count });
    } catch (error) {
        console.error('Erreur lors de la récupération du nombre de personnels :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/personnel-search', async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.status(400).json({ error: 'Le paramètre de recherche est requis' });
    }

    try {
        const searchTerm = `%${q.toLowerCase()}%`;
        const { rows } = await pool.query(
            'SELECT matricule, nom_prenom, matricule, profession FROM personnel WHERE LOWER(nom_prenom) LIKE $1 OR LOWER(profession) LIKE $1 OR LOWER(matricule) LIKE $1',
            [searchTerm]
        );

        res.json(rows);
    } catch (err) {
        console.error('Erreur lors de la recherche d\'employés :', err);
        res.status(500).json({ error: 'Une erreur est survenue lors de la recherche d\'employés' });
    }
});
//operations des type d'actes
app.post('/type_actes', async (req, res) => {
    const { libelle, create_by } = req.body;

    const id = uuidv4(); // Générer un nouvel ID unique
    const update_at = new Date();
    const create_at = new Date();

    const query = 'INSERT INTO type_actes (id, libelle, create_at, update_at, create_by) VALUES ($1, $2, $3, $4, $5)';
    const values = [id, libelle, create_at, update_at, create_by];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'Type d\'acte créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'insertion du type d\'acte :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/type_actes', async (req, res) => {
    try {
        const query = 'SELECT * FROM type_actes';
        const result = await pool.query(query);
        const type_actes = result.rows;
        res.status(200).json(type_actes);
    } catch (error) {
        console.error('Erreur lors de la récupération des type actes :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
//recuperation des categories d'acte
app.get('/categorie_acte', async (req, res) => {
    try {
        const query = 'SELECT * FROM categorie_acte';
        const result = await pool.query(query);
        const categorie_acte = result.rows;
        res.status(200).json(categorie_acte);
    } catch (error) {
        console.error('Erreur lors de la récupération des categories actes :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
//operation des type de formations sanitaire
app.post('/type_fs', async (req, res) => {
    const { libelle, create_by } = req.body;

    const id = uuidv4(); // Générer un nouvel ID unique
    const update_at = new Date();
    const create_at = new Date();

    const query = 'INSERT INTO type_fs (id, libelle, create_at, update_at, create_by) VALUES ($1, $2, $3, $4, $5)';
    const values = [id, libelle, create_at, update_at, create_by];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'type créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'insertion du type :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/type_fs', async (req, res) => {
    try {
        const query = 'SELECT * FROM type_fs';
        const result = await pool.query(query);
        const type_fs = result.rows;
        res.status(200).json(type_fs);
    } catch (error) {
        console.error('Erreur lors de la récupération des type  :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
//recuperation des regions
app.get('/region', async (req, res) => {
    try {
        const query = 'SELECT * FROM region';
        const result = await pool.query(query);
        const region = result.rows;
        res.status(200).json(region);
    } catch (error) {
        console.error('Erreur lors de la récupération des regions  :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
//operation des type d'utilisateur
app.post('/type_user', async (req, res) => {
    const { libelle, create_by } = req.body;

    const id = uuidv4(); // Générer un nouvel ID unique
    const update_at = new Date();
    const create_at = new Date();

    const query = 'INSERT INTO type_user (id, libelle, create_at, update_at, create_by) VALUES ($1, $2, $3, $4, $5)';
    const values = [id, libelle, create_at, update_at, create_by];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'type créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'insertion du type :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/type_user', async (req, res) => {
    try {
        const query = 'SELECT * FROM type_user';
        const result = await pool.query(query);
        const type_user = result.rows;
        res.status(200).json(type_user);
    } catch (error) {
        console.error('Erreur lors de la récupération des type  :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
//operation des fonction de service
app.post('/service_fonction', async (req, res) => {
    const { libelle, create_by } = req.body;

    const id = uuidv4(); // Générer un nouvel ID unique
    const update_at = new Date();
    const create_at = new Date();

    const query = 'INSERT INTO service_fonction (id, libelle, create_at, update_at, create_by) VALUES ($1, $2, $3, $4, $5)';
    const values = [id, libelle, create_at, update_at, create_by];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'Type de service créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'insertion du type de service :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/service_fonction', async (req, res) => {
    try {
        const query = 'SELECT * FROM service_fonction';
        const result = await pool.query(query);
        const service_fonction = result.rows;
        res.status(200).json(service_fonction);
    } catch (error) {
        console.error('Erreur lors de la récupération des type  :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
//operation des fonction de service
app.post('/adress', async (req, res) => {
    const { libelle, create_by } = req.body;

    const id = uuidv4(); // Générer un nouvel ID unique
    const update_at = new Date();
    const create_at = new Date();

    const query = 'INSERT INTO adress (id, libelle, create_at, update_at, create_by) VALUES ($1, $2, $3, $4, $5)';
    const values = [id, libelle, create_at, update_at, create_by];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'Adresse créée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la creation de l\'adresse :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/adress', async (req, res) => {
    try {
        const query = 'SELECT * FROM adress';
        const result = await pool.query(query);
        const adress = result.rows;
        res.status(200).json(adress);
    } catch (error) {
        console.error('Erreur lors de la récupération des adress  :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
// Endpoint pour la création d'un acte avec le fichier PDF
app.post('/actes', upload.single('pdf'), async (req, res) => {
    const pdfData = fs.readFileSync(req.file.path);
    const pdfBase64 = pdfData.toString('base64');

    const { type, titre, description, numero, categorie, signature_date, signataire } = req.body;

    const id = uuidv4(); // Générer un nouvel ID unique
    const create_at = new Date();
    const update_at = new Date();
    const pdfPath = req.file.path; // Chemin du fichier PDF enregistré

    const query = 'INSERT INTO actes (id, type, titre, description, create_at, update_at, pdf_data, numero, categorie, signature_date, signataire) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)';
    const values = [id, type, titre, description, create_at, update_at, pdfBase64, numero, categorie, signature_date, signataire];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'Acte créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'insertion de l\'acte :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/actes', async (req, res) => {
    try {
        const query = 'SELECT * FROM actes';
        const result = await pool.query(query);
        const actes = result.rows;
        res.status(200).json(actes);
    } catch (error) {
        console.error('Erreur lors de la récupération des actes :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.post('/formation_sanitaire', async (req, res) => {

    const { id_type, id_adress, libelle, region, district } = req.body;

    const id = uuidv4(); // Générer un nouvel ID unique
    const create_at = new Date();
    const update_at = new Date();

    const query = 'INSERT INTO formation_sanitaire (id, id_type, id_adress, libelle, create_at, update_at, region, district) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
    const values = [id, id_type, id_adress, libelle, create_at, update_at, region, district];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'Structure sanitaire créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'insertion de la Structure :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/formation_sanitaire', async (req, res) => {
    try {
        const query = 'SELECT * FROM formation_sanitaire';
        const result = await pool.query(query);
        const formation_sanitaire = result.rows;
        res.status(200).json(formation_sanitaire);
    } catch (error) {
        console.error('Erreur lors de la récupération des structures sanitaires :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.post('/lieu_service', async (req, res) => {

    const { id_perso, id_acte, id_fsactuel, id_fsnouvelle, date_signatureacte, categorie_acte, poste } = req.body;

    const id = uuidv4(); // Générer un nouvel ID unique
    const create_at = new Date();
    const update_at = new Date();


    const query = 'INSERT INTO lieu_service (id,  id_perso, id_acte, id_fsActuel, id_fsNouvelle, create_at, update_at, date_signatureacte, categorie_acte, poste ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';
    const values = [id, id_perso, id_acte, id_fsactuel, id_fsnouvelle, create_at, update_at, date_signatureacte, categorie_acte, poste];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'Affectation créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'affectation :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.post('/approbation_stage', async (req, res) => {

    const { id_perso, id_acte, date_signatureacte, categorie_acte, lieu_stage, debut_stage, fin_stage } = req.body;

    const id = uuidv4(); // Générer un nouvel ID unique
    const create_at = new Date();
    const update_at = new Date();


    const query = 'INSERT INTO approbation_stage (id,  id_perso, id_acte, create_at, update_at, date_signatureacte, categorie_acte, lieu_stage, debut_stage, fin_stage ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';
    const values = [id, id_perso, id_acte, create_at, update_at, date_signatureacte, categorie_acte, lieu_stage, debut_stage, fin_stage];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'Approbation créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'insertion de la mise en stage :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/approbation_stage/:id_perso', async (req, res) => {
    try {
        const { id_perso } = req.params;
        const query = 'SELECT * FROM approbation_stage WHERE id_perso = $1';
        const result = await pool.query(query, [id_perso]);
        const approbation_stage = result.rows;
        res.status(200).json(approbation_stage);
    } catch (error) {
        console.error('Erreur lors de la récupération des approbation de stage :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/lieu_service/:id_perso', async (req, res) => {
    try {
        const { id_perso } = req.params;
        const query = 'SELECT * FROM lieu_service WHERE id_perso = $1';
        const result = await pool.query(query, [id_perso]);
        const lieu_service = result.rows;
        res.status(200).json(lieu_service);
    } catch (error) {
        console.error('Erreur lors des affectation :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/lieu_service-count', async (req, res) => {
    try {
        const query = 'SELECT COUNT(*) AS count FROM lieu_service';
        const result = await pool.query(query);
        const count = result.rows[0].count;
        res.status(200).json({ count });
    } catch (error) {
        console.error('Erreur lors de la récupération du nombre d\'affectation :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/lieu_service', async (req, res) => {
    try {
        const query = 'SELECT * FROM lieu_service';
        const result = await pool.query(query);
        const lieu_service = result.rows;
        res.status(200).json(lieu_service);
    } catch (error) {
        console.error('Erreur lors de la récupération des affectations :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.post('/mise_stage', async (req, res) => {

    const { id_perso, nom_prenom, sex, situation_matri, date_naissance, lieu_naissance, telephone, piece, id_fs } = req.body;

    const id = uuidv4(); // Générer un nouvel ID unique
    const create_at = new Date();
    const update_at = new Date();

    const query = 'INSERT INTO mise_stage (id, id_perso, nom_prenom, sex, situation_matri, date_naissance, lieu_naissance, telephone, piece, id_fs, create_at, update_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)';
    const values = [id, id_perso, nom_prenom, sex, situation_matri, date_naissance, lieu_naissance, telephone, piece, id_fs, create_at, update_at];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'mise_stage créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'insertion de mise_stage :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/mise_stage', async (req, res) => {
    try {
        const query = 'SELECT * FROM mise_stage';
        const result = await pool.query(query);
        const mise_stage = result.rows;
        res.status(200).json(mise_stage);
    } catch (error) {
        console.error('Erreur lors de la récupération des mise_stage :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/mise_stage/:id_perso', async (req, res) => {
    try {
        const { id_perso } = req.params;
        const query = 'SELECT * FROM mise_stage WHERE id_perso = $1';
        const result = await pool.query(query, [id_perso]);
        const mise_stage = result.rows;
        res.status(200).json(mise_stage);
    } catch (error) {
        console.error('Erreur lors de la récupération des mise_stage :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/mise_stage-count', async (req, res) => {
    try {
        const query = 'SELECT COUNT(*) AS count FROM mise_stage';
        const result = await pool.query(query);
        const count = result.rows[0].count;
        res.status(200).json({ count });
    } catch (error) {
        console.error('Erreur lors de la récupération du nombre de mise_stage :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.post('/priseService_repriseService', async (req, res) => {

    const { id_perso, nom_prenom, sex, situation_matri, region_origine, date_naissance, lieu_naissance, telephone, id_fs, corp, grade, specialite, piece_jointe } = req.body;

    const id = uuidv4(); // Générer un nouvel ID unique
    const create_at = new Date();
    const update_at = new Date();

    const query = 'INSERT INTO priseService_repriseService (id,  id_perso, nom_prenom, sex, situation_matri, region_origine, date_naissance, lieu_naissance, telephone, id_fs, corp, grade, specialite, piece_jointe, create_at, update_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)';
    const values = [id, id_perso, nom_prenom, sex, situation_matri, region_origine, date_naissance, lieu_naissance, telephone, id_fs, corp, grade, specialite, piece_jointe, create_at, update_at];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'priseService_repriseService créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'insertion de priseService_repriseService :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/priseService_repriseService', async (req, res) => {
    try {
        const query = 'SELECT * FROM priseService_repriseService';
        const result = await pool.query(query);
        const priseService_repriseService = result.rows;
        res.status(200).json(priseService_repriseService);
    } catch (error) {
        console.error('Erreur lors de la récupération des priseService_repriseService :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.post('/doc_auth', upload.single('pdf'), async (req, res) => {
    const { nom_concerne, mail, phone, descript, localisation } = req.body;

    const id = uuidv4(); // Générer un nouvel ID unique
    const create_at = new Date();
    const pdfPath = req.file.path; // Chemin du fichier PDF enregistré

    const query = 'INSERT INTO doc_auth (id, nom_concerne, mail, phone, descript, localisation, pdf_path, create_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)';
    const values = [id, nom_concerne, mail, phone, descript, localisation, pdfPath, create_at];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'document envoyee avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'envoie du document :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/priseService_repriseService-count', async (req, res) => {
    try {
        const query = 'SELECT COUNT(*) AS count FROM priseService_repriseService';
        const result = await pool.query(query);
        const count = result.rows[0].count;
        res.status(200).json({ count });
    } catch (error) {
        console.error('Erreur lors de la récupération du nombre de priseService_repriseService :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/doc_auth', async (req, res) => {
    try {
        const query = 'SELECT * FROM doc_auth';
        const result = await pool.query(query);
        const doc_auth = result.rows;
        res.status(200).json(doc_auth);
    } catch (error) {
        console.error('Erreur lors de la récupération des docments :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
// Route d'enregistrement d'une realisation
app.post('/realisations', upload.single('pdf'), async (req, res) => {
    const { nom_auteur, poste, titre, descript, region } = req.body;

    const id = uuidv4(); // Générer un nouvel ID unique
    const create_at = new Date();
    const pdfPath = req.file.path; // Chemin du fichier PDF enregistré

    const query = 'INSERT INTO realisations (id, nom_auteur, poste, titre, descript, region, create_at, pdf_path) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
    const values = [id, nom_auteur, poste, titre, descript, region, create_at, pdfPath];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'realisation créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'insertion de la realisation :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/realisations', async (req, res) => {
    try {
        const query = 'SELECT * FROM realisations';
        const result = await pool.query(query);
        const realisations = result.rows;
        res.status(200).json(realisations);
    } catch (error) {
        console.error('Erreur lors de la récupération des realisations :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
// Route d'enregistrement d'une offre
app.post('/offres', upload.single('pdf'), async (req, res) => {
    const { nom_acteur, poste, titre, descript, region } = req.body;

    const id = uuidv4(); // Générer un nouvel ID unique
    const create_at = new Date();
    const pdfPath = req.file.path; // Chemin du fichier PDF enregistré

    const query = 'INSERT INTO offres (id, nom_acteur, poste, titre, descript, region, create_at, pdf_path) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
    const values = [id, nom_acteur, poste, titre, descript, region, create_at, pdfPath];

    try {
        await pool.query(query, values);
        res.status(201).json({ message: 'offre créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'insertion de l\'offre :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
app.get('/offres', async (req, res) => {
    try {
        const query = 'SELECT * FROM offres';
        const result = await pool.query(query);
        const offres = result.rows;
        res.status(200).json(offres);
    } catch (error) {
        console.error('Erreur lors de la récupération des offres :', error);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});
// Route protégée - Exemple d'utilisation du middleware d'authentification
app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Route protégée accessible avec succès', user: req.user });
});
// Démarrer le serveur
const port = 3000;
app.listen(port, () => {
    console.log(`Le serveur est en cours d'exécution sur le port ${port}`);
});