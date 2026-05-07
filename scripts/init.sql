-- scripts/init.sql
-- Isso roda automaticamente na primeira inicialização do PostgreSQL

-- 1. Criar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- Para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Para funções criptográficas
CREATE EXTENSION IF NOT EXISTS "citext";         -- Para case-insensitive text

-- 2. Criar schemas personalizados
CREATE SCHEMA IF NOT EXISTS laboure;
CREATE SCHEMA IF NOT EXISTS audit;

-- 3. Configurar permissões
GRANT ALL ON SCHEMA laboure TO postgres;
GRANT ALL ON SCHEMA audit TO postgres;

-- 4. Criar tabelas de auditoria (opcional)
CREATE TABLE IF NOT EXISTS audit.log_changes (
    id SERIAL PRIMARY KEY,
    table_name TEXT,
    operation TEXT,
    changed_at TIMESTAMP DEFAULT NOW()
);

-- 5. Configurar timezone
SET TIMEZONE = 'America/Sao_Paulo';

-- 6. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Comentários no banco
COMMENT ON DATABASE laboure_db IS 'Labouré E-Commerce Database - PostgreSQL';