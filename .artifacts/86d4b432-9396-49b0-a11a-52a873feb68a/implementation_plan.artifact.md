# Implementación de Creación de Contenido y Notificaciones

Este plan detalla los cambios necesarios para permitir que los administradores (managers) creen eventos y noticias desde la aplicación móvil, asegurando que se notifique a todos los usuarios y se agreguen automáticamente a la sección de recordatorios.

## User Review Required

> [!IMPORTANT]
> Se asume que el tipo de usuario "Administrador" corresponde al valor `manager` en el campo `type` de la colección `User` de Strapi.
> Las notificaciones se enviarán a todos los tokens activos registrados en la base de datos.

## Proposed Changes

### Backend (Strapi)

#### [MODIFY] [event/lifecycles.ts](file:///C:/Users/sergi/Desktop/Practicas/bienestau-backend-master/src/api/event/content-types/event/lifecycles.ts)
*   Modificar los hooks `afterCreate` y `afterUpdate` para que, además de enviar la notificación, creen automáticamente una entrada en la colección `Reminder`.
*   Esto asegurará que el evento aparezca en la lista de recordatorios de la aplicación.

#### [MODIFY] [new/lifecycles.ts](file:///C:/Users/sergi/Desktop/Practicas/bienestau-backend-master/src/api/new/content-types/new/lifecycles.ts)
*   Similar a eventos, se agregará la lógica para crear un `Reminder` automáticamente al publicar una noticia.

#### [MODIFY] [reminder/lifecycles.ts](file:///C:/Users/sergi/Desktop/Practicas/bienestau-backend-master/src/api/reminder/content-types/reminder/lifecycles.ts)
*   Ajustar la lógica para evitar notificaciones duplicadas si el recordatorio fue originado por un evento o noticia, o simplemente unificar la mensajería.

### Frontend (React Native / Expo)

#### [NEW] [create.tsx](file:///C:/Users/sergi/Desktop/Practicas/bienestau-frontend-master/app/(protected)/bienestar/create.tsx)
*   Crear una nueva pantalla con un formulario para:
    *   Seleccionar tipo de contenido (Evento o Noticia).
    *   Ingresar Título.
    *   Ingresar Contenido (Descripción).
    *   Seleccionar e subir una Imagen.
*   Implementar la lógica de envío a Strapi (incluyendo la subida de archivos multipart).

#### [MODIFY] [index.tsx](file:///C:/Users/sergi/Desktop/Practicas/bienestau-frontend-master/app/(protected)/bienestar/index.tsx)
*   Actualizar el FAB (Floating Action Button) para que navegue a la nueva pantalla de creación, asegurando que solo sea visible para usuarios con `user.type === 'manager'`.

#### [MODIFY] [_layout.tsx](file:///C:/Users/sergi/Desktop/Practicas/bienestau-frontend-master/app/(protected)/bienestar/_layout.tsx)
*   Registrar la nueva ruta `create` en el stack de navegación.

## Verification Plan

### Automated Tests
*   No se dispone de un entorno de pruebas automáticas configurado para Strapi/RN en este momento, se procederá con verificación manual.

### Manual Verification
1.  Iniciar sesión con una cuenta de tipo `manager`.
2.  Verificar que aparezca el botón "+" en la pantalla de inicio.
3.  Completar el formulario de creación de evento con imagen.
4.  Confirmar en el panel de Strapi que el evento se creó y que existe un recordatorio asociado.
5.  Verificar que los dispositivos reciban la notificación push (si hay tokens válidos configurados).
6.  Verificar que el nuevo evento aparezca en la sección de "Recordatorios" de la app.
