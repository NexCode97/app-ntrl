-- Actualizar contraseña del administrador principal
UPDATE users
SET password_hash = '$2a$12$6TgGFHJwjQo50qB5IYc/juyOC3weaI..mBO.Ra3apipPB8r6uxbUW',
    updated_at = NOW()
WHERE email = 'socialnaturalropadeportiva@gmail.com';
