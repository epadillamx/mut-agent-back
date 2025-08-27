-- Tabla principal de conversaciones
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    phone VARCHAR(25) NOT NULL,
    user_id INTEGER REFERENCES whatsapp_usuarios(id) ON DELETE SET NULL,
    ticket_id INTEGER REFERENCES whatsapp_tickets(id) ON DELETE SET NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_whatsapp_conversations_session_id ON whatsapp_conversations(session_id);
CREATE INDEX idx_whatsapp_conversations_user_id ON whatsapp_conversations(user_id);
CREATE INDEX idx_whatsapp_conversations_started_at ON whatsapp_conversations(started_at);
CREATE INDEX idx_whatsapp_conversations_completed_at ON whatsapp_conversations(completed_at);

-- Tabla de mensajes de conversación
CREATE TABLE IF NOT EXISTS whatsapp_conversation_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para mensajes
CREATE INDEX idx_whatsapp_conversation_messages_conversation_id ON whatsapp_conversation_messages(conversation_id);
CREATE INDEX idx_whatsapp_conversation_messages_created_at ON whatsapp_conversation_messages(created_at);
CREATE INDEX idx_whatsapp_conversation_messages_role ON whatsapp_conversation_messages(role);

-- Tabla para guardar el estado completo del workflow
CREATE TABLE IF NOT EXISTS whatsapp_conversation_states (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    state JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(conversation_id)
);

-- Índice para estados
CREATE INDEX idx_whatsapp_conversation_states_conversation_id ON whatsapp_conversation_states(conversation_id);



-- Función para limpiar conversaciones antiguas automáticamente
CREATE OR REPLACE FUNCTION cleanup_old_whatsapp_conversations()
RETURNS void AS $$
BEGIN
    DELETE FROM whatsapp_conversations 
    WHERE completed_at IS NULL 
    AND started_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION wp_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON whatsapp_conversations
    FOR EACH ROW EXECUTE FUNCTION wp_updated_at_column();

CREATE TRIGGER update_conversation_states_updated_at BEFORE UPDATE ON whatsapp_conversation_states
    FOR EACH ROW EXECUTE FUNCTION wp_updated_at_column();


/*
    -- Vista para análisis de conversaciones
CREATE VIEW whatsapp_conversation_analytics AS
SELECT 
    c.id,
    c.session_id,
    c.user_id,
    u.nombre as user_name,
    u.email as user_email,
    l.nombre_local as user_location,
    c.started_at,
    c.completed_at,
    c.ticket_id,
    EXTRACT(EPOCH FROM (c.completed_at - c.started_at))/60 as duration_minutes,
    COUNT(DISTINCT cm.id) as message_count,
    COUNT(DISTINCT CASE WHEN cm.role = 'user' THEN cm.id END) as user_message_count,
    COUNT(DISTINCT CASE WHEN cm.role = 'assistant' THEN cm.id END) as assistant_message_count
FROM whatsapp_conversations c
LEFT JOIN usuarios u ON c.user_id = u.id
LEFT JOIN locales l ON u.local_id = l.id
LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
GROUP BY c.id, c.session_id, c.user_id, u.nombre, u.email, l.nombre_local, 
         c.started_at, c.completed_at, c.ticket_id;*/