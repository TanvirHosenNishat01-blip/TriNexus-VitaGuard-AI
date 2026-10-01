import PredictionForm from "../components/PredictionForm.jsx";
import { diabetesFields } from "../utils/validationSchemas.js";
import { getDiabetesPrediction } from "../services/api.js";
export default function DiabetesPredict() {
  return (
    <PredictionForm
      disease="Diabetes"
      kind="diabetes"
      fields={diabetesFields}
      predict={getDiabetesPrediction}
    />
  );
}
