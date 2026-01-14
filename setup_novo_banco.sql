-- # SCRIPT DE INICIALIZAÇÃO - JOGO 2.0

-- 1. Tabela de Personagens
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT UNIQUE NOT NULL,
    state JSONB DEFAULT '{"inventory": {}, "skills": {}, "silver": 0}'::JSONB,
    current_activity JSONB DEFAULT NULL,
    activity_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    dungeon_state JSONB DEFAULT NULL,
    last_saved TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Segurança de Linha)
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Políticas de Personagem
CREATE POLICY "Leitura permitida para todos" ON characters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserção pelo dono" ON characters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update pelo dono" ON characters FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 2. Tabela de Mensagens (Chat)
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública" ON messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Envio pelo dono" ON messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. Tabela de Mercado
CREATE TABLE IF NOT EXISTS market_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES auth.users NOT NULL,
    seller_name TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_data JSONB NOT NULL,
    amount INT NOT NULL,
    price INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE market_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver mercado" ON market_listings FOR SELECT TO authenticated USING (true);

-- NOTA: Como o Jogo 2.0 é Server-Authoritative, 
-- o servidor Node.js usará a Service Role Key para ignorar estas regras 
-- e garantir que ninguém trapaceie via SQL Injection ou chamadas diretas.
