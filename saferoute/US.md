# US-20
Confirmación de Llegada
Como padre, quiero saber si mi hijo llegó al colegio, para estar tranquilo.
S1: Given vehículo en colegio, When conductor cierra viaje, Then recibe notificación de éxito.
S2: Given viaje de retorno, When llega a casa, Then recibe "Hijo entregado".
S3: Given retraso mayor a 20min, When tiempo pasa, Then recibe alerta de demora.	

# US-1 
Contratar Plan
Como administrador, quiero elegir un plan, para escalar mi operación.
S1: Given el admin elige "Plan Completo", When confirma pago, Then los límites de rutas se actualizan.
S2: Given un plan activo, When elige "Upgrade", Then se prorratea el pago.
S3: Given tarjeta sin fondos, When intenta contratar, Then se muestra "Error de transacción".


# US-2
Registro de Conductores
Como administrador, quiero crear cuentas de conductores, para asignar responsabilidades.
S1: Given datos válidos, When guarda, Then perfil se crea.
S2: Given licencia subida, When sistema valida, Then estado cambia a "Verificado".
S3: Given DNI duplicado, When intenta guardar, Then muestra "Usuario ya existe".

# US-3
Registro de Padres
Como administrador, quiero registrar a los padres, para habilitar el monitoreo.
S1: Given correo válido, When registra, Then envía invitación.
S2: Given vínculo con alumno, When confirma, Then habilita vista de mapa.
S3: Given correo inválido, When intenta enviar, Then muestra "Formato no soportado".

# US-4
Alta de Alumnos
Como administrador, quiero registrar alumnos, para incluirlos en los recorridos.
S1: Given datos del menor, When guarda, Then aparece en lista de espera.
S2: Given foto subida, When guarda, Then se muestra en carné digital.
S3: Given campos vacíos, When intenta guardar, Then resalta campos obligatorios.

# US-6
Asignación de Roles
Como administrador, quiero asignar conductores a rutas, para organizar la operación.
S1: Given conductor libre, When asigna a ruta X, Then conductor recibe alerta.
S2: Given cambio de unidad, When reasigna, Then se actualiza en tiempo real.
S3: Given conductor ya ocupado, When intenta asignar, Then muestra "No disponible".

# US-5
Creación de Rutas
Como administrador, quiero trazar rutas y paradas, para optimizar el tiempo.
S1: Given puntos A y B, When traza en mapa, Then calcula tiempo estimado.
S2: Given paradas nuevas, When agrega a ruta, Then recalcula orden óptimo.
S3: Given puntos inaccesibles, When intenta trazar, Then muestra "Ruta no transitable".

# US-18
Rastreo en Tiempo Real
Como padre, quiero el vehículo en el mapa, para calcular la hora de llegada.
S1: Given viaje activo, When abre mapa, Then ve el icono moverse.
S2: Given parada propia, When toca icono, Then muestra distancia en KM.
S3: Given viaje finalizado, When abre mapa, Then muestra "Servicio concluido".

# US-10
Inicio de Trayecto
Como conductor, quiero activar la ruta, para notificar a los padres.
S1: Given ruta lista, When pulsa "Iniciar", Then cambia estado a "En camino".
S2: Given GPS activo, When inicia, Then comienza transmisión de coordenadas.
S3: Given sin conexión, When intenta iniciar, Then muestra "Modo Offline: reconectando".

# US-14
Finalización de Ruta
Como conductor, quiero cerrar la sesión, para concluir el turno.
S1: Given fin de recorrido, When pulsa "Cerrar", Then detiene GPS.
S2: Given alumnos pendientes, When intenta cerrar, Then advierte "Hay alumnos a bordo".
S3: Given error de servidor, When cierra, Then guarda datos localmente.

# US-11
Marcación de Abordaje
Como conductor, quiero registrar el abordaje, para confirmar asistencia.
S1: Given parada alcanzada, When marca check, Then notifica al padre.
S2: Given código QR, When escanea al alumno, Then registra abordaje automático.
S3: Given alumno equivocado, When intenta marcar, Then alerta "Alumno no pertenece a esta parada".

# TS-1
Implementación JWT Authentication
Como sistema, deseo emitir tokens JWT para asegurar sesiones autenticadas.
S1: Given credenciales válidas, When usuario inicia sesión, Then retorna JWT válido.
S2: Given token activo, When consume endpoint protegido, Then retorna 200 OK.
S3: Given token expirado, When consume endpoint, Then retorna 401 Unauthorized.

# TS-2
Integración Leaflet Maps
Como sistema, deseo integrar Leaflet para visualizar rutas dinámicas en tiempo real.
S1: Given coordenadas válidas, When carga mapa, Then renderiza ruta correctamente.
S2: Given tracking activo, When recibe GPS, Then actualiza posición del vehículo.
S3: Given API de mapas caída, When carga mapa, Then muestra mensaje de error.