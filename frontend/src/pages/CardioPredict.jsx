import PredictionForm from "../components/PredictionForm.jsx";
import { cardioFields } from "../utils/validationSchemas.js";
import { getCardioPrediction } from "../services/api.js";
export default function CardioPredict() {
  return (
    <PredictionForm
      disease="Cardiovascular"
      kind="cardio"
      fields={cardioFields}
      predict={getCardioPrediction}
    />
  );
}
