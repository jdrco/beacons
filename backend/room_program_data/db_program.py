import json
import uuid
import os
import sys
from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.models.user import Program

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in the .env file")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
session = SessionLocal()

json_file_path = os.path.join(os.path.dirname(__file__), "all_programs_simplified.json")

with open(json_file_path, "r", encoding="utf-8") as file:
    try:
        json_data = json.load(file)
    except json.JSONDecodeError as e:
        raise ValueError(f"❌ Error parsing JSON: {e}")

total_program = len(json_data)


try:
    for program in json_data:
        name = program.get("name")
        level = program.get("level")
        faculty = program.get("faculty")

        if not name or not level or not faculty:
            print(f"Skipping program due to missing data: {program}")
            continue

        is_undergrad = level.lower() == "undergraduate"

        new_program = Program(
            name=name,
            is_undergrad=is_undergrad,
            faculty=faculty
        )

        session.add(new_program)
    
    session.commit()
    print("✅ All programs have been successfully added to the database.")

except SQLAlchemyError as e:
    session.rollback()
    print(f"❌ Error occurred: {e}")

finally:
    session.close()
