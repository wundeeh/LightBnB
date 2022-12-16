const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

pool.query(`SELECT title FROM properties LIMIT 10;`).then(response => {})


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {

  return pool
    .query(`
    SELECT * FROM users
    WHERE email = $1;
    `, [email])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`
    SELECT * FROM users
    WHERE id = $1;
    `, [id])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  return pool
    .query(`
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;
    `, [user.name, user.email, user.password])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
    .query(`
    SELECT properties.*, reservations.*, AVG(property_reviews.rating)
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON property_reviews.property_id = properties.id
    WHERE reservations.guest_id = $1
    GROUP BY properties.id, reservations.id
    ORDER BY start_date
    LIMIT $2;
    `, [guest_id, limit])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
 const getAllProperties = function (options, limit = 10) {
  // 1
  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // 3

  if (options.city !== '' || options.minimum_price_per_night !== '' || options.maximum_price_per_night !== '' || options.minimum_rating !== '') {
    queryString += `WHERE `;
  }
  // console.log("before city", queryParams.length);

  
  if (options.city) {
    //console.log("options", options);
    queryParams.push(`%${options.city}%`);
    queryString += `city LIKE $${queryParams.length} `;
  }

  // console.log("after city", queryParams.length);

  ///////////////////////////////////////////////////////////////

  if (options.owner_id) {
    queryParams.push(`%${options.owner_id}%`);
    if (queryParams.indexOf(options.owner_id) === 0) {
      queryString += `owner_id LIKE $${queryParams.length} `;
    } else {
      queryString += `AND owner_id LIKE $${queryParams.length} `;
    }
  }
  // console.log("after owner id", queryParams.length);
  // console.log("params before push", queryParams);
  if (options.minimum_price_per_night) {
    queryParams.push(`${Number(options.minimum_price_per_night) * 100}`);
    // console.log("params after push", queryParams);
    // console.log("number from query", Number(options.minimum_price_per_night) * 100);
    // console.log("IF STATEMENT", queryParams.indexOf(Number(options.minimum_price_per_night) * 100) === 0);
    if (queryParams.indexOf(`${Number(options.minimum_price_per_night) * 100}`) == 0) { 
      queryString += `$${queryParams.length} <= cost_per_night `;
    } else {
      queryString += `AND $${queryParams.length} <= cost_per_night `;
    }
  }
  // console.log("after min price", queryParams.length);

  if (options.maximum_price_per_night) {
    queryParams.push(`${Number(options.maximum_price_per_night) * 100}`);
    if (queryParams.indexOf(`${Number(options.maximum_price_per_night) * 100}`) == 0) {
      queryString += `$${queryParams.length} >= cost_per_night `;
    } else {
      queryString += `AND $${queryParams.length} >= cost_per_night `;
    }
  }
  // console.log("after max price", queryParams.length);

  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    if (queryParams.indexOf(options.minimum_rating) === 0) {
      queryString += `property_reviews.rating >= $${queryParams.length} `;
    } else {
      queryString += `AND property_reviews.rating >= $${queryParams.length} `;
    }
  }
  // console.log("params", queryParams);

  /////////////////////////////////////////////////////////////////

  // 4
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // 5
  // console.log("query string =========", queryString);

  // 6
  return pool.query(queryString, queryParams).then((res) => {
    //console.log("rows", res.rows)
   return res.rows
  });
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const queryParams = [
    property.owner_id, 
    property.title, 
    property.description, 
    property.thumbnail_photo_url, 
    property.cover_photo_url, 
    property.cost_per_night, 
    property.street, 
    property.city,
    property.province, 
    property.post_code, 
    property.country, 
    property.parking_spaces, 
    property.number_of_bathrooms, 
    property.number_of_bedrooms
  ];

  let queryString = `
  INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *;
  `

  return pool
  .query(
    queryString,
    queryParams)
  .then((result) => {
    return result.rows;
    })
  .catch((err) => {
    console.log(err.message);
    });
}
exports.addProperty = addProperty;
