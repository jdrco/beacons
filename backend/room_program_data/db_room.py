import json
import uuid
import os
import sys
from datetime import datetime, time
from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.models.building import Building, Room, RoomSchedule, SingleEventSchedule

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in the .env file")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
session = SessionLocal()

json_file_path = os.path.join(os.path.dirname(__file__), "buildings_with_location.json")

with open(json_file_path, "r", encoding="utf-8") as file:
    try:
        json_data = json.load(file)
    except json.JSONDecodeError as e:
        raise ValueError(f"❌ Error parsing JSON: {e}")

total_buildings = len(json_data)


try:
    print("🔄 Clearing existing data...")
    session.query(SingleEventSchedule).delete()
    session.query(RoomSchedule).delete()
    session.query(Room).delete()
    session.query(Building).delete()
    session.commit()
    print("✅ Database cleared.")

    print("🚀 Inserting buildings, rooms, and schedules...")

    for building_name, details in json_data.items():
        if building_name in {"TBD", "ONLINE"}:
            continue

        latitude = details["coordinates"]["latitude"]
        longitude = details["coordinates"]["longitude"]

        building = Building(
            id=uuid.uuid4(),
            name=building_name,
            latitude=latitude,
            longitude=longitude
        )
        session.add(building)
        session.flush()

        for full_room_name, schedules in details["rooms"].items():
            room_name = full_room_name[len(building_name) + 1 :] if full_room_name.startswith(building_name + " ") else full_room_name

            room = Room(
                id=uuid.uuid4(),
                building_id=building.id,
                name=room_name
            )
            session.add(room)
            session.flush()

            schedule_by_day = {day: [] for day in "MTWRFSU"}

            for schedule in schedules:
                date_range = schedule["dates"]
                time_range = schedule["time"]
                course = schedule.get("course", None)

                start_time_str, end_time_str = time_range.split(" - ")
                start_time = datetime.strptime(start_time_str, "%H:%M").time()
                end_time = datetime.strptime(end_time_str, "%H:%M").time()

                if "(" in date_range and ")" in date_range:
                    day_abbrs = date_range.split("(")[-1].strip(")")
                    for day in day_abbrs:
                        schedule_by_day[day].append((start_time, end_time, course))

                else:
                    event_date_str = date_range.strip()
                    event_date = datetime.strptime(event_date_str, "%Y-%m-%d")

                    single_event = SingleEventSchedule(
                        id=uuid.uuid4(),
                        room_id=room.id,
                        start_time=datetime.combine(event_date, start_time),
                        end_time=datetime.combine(event_date, end_time),
                        course=course
                    )
                    session.add(single_event)

            for day, day_schedules in schedule_by_day.items():
                if not day_schedules:
                    continue

                day_schedules.sort()

                for start_time, end_time, course in day_schedules:
                    class_schedule = RoomSchedule(
                        id=uuid.uuid4(),
                        room_id=room.id,
                        start_time=start_time,
                        end_time=end_time,
                        day=day,
                        occupied=True,
                        course=course
                    )
                    session.add(class_schedule)

        print(f"✅ Finished Adding Building: {building_name}")

    session.commit()
    print("🎉 Buildings, Rooms, and Schedules inserted successfully!")

except SQLAlchemyError as e:
    session.rollback()
    print(f"❌ Error occurred: {e}")

# finally:
#     session.close()

WORKING_HOURS_START = time(8, 0)
WORKING_HOURS_END = time(22, 0)
MINIMUM_GAP_MINUTES = 15

schedules = session.query(RoomSchedule).order_by(RoomSchedule.room_id, RoomSchedule.day, RoomSchedule.start_time).all()

schedule_dict = {}

for schedule in schedules:
    key = (schedule.room_id, schedule.day)
    if key not in schedule_dict:
        schedule_dict[key] = []
    schedule_dict[key].append(schedule)

missing_schedules = []

for (room_id, day), schedule_list in schedule_dict.items():
    previous_end = WORKING_HOURS_START
    
    for schedule in schedule_list:
        current_start = schedule.start_time
        current_end = schedule.end_time

        time_difference = (datetime.combine(datetime.today(), current_start) - 
                           datetime.combine(datetime.today(), previous_end)).total_seconds() / 60

        if time_difference > MINIMUM_GAP_MINUTES:
            missing_schedules.append(RoomSchedule(
                room_id=room_id,
                day=day,
                start_time=previous_end,
                end_time=current_start,
                occupied=False,
                course=None
            ))

        previous_end = current_end

    time_difference = (datetime.combine(datetime.today(), WORKING_HOURS_END) - 
                       datetime.combine(datetime.today(), previous_end)).total_seconds() / 60

    if time_difference > MINIMUM_GAP_MINUTES:
        missing_schedules.append(RoomSchedule(
            room_id=room_id,
            day=day,
            start_time=previous_end,
            end_time=WORKING_HOURS_END,
            occupied=False,
            course=None
        ))

if missing_schedules:
    session.bulk_save_objects(missing_schedules)
    session.commit()
    print(f"Added {len(missing_schedules)} missing schedules.")

session.close()
