import numpy as np
import pandas as pd
import statistics
from flask import Flask, render_template, request, jsonify
from sklearn.preprocessing import LabelEncoder
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix

app = Flask(__name__)

# Cargar el dataset de entrenamiento
DATA_PATH = "Training.csv"
data = pd.read_csv(DATA_PATH).dropna(axis=1)

# Preprocesamiento del dataset
encoder = LabelEncoder()
data["prognosis"] = encoder.fit_transform(data["prognosis"])

X = data.iloc[:, :-1]  # Síntomas
y = data.iloc[:, -1]   # Prognosis

# Entrenar los modelos
svm_model = SVC()
svm_model.fit(X, y)

nb_model = GaussianNB()
nb_model.fit(X, y)

rf_model = RandomForestClassifier(random_state=18)
rf_model.fit(X, y)

# Crear un diccionario que mapea cada síntoma a un índice
symptoms = X.columns.values
symptom_index = {}
for index, value in enumerate(symptoms):
    symptom = value.replace("_", " ").title() # Mantener los nombres originales de los síntomas
    symptom_index[symptom] = index

# Crear un diccionario con los índices y las clases predichas
data_dict = {
    "symptom_index": symptom_index,
    "predictions_classes": encoder.classes_ ,
    "symptoms": list(symptom_index.keys())  # Lista de síntomas para la búsqueda
}

# Función para hacer la predicción
def predictDisease(selected_symptoms):
    # Crear el vector de entrada (132 características)
    input_data = [0] * len(data_dict["symptom_index"])

    # Marcar con 1 los síntomas seleccionados por el usuario
    for symptom in selected_symptoms:
        if symptom in data_dict["symptom_index"]:
            index = data_dict["symptom_index"][symptom]
            input_data[index] = 1

    input_data = np.array(input_data).reshape(1, -1)  # Convertir a un array adecuado para el modelo

    # Hacer las predicciones con los tres modelos
    rf_prediction = data_dict["predictions_classes"][rf_model.predict(input_data)[0]]
    nb_prediction = data_dict["predictions_classes"][nb_model.predict(input_data)[0]]
    svm_prediction = data_dict["predictions_classes"][svm_model.predict(input_data)[0]]

    # Tomar la moda de las predicciones
    final_prediction = statistics.mode([rf_prediction, nb_prediction, svm_prediction])

    predictions = {
        "rf_model_prediction": rf_prediction,
        "naive_bayes_prediction": nb_prediction,
        "svm_model_prediction": svm_prediction,
        "final_prediction": final_prediction
    }
    return predictions

# Ruta para la página principal
@app.route("/", methods=["GET", "POST"])
def home():
    if request.method == "POST":
        # Obtener los síntomas seleccionados desde el formulario
        selected_symptoms = request.form.getlist("symptoms")  
        
        # Realizar la predicción
        disease = predictDisease(selected_symptoms)
        
        # Enviar la predicción y los síntomas seleccionados a la plantilla
        return render_template("index.html", disease=disease, symptoms=selected_symptoms)

    symptoms = list(X.columns)  # Todos los síntomas disponibles en el dataset
    return render_template("index.html", symptoms=symptoms)

# Ruta para buscar síntomas
@app.route("/search", methods=["GET"])
def search():
    query = request.args.get('query', '').lower()

    # Filtrar síntomas que contienen el texto ingresado
    if query:
        filtered_symptoms = [symptom for symptom in data_dict["symptoms"] if query in symptom.lower()]
        return jsonify(filtered_symptoms)
    
    # Si no hay búsqueda, devolver todos los síntomas
    return jsonify(data_dict["symptoms"])

if __name__ == "__main__":
    app.run(debug=True)
