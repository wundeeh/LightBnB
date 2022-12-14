SELECT city, COUNT(reservations.*) as total_reservations
FROM properties
JOIN reservations ON reservations.property_id = properties.id
GROUP BY properties.city
ORDER BY total_reservations DESC;