import sys
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch

# 1. Ensure 'backend' directory is in Python path for imports
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app
from app.database.database import Base
from app.routes.prediction import get_db
from app.models.models import PredictionRecord, CardioPredictionRecord

# 2. Setup isolated in-memory SQLite database for testing
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables in the test database and teardown when done."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(autouse=True)
def clean_db_between_tests():
    """Wipe table data between tests to guarantee state isolation."""
    yield
    with test_engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()


@pytest.fixture()
def client():
    """Dependency override fixture that provides an isolated DB session."""
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# =====================================================================
# 1. ROOT / HEALTH CHECK ENDPOINT TESTS
# =====================================================================

def test_root_endpoint(client):
    """Test health check / root endpoint."""
    response = client.get("/")
    print("\nRoot API Status:", response.status_code)
    print("Response:", response.json())

    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "TriNexus-VitaGuard-AI" in data["message"]


# =====================================================================
# 2. DIABETES PREDICTION & MODEL INTEGRITY TESTS (/api/predict)
# =====================================================================

def test_predict_diabetes_success(client):
    """Test successful diabetes prediction with valid patient data."""
    payload = {
        "Pregnancies": 1,
        "Glucose": 85.0,
        "BloodPressure": 66.0,
        "SkinThickness": 29.0,
        "Insulin": 100.0,
        "BMI": 26.6,
        "DiabetesPedigreeFunction": 0.351,
        "Age": 31,
    }
    response = client.post("/api/predict", json=payload)
    print("\nDiabetes API Status:", response.status_code)
    print("Response:", response.json())

    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert data["prediction"] in [0, 1]
    assert "risk_level" in data
    assert data["risk_level"] in ["Low Risk", "High Risk"]
    assert "risk_probability_percentage" in data
    assert 0.0 <= data["risk_probability_percentage"] <= 100.0


def test_predict_diabetes_model_invariance(client):
    """Model test: Verify identical inputs yield identical deterministic predictions."""
    payload = {
        "Pregnancies": 1,
        "Glucose": 115.0,
        "BloodPressure": 72.0,
        "SkinThickness": 22.0,
        "Insulin": 85.0,
        "BMI": 24.2,
        "DiabetesPedigreeFunction": 0.32,
        "Age": 29,
    }
    res_1 = client.post("/api/predict", json=payload)
    res_2 = client.post("/api/predict", json=payload)

    print("\nDiabetes Invariance Run 1 Status:", res_1.status_code)
    print("Response 1:", res_1.json())
    print("Diabetes Invariance Run 2 Status:", res_2.status_code)
    print("Response 2:", res_2.json())

    assert res_1.json()["prediction"] == res_2.json()["prediction"]
    assert res_1.json()["risk_probability_percentage"] == res_2.json()["risk_probability_percentage"]


def test_predict_diabetes_boundary_values(client):
    """Model test: Low-end boundary values produce valid classification output."""
    payload = {
        "Pregnancies": 0,
        "Glucose": 1.0,
        "BloodPressure": 1.0,
        "SkinThickness": 1.0,
        "Insulin": 1.0,
        "BMI": 1.0,
        "DiabetesPedigreeFunction": 0.01,
        "Age": 1,
    }
    response = client.post("/api/predict", json=payload)
    print("\nDiabetes Boundary Status:", response.status_code)
    print("Response:", response.json())

    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] in [0, 1]
    assert 0.0 <= data["risk_probability_percentage"] <= 100.0


def test_predict_diabetes_validation_error(client):
    """Test that missing required fields trigger a 422 Unprocessable Entity."""
    incomplete_payload = {
        "Pregnancies": 2,
        "Glucose": 140.0,
    }
    response = client.post("/api/predict", json=incomplete_payload)
    print("\nDiabetes Validation Error Status:", response.status_code)
    print("Response:", response.json())

    assert response.status_code == 422


def test_predict_diabetes_invalid_data_type(client):
    """Test that passing invalid types triggers 422."""
    invalid_payload = {
        "Pregnancies": "invalid_number",
        "Glucose": "high",
        "BloodPressure": 80.0,
        "SkinThickness": 25.0,
        "Insulin": 100.0,
        "BMI": 28.5,
        "DiabetesPedigreeFunction": 0.45,
        "Age": 45,
    }
    response = client.post("/api/predict", json=invalid_payload)
    print("\nDiabetes Invalid Type Status:", response.status_code)
    print("Response:", response.json())

    assert response.status_code == 422


