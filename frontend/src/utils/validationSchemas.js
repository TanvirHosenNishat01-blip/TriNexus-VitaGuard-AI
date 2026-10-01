const numeric = (name, label, unit, integer = false, hint = "") => ({
  name,
  label,
  unit,
  integer,
  hint,
});
const category = (name, label, codes) => ({
  name,
  label,
  integer: true,
  codes,
  hint: "Use the numeric code from the source record.",
});

export const diabetesFields = [
  numeric("Pregnancies", "Pregnancies", "count", true),
  numeric("Age", "Age", "years", true),
  numeric("Glucose", "Glucose", "mg/dL"),
  numeric("BloodPressure", "Diastolic blood pressure", "mm Hg"),
  numeric("SkinThickness", "Skin thickness", "mm"),
  numeric("Insulin", "Insulin", "µU/mL"),
  numeric("BMI", "Body mass index", "kg/m²"),
  numeric("DiabetesPedigreeFunction", "Diabetes pedigree function", "score"),
];
export const cardioFields = [
  numeric("age", "Age", "years", true),
  category("sex", "Sex", [0, 1]),
  category("cp", "Chest pain type", [0, 1, 2, 3]),
  numeric("trestbps", "Resting blood pressure", "mm Hg", true),
  numeric("chol", "Serum cholesterol", "mg/dL", true),
  category("fbs", "Fasting blood sugar", [0, 1]),
  category("restecg", "Resting ECG", [0, 1, 2]),
  numeric("thalach", "Maximum heart rate", "bpm", true),
  category("exang", "Exercise-induced angina", [0, 1]),
  numeric("oldpeak", "ST depression", "value"),
  category("slope", "Peak exercise ST slope", [0, 1, 2]),
  category("ca", "Major vessels", [0, 1, 2, 3]),
  category("thal", "Thal category", [0, 1, 2]),
];

export function emptyValues(fields) {
  return Object.fromEntries(fields.map(({ name }) => [name, ""]));
}
export function validateValues(fields, values) {
  const errors = {};
  const data = {};
  for (const field of fields) {
    const raw = values[field.name];
    if (
      raw === undefined ||
      raw === null ||
      (typeof raw === "string" && raw.trim() === "")
    ) {
      errors[field.name] = "This field is required.";
      continue;
    }
    const value =
      typeof raw === "number" || typeof raw === "string" ? Number(raw) : NaN;
    if (!Number.isFinite(value)) errors[field.name] = "Enter a finite number.";
    else if (field.integer && !Number.isSafeInteger(value))
      errors[field.name] = "Enter a whole number.";
    else if (field.codes && !field.codes.includes(value))
      errors[field.name] = "Choose one of the listed codes.";
    else if (value < 0 && field.name !== "oldpeak")
      errors[field.name] = "Enter zero or a positive number.";
    else data[field.name] = value;
  }
  return { data, errors, valid: Object.keys(errors).length === 0 };
}
