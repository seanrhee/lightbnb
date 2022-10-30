select properties.city as city, count(reservations.*) as total_reservations
from properties
join reservations on property_id = properties.id
group by properties.city
order by total_reservations desc;