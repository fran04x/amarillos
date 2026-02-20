# Serverless Telegram Streaming App

Aplicación web que reproduce videos almacenados en Telegram directamente en el navegador, utilizando un backend intermedio y una interfaz estática.

## Funcionamiento

-. Los videos se suben a un canal privado de Telegram, donde quedan almacenados permanentemente.
-. Cada archivo recibe un identificador único que permite recuperarlo posteriormente.
-. Se genera un archivo `data.js` que contiene los episodios y sus identificadores.
-. La web, alojada en GitHub Pages, carga ese archivo y muestra el contenido disponible.
-. Cuando el usuario reproduce un video, el navegador solicita el archivo al backend.
-. El backend está alojado en Hugging Face Space y actúa como intermediario.
-. El backend se autentica con Telegram mediante la API MTProto.
-. Solicita el archivo correspondiente usando su identificador.
-. Telegram envía el archivo en fragmentos binarios.
-. El backend retransmite esos fragmentos al navegador en tiempo real.
-. El archivo no se almacena en el backend, solo se transmite.
-. El reproductor recibe los datos progresivamente.
-. La reproducción comienza antes de completar la transferencia.
-. El navegador puede solicitar partes específicas para permitir avance y retroceso.
-. El flujo completo es: Telegram → Backend → Navegador.
