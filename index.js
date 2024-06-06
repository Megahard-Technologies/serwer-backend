const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const QUERY_RESULT_ERROR = 500;
const PORT = 3000;

const app = express();

app.use(cors());

const db = mysql.createConnection({
  host: 'localhost',
  port: 3333,
  user: 'root',
  password: 'root',
  database: 'kck_pio_db',
  timezone: 'Z' // zmiana strefy czasowej na UTC
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Connected to database');
});

app.get('/api/wydarzenia', (req, res) => {
  const sql =
    `SELECT wydarzenia.id_wydarzenia, uslugodawca.nazwa_firmy, wydarzenia.nazwa, uslugodawca.adres, wydarzenia.zdjecie, wydarzenia.czas_rozpoczecia
  FROM wydarzenia JOIN uslugodawca ON wydarzenia.id_uslugodawcy = uslugodawca.id_uslugodawcy
  WHERE wydarzenia.czas_zakonczenia >= NOW()`; // zakończone wydarzenia nie pokazują się

  db.query(sql, (err, result) => {
    if (err) {
      res.status(QUERY_RESULT_ERROR).send({ error: 'Something failed!' });
    } else {
      const events = result.map(event => {
        if (event.zdjecie) {
          event.image_base64 = event.zdjecie;
        }
        delete event.zdjecie;
        return event;
      });
      res.json(events);
    }
  });
});

app.get('/api/wydarzenia/szczegoly/:eventId', (req, res) => {
  const { eventId } = req.params;
  const sql =`SELECT wydarzenia.id_uslugodawcy, wydarzenia.nazwa, wydarzenia.opis, 
  DATE_FORMAT(wydarzenia.czas_rozpoczecia, '%d-%m-%Y %H:%i') AS czas_rozpoczecia, 
  DATE_FORMAT(wydarzenia.czas_zakonczenia, '%d-%m-%Y %H:%i') AS czas_zakonczenia, 
  wydarzenia.cena, uslugodawca.nazwa_firmy, uslugodawca.adres, uslugodawca.email, 
  uslugodawca.nr_telefonu
  FROM wydarzenia JOIN uslugodawca ON wydarzenia.id_uslugodawcy = uslugodawca.id_uslugodawcy
  WHERE wydarzenia.id_wydarzenia = ?`;

  db.query(sql, [eventId], (err, result) => {
    if (err) {
      res.status(QUERY_RESULT_ERROR).send({ error: 'Something failed!' });
    } else {
      res.json(result);
    }
  });
});

app.get('/api/wydarzenia/godziny_otwarcia/:eventId', (req, res) => {
  const { eventId } = req.params;
  const sql =
    `SELECT godziny_otwarcia.dzien_tygodnia, godziny_otwarcia.otwarcie, godziny_otwarcia.zamkniecie
  FROM wydarzenia JOIN uslugodawca ON wydarzenia.id_uslugodawcy = uslugodawca.id_uslugodawcy JOIN godziny_otwarcia ON uslugodawca.id_uslugodawcy = godziny_otwarcia.id_uslugodawcy
  WHERE wydarzenia.id_wydarzenia = ?`;

  db.query(sql, [eventId], (err, result) => {
    if (err) {
      res.status(QUERY_RESULT_ERROR).send({ error: 'Something failed!' });
    } else {
      res.json(result);
    }
  });
});

app.get('/api/wydarzenia/ocena/:eventId', (req, res) => {
  const { eventId } = req.params;
  const sql =
    `SELECT ROUND(AVG(opinie.ilosc_gwiazdek), 2) AS avg_ilosc_gwiazdek, COUNT(opinie.ilosc_gwiazdek) AS ilosc_opinii
  FROM opinie JOIN uslugodawca ON opinie.id_uslugodawcy = uslugodawca.id_uslugodawcy JOIN wydarzenia ON uslugodawca.id_uslugodawcy = wydarzenia. id_uslugodawcy
  WHERE wydarzenia.id_wydarzenia = ?`;

  db.query(sql, [eventId], (err, result) => {
    if (err) {
      res.status(QUERY_RESULT_ERROR).send({ error: 'Something failed!' });
    } else {
      res.json(result);
    }
  });
});

app.get('/api/wydarzenia/opinie/:eventId', (req, res) => {
  const { eventId } = req.params;
  const sql =
    `SELECT opinie.opis, DATE_FORMAT(opinie.czas , '%Y-%m-%d') AS czas
  FROM opinie JOIN uslugodawca ON opinie.id_uslugodawcy = uslugodawca.id_uslugodawcy JOIN wydarzenia ON uslugodawca.id_uslugodawcy = wydarzenia. id_uslugodawcy
  WHERE wydarzenia.id_wydarzenia = ?`;

  db.query(sql, [eventId], (err, result) => {
    if (err) {
      res.status(QUERY_RESULT_ERROR).send({ error: 'Something failed!' });
    } else {
      res.json(result);
    }
  });
});

app.use(express.json()); // Ten wiersz jest ważny do analizowania treści JSON w żądaniach POST

app.post('/api/wydarzenia/wysylanie_opinii/:id_uslugodawcy', (req, res) => {
  const { id_uslugodawcy } = req.params;
  const { opinion } = req.body; // Dane z ciała zapytania
  const { rating } = req.body;
  const { ip } = req.body;

  //console.log(`Received opinion for provider ${id_uslugodawcy}: ${opinion}, ${rating}, ${ip}`);
  const sql = 'INSERT INTO opinie (id_uslugodawcy, opis, ilosc_gwiazdek, czas, adres_ip) VALUES (?, ?, ?, now(), ?)';

  db.query(sql, [id_uslugodawcy, opinion, rating, ip], (err, result) => {
    if (err) {
      res.status(QUERY_RESULT_ERROR).send({ error: 'Something failed!' });
    } else {
      res.json({ status: 'success', message: 'Opinion submitted successfully' });
    }
  });
});

app.get('/api/wydarzenia/walidacja_wysylanie_opinii', (req, res) => {
  const { ip, provider_id } = req.query;

  //console.log(`Received IP: ${ip} and Provider ID: ${provider_id}`);
  sql = `SELECT * FROM opinie WHERE adres_ip = ? AND id_uslugodawcy = ?`;

  db.query(sql, [ip, provider_id], (err, result) => {
    if (err) {
      return res.status(QUERY_RESULT_ERROR).json({ error: 'Something failed!' });
    }
    if (result.length > 0) {
      res.json({ success: true });
      //return res.status(400).json({ error: 'Opinion already submitted' });
      //res.json(result);
    }
    else {
      return res.json('Brak opinii');
    }

  });
});

app.post('/api/wydarzenia/usuwanie_opinii', (req, res) => {
  const { id_uslugodawcy } = req.body;
  const { ip } = req.body;

  //console.log(`${id_uslugodawcy}, ${ip}`);
  const sql = 'DELETE FROM opinie WHERE id_uslugodawcy = ? AND adres_ip = ?;';

  db.query(sql, [id_uslugodawcy, ip], (err, result) => {
    if (err) {
      res.status(QUERY_RESULT_ERROR).send({ error: 'Something failed!' });
    } else {
      res.json({ status: 'success', message: 'Opinion deleted successfully' });
    }
  });
});

app.listen(PORT, () => {
  console.log('Server started on port 3000');
});