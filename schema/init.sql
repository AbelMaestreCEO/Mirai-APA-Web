-- =========================================
-- init.sql
-- Esquema de Base de Datos para Mirai APA
-- Motor: Cloudflare D1 (SQLite)
-- =========================================

-- =========================================
-- TABLA PRINCIPAL: Archivos
-- =========================================

CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,                     -- UUID generado con crypto.randomUUID()
    original_name TEXT NOT NULL,             -- Nombre original del archivo subido
    formatted_name TEXT,                     -- Nombre del archivo formateado (ej. documento_APA.docx)
    file_type TEXT NOT NULL DEFAULT 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size INTEGER NOT NULL DEFAULT 0,         -- Tamaño en bytes
    r2_key TEXT NOT NULL,                    -- Clave del objeto en R2 (puede diferir del id)
    status TEXT NOT NULL DEFAULT 'active',   -- active, deleted, expired, error
    uploaded_at TEXT NOT NULL,               -- Timestamp ISO 8601
    expires_at TEXT,                         -- Fecha de expiración (para auto-limpieza)
    deleted_at TEXT,                         -- Fecha de eliminación lógica
    user_id TEXT,                            -- ID del usuario (nullable, sin auth por ahora)
    session_id TEXT,                         -- ID de sesión anónima (para historial sin login)
    metadata_json TEXT DEFAULT '{}',         -- JSON con metadatos adicionales
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =========================================
-- ÍNDICES PARA RENDIMIENTO
-- =========================================

-- Búsqueda rápida por usuario
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);

-- Búsqueda rápida por sesión
CREATE INDEX IF NOT EXISTS idx_files_session_id ON files(session_id);

-- Búsqueda rápida por estado (para limpieza)
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);

-- Búsqueda rápida por fecha de expiración (para cron de limpieza)
CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at);

-- Búsqueda rápida por fecha de subida (para ordenar historial)
CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files(uploaded_at DESC);

-- =========================================
-- TABLA AUXILIAR: Registro de Conversiones
-- =========================================

CREATE TABLE IF NOT EXISTS conversion_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id TEXT NOT NULL,                   -- Referencia al archivo en tabla files
    paragraphs_count INTEGER DEFAULT 0,      -- Cantidad de párrafos procesados
    tables_count INTEGER DEFAULT 0,          -- Cantidad de tablas procesadas
    images_count INTEGER DEFAULT 0,          -- Cantidad de imágenes procesadas
    references_count INTEGER DEFAULT 0,      -- Cantidad de referencias detectadas
    headings_count INTEGER DEFAULT 0,        -- Cantidad de títulos detectados
    processing_time_ms INTEGER DEFAULT 0,    -- Tiempo de procesamiento en milisegundos
    rules_applied TEXT DEFAULT '[]',         -- JSON con lista de reglas APA aplicadas
    errors_json TEXT DEFAULT '[]',           -- JSON con errores/warnings durante conversión
    client_ip TEXT,                          -- IP del cliente (anonimizada si se desea)
    user_agent TEXT,                         -- User-Agent del navegador
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Índice para buscar logs por archivo
CREATE INDEX IF NOT EXISTS idx_conversion_logs_file_id ON conversion_logs(file_id);

-- Índice para estadísticas por fecha
CREATE INDEX IF NOT EXISTS idx_conversion_logs_created_at ON conversion_logs(created_at DESC);

-- =========================================
-- TABLA AUXILIAR: Configuración del Sistema
-- =========================================

CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,                    -- Clave única de configuración
    value TEXT NOT NULL,                     -- Valor (string, puede ser JSON)
    description TEXT,                        -- Descripción humana del parámetro
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =========================================
-- DATOS INICIALES: Configuración por defecto
-- =========================================

INSERT INTO system_config (key, value, description) VALUES
    ('max_file_size_mb', '25', 'Tamaño máximo de archivo en megabytes'),
    ('max_files_per_user', '50', 'Máximo de archivos por usuario'),
    ('retention_days', '30', 'Días de retención de archivos antes de auto-eliminación'),
    ('allowed_extensions', '[".docx"]', 'Extensiones de archivo permitidas (JSON array)'),
    ('default_font', 'Times New Roman', 'Fuente por defecto para formateo APA'),
    ('default_font_size', '12', 'Tamaño de fuente por defecto en puntos'),
    ('maintenance_mode', 'false', 'Modo mantenimiento activado/desactivado'),
    ('version', '1.0.0', 'Versión actual del esquema de base de datos');

-- =========================================
-- VISTA ÚTIL: Historial de Conversiones
-- =========================================

CREATE VIEW IF NOT EXISTS vw_conversion_history AS
SELECT 
    f.id,
    f.original_name,
    f.formatted_name,
    f.size,
    f.status,
    f.uploaded_at,
    f.expires_at,
    f.user_id,
    f.session_id,
    cl.paragraphs_count,
    cl.tables_count,
    cl.images_count,
    cl.references_count,
    cl.headings_count,
    cl.processing_time_ms,
    cl.errors_json
FROM files f
LEFT JOIN conversion_logs cl ON f.id = cl.file_id
WHERE f.status = 'active'
ORDER BY f.uploaded_at DESC;

-- =========================================
-- VISTA ÚTIL: Estadísticas Diarias
-- =========================================

CREATE VIEW IF NOT EXISTS vw_daily_stats AS
SELECT 
    DATE(f.uploaded_at) AS date,
    COUNT(*) AS total_uploads,
    SUM(f.size) AS total_size_bytes,
    AVG(cl.processing_time_ms) AS avg_processing_time_ms,
    SUM(cl.paragraphs_count) AS total_paragraphs,
    SUM(cl.references_count) AS total_references
FROM files f
LEFT JOIN conversion_logs cl ON f.id = cl.file_id
WHERE f.status = 'active'
GROUP BY DATE(f.uploaded_at)
ORDER BY date DESC;

-- =========================================
-- TRIGGER: Actualizar updated_at automáticamente
-- =========================================

CREATE TRIGGER IF NOT EXISTS trg_files_updated_at
AFTER UPDATE ON files
FOR EACH ROW
BEGIN
    UPDATE files SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- =========================================
-- TRIGGER: Limpiar archivos expirados
-- (Se ejecuta en cada inserción para mantener limpieza)
-- =========================================

CREATE TRIGGER IF NOT EXISTS trg_cleanup_expired
AFTER INSERT ON files
FOR EACH ROW
BEGIN
    -- Marcar como expirados los archivos que ya pasaron su fecha de expiración
    UPDATE files 
    SET status = 'expired', deleted_at = datetime('now')
    WHERE expires_at IS NOT NULL 
      AND expires_at < datetime('now') 
      AND status = 'active';
END;

-- =========================================
-- FUNCIONES AUXILIARES (Vistas para limpieza)
-- =========================================

-- Vista de archivos listos para eliminar físicamente
CREATE VIEW IF NOT EXISTS vw_files_to_purge AS
SELECT id, r2_key
FROM files
WHERE status IN ('deleted', 'expired')
  AND deleted_at IS NOT NULL
  AND datetime(deleted_at, '+7 days') < datetime('now');

-- =========================================
-- VERIFICACIÓN DE INTEGRIDAD
-- =========================================

-- Esta consulta no se ejecuta automáticamente, 
-- pero puedes usarla para verificar que todo se creó correctamente:
-- SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
-- SELECT name FROM sqlite_master WHERE type='index' ORDER BY name;
-- SELECT name FROM sqlite_master WHERE type='view' ORDER BY name;
-- SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name;