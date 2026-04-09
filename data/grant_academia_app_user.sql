-- Rode no HeidiSQL como root (ou usuário com permissão GRANT).
-- Troque TODAS as ocorrências de __SENHA__ pela mesma senha do .env (DB_PASSWORD).

USE academia;

CREATE USER IF NOT EXISTS 'academia_user'@'localhost' IDENTIFIED BY '__SENHA__';
CREATE USER IF NOT EXISTS 'academia_user'@'127.0.0.1' IDENTIFIED BY '__SENHA__';

-- Se o usuário já existia com outra senha, descomente e use a senha do .env:
-- ALTER USER 'academia_user'@'localhost' IDENTIFIED BY '__SENHA__';
-- ALTER USER 'academia_user'@'127.0.0.1' IDENTIFIED BY '__SENHA__';

GRANT ALL PRIVILEGES ON academia.* TO 'academia_user'@'localhost';
GRANT ALL PRIVILEGES ON academia.* TO 'academia_user'@'127.0.0.1';

FLUSH PRIVILEGES;
