from app.database import Base, engine
from app.models.student_document import StudentDocument
Base.metadata.create_all(bind=engine)
print("student_documents table is ready")
