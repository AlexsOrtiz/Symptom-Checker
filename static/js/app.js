$(document).ready(function() {
    // Variable para almacenar los síntomas seleccionados
    let selectedSymptoms = [];

    // Función para filtrar síntomas al escribir en el campo de búsqueda
    $('#symptom_search').on('input', function() {
        let query = $(this).val(); // Captura lo que se escribe en el input
        $.get(`/search?query=${query}`, function(data) {
            let options = data.map(function(symptom) {
                return `<option value="${symptom}">${symptom}</option>`;  // Añadir a la lista de opciones
            }).join('');
            $('#symptom_dropdown').html(options); // Actualiza la lista desplegable
        });
    });

    // Función para agregar síntomas seleccionados a la lista
    $('#symptom_dropdown').on('change', function() {
        let symptom = $(this).val(); // Obtiene el síntoma seleccionado

        // Asegurarnos de que solo agregamos un síntoma único
        if (!selectedSymptoms.includes(symptom)) {
            selectedSymptoms.push(symptom);  // Agregamos el síntoma a la lista
            updateSelectedSymptomsList(); // Actualizamos la lista mostrada
        }

        // Actualizar el campo oculto con los síntomas seleccionados
        $('#selected_symptoms').val(selectedSymptoms.join(','));
    });

    // Función para actualizar la lista de síntomas seleccionados en la interfaz
    function updateSelectedSymptomsList() {
        $('#selected_symptoms_list').empty(); // Limpiar la lista

        // Añadir cada síntoma a la lista
        selectedSymptoms.forEach(function(symptom) {
            $('#selected_symptoms_list').append(`
                <li>
                    ${symptom}
                    <button class="remove-btn" data-symptom="${symptom}">Remove</button>
                </li>
            `);
        });

        // Manejar la eliminación de un síntoma
        $('.remove-btn').on('click', function() {
            let symptomToRemove = $(this).data('symptom');
            selectedSymptoms = selectedSymptoms.filter(function(symptom) {
                return symptom !== symptomToRemove;
            });
            updateSelectedSymptomsList(); // Actualizar la lista después de eliminar
            $('#selected_symptoms').val(selectedSymptoms.join(',')); // Actualizar el campo oculto
        });
    }
});
