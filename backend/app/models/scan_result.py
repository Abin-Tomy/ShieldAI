from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class ScanResult(Base):
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(String, unique=True, nullable=False, index=True)
    scan_type = Column(String, nullable=False)          # phishing | malware
    input_value = Column(String, nullable=False)         # URL or filename
    prediction = Column(String, nullable=False)          # phishing/legitimate/malicious/benign
    confidence = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)          # critical/high/medium/low
    aatr_action = Column(String, nullable=False)         # block/quarantine/warn/watch
    shap_top_features = Column(Text, nullable=True)      # JSON string
    threat_report = Column(Text, nullable=True)
    processing_time_ms = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
