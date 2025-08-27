drop table public.whatsapp_conversation;

-- Tabla de usuarios
CREATE TABLE whatsapp_usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    local_id VARCHAR(20) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    nombre_local VARCHAR(50) NOT NULL,
    fractal_code VARCHAR(20) NOT NULL
);

-- Índices para usuarios
CREATE INDEX idx_whatsapp_usuarios_email ON whatsapp_usuarios (email);

CREATE INDEX idx_whatsapp_usuarios_local_id ON whatsapp_usuarios (local_id);

-- Tabla de tickets
CREATE TABLE whatsapp_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES whatsapp_usuarios(id),
    descripcion TEXT NOT NULL,
    urgencia VARCHAR(40) NOT NULL CONSTRAINT tickets_urgencia_check CHECK (urgencia IN ('Urgente', 'Media', 'Normal')),
    categoria VARCHAR(100) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(50) DEFAULT 'Abierto',
    idfracttal INTEGER
);
-- Índices para tickets
CREATE INDEX idx_whatsapp_tickets_user_id ON whatsapp_tickets (user_id);

CREATE INDEX idx_whatsapp_tickets_estado ON whatsapp_tickets (estado);