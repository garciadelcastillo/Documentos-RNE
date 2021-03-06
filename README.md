# Documentos-RNE
A [Node.js](https://nodejs.org/en/) batch downloader and renamer for the radio documentary series "Documentos de RNE": http://www.rtve.es/alacarta/audios/documentos-rne/. If you speak Spanish (or are trying to learn), this is a fantastic repository of eloquent and beautiful speech, while at the same time a great resource to learn about Spanish history, culture and its ties to the rest of the world; worth checking out. Changing to spanish from here on.

Este repositorio contiene una aplicación de [Node.js](https://nodejs.org/en/) para descargar automáticamente la serie completa de documentales radiofónicos de "Documentos de RNE": http://www.rtve.es/alacarta/audios/documentos-rne/. RTVE lleva muchos años haciendo un fantástico trabajo con esta serie, y se la recomiendo a cualquier interesado en la historia de España, su cultura y sus enlaces con el resto de la historia mundial.


## Disclaimer
Los Documentos de RNE se encuentran públicamente accesibles desde [la web del programa](http://www.rtve.es/alacarta/audios/documentos-rne/), y se pueden descargar manualmente en los enlaces de descarga directa de cada podcast. Esta aplicación simplemente automatiza el tedioso y paciente proceso de descargar los archivos mp3 uno a uno, con la añadida ventaja de catalogarlos y renombrarlos por fecha, y reescribir las etiquetas id3 de los mp3 ;)

El autor de esta aplicación no se hace responsable del uso que se pueda dar a estos archivos. 


## Instrucciones
* Instala [Node.js](https://nodejs.org/en/) en Win/Mac/Linux.
* Clona este repositorio. Si no eres usuario habitual de .git, simplemente pincha en el botón verde arriba a la derecha de esta página y descárgate la aplicación en un .ZIP. A día de hoy (22/12/2016) el archivo contiene ~315 programas con un tamaño aproximado de 15.5 Gb. Asegurate de descomprimir el archivo ZIP en un unidad con suficiente espacio (HDD portátiles y USB sticks valen también).
* Abre un terminal (o un Command Prompt) en la carpeta descomprimida (por ejemplo `Documentos-RNE-master`). 
* Instala las dependencias con `npm` (el `$` no hay que teclearlo...):
```
$ npm install
```
* (opcional) Abre el archivo `app.js` con cualquier editor de texto (Notepad, Sublime, Atom...) y configura la aplicación. Si no te sientes muy cómodo programando o no te apetece calentarte la cabeza, puedes saltarte este paso, y la aplicación descagará todos los podcasts a la carpeta `downloads` en el directorio de la aplicación. 
* Inicia la aplicación tecleando en el terminal:
```
$ node app.js
```
A partir de aquí, la aplicación conectará con la base de datos del archivo, y se descargará todos los podcasts uno a uno, renombrándolos y aplicando tags a los mp3 ;)

## Troubleshooting
Cualquier duda/problema/sugerencia puede ser reportada en el apartado 'issues' de este repositorio. 