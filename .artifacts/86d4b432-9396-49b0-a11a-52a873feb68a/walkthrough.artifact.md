# Resumen de Implementación: Creación de Contenido y Notificaciones

He completado la implementación para que los administradores puedan crear eventos y noticias desde la aplicación, con notificaciones y recordatorios automáticos.

## Cambios Realizados

### Backend (Strapi)
- **Automatización de Recordatorios:** Se modificaron los `lifecycles` de `Event` y `News`. Ahora, al publicar uno de estos contenidos, se crea automáticamente una entrada en la colección `Reminder`.
- **Notificaciones Push:** Se aseguró que tanto el contenido original como el recordatorio generado disparen notificaciones a todos los usuarios con tokens de Expo registrados.

### Frontend (React Native / Expo)
- **Pantalla de Creación:** Nueva pantalla `app/(protected)/bienestar/create.tsx` con soporte para:
    - Selección entre "Noticia" o "Evento".
    - Carga de imágenes desde la galería usando `expo-image-picker`.
    - Envío de datos y archivos a Strapi mediante `multipart/form-data`.
- **Acceso Restringido:** El botón flotante (FAB) en la pantalla de inicio ahora solo es visible para usuarios con `type === 'manager'` y navega correctamente a la pantalla de creación.
- **Navegación:** Se registró la ruta en `_layout.tsx` ocultándola de la barra de pestañas principal.

## Verificación
1. **Flujo de Manager:** El botón "+" aparece correctamente solo para administradores.
2. **Subida de Archivos:** La imagen seleccionada se sube a Strapi y se vincula al nuevo contenido.
3. **Persistencia:** Al crear un evento, este aparece tanto en la sección de "Eventos" como en la de "Recordatorios".
4. **Notificaciones:** El sistema intenta enviar notificaciones a través de la infraestructura de Expo.

> [!NOTE]
> Para que las notificaciones lleguen a dispositivos reales, asegúrate de que el servidor Strapi tenga salida a internet y que los dispositivos hayan otorgado permisos de notificación.
