# Fix: Normalización de Acentos para Búsqueda de Locales

## Problema

Los usuarios no podían encontrar locales que contienen tildes/acentos en su nombre cuando escribían sin tildes.

**Ejemplo:**
- Local en BD: `PLAZA MÚSICA`
- Usuario escribe: `plaza musica`
- Resultado anterior: ❌ No encontrado
- Resultado con fix: ✅ Encontrado

## Solución Implementada

Se modificó la función `validateLocationDb()` en `src/services/database.service.js` para normalizar tanto el input del usuario como los valores en la base de datos.

### Cambios realizados:

#### 1. Nueva función `normalizeText()`
```javascript
function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}
```
Esta función:
- Usa `normalize('NFD')` para descomponer caracteres con tildes
- Elimina los diacríticos (tildes, acentos) con regex
- Convierte a mayúsculas para comparación case-insensitive

#### 2. Modificación del query SQL
```sql
-- Antes:
WHERE l."nombreComercial" ILIKE $1

-- Después:
WHERE translate(upper(l."nombreComercial"), 'ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕÑ', 'AEIOUAEIOUAEIOUAEIOUAON') ILIKE $1
```

La función `translate()` de PostgreSQL reemplaza cada caracter acentuado por su equivalente sin acento:
- `Á, À, Ä, Â, Ã` → `A`
- `É, È, Ë, Ê` → `E`
- `Í, Ì, Ï, Î` → `I`
- `Ó, Ò, Ö, Ô, Õ` → `O`
- `Ú, Ù, Ü, Û` → `U`
- `Ñ` → `N`

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/services/database.service.js` | Añadida función `normalizeText()` y modificado query en `validateLocationDb()` |

## Requisitos Adicionales (Manual)

### Base de datos
Si la columna `categoria` de la tabla `whatsapp_tickets` es muy corta, ejecutar:
```sql
ALTER TABLE whatsapp_tickets ALTER COLUMN categoria TYPE varchar(200);
```

## Testing

Para probar el fix:
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"phone": "56912345678", "message": "Hola soy de plaza musica"}'
```

Debería encontrar el local `PLAZA MÚSICA` aunque se escriba sin tilde.

## Fecha
- **Implementación:** 2026-01-22
- **Autor:** Desarrollo con asistencia de IA
