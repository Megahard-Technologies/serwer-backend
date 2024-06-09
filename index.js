const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const QUERY_RESULT_ERROR = 500;
const PORT = 3000;

const app = express();

app.use(cors());
app.use(express.json({limit: '50mb'})); // Ten wiersz jest ważny do analizowania treści JSON w żądaniach POST


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

// Uslugodawca

app.post('/api/wydarzenia/', (req, res) => {
    const {name, image, description, startDate, endDate, price, serviceProviderId} = req.body;

    const sql = `INSERT INTO wydarzenia (nazwa, zdjecie, opis, czas_rozpoczecia, czas_zakonczenia, cena, id_uslugodawcy)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;

    let mysqlStartDate = new Date(startDate).toISOString().slice(0, 19).replace('T', ' ');
    let mysqlEndDate = new Date(endDate).toISOString().slice(0, 19).replace('T', ' ');

    db.query(sql, [name, image, description, mysqlStartDate, mysqlEndDate, price, serviceProviderId], (err, result) => {
        if (err) {
            res.status(500).send({error: `Something failed! : ${err}`});
        } else {
            res.json({status: 'success', message: 'Event added successfully'});
        }
    });
});

app.get('/api/wydarzenia/:serviceProviderId', (req, res) => {
    const { serviceProviderId } = req.params;
    const sql = `SELECT id_wydarzenia AS id,
                      nazwa AS name, 
                      zdjecie AS image, 
                      opis AS description, 
                      czas_rozpoczecia AS startDate, 
                      czas_zakonczenia AS endDate,
                      cena AS price
               FROM wydarzenia
               WHERE id_uslugodawcy = ?`;

    db.query(sql, [serviceProviderId], (err, result) => {
        if (err) {
            res.status(500).send({error: 'Something failed!'});
        } else {
            // Przekształć daty z formatu SQL do formatu JavaScript
            const events = result.map(event => ({
                ...event,
                startDate: new Date(event.startDate),
                endDate: new Date(event.endDate),
                price: parseFloat(event.price)
            }));
            res.json(events);
        }
    });
});

app.get('/api/wydarzenia/:id', (req, res) => {
    const { id } = req.params;
    const sql = `SELECT id_wydarzenia AS id,
                      nazwa AS name, 
                      zdjecie AS image, 
                      opis AS description, 
                      czas_rozpoczecia AS startDate, 
                      czas_zakonczenia AS endDate,
                      cena AS price
               FROM wydarzenia
               WHERE id_wydarzenia = ?`;

    db.query(sql, [id], (err, result) => {
        if (err) {
            res.status(500).send({error: 'Something failed!'});
        } else {
            if (result.length > 0) {
                const event = {
                    ...result[0],
                    startDate: new Date(result[0].startDate),
                    endDate: new Date(result[0].endDate),
                    price: parseFloat(result[0].price)
                };
                res.json(event);
            } else {
                res.status(404).send({error: 'Event not found!'});
            }
        }
    });
});

app.delete('/api/wydarzenia/:eventId', (req, res) => {
    const {eventId} = req.params;
    const sql = 'DELETE FROM wydarzenia WHERE id_wydarzenia = ?';

    db.query(sql, [eventId], (err, result) => {
        if (err) {
            res.status(500).send({error: 'Something failed!'});
        } else {
            res.json({status: 'success', message: 'Event deleted successfully'});
        }
    });

});

app.put('/api/wydarzenia/:eventId', (req, res) => {
    const {eventId} = req.params;
    const {name, image, description, startDate, endDate, price} = req.body;

    const sql = `UPDATE wydarzenia SET nazwa = ?, zdjecie = ?, opis = ?, czas_rozpoczecia = ?, czas_zakonczenia = ?, cena = ?
               WHERE id_wydarzenia = ?`;

    let mysqlStartDate = new Date(startDate).toISOString().slice(0, 19).replace('T', ' ');
    let mysqlEndDate = new Date(endDate).toISOString().slice(0, 19).replace('T', ' ');

    db.query(sql, [name, image, description, mysqlStartDate, mysqlEndDate, price, eventId], (err, result) => {
        if (err) {
            res.status(500).send({error: 'Something failed!'});
        } else {
            res.json({status: 'success', message: 'Event updated successfully'});
        }
    });

});


app.get('/api/opinions/:serviceProviderId', (req, res) => {
    const { serviceProviderId } = req.params;
    const sql = `SELECT ilosc_gwiazdek AS stars, opis AS description, DATE_FORMAT(czas , '%d-%m-%Y %H:%i') AS date FROM opinie WHERE id_uslugodawcy = ?`;

    db.query(sql, [serviceProviderId], (err, result) => {
        if (err) {
            res.status(500).send({error: 'Something failed!'});
        } else {
            res.json(result);
        }
    });
});



// User
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
    const {eventId} = req.params;
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
    const {eventId} = req.params;
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
    const {eventId} = req.params;
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


app.post('/api/wydarzenia/wysylanie_opinii/:id_uslugodawcy', (req, res) => {
    const {id_uslugodawcy} = req.params;
    const {opinion} = req.body; // Dane z ciała zapytania
    const {rating} = req.body;
    const {ip} = req.body;

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
    const {ip, provider_id} = req.query;

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
    const {id_uslugodawcy} = req.body;
    const {ip} = req.body;


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