# =====================================================================
# 3. SHAP EXPLAINABILITY ENDPOINT TESTS (/api/shap-importance)
# =====================================================================

def test_shap_importance_endpoint(client):
    """Test fetching SHAP global feature importances."""
    response = client.get("/api/shap-importance")
    print("\nSHAP API Status:", response.status_code)
    print("Response:", response.json())

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "feature" in data[0]
    assert "importance" in data[0]


# =====================================================================
# 4. CARDIOVASCULAR PREDICTION ENDPOINT TESTS (/api/predict/cardio)
# =====================================================================

def test_predict_cardio_validation_error(client):
    """Test that missing cardio fields trigger a 422 Unprocessable Entity."""
    incomplete_cardio = {
        "age": 55,
        "sex": 1,
    }
    response = client.post("/api/predict/cardio", json=incomplete_cardio)
    print("\nCardio Validation Error Status:", response.status_code)
    print("Response:", response.json())

    assert response.status_code == 422


@patch("app.routes.prediction.process_cardio_prediction")
def test_predict_cardio_success(mock_cardio_predict, client):
    """Test cardio prediction endpoint with mock to verify route logic."""
    mock_cardio_predict.return_value = {
        "prediction": 1,
        "risk_level": "High Risk",
        "risk_probability_percentage": 78.50,
    }

    cardio_payload = {
        "age": 60,
        "sex": 1,
        "cp": 2,
        "trestbps": 140,
        "chol": 260,
        "fbs": 0,
        "restecg": 1,
        "thalach": 145,
        "exang": 1,
        "oldpeak": 2.5,
        "slope": 1,
        "ca": 1,
        "thal": 2,
    }
    response = client.post("/api/predict/cardio", json=cardio_payload)
    print("\nCardio API Status:", response.status_code)
    print("Response:", response.json())

    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] == 1
    assert data["risk_level"] == "High Risk"
    assert data["risk_probability_percentage"] == 78.50


# =====================================================================
# 5. DATABASE PERSISTENCE TESTS
# =====================================================================

def test_diabetes_database_record_creation(client):
    """Verify calling /api/predict commits a record to PredictionRecord."""
    payload = {
        "Pregnancies": 1,
        "Glucose": 115.0,
        "BloodPressure": 72.0,
        "SkinThickness": 22.0,
        "Insulin": 85.0,
        "BMI": 24.2,
        "DiabetesPedigreeFunction": 0.32,
        "Age": 29,
    }
    response = client.post("/api/predict", json=payload)
    print("\nDB Diabetes Record API Status:", response.status_code)
    print("Response:", response.json())

    assert response.status_code == 200

    db = TestingSessionLocal()
    record = db.query(PredictionRecord).filter_by(glucose=115.0, age=29).first()
    assert record is not None
    assert record.risk_level in ["Low Risk", "High Risk"]
    assert record.created_at is not None
    db.close()


@patch("app.routes.prediction.process_cardio_prediction")
def test_cardio_database_record_creation(mock_cardio_predict, client):
    """Verify calling /api/predict/cardio commits a record to CardioPredictionRecord."""
    mock_cardio_predict.return_value = {
        "prediction": 0,
        "risk_level": "Low Risk",
        "risk_probability_percentage": 15.20,
    }
    cardio_payload = {
        "age": 45,
        "sex": 0,
        "cp": 1,
        "trestbps": 120,
        "chol": 200,
        "fbs": 0,
        "restecg": 0,
        "thalach": 160,
        "exang": 0,
        "oldpeak": 0.0,
        "slope": 2,
        "ca": 0,
        "thal": 2,
    }
    response = client.post("/api/predict/cardio", json=cardio_payload)
    print("\nDB Cardio Record API Status:", response.status_code)
    print("Response:", response.json())

    assert response.status_code == 200

    db = TestingSessionLocal()
    record = db.query(CardioPredictionRecord).filter_by(age=45, chol=200).first()
    assert record is not None
    assert record.prediction == 0
    assert record.risk_level == "Low Risk"
    assert record.id is not None
    db.close()